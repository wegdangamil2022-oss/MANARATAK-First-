import type { IScholarshipRepository } from '@manaratak/domain';
import type {
  IScholarshipHandoffDuplicateLookup,
  ScholarshipDuplicateScreeningMatch,
} from '../handoff';

/**
 * Read-only adapter for WP12-5 duplicate screening.
 * It never creates, updates, merges, or publishes a Scholarship.
 */
export class ScholarshipRepositoryDuplicateLookup implements IScholarshipHandoffDuplicateLookup {
  constructor(private readonly repository: IScholarshipRepository) {}

  async findMatchesByDedupKey(key: string): Promise<readonly ScholarshipDuplicateScreeningMatch[]> {
    const scholarship = await this.repository.findByDedupKey(key);
    if (!scholarship) return [];
    return [{
      id: scholarship.id,
      publicId: scholarship.publicId,
      displayName: scholarship.displayName,
      canonicalDedupKey: scholarship.canonicalDedupKey,
      sourceImportRecordId: scholarship.sourceImportRecordId ?? null,
      countryReferenceId: scholarship.countryReferenceId ?? null,
      countrySourceLabel: scholarship.countrySourceLabel ?? null,
      officialSourceUrl: scholarship.officialSourceUrl ?? scholarship.sourceUrl ?? scholarship.officialWebsite ?? null,
    }];
  }
}
