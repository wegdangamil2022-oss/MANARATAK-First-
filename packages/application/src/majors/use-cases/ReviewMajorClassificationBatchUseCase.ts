import type { AtomicPersistenceContext } from '@manaratak/domain';
import { taxonomyRevisionHash } from '../../academic-taxonomy/services/TaxonomyRevisionHash';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface MajorClassificationReviewBatch {
  batchId: string; reason: string; reviewedHash: string;
  rows: Array<{ code: string; profileId: string; versionId: string; expectedRevision: string;
    canonicalName: string; academicFieldId: string; disciplineId: string; rationale: string }>;
}
export const majorClassificationReviewHash = (input: MajorClassificationReviewBatch) =>
  taxonomyRevisionHash({ batchId: input.batchId, reason: input.reason, rows: input.rows });
export interface IMajorClassificationReviewGateway {
  apply(input: MajorClassificationReviewBatch, tx: AtomicPersistenceContext, actorId: string): Promise<{ reviewed: number; replay: boolean }>;
}
/** An explicit editorial classification decision, separate from immutable source content. */
export class ReviewMajorClassificationBatchUseCase {
  constructor(private readonly gateway: IMajorClassificationReviewGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  execute(input: MajorClassificationReviewBatch, context: AtomicMutationRequestContext) {
    if (!context.actorId?.trim() || !input.batchId || input.rows.length < 1 || input.rows.length > 100 ||
      input.reason.trim().length < 10 || input.reason.length > 1000 || input.reviewedHash !== majorClassificationReviewHash(input) ||
      new Set(input.rows.map(r => r.profileId)).size !== input.rows.length || input.rows.some(r =>
        !/^(MJR|MAS|DOC)-\d{4}$/.test(r.code) || !r.profileId || !r.versionId || !r.academicFieldId || !r.disciplineId ||
        !r.canonicalName.trim() || r.rationale.trim().length < 10 || r.rationale.length > 1000 || !Number.isFinite(Date.parse(r.expectedRevision)))) {
      throw Error('MAJOR_CLASSIFICATION_REVIEW_INVALID');
    }
    return this.atomic.execute({ domain: 'MAJORS', aggregateType: 'CLASSIFICATION_REVIEW', aggregateId: input.batchId,
      action: 'MAJOR_CLASSIFICATION_REFERENCES_REVIEWED', context,
      auditMetadata: { reviewedHash: input.reviewedHash, reason: input.reason, profiles: input.rows.map(r => r.profileId) },
      outbox: { payload: { batchId: input.batchId, reviewedHash: input.reviewedHash, rows: input.rows.length } },
    }, tx => this.gateway.apply(input, tx, context.actorId), result => !result.replay);
  }
}
