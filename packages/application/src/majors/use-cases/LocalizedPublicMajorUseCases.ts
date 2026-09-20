import {
  IMajorRepository,
  MajorStatus,
  PaginatedMajorResult,
  PublicMajorDto,
  PublicMajorFilters,
} from '@manaratak/domain';
import { DEFAULT_LOCALE, type SupportedLocale } from '@manaratak/shared';
import { ApplicationLocaleProjectionService } from '../../localization/ApplicationLocaleProjectionService';

export class LocalizedPublicMajorUseCases {
  constructor(
    private readonly repository: IMajorRepository,
    private readonly projection = new ApplicationLocaleProjectionService(),
  ) {}

  public async listMajors(
    filters: PublicMajorFilters,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PaginatedMajorResult<PublicMajorDto>> {
    const paginated = await this.repository.listPublished(filters);
    return {
      ...paginated,
      data: paginated.data.map((major) => this.projection.projectMajor(major, [], locale)),
    };
  }

  public async getMajor(
    slug: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
  ): Promise<PublicMajorDto> {
    const major = await this.repository.findBySlug(slug);
    if (!major || major.status !== MajorStatus.PUBLISHED) {
      throw new Error('Major not found');
    }
    const sections = this.repository.listContentSections
      ? await this.repository.listContentSections(major.id)
      : [];
    return this.projection.projectMajor(major, sections, locale);
  }
}
