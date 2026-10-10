import {
  IUniversityRepository,
  PaginatedUniversityResult,
  PublicUniversityDto,
  PublicUniversityFilters,
  UniversityStatus,
} from '@manaratak/domain';
import { projectPublicUniversity } from './UniversityPublicProjection';

export class PublicUniversityUseCases {
  constructor(private readonly repository: IUniversityRepository) {}

  public async listUniversities(filters: PublicUniversityFilters): Promise<PaginatedUniversityResult<PublicUniversityDto>> {
    const paginated = await this.repository.listPublished(filters);
    return { ...paginated, data: paginated.data.map(projectPublicUniversity) };
  }

  public async getUniversity(slug: string): Promise<PublicUniversityDto> {
    const university = await this.repository.findBySlug(slug);
    if (!university || university.status !== UniversityStatus.PUBLISHED) {
      throw new Error('University not found');
    }
    return projectPublicUniversity(university);
  }
}
