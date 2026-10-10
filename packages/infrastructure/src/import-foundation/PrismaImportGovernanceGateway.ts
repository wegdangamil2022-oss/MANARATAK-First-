import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext, UniversalImportHandoff } from '@manaratak/domain';
import type { IImportGovernanceGateway, ImportMappingDefinition, ImportMappingProfileDto } from '@manaratak/application';
import { screeningReceiptIdentity } from './PrismaImportScreeningReceiptStore';

const terminal = ['COMPLETED','PARTIALLY_COMPLETED','FAILED_PERMANENT','DLQ','CANCELLED','PAUSED'];
const auxiliary = ['CHECKPOINT','DLQ','WORKER_FAILURE','STAGING_REJECTED'];
const profileDto = (row: { id: string; sourceId: string; ownerDomain: string; version: number; sourceRevision: Date;
  definition: Prisma.JsonValue; definitionHash: string }): ImportMappingProfileDto => ({ ...row, definition: row.definition as unknown as ImportMappingDefinition });
export class PrismaImportGovernanceGateway implements IImportGovernanceGateway {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient, private readonly bound = false) {}
  withTransaction(context: AtomicPersistenceContext) {
    const tx = (context as unknown as { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('IMPORT_GOVERNANCE_TRANSACTION_REQUIRED');
    return new PrismaImportGovernanceGateway(tx, true);
  }
  private requireTransaction() { if (!this.bound) throw new Error('IMPORT_GOVERNANCE_TRANSACTION_REQUIRED'); }
  private async lock(key: string) {
    this.requireTransaction();
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`import-governance:${key}`}, 0))`;
  }
  async listProfiles(sourceId: string, ownerDomain: string) {
    return (await this.prisma.importMappingProfile.findMany({ where: { sourceId, ownerDomain }, orderBy: { version: 'desc' }, take: 50 })).map(profileDto);
  }
  async getProfile(id: string) { const row = await this.prisma.importMappingProfile.findUnique({ where: { id } }); return row ? profileDto(row) : null; }
  async createProfile(input: { sourceId: string; ownerDomain: string; sourceRevision: string; expectedVersion: number;
    definition: ImportMappingDefinition; definitionHash: string; actorId: string; reason: string }) {
    await this.lock(`mapping:${input.sourceId}:${input.ownerDomain}`);
    if (input.sourceId !== 'MANUAL_EAP_UPLOAD') {
      const source = await this.prisma.importSourceRegistryEntry.findUnique({ where: { sourceId: input.sourceId } });
      if (!source || (source.metadata as Record<string, unknown> | null)?.ownerDomain !== 'GENERIC' ||
          source.updatedAt.toISOString() !== input.sourceRevision) throw new Error('IMPORT_MAPPING_PROFILE_CONFLICT');
      const locked = await this.prisma.importSourceRegistryEntry.updateMany({ where: { sourceId: input.sourceId, updatedAt: source.updatedAt }, data: { status: source.status, updatedAt: source.updatedAt } });
      if (!locked.count) throw new Error('IMPORT_MAPPING_PROFILE_CONFLICT');

    } else if (input.sourceRevision !== '1970-01-01T00:00:00.000Z') throw new Error('IMPORT_MAPPING_PROFILE_CONFLICT');
    const last = await this.prisma.importMappingProfile.findFirst({ where: { sourceId: input.sourceId, ownerDomain: input.ownerDomain }, orderBy: { version: 'desc' } });
    if ((last?.version ?? 0) !== input.expectedVersion) throw new Error('IMPORT_MAPPING_PROFILE_CONFLICT');
    const { expectedVersion: _expected, ...data } = input;
    return profileDto(await this.prisma.importMappingProfile.create({ data: { ...data, id: randomUUID(), version: input.expectedVersion + 1,
      sourceRevision: new Date(input.sourceRevision), definition: input.definition as unknown as Prisma.InputJsonValue } }));
  }
  async reviewDomain(recordId: string) {
    const record = await this.prisma.importRecord.findUnique({ where: { id: recordId }, select: { batch: { select: { dataType: true } } } });
    if (!record) throw new Error('IMPORT_REVIEW_RECORD_NOT_READY');
    return record.batch.dataType;
  }
  async release(input: { recordId: string; expectedVersion: number; actorId: string }) {
    await this.lock(`review:${input.recordId}`);
    const won = await this.prisma.importReviewAssignment.updateMany({ where: { recordId: input.recordId,
      version: input.expectedVersion, assigneeId: input.actorId, claimedBy: input.actorId, state: 'CLAIMED' },
      data: { state: 'ASSIGNED', claimedBy: null, claimUntil: null, version: { increment: 1 } } });
    if (!won.count) throw new Error('IMPORT_REVIEW_CONFLICT');
    return this.prisma.importReviewAssignment.findUnique({ where: { recordId: input.recordId } });
  }
  async assign(input: { recordId: string; assigneeId: string; dueAt: string; expectedVersion: number; actorId: string }) {
    await this.lock(`review:${input.recordId}`);
    const record = await this.prisma.importRecord.findUnique({ where: { id: input.recordId }, include: { batch: true } });
    if (!record || !['NEEDS_REVIEW','INCOMPLETE'].includes(record.status) || !terminal.includes(record.batch.batchStatus)) throw new Error('IMPORT_REVIEW_RECORD_NOT_READY');
    const parent = await this.prisma.importBatch.updateMany({ where: { id: record.batchId, batchStatus: record.batch.batchStatus,
      updatedAt: record.batch.updatedAt, claimedBy: null, claimUntil: null }, data: { batchStatus: record.batch.batchStatus } });
    if (!parent.count) throw new Error('IMPORT_REVIEW_CONFLICT');
    const prior = await this.prisma.importReviewAssignment.findUnique({ where: { recordId: input.recordId } });
    if ((prior?.version ?? 0) !== input.expectedVersion || (prior?.claimUntil && prior.claimUntil > new Date())) throw new Error('IMPORT_REVIEW_CONFLICT');
    const data = { batchId: record.batchId, ownerDomain: record.batch.dataType, assigneeId: input.assigneeId, dueAt: new Date(input.dueAt),
      state: 'ASSIGNED', claimedBy: null, claimUntil: null, version: input.expectedVersion + 1 };
    return prior ? this.prisma.importReviewAssignment.update({ where: { recordId: input.recordId }, data }) :
      this.prisma.importReviewAssignment.create({ data: { recordId: input.recordId, ...data } });
  }
  async claim(input: { recordId: string; expectedVersion: number; actorId: string }) {
    await this.lock(`review:${input.recordId}`);
    const record = await this.prisma.importRecord.findUnique({ where: { id: input.recordId }, include: { batch: true } });
    if (!record || !['NEEDS_REVIEW','INCOMPLETE'].includes(record.status) || !terminal.includes(record.batch.batchStatus)) throw new Error('IMPORT_REVIEW_RECORD_NOT_READY');
    const parent = await this.prisma.importBatch.updateMany({ where: { id: record.batchId, batchStatus: record.batch.batchStatus,
      updatedAt: record.batch.updatedAt, claimedBy: null, claimUntil: null }, data: { batchStatus: record.batch.batchStatus } });
    if (!parent.count) throw new Error('IMPORT_REVIEW_CONFLICT');
    const now = new Date();
    const won = await this.prisma.importReviewAssignment.updateMany({ where: { recordId: input.recordId, assigneeId: input.actorId,
      version: input.expectedVersion, state: { in: ['ASSIGNED','CLAIMED'] }, OR: [{ claimUntil: null }, { claimUntil: { lte: now } }, { claimedBy: input.actorId }] },
      data: { state: 'CLAIMED', claimedBy: input.actorId, claimUntil: new Date(now.getTime() + 15 * 60_000), version: { increment: 1 } } });
    if (won.count !== 1) throw new Error('IMPORT_REVIEW_CONFLICT');
    return this.prisma.importReviewAssignment.findUnique({ where: { recordId: input.recordId } });
  }
  async listReviews(input: { assigneeId?: string; batchId?: string; page: number }) {
    const where = { ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}), ...(input.batchId ? { batchId: input.batchId } : {}) };
    const data = await this.prisma.importReviewAssignment.findMany({ where, orderBy: [{ dueAt: 'asc' }, { recordId: 'asc' }], take: 50, skip: (input.page - 1) * 50 });
    return { data, total: await this.prisma.importReviewAssignment.count({ where }), page: input.page,
      ownerDecisionRequired: true, canonicalMutation: false };
  }
  async reconcile(input: { recordId: string; expectedUpdatedAt: string; actorId: string }) {
    this.requireTransaction();
    const record = await this.prisma.importRecord.findUnique({ where: { id: input.recordId }, include: { batch: true } });
    if (!record || record.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new Error('IMPORT_RECONCILIATION_CONFLICT');
    const raw = record.rawPayload as Record<string, unknown>;
    if (!['DISPATCH_IN_FLIGHT','MANUAL_RECONCILIATION_REQUIRED'].includes(String(raw._phase6HandoffState))) throw new Error('IMPORT_RECONCILIATION_CONFLICT');
    const envelope = raw._phase6HandoffEnvelope as UniversalImportHandoff | undefined;
    if (!envelope) throw new Error('IMPORT_RECEIPT_NOT_FOUND');
    const identity = screeningReceiptIdentity(envelope);
    const receipt = await this.prisma.importScreeningReceipt.findUnique({ where: { ownerDomain_handoffKey: { ownerDomain: identity.ownerDomain, handoffKey: identity.handoffKey } } });
    if (!receipt || receipt.requestHash !== identity.requestHash) throw new Error('IMPORT_RECEIPT_NOT_FOUND');
    const now = new Date();
    const parent = await this.prisma.importBatch.updateMany({ where: { id: record.batchId, updatedAt: record.batch.updatedAt,
      batchStatus: { in: [...terminal, 'PAUSING','CANCELLING'] }, OR: [{ claimUntil: null }, { claimUntil: { lte: now } }, { claimedBy: input.actorId }] },
      data: { batchStatus: record.batch.batchStatus } });
    if (!parent.count) throw new Error('IMPORT_RECONCILIATION_CONFLICT');
    const next: Record<string, unknown> = { ...raw, _phase6HandoffState: 'DISPATCHED', _domainHandoff: receipt.result, _screeningReceiptId: receipt.id };
    delete next._phase6HandoffEnvelope;
    const won = await this.prisma.importRecord.updateMany({ where: { id: input.recordId, updatedAt: record.updatedAt,
      promotedEntityId: null, retentionProcessedAt: null }, data: { rawPayload: next as Prisma.InputJsonValue,
        status: envelope.validation.state === 'VALID' ? 'COMPLETE' : 'NEEDS_REVIEW', processingNotes: 'Audited recovery from durable screening receipt.' } });
    if (!won.count) throw new Error('IMPORT_RECONCILIATION_CONFLICT');
    const unresolved = await this.prisma.importRecord.count({ where: { batchId: record.batchId, OR: [
      { rawPayload: { path: ['_phase6HandoffState'], equals: 'DISPATCH_IN_FLIGHT' } },
      { rawPayload: { path: ['_phase6HandoffState'], equals: 'MANUAL_RECONCILIATION_REQUIRED' } }] } });
    if (!unresolved && ['PAUSING','CANCELLING'].includes(record.batch.batchStatus))
      await this.prisma.importBatch.update({ where: { id: record.batchId }, data: { batchStatus: record.batch.batchStatus === 'PAUSING' ? 'PAUSED' : 'CANCELLED', claimedBy: null, claimUntil: null } });
    return { recordId: record.id, receiptId: receipt.id, ownerInvoked: false, canonicalMutation: false, unresolved };
  }
  async getObservation(sourceId: string) { return this.prisma.importSourceObservation.findUnique({ where: { sourceId } }); }
  async decideDrift(input: { sourceId: string; expectedUpdatedAt: string; decision: 'ACCEPT' | 'REJECT'; actorId: string; reason: string }) {
    await this.lock(`observation:${input.sourceId}`);
    const row = await this.prisma.importSourceObservation.findUnique({ where: { sourceId: input.sourceId } });
    if (!row || row.updatedAt.toISOString() !== input.expectedUpdatedAt || row.driftState !== 'REVIEW_REQUIRED' || !row.pendingShapeHash)
      throw new Error('IMPORT_DRIFT_CONFLICT');
    return this.prisma.importSourceObservation.update({ where: { sourceId: input.sourceId }, data: {
      ...(input.decision === 'ACCEPT' ? { shapeHash: row.pendingShapeHash, shape: row.pendingShape ?? Prisma.JsonNull,
        pendingShape: Prisma.JsonNull, pendingShapeHash: null, driftState: 'ACCEPTED' } : { driftState: 'REJECTED' }),
      decisionActorId: input.actorId, decisionReason: input.reason } });
  }
  async setFallback(input: { sourceId: string; fallbackSourceId: string | null; sourceRevision: string; fallbackSourceRevision?: string; actorId: string; reason: string }) {
    await this.lock(`observation:${input.sourceId}`);
    const ids = [...new Set([input.sourceId, ...(input.fallbackSourceId ? [input.fallbackSourceId] : [])])].sort();
    for (const sourceId of ids) {
      const source = await this.prisma.importSourceRegistryEntry.findUnique({ where: { sourceId } });
      const expected = sourceId === input.sourceId ? input.sourceRevision : input.fallbackSourceRevision;
      if (!source || source.updatedAt.toISOString() !== expected || (source.metadata as Record<string, unknown> | null)?.ownerDomain !== 'GENERIC' ||
          (sourceId !== input.sourceId && (source.status !== 'ACTIVE' || source.accessClassification !== 'PUBLIC_ALLOWED')))
        throw new Error('IMPORT_FALLBACK_CONFLICT');
      const locked = await this.prisma.importSourceRegistryEntry.updateMany({ where: { sourceId, updatedAt: source.updatedAt }, data: { updatedAt: source.updatedAt } });
      if (!locked.count) throw new Error('IMPORT_FALLBACK_CONFLICT');
    }
    const row = await this.prisma.importSourceObservation.findUnique({ where: { sourceId: input.sourceId } });
    if (!row || row.sourceRevision.toISOString() !== input.sourceRevision) throw new Error('IMPORT_FALLBACK_CONFLICT');
    return this.prisma.importSourceObservation.update({ where: { sourceId: input.sourceId }, data: { fallbackSourceId: input.fallbackSourceId,
      fallbackSourceRevision: input.fallbackSourceRevision ? new Date(input.fallbackSourceRevision) : null,
      decisionActorId: input.actorId, decisionReason: input.reason } });
  }
  async counters(batchId: string): Promise<unknown> {
    if (!this.bound) return (this.prisma as PrismaClient).$transaction(tx => new PrismaImportGovernanceGateway(tx, true).counters(batchId), { isolationLevel: 'RepeatableRead' });
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error('IMPORT_BATCH_NOT_FOUND');
    const groups = await this.prisma.importRecord.groupBy({ by: ['status'], where: { batchId, status: { notIn: auxiliary } }, _count: { _all: true } });
    const counts = Object.fromEntries(groups.map(row => [row.status, row._count._all]));
    const work = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { batchId, received: batch.receivedRecords, skipped: batch.skippedRecords, invalid: batch.invalidRecords,
      staged: batch.totalRecords, persistedWorkItems: work, processed: batch.processedRecords, failed: batch.failedRecords,
      review: counts.NEEDS_REVIEW ?? 0, counts, historicalCountsKnown: batch.receivedRecords !== null,
      consistent: batch.receivedRecords === null ? null : batch.receivedRecords === batch.totalRecords + (batch.skippedRecords ?? 0) };
  }
  async recoverLegacy(input: { batchId: string; expectedUpdatedAt: string; decision: 'QUEUE' | 'REJECT' }) {
    this.requireTransaction();
    const batch = await this.prisma.importBatch.findUnique({ where: { id: input.batchId } });
    if (!batch || batch.batchStatus !== 'CREATED' || batch.updatedAt.toISOString() !== input.expectedUpdatedAt || batch.claimedBy || batch.claimUntil)
      throw new Error('IMPORT_RECOVERY_CONFLICT');
    const parent = await this.prisma.importBatch.updateMany({ where: { id: batch.id, batchStatus: 'CREATED', updatedAt: batch.updatedAt,
      claimedBy: null, claimUntil: null }, data: { batchStatus: 'CREATED' } });
    if (!parent.count) throw new Error('IMPORT_RECOVERY_CONFLICT');
    const count = await this.prisma.importRecord.count({ where: { batchId: batch.id, status: { notIn: auxiliary } } });
    const unsafe = await this.prisma.importRecord.count({ where: { batchId: batch.id, OR: [
      { status: { in: ['STAGING_PENDING','STAGING_INVALID'] } }, { promotedEntityId: { not: null } },
      { rawPayload: { path: ['_phase6HandoffState'], equals: 'DISPATCH_IN_FLIGHT' } },
      { rawPayload: { path: ['_phase6HandoffState'], equals: 'MANUAL_RECONCILIATION_REQUIRED' } }] } });
    if (input.decision === 'QUEUE' && (unsafe || count !== batch.totalRecords)) throw new Error('IMPORT_RECOVERY_EVIDENCE_REQUIRED');
    if (input.decision === 'QUEUE' && count) {
      const eligible = await this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS "count" FROM "ImportRecord" WHERE "batchId" = ${batch.id}
        AND ("status" = 'INCOMPLETE' OR ("status" IN ('COMPLETE','NEEDS_REVIEW')
          AND "sourceDedupKey" IS NOT NULL AND octet_length("sourceDedupKey") <= 512
          AND "rawPayload"->>'_phase6HandoffState' = 'PENDING_HANDOFF'
          AND "rawPayload" #>> '{_phase6HandoffEnvelope,ownerDomain}' = ${batch.dataType}
          AND "rawPayload" #>> '{_phase6HandoffEnvelope,execution,executionId}' = ${batch.id}
          AND length("rawPayload" #>> '{_phase6HandoffEnvelope,handoffId}') BETWEEN 1 AND 600
          AND "rawPayload" #>> '{_phase6HandoffEnvelope,validation,state}' IN ('VALID','NEEDS_REVIEW')));`;
      if (eligible[0]?.count !== count) throw new Error('IMPORT_RECOVERY_EVIDENCE_REQUIRED');
    }

    await this.prisma.importBatch.update({ where: { id: batch.id }, data: {
      batchStatus: input.decision === 'QUEUE' ? 'QUEUED' : 'FAILED_PERMANENT', availableAt: new Date(),
      lastError: input.decision === 'REJECT' ? 'IMPORT_LEGACY_REJECTED_BY_REVIEW' : null } });
    return { batchId: batch.id, decision: input.decision, canonicalMutation: false };
  }
  async assignRetention(input: { batchId: string; expectedUpdatedAt: string; days: number }) {
    this.requireTransaction();
    const batch = await this.prisma.importBatch.findUnique({ where: { id: input.batchId } });
    if (!batch || !terminal.includes(batch.batchStatus) || batch.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new Error('IMPORT_RETENTION_CONFLICT');
    const won = await this.prisma.importBatch.updateMany({ where: { id: batch.id, updatedAt: batch.updatedAt, batchStatus: batch.batchStatus,
      claimedBy: null, claimUntil: null }, data: { batchStatus: batch.batchStatus } });
    if (!won.count) throw new Error('IMPORT_RETENTION_CONFLICT');
    const expires = new Date(Math.max(Date.now(), batch.createdAt.getTime()) + input.days * 86400_000);
    const result = await this.prisma.importRecord.updateMany({ where: { batchId: batch.id, retentionExpiresAt: null,
      retentionProcessedAt: null, legalHoldUntil: null, status: { notIn: ['CHECKPOINT','NEEDS_REVIEW','STAGING_PENDING','STAGING_INVALID'] },
 },
      data: { retentionExpiresAt: expires, retentionState: 'IMPORT_RAW_PROVENANCE' } });
    return { batchId: batch.id, assigned: result.count, expiresAt: expires, legalHoldsPreserved: true };
  }
}
