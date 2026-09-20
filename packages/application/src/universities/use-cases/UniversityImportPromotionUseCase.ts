import { IUniversityRepository } from '@manaratak/domain';

export type UniversityPromotionResult = {
  type: 'REJECTED';
  reason: 'UNIVERSITY_BULK_IMPORT_BLOCKED_PENDING_GOOGLE_STUDIO';
};

/**
 * Legacy compatibility boundary. University writes remain disabled until the
 * WP10 safety gate, database recovery, migrations, dry run, and approval close.
 */
export class UniversityImportPromotionUseCase {
  constructor(_repository: IUniversityRepository) {}

  public async promote(_record: unknown): Promise<UniversityPromotionResult> {
    return {
      type: 'REJECTED',
      reason: 'UNIVERSITY_BULK_IMPORT_BLOCKED_PENDING_GOOGLE_STUDIO',
    };
  }
}
