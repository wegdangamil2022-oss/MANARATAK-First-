import type { AtomicPersistenceContext } from '@manaratak/domain';
import { taxonomyRevisionHash } from '../../academic-taxonomy/services/TaxonomyRevisionHash';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export function majorSourceAcademicContext(blocks: unknown): string | undefined {
  if (!Array.isArray(blocks) || typeof blocks[0]?.content !== 'string') return undefined;
  const values = [...blocks[0].content.matchAll(/^\|\s*(?:الكلية|المجال الأكاديمي|الكلية أو المجال الأكاديمي)\s*\|\s*([^|]+)\|/gm)]
    .map(match => match[1].trim());
  return values.length && new Set(values).size === 1 ? values[0] : undefined;
}
export interface MajorSourceContextReview {
  batchId: string; reason: string; reviewedHash: string;
  rows: Array<{ code: string; profileId: string; versionId: string; expectedRevision: string; sourceContext: string; academicFieldId: string }>;
}
export const majorSourceContextReviewHash = (input: MajorSourceContextReview) => taxonomyRevisionHash({ batchId: input.batchId, reason: input.reason, rows: input.rows });
export interface IMajorSourceContextReviewGateway {
  apply(input: MajorSourceContextReview, tx: AtomicPersistenceContext, actorId: string): Promise<{ reviewed: number; replay: boolean }>;
}
/** Explicit post-import reference review. Source snapshots are immutable. */
export class ReviewMajorSourceContextUseCase {
  constructor(private readonly gateway: IMajorSourceContextReviewGateway, private readonly atomic: AtomicDomainMutationCoordinator) {}
  execute(input: MajorSourceContextReview, context: AtomicMutationRequestContext) {
    if (!context.actorId?.trim() || !input.batchId || input.rows.length < 1 || input.rows.length > 25 ||
      input.reason.trim().length < 10 || input.reason.length > 1000 || input.reviewedHash !== majorSourceContextReviewHash(input) ||
      new Set(input.rows.map(r => r.profileId)).size !== input.rows.length || input.rows.some(r =>
        !/^(MJR|MAS|DOC)-\d{4}$/.test(r.code) || !r.profileId || !r.versionId || !r.academicFieldId ||
        !r.sourceContext.trim() || r.sourceContext.length > 500 || !Number.isFinite(Date.parse(r.expectedRevision)))) throw Error('MAJOR_CONTEXT_REVIEW_INVALID');
    return this.atomic.execute({ domain: 'MAJORS', aggregateType: 'SOURCE_CONTEXT_REVIEW', aggregateId: input.batchId,
      action: 'MAJOR_SOURCE_CONTEXT_REFERENCES_REVIEWED', context,
      auditMetadata: { reviewedHash: input.reviewedHash, reason: input.reason, profiles: input.rows.map(r => r.profileId) },
      outbox: { payload: { batchId: input.batchId, reviewedHash: input.reviewedHash, rows: input.rows.length } },
    }, tx => this.gateway.apply(input, tx, context.actorId), result => !result.replay);
  }
}
