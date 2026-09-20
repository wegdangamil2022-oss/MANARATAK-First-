import {
  IUniversityRepository,
  PaginatedUniversityResult,
  PublicUniversityDto,
  PublicUniversityFilters,
  sanitizeUniversityOptionalFields,
  UniversityDto,
  UniversityStatus
} from '@manaratak/domain';

export class PublicUniversityUseCases {
  constructor(private readonly repository: IUniversityRepository) {}

  public async listUniversities(filters: PublicUniversityFilters): Promise<PaginatedUniversityResult<PublicUniversityDto>> {
    const paginated = await this.repository.listPublished(filters);

    return {
      ...paginated,
      data: paginated.data.map(this.mapToPublicDto)
    };
  }

  public async getUniversity(slug: string): Promise<PublicUniversityDto> {
    const university = await this.repository.findBySlug(slug);

    if (!university || university.status !== UniversityStatus.PUBLISHED) {
      throw new Error('University not found');
    }

    return this.mapToPublicDto(university);
  }

  private mapToPublicDto(university: UniversityDto): PublicUniversityDto {
    const {
      id,
      canonicalDedupKey,
      sourceImportRecordId,
      status,
      completenessStatus,
      createdAt,
      optionalFields,
      sourceRecords,
      translations,
      localizedTexts,
      localizedNames,
      ...publicData
    } = university;

    const activeOnly = (items: unknown[] | undefined): unknown[] | undefined =>
      Array.isArray(items)
        ? items.filter((item) => !item || typeof item !== 'object' || !('status' in item) || (item as { status?: string }).status === 'ACTIVE')
        : items;

    return {
      ...sanitizeUniversityOptionalFields(optionalFields),
      ...publicData,
      campuses: activeOnly(university.campuses),
      organizationUnits: activeOnly(university.organizationUnits),
      academicPrograms: (university.academicPrograms ?? [])
        .filter((program) => program.status === 'ACTIVE')
        .map((program) => ({
          ...program,
          admissionRequirements: (program.admissionRequirements ?? []).filter((requirement) => requirement.status === 'ACTIVE'),
        })),
      admissionRequirements: activeOnly(university.admissionRequirements as unknown[] | undefined),
    } as PublicUniversityDto;
  }
}
