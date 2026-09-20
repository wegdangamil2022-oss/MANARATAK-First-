import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { IRetentionOwnerGateway } from '@manaratak/application';
import { RetentionCandidate, RetentionDecision, RetentionDisposition, RetentionOwner } from '@manaratak/domain';

export class PrismaImportRetentionGateway implements IRetentionOwnerGateway {
  readonly owner = RetentionOwner.IMPORT;
  constructor(private readonly prisma: PrismaClient) {}
  async listDue(now: Date, limit: number): Promise<RetentionCandidate[]> {
    const rows = await (this.prisma as any).importRecord.findMany({
      where: { retentionExpiresAt: { lte: now }, retentionProcessedAt: null, OR: [{ retentionClaimUntil: null }, { retentionClaimUntil: { lte: now } }] },
      orderBy: { retentionExpiresAt: 'asc' }, take: limit,
      select: { id: true, retentionExpiresAt: true, legalHoldUntil: true, status: true },
    });
    return rows.map((row: any) => ({ owner: this.owner, recordId: row.id, expiresAt: new Date(row.retentionExpiresAt), legalHoldUntil: row.legalHoldUntil ? new Date(row.legalHoldUntil) : null, lifecycleState: row.status }));
  }
  async applyDecision(candidate: RetentionCandidate, decision: RetentionDecision): Promise<'APPLIED' | 'SKIPPED'> {
    if (decision.disposition !== RetentionDisposition.PURGE) throw new Error('IMPORT_RETENTION_DISPOSITION_UNSUPPORTED');
    const token = randomUUID(); const claimUntil = new Date(decision.decidedAt.getTime() + 5 * 60_000);
    const claimed = await (this.prisma as any).importRecord.updateMany({ where: { id: candidate.recordId, retentionProcessedAt: null, retentionExpiresAt: candidate.expiresAt, OR: [{ retentionClaimUntil: null }, { retentionClaimUntil: { lte: decision.decidedAt } }] }, data: { retentionClaimToken: token, retentionClaimUntil: claimUntil } });
    if (claimed.count !== 1) return 'SKIPPED';
    try {
      const updated = await (this.prisma as any).importRecord.updateMany({ where: { id: candidate.recordId, retentionProcessedAt: null, retentionClaimToken: token }, data: { rawPayload: { retentionPurged: true, purgedAt: decision.decidedAt.toISOString() }, retentionState: 'RAW_PURGED', retentionProcessedAt: decision.decidedAt, retentionClaimToken: null, retentionClaimUntil: null } });
      return updated.count === 1 ? 'APPLIED' : 'SKIPPED';
    } catch (error) {
      await (this.prisma as any).importRecord.updateMany({ where: { id: candidate.recordId, retentionClaimToken: token }, data: { retentionClaimToken: null, retentionClaimUntil: null } });
      throw error;
    }
  }
}
