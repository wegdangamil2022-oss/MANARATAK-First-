import type { ImportRecordDto } from '@manaratak/domain';

export type CoursePromotionResult =
  | { type: 'CREATED'; courseId: string }
  | { type: 'DUPLICATE'; existingId: string }
  | { type: 'REJECTED'; reason: string }
  | { type: 'FAILED'; error: string };

/**
 * @deprecated P5 source closure disables the pre-provider-registry promotion path.
 * Production transfer must use CourseImportCoordinator so provider identity, canonical
 * deduplication, approved-domain URL safety, provenance and atomic handoff are enforced.
 */
export class CourseImportPromotionUseCase {
  public constructor(..._legacyDependencies: unknown[]) {}

  public async promote(_record: ImportRecordDto): Promise<CoursePromotionResult> {
    return {
      type: 'REJECTED',
      reason: 'COURSE_IMPORT_LEGACY_PROMOTION_DISABLED_USE_COURSE_IMPORT_COORDINATOR',
    };
  }
}
