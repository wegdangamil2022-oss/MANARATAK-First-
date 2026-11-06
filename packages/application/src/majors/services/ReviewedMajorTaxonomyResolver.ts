import type { MajorImportPayload } from '@manaratak/domain';
import { AcademicTaxonomyResolver, TaxonomyResolutionOutcome, type TaxonomyResolutionResult } from './AcademicTaxonomyResolver';

/** Source imports may carry reviewed references; a keyword suggestion is never approval. */
export class ReviewedMajorTaxonomyResolver extends AcademicTaxonomyResolver {
  override resolve(payload: MajorImportPayload): TaxonomyResolutionResult {
    if (payload.academicFieldId || payload.disciplineId) return super.resolve(payload);
    return {
      outcome: TaxonomyResolutionOutcome.REVIEW_REQUIRED,
      confidence: 0,
      reason: 'Source classification retained. Canonical mapping requires an explicit reviewed reference.',
    };
  }
}
