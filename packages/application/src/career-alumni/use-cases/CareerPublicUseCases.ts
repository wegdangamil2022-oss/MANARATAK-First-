import {
  CareerEmployerStatus,
  CareerJobFilters,
  CareerJobPostingDto,
  CareerJobStatus,
  ICareerReferenceGateway,
  ICareerRepository,
  PaginatedCareerResult,
} from '@manaratak/domain';

export interface CareerPublicFilters extends Omit<CareerJobFilters, 'status'> {
  country?: string;
  city?: string;
}

export class CareerPublicUseCases {
  constructor(
    private readonly repository: ICareerRepository,
    private readonly references: ICareerReferenceGateway,
  ) {}

  public async listPublishedJobs(filters: CareerPublicFilters): Promise<PaginatedCareerResult<CareerJobPostingDto>> {
    const canonical: Omit<CareerJobFilters, 'status'> = { ...filters };
    delete (canonical as CareerPublicFilters).country;
    delete (canonical as CareerPublicFilters).city;
    if (!canonical.countryReferenceId && filters.country)
      canonical.countryReferenceId = (await this.references.resolveCountryReference(filters.country)).id;
    if (!canonical.cityReferenceId && filters.city)
      canonical.cityReferenceId = (await this.references.resolveCityReference(filters.city, canonical.countryReferenceId)).id;
    return this.repository.listPublishedJobs({ ...canonical, limit: Math.min(filters.limit || 20, 50), cursor: filters.cursor });
  }

  public async getPublishedJobBySlug(slug: string): Promise<CareerJobPostingDto> {
    const job = await this.repository.findJobBySlug(slug);
    const expired = job?.applicationDeadline
      ? new Date(job.applicationDeadline).getTime() <= Date.now()
      : false;
    if (
      !job
      || job.status !== CareerJobStatus.PUBLISHED
      || job.employer?.verificationStatus !== CareerEmployerStatus.VERIFIED
      || expired
    )
      throw new Error('Career opportunity not found');
    return job;
  }
}
