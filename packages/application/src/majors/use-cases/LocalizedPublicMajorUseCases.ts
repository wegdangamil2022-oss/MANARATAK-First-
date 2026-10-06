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
    options?: { degreeLevel?: string; profileCode?: string },
  ): Promise<PublicMajorDto> {
    const major = await this.repository.findBySlug(slug);
    if (!major || major.status !== MajorStatus.PUBLISHED) {
      throw new Error('Major not found');
    }

    const profiles = major.profiles ?? [];
    let targetProfile = options?.profileCode
      ? profiles.find((p) => p.code === options.profileCode)
      : options?.degreeLevel
      ? profiles.find((p) => p.level?.toUpperCase() === options.degreeLevel?.toUpperCase())
      : undefined;

    if (targetProfile && targetProfile.status !== MajorStatus.PUBLISHED) {
      throw new Error('Major level profile not published');
    }

    const sections = this.repository.listContentSections
      ? await this.repository.listContentSections(major.id, {
          profileId: targetProfile?.id,
          publishedOnly: true,
        })
      : [];

    let projected = this.projection.projectMajor(major, sections, locale);
    if (targetProfile) {
      projected = {
        ...projected,
        displayName: targetProfile.displayName || projected.displayName,
        localizedNameAr: targetProfile.localizedNameAr || projected.localizedNameAr,
        localizedNameEn: targetProfile.localizedNameEn || projected.localizedNameEn,
        degreeLevel: targetProfile.level,
        classificationCode: targetProfile.code || projected.classificationCode,
      };
    }
    return projected;
  }
}
