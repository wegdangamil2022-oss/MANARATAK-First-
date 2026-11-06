import type { AtomicPersistenceContext, UniversalImportHandoff } from '@manaratak/domain';
import { MajorImportScreeningConsumer } from '../services/MajorImportScreeningConsumer';
import { referenceImportPayloadDigest } from '../../reference-data/services/ReferenceDataScreeningHandoffConsumer';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface ReviewedMajorBatch {
  batchId: string;
  handoffs: UniversalImportHandoff[];
  reason: string;
  reviewedHash: string;
}
export interface MajorBatchResult { replay: boolean; results: Array<{ type: 'CREATED' | 'VERSION_CREATED'; code: string; majorId: string; profileId: string; existingId?: string; versionNumber?: number }> }
export interface IReviewedMajorBatchGateway {
  screen(batch: ReviewedMajorBatch): Promise<void>;
  apply(batch: ReviewedMajorBatch, context: AtomicPersistenceContext, actorId: string): Promise<MajorBatchResult>;
}
export function reviewedMajorBatchHash(batch: Omit<ReviewedMajorBatch, 'reviewedHash'> | ReviewedMajorBatch) {
  return referenceImportPayloadDigest({ batchId: batch.batchId, handoffs: batch.handoffs, reason: batch.reason });
}
/** Bounded operator composition. It does not approve publication or invent source content. */
export class ReviewedMajorBatchUseCase {
  constructor(private readonly gateway: IReviewedMajorBatchGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  async execute(batch: ReviewedMajorBatch, context: AtomicMutationRequestContext): Promise<MajorBatchResult> {
    if (!context.actorId?.trim()) throw Error('MAJOR_BATCH_ACTOR_REQUIRED');
    if (!batch.batchId || !batch.handoffs.length || batch.handoffs.length > 25 || batch.reason.trim().length < 10 || batch.reason.length > 1000 ||
      batch.reviewedHash !== reviewedMajorBatchHash(batch)) throw Error('MAJOR_BATCH_REVIEW_INVALID');
    const consumer = new MajorImportScreeningConsumer(), codes = new Set<string>();
    for (const handoff of batch.handoffs) {
      const screened = await consumer.accept(handoff);
      const code = String(screened.payload?.classificationCode ?? '');
      if (screened.state !== 'NEEDS_OWNER_REVIEW' || screened.dryRun !== false || !/^(MJR|MAS|DOC)-\d{4}$/.test(code) ||
        !screened.origin?.batchId || !screened.origin.sourceDedupKey || !screened.source?.artifactId ||
        !/^[a-f0-9]{64}$/.test(screened.source.sha256 ?? '') || codes.has(code)) throw Error('MAJOR_BATCH_SCREENING_INVALID');
      codes.add(code);
    }
    await this.gateway.screen(batch);
    return this.atomic.execute({ domain: 'MAJORS', aggregateType: 'REVIEWED_MAJOR_BATCH', aggregateId: batch.batchId,
      action: 'REVIEWED_MAJOR_BATCH_IMPORTED', context,
      auditMetadata: { reviewedHash: batch.reviewedHash, reason: batch.reason, rows: batch.handoffs.length },
      outbox: { payload: { batchId: batch.batchId, reviewedHash: batch.reviewedHash, rows: batch.handoffs.length } },
    }, tx => this.gateway.apply(batch, tx, context.actorId), result => !result.replay);
  }
}
