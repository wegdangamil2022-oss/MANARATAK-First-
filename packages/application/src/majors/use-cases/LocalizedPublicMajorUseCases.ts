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
    if (!major) {
      throw new Error('Major not found');
    }

    const profiles = major.profiles ?? [];
    let targetProfile = options?.profileCode
      ? profiles.find((p) => p.code === options.profileCode)
      : options?.degreeLevel
      ? profiles.find((p) => p.level?.toUpperCase() === options.degreeLevel?.toUpperCase())
      : profiles.find(p => p.status === MajorStatus.PUBLISHED && p.currentPublishedVersionId);

    if ((options?.profileCode || options?.degreeLevel || profiles.length > 0) && !targetProfile) throw new Error('Major level profile not published');
    if (!profiles.length && major.status !== MajorStatus.PUBLISHED) throw new Error('Major not found');

    if (targetProfile && (targetProfile.status !== MajorStatus.PUBLISHED || !targetProfile.currentPublishedVersionId)) {
      throw new Error('Major level profile not published');
    }

    const sections = this.repository.listContentSections
      ? await this.repository.listContentSections(major.id, {
          profileId: targetProfile?.id,
          publishedOnly: true,
        })
      : [];

    const scopedMajor = targetProfile ? {
      ...major, profiles: [targetProfile], publicId: targetProfile.code || major.publicId,
      degreeLevel: targetProfile.level, classificationCode: targetProfile.code || major.classificationCode,
      currentPublishedVersionId: targetProfile.currentPublishedVersionId,
      displayName: targetProfile.displayName || major.displayName,
      localizedNameAr: targetProfile.localizedNameAr || major.localizedNameAr,
      localizedNameEn: targetProfile.localizedNameEn || major.localizedNameEn,
      optionalFields: { ...major.optionalFields, degreeLevel: targetProfile.level,
        classificationCode: targetProfile.code || major.classificationCode },
    } : major;
    const projected = this.projection.projectMajor(scopedMajor, sections, locale);

    return projected;
  }
}
