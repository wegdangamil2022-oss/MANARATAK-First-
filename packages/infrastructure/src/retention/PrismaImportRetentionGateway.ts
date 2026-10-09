import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { IRetentionOwnerGateway } from '@manaratak/application';
import { RetentionCandidate, RetentionDecision, RetentionDisposition, RetentionOwner } from '@manaratak/domain';

const TERMINAL_BATCHES = ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED_PERMANENT', 'DLQ', 'CANCELLED'];
const PRESERVED_STATES = ['NEEDS_REVIEW', 'STAGING_PENDING', 'STAGING_INVALID', 'CHECKPOINT'];
export class PrismaImportRetentionGateway implements IRetentionOwnerGateway {
  readonly owner = RetentionOwner.IMPORT;
  constructor(private readonly prisma: PrismaClient) {}
  async listDue(now: Date, limit: number): Promise<RetentionCandidate[]> {
    const rows = await this.prisma.importRecord.findMany({
      where: { retentionExpiresAt: { lte: now }, retentionProcessedAt: null,
        status: { notIn: PRESERVED_STATES }, batch: { batchStatus: { in: TERMINAL_BATCHES } },
        OR: [{ retentionClaimUntil: null }, { retentionClaimUntil: { lte: now } }] },
      orderBy: { retentionExpiresAt: 'asc' }, take: Math.max(1, Math.min(100, Math.trunc(limit) || 1)),
      select: { id: true, retentionExpiresAt: true, legalHoldUntil: true, status: true },
    });
    return rows.map(row => ({ owner: this.owner, recordId: row.id, expiresAt: row.retentionExpiresAt!,
      legalHoldUntil: row.legalHoldUntil, lifecycleState: row.status }));
  }
  async applyDecision(candidate: RetentionCandidate, decision: RetentionDecision): Promise<'APPLIED' | 'SKIPPED'> {
    if (decision.disposition !== RetentionDisposition.PURGE) throw new Error('IMPORT_RETENTION_DISPOSITION_UNSUPPORTED');
    if (candidate.owner !== this.owner || decision.owner !== this.owner || candidate.recordId !== decision.recordId ||
      candidate.expiresAt.getTime() !== decision.expiresAt.getTime() || candidate.expiresAt > decision.decidedAt)
      throw new Error('IMPORT_RETENTION_DECISION_MISMATCH');
    return this.prisma.$transaction(async tx => {
      const record = await tx.importRecord.findUnique({ where: { id: candidate.recordId },
        select: { batchId: true, rawPayload: true, batch: { select: { batchStatus: true } } } });
      if (!record || !TERMINAL_BATCHES.includes(record.batch.batchStatus)) return 'SKIPPED';
      const payload = record.rawPayload as Record<string, unknown> | null;
      if (payload && ['DISPATCH_IN_FLIGHT','MANUAL_RECONCILIATION_REQUIRED'].includes(String(payload._phase6HandoffState))) return 'SKIPPED';
      // Lock the parent status in the same transaction: replay cannot race a purge.
      const parent = await tx.importBatch.updateMany({ where: { id: record.batchId,
        batchStatus: record.batch.batchStatus, claimedBy: null, claimUntil: null },
        data: { batchStatus: record.batch.batchStatus } });
      if (parent.count !== 1) return 'SKIPPED';
      const hold = { OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: decision.decidedAt } }] };
      const fence = { rawPayload: { equals: record.rawPayload === null ? Prisma.JsonNull : record.rawPayload as Prisma.InputJsonValue }, id: candidate.recordId, retentionProcessedAt: null, retentionExpiresAt: candidate.expiresAt,
        status: { notIn: PRESERVED_STATES }, AND: [hold] };
      const token = randomUUID();
      const claimed = await tx.importRecord.updateMany({ where: { ...fence,
        OR: [{ retentionClaimUntil: null }, { retentionClaimUntil: { lte: decision.decidedAt } }] },
        data: { retentionClaimToken: token, retentionClaimUntil: new Date(decision.decidedAt.getTime() + 300_000) } });
      if (claimed.count !== 1) return 'SKIPPED';
      const updated = await tx.importRecord.updateMany({ where: { ...fence, retentionClaimToken: token },
        data: { rawPayload: { retentionPurged: true, purgedAt: decision.decidedAt.toISOString() },
          retentionState: 'RAW_PURGED', retentionProcessedAt: decision.decidedAt,
          retentionClaimToken: null, retentionClaimUntil: null } });
      if (updated.count !== 1) {
        await tx.importRecord.updateMany({ where: { id: candidate.recordId, retentionClaimToken: token },
          data: { retentionClaimToken: null, retentionClaimUntil: null } });
        return 'SKIPPED';
      }
      return 'APPLIED';
    });
  }
}
