import {
  IUniversityRepository,
  PaginatedUniversityResult,
  PublicUniversityDto,
  PublicUniversityFilters,
  UniversityStatus,
} from '@manaratak/domain';
import { DEFAULT_LOCALE, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';

export class LocalizedPublicUniversityUseCases {
  constructor(
    private readonly repository: IUniversityRepository,
    private readonly projection = new ApplicationLocaleProjectionService(),
  ) {}

  public async listUniversities(
    filters: PublicUniversityFilters,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PaginatedUniversityResult<PublicUniversityDto>> {
    const paginated = await this.repository.listPublished(filters);
    return {
      ...paginated,
      data: paginated.data.map((university) => this.projection.projectUniversity(university, locale)),
    };
  }

  public async getUniversity(
    slug: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PublicUniversityDto> {
    const university = await this.repository.findBySlug(slug);
    if (!university || university.status !== UniversityStatus.PUBLISHED) {
      throw new Error('University not found');
    }
    return this.projection.projectUniversity(university, locale);
  }
}
