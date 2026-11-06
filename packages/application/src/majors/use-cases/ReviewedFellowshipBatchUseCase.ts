import { MajorImportPayloadSchema, type AtomicPersistenceContext, type IImportHandoffConsumer, type UniversalImportHandoff } from '@manaratak/domain';
import { z } from 'zod';
import { taxonomyRevisionHash as hash } from '../../academic-taxonomy/services/TaxonomyRevisionHash';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

const payloadSchema = MajorImportPayloadSchema.omit({ sourceImportRecordId: true, degreeLevel: true, degreeLevelId: true, academicFieldId: true, disciplineId: true }).extend({
  canonicalMajorName: z.string().trim().min(1).max(300), classificationCode: z.string().regex(/^FEL-\d{4}$/),
  fellowshipType: z.string().trim().min(1).max(300), professionalDomain: z.string().trim().min(1).max(300),
}).strict();
export function parseFellowshipOwnerPayload(value: unknown) {
  if (!value || Buffer.byteLength(JSON.stringify(value)) > 64000) throw Error('FELLOWSHIP_PAYLOAD_INVALID');
  const inspect = (item: unknown, depth = 0) => {
    if (depth > 8) throw Error('FELLOWSHIP_PAYLOAD_DEPTH');
    if (item && typeof item === 'object') for (const [key, child] of Object.entries(item)) {
      if (['__proto__', 'prototype', 'constructor', 'approvedBy', 'isPubliclyVisible', 'status', 'linkedMajorId', 'linkedProfileId'].includes(key)) throw Error('FELLOWSHIP_OWNER_FIELD_FORBIDDEN');
      inspect(child, depth + 1);
    }
  };
  inspect(value); return payloadSchema.parse(value);
}
export class FellowshipImportScreeningConsumer implements IImportHandoffConsumer {
  readonly effectMode = 'SCREENING_ONLY' as const;
  async accept(handoff: UniversalImportHandoff) {
    if (handoff.ownerDomain.trim().toUpperCase() !== 'FELLOWSHIPS') throw Error('FELLOWSHIP_OWNER_MISMATCH');
    try {
      const payload = parseFellowshipOwnerPayload(handoff.normalizedPayload);
      return { owner: 'FELLOWSHIPS', schemaVersion: 1, state: handoff.validation.state !== 'INVALID' && !handoff.validation.issues.some(i => i.severity === 'ERROR') ? 'NEEDS_OWNER_REVIEW' : 'INVALID', dryRun: handoff.execution.dryRun, payload,
        origin: { batchId: handoff.referenceMetadata?.importBatchId ?? null, sourceDedupKey: handoff.referenceMetadata?.sourceRecordDedupKey ?? null },
        source: { artifactId: handoff.artifact.artifactId ?? null, sha256: handoff.referenceMetadata?.artifactSha256 ?? null } };
    } catch { return { owner: 'FELLOWSHIPS', schemaVersion: 1, state: 'INVALID', dryRun: handoff.execution.dryRun, payload: null }; }
  }
}
export interface ReviewedFellowshipBatch { batchId: string; handoffs: UniversalImportHandoff[]; reason: string; reviewedHash: string }
export interface FellowshipBatchResult { replay: boolean; results: Array<{ code: string; fellowshipId: string }> }
export interface IReviewedFellowshipBatchGateway {
  screen(batch: ReviewedFellowshipBatch): Promise<void>;
  apply(batch: ReviewedFellowshipBatch, context: AtomicPersistenceContext, actorId: string): Promise<FellowshipBatchResult>;
}
export const reviewedFellowshipBatchHash = (batch: ReviewedFellowshipBatch) => hash({ batchId: batch.batchId, handoffs: batch.handoffs, reason: batch.reason });
export class ReviewedFellowshipBatchUseCase {
  constructor(private readonly gateway: IReviewedFellowshipBatchGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  async execute(batch: ReviewedFellowshipBatch, context: AtomicMutationRequestContext): Promise<FellowshipBatchResult> {
    if (!context.actorId?.trim()) throw Error('FELLOWSHIP_ACTOR_REQUIRED');
    if (!batch.batchId || !batch.handoffs.length || batch.handoffs.length > 25 || batch.reason.trim().length < 10 || batch.reason.length > 1000 || batch.reviewedHash !== reviewedFellowshipBatchHash(batch)) throw Error('FELLOWSHIP_BATCH_REVIEW_INVALID');
    const consumer = new FellowshipImportScreeningConsumer(), codes = new Set<string>();
    for (const handoff of batch.handoffs) {
      const result = await consumer.accept(handoff), code = result.payload?.classificationCode;
      if (result.state !== 'NEEDS_OWNER_REVIEW' || result.dryRun || !code || codes.has(code) || !result.origin?.batchId || !result.origin.sourceDedupKey || !result.source?.artifactId || !/^[a-f0-9]{64}$/.test(result.source.sha256 ?? '')) throw Error('FELLOWSHIP_SCREENING_REQUIRED');
      codes.add(code);
    }
    await this.gateway.screen(batch);
    return this.atomic.execute({ domain: 'MAJORS', aggregateType: 'REVIEWED_FELLOWSHIP_BATCH', aggregateId: batch.batchId,
      action: 'REVIEWED_FELLOWSHIP_BATCH_IMPORTED', context, auditMetadata: { reviewedHash: batch.reviewedHash, reason: batch.reason, rows: batch.handoffs.length },
      outbox: { payload: { batchId: batch.batchId, reviewedHash: batch.reviewedHash, rows: batch.handoffs.length } },
    }, tx => this.gateway.apply(batch, tx, context.actorId), result => !result.replay);
  }
}
