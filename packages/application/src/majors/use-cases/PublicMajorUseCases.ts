import {
  IMajorRepository,
  MajorDto,
  MajorPhaseLinkingService,
  MajorStatus,
  PaginatedMajorResult,
  PublicMajorDto,
  PublicMajorFilters
} from '@manaratak/domain';

export class PublicMajorUseCases {
  constructor(private readonly repository: IMajorRepository) {}

  public async listMajors(filters: PublicMajorFilters): Promise<PaginatedMajorResult<PublicMajorDto>> {
    const paginated = await this.repository.listPublished(filters);

    return {
      ...paginated,
      data: paginated.data.map(this.mapToPublicDto)
    };
  }

  public async getMajor(slug: string, options?: { degreeLevel?: string; profileCode?: string }): Promise<PublicMajorDto> {
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

    let publicMajor = this.mapToPublicDto(major);
    if (targetProfile) {
      publicMajor = {
        ...publicMajor,
        publicId: targetProfile.code || publicMajor.publicId,
        profiles: [targetProfile],
        currentPublishedVersionId: targetProfile.currentPublishedVersionId,
        displayName: targetProfile.displayName || publicMajor.displayName,
        localizedNameAr: targetProfile.localizedNameAr || publicMajor.localizedNameAr,
        localizedNameEn: targetProfile.localizedNameEn || publicMajor.localizedNameEn,
        degreeLevel: targetProfile.level,
        classificationCode: targetProfile.code || publicMajor.classificationCode,
      };
    }

    if (!this.repository.listContentSections) {
      return publicMajor;
    }

    const sections = await this.repository.listContentSections(major.id, {
      profileId: targetProfile?.id,
      publishedOnly: true,
    });
    return {
      ...publicMajor,
      contentSections: sections.map((section) => ({
        sectionKey: section.sectionKey,
        title: section.title,
        content: section.content,
        reviewStatus: section.reviewStatus,
        metadata: section.metadata,
      })),
    };
  }

  private mapToPublicDto(major: MajorDto): PublicMajorDto {
    const {
      id: _id,
      canonicalDedupKey: _canonicalDedupKey,
      sourceImportRecordId: _sourceImportRecordId,
      status: _status,
      completenessStatus: _completenessStatus,
      createdAt: _createdAt,
      optionalFields,
      ...publicData
    } = major;

    return {
      ...(optionalFields || {}),
      ...publicData,
      phaseLinks: MajorPhaseLinkingService.buildLinks(major),
    };
  }
}
