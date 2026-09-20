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

  public async getMajor(slug: string): Promise<PublicMajorDto> {
    const major = await this.repository.findBySlug(slug);

    if (!major || major.status !== MajorStatus.PUBLISHED) {
      throw new Error('Major not found');
    }

    const publicMajor = this.mapToPublicDto(major);
    if (!this.repository.listContentSections) {
      return publicMajor;
    }

    const sections = await this.repository.listContentSections(major.id);
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
