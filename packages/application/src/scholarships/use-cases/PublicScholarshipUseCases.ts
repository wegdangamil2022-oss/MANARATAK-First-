import {
  IScholarshipRepository,
  PublicScholarshipFilters,
  PublicScholarshipDto,
  PaginatedResult,
} from '@manaratak/domain';
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';

export class PublicScholarshipUseCases {
  private readonly localeProjection = new ApplicationLocaleProjectionService();

  constructor(private readonly repository: IScholarshipRepository) {}

  public async listScholarships(
    filters: PublicScholarshipFilters,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PaginatedResult<PublicScholarshipDto>> {
    const paginated = await this.repository.listPublished(filters);
    return {
      ...paginated,
      data: paginated.data.map((scholarship) => this.mapToPublicDto(scholarship, locale)),
    };
  }

  public async getScholarship(
    slug: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PublicScholarshipDto> {
    const scholarship = await this.repository.findPublishedBySlug(slug);
    if (!scholarship) throw new Error('Scholarship not found');
    return this.mapToPublicDto(scholarship, locale);
  }

  private mapToPublicDto(scholarship: any, locale: SupportedLocale): PublicScholarshipDto {
    const localizedNames = this.localeValues(scholarship.localizedNames);
    const sourceLocale = isSupportedLocale(scholarship.sourceLocale) ? scholarship.sourceLocale : null;
    const displayName = this.localeProjection.resolveValue<string>({
      requestedLocale: locale,
      sourceLocale,
      sourceValue: scholarship.displayName,
      localizedValues: localizedNames,
    }).value ?? scholarship.displayName;

    const {
      id, canonicalDedupKey, sourceImportRecordId, status, completenessStatus,
      verificationStatus, publicationStatus, createdAt, optionalFields, localizedNames: _localizedNames,
      versions, sponsorContext, applicationCycles,
      ...publicData
    } = scholarship;

    // Canonical fields always win. Legacy optionalFields and alternate-language payloads
    // are never spread into one public page response. Only the requested display locale is projected.
    return { ...publicData, displayName } as PublicScholarshipDto;
  }

  private localeValues(value: unknown): Partial<Record<SupportedLocale, string>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: Partial<Record<SupportedLocale, string>> = {};
    for (const [locale, text] of Object.entries(value as Record<string, unknown>)) {
      if (!isSupportedLocale(locale) || typeof text !== 'string' || !text.trim()) continue;
      result[locale] = text.trim();
    }
    return result;
  }
}
