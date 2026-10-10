import { randomUUID } from 'node:crypto';
import { referenceStandardsReadiness, validateStandardSnapshotEvidence } from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { IReferenceOwnerReviewGateway, ReferenceOwnerReview, ReferenceSnapshotRecord } from '../services/IReferenceOwnerReviewGateway';
import { referenceImportPayloadDigest } from '../services/ReferenceDataScreeningHandoffConsumer';
import { ReferenceDataImportHandoffService } from '../services/ReferenceDataImportHandoffService';
const hash = (value: unknown) => referenceImportPayloadDigest({ value });
export class ReferenceOwnerReviewUseCases {
  constructor(private readonly gateway: IReferenceOwnerReviewGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  list(page: number, status?: string) { return this.gateway.list(page, status); }
  snapshots(page: number) { return this.gateway.snapshots(page); }
  async readiness() { return referenceStandardsReadiness(await this.gateway.reviewedSnapshots()); }
  private command<T>(id: string, action: string, context: AtomicMutationRequestContext, work: (gateway: IReferenceOwnerReviewGateway, tx: import('@manaratak/domain').AtomicPersistenceContext) => Promise<T>, record?: (value: T) => boolean) {
    if (!context.actorId?.trim()) throw new Error('REFERENCE_OWNER_ACTOR_REQUIRED');
    return this.atomic.execute({ domain: 'REFERENCE_DATA', aggregateType: 'REFERENCE_REVIEW', aggregateId: id, action, context }, async tx => {
      const gateway = this.gateway.withTransaction(tx); await gateway.lock(id); return work(gateway, tx);
    }, record);
  }
  private async previewEvidence(gateway: IReferenceOwnerReviewGateway, receiptId: string) {
    const receipt = await gateway.screening(receiptId); const screen = receipt?.result;
    if (!receipt || screen?.state !== 'NEEDS_OWNER_REVIEW' || !screen.entityType || !screen.normalizedPayload || !screen.normalizedPayloadHash || screen.dryRun !== false)
      throw new Error('REFERENCE_OWNER_SCREENING_EVIDENCE_REQUIRED');
    if (referenceImportPayloadDigest(screen.normalizedPayload) !== screen.normalizedPayloadHash) throw new Error('REFERENCE_OWNER_SOURCE_CONFLICT');
    if (!screen.sourceArtifactId || !screen.sourceContentHash) throw new Error('REFERENCE_OWNER_SOURCE_REQUIRED');
    await gateway.verifyArtifact(screen.sourceArtifactId, screen.sourceContentHash);
    const report = new ReferenceDataImportHandoffService().prepareSeedBatch({ seedBatchId: receiptId, sourceName: 'P6', sourceVersion: receipt.requestHash, entityType: screen.entityType, records: [screen.normalizedPayload] });
    if (!report.records[0]?.validationReport?.canBeImported) throw new Error('REFERENCE_OWNER_PAYLOAD_INVALID');
    const preview = await gateway.inspect(screen.entityType, screen.normalizedPayload);
    preview.issues.push(...screen.issues.map(issue => `SOURCE_REVIEW:${issue.code}`));
    return { receipt, screen, preview };
  }
  async preview(receiptId: string, context: AtomicMutationRequestContext) {
    const id = `p7-review-${hash(receiptId)}`;
    return this.command(id, 'REFERENCE_IMPORT_PREVIEWED', context, async gateway => {
      const prior = await gateway.get(id); if (prior) return { plan: prior, replay: true };
      const { receipt, screen, preview } = await this.previewEvidence(gateway, receiptId);
      const plan: ReferenceOwnerReview = { id, receiptId, sourceHash: receipt.requestHash, entityType: screen.entityType!, payload: screen.normalizedPayload!, preview,
        previewHash: hash({ payload: screen.normalizedPayload, preview }), version: 1, status: 'PREVIEWED' };
      await gateway.create(plan); return { plan, replay: false };
    }, result => !result.replay).then(result => result.plan);
  }
  async refresh(id: string, expectedVersion: number, context: AtomicMutationRequestContext) {
    return this.command(id, 'REFERENCE_IMPORT_PREVIEW_REFRESHED', context, async gateway => {
      const prior = await gateway.get(id);
      if (!prior || prior.version !== expectedVersion || prior.status === 'APPLIED') throw new Error('REFERENCE_OWNER_REVIEW_CONFLICT');
      const { receipt, screen, preview } = await this.previewEvidence(gateway, prior.receiptId);
      if (receipt.requestHash !== prior.sourceHash) throw new Error('REFERENCE_OWNER_SOURCE_CONFLICT');
      const next: ReferenceOwnerReview = { ...prior, preview, previewHash: hash({ payload: screen.normalizedPayload, preview }), version: prior.version + 1, status: 'PREVIEWED', reviewer: null, reason: null };
      await gateway.save(next, prior.version); return next;
    });
  }
  async review(id: string, input: { expectedVersion: number; previewHash: string; decision: 'APPROVE'|'REJECT'; reason: string }, context: AtomicMutationRequestContext) {
    if (input.reason.trim().length < 3 || input.reason.length > 1000) throw new Error('REFERENCE_OWNER_REASON_REQUIRED');
    return this.command(id, 'REFERENCE_IMPORT_REVIEWED', context, async gateway => {
      const plan = await gateway.get(id);
      if (!plan || plan.version !== input.expectedVersion || plan.previewHash !== input.previewHash || plan.status !== 'PREVIEWED') throw new Error('REFERENCE_OWNER_REVIEW_CONFLICT');
      if (input.decision === 'APPROVE' && plan.preview.issues.some(issue => !issue.startsWith('SOURCE_REVIEW:'))) throw new Error('REFERENCE_OWNER_PREVIEW_INVALID');
      const next: ReferenceOwnerReview = { ...plan, status: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', version: plan.version + 1, reviewer: context.actorId, reason: input.reason.trim() };
      await gateway.save(next, plan.version); return next;
    });
  }
  async apply(id: string, input: { expectedVersion: number; previewHash: string }, context: AtomicMutationRequestContext) {
    return this.command(id, 'REFERENCE_IMPORT_APPLIED', context, async (gateway, tx) => {
      const plan = await gateway.get(id);
      if (!plan || plan.previewHash !== input.previewHash) throw new Error('REFERENCE_OWNER_REVIEW_CONFLICT');
      if (plan.status === 'APPLIED') return { result: plan.result, replay: true };
      if (plan.status !== 'APPROVED' || plan.version !== input.expectedVersion || !plan.reviewer || !plan.reason) throw new Error('REFERENCE_OWNER_APPROVAL_REQUIRED');
      const { receipt, screen, preview } = await this.previewEvidence(gateway, plan.receiptId);
      if (receipt.requestHash !== plan.sourceHash || hash({ payload: screen.normalizedPayload, preview }) !== plan.previewHash) throw new Error('REFERENCE_OWNER_STALE_PREVIEW');
      const result = await gateway.apply(plan, tx, context.actorId);
      await gateway.save({ ...plan, result, status: 'APPLIED', version: plan.version + 1 }, plan.version);
      return { result, replay: false };
    }, result => !result.replay).then(result => result.result);
  }
  async createSnapshot(input: Omit<ReferenceSnapshotRecord, 'snapshotId'|'status'|'reviewedBy'|'reviewedAt'|'version'>, context: AtomicMutationRequestContext) {
    const row: ReferenceSnapshotRecord = { ...input, snapshotId: randomUUID(), status: 'DRAFT', reviewedBy: null, reviewedAt: null, version: 1 };
    const issues = validateStandardSnapshotEvidence(row); if (issues.length) throw new Error('REFERENCE_STANDARD_EVIDENCE_INVALID');
    return this.command(`standard:${row.standardFamily}`, 'REFERENCE_STANDARD_PROPOSED', context, async gateway => {
      await gateway.verifyArtifact(row.sourceArtifactId, row.sourceArtifactHash); await gateway.saveSnapshot(row); return row;
    });
  }
  async reviewSnapshot(id: string, expectedVersion: number, decision: 'APPROVE'|'REJECT', reason: string, context: AtomicMutationRequestContext) {
    if (reason.trim().length < 3 || reason.length > 1000) throw new Error('REFERENCE_OWNER_REASON_REQUIRED');
    const observed = await this.gateway.snapshot(id); if (!observed) throw new Error('REFERENCE_STANDARD_NOT_FOUND');
    return this.command(`standard:${observed.standardFamily}`, 'REFERENCE_STANDARD_REVIEWED', context, async gateway => {
      const row = await gateway.snapshot(id); if (!row || row.version !== expectedVersion || row.status !== 'DRAFT') throw new Error('REFERENCE_OWNER_REVIEW_CONFLICT');
      await gateway.verifyArtifact(row.sourceArtifactId, row.sourceArtifactHash);
      if (decision === 'APPROVE') {
        const current = (await gateway.reviewedSnapshots()).filter(item => item.standardFamily === row.standardFamily);
        if (current.length > 1 || (current[0]?.snapshotId ?? null) !== (row.supersedesSnapshotId ?? null)) throw new Error('REFERENCE_STANDARD_SUPERSESSION_CONFLICT');
        if (current[0]) await gateway.saveSnapshot({ ...current[0], status: 'SUPERSEDED', version: current[0].version + 1 }, current[0].version);
      }
      const next: ReferenceSnapshotRecord = { ...row, status: decision === 'APPROVE' ? 'REVIEWED' : 'REJECTED', reviewedBy: context.actorId, reviewedAt: new Date().toISOString(), notes: reason.trim(), version: row.version + 1 };
      if (validateStandardSnapshotEvidence(next).length) throw new Error('REFERENCE_STANDARD_EVIDENCE_INVALID');
      await gateway.saveSnapshot(next, row.version); return next;
    });
  }
}
