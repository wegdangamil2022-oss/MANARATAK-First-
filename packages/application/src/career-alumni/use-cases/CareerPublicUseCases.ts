import type { CareerJobFilters, ICareerReferenceGateway, ICareerRepository, PublicCareerJobPostingDto, CareerJobPostingDto } from '@manaratak/domain';
import { careerJobOpen, careerPublicMetadata, careerRecord, publishedCareerJob } from '../CareerPolicy';
export interface CareerPublicFilters extends Omit<CareerJobFilters, 'status'> { country?: string; city?: string; }
export class CareerPublicUseCases {
  constructor(private readonly repository: ICareerRepository, private readonly references: ICareerReferenceGateway) {}
  async listPublishedJobs(filters: CareerPublicFilters) {
    const canonical = { ...filters };
    delete canonical.country; delete canonical.city;
    if (!canonical.countryReferenceId && filters.country) canonical.countryReferenceId = (await this.references.resolveCountryReference(filters.country)).id;
    if (!canonical.cityReferenceId && filters.city) canonical.cityReferenceId = (await this.references.resolveCityReference(filters.city, canonical.countryReferenceId)).id;
    const page = await this.repository.listPublishedJobs({ ...canonical, limit: Math.min(filters.limit || 20, 50) });
    return { ...page, data: await Promise.all(page.data.filter(careerJobOpen).map(job => this.project(job, filters.locale))) };
  }
  async getPublishedJobBySlug(slug: string, locale?: 'ar' | 'en') {
    const job = await this.repository.findJobBySlug(slug);
    if (!careerJobOpen(job)) throw new Error('CAREER_JOB_NOT_FOUND');
    return this.project(job!, locale);
  }
  private async project(raw: CareerJobPostingDto, locale: 'ar' | 'en' = 'ar'): Promise<PublicCareerJobPostingDto> {
    const job = publishedCareerJob(raw), employer = raw.employer;
    const candidate = careerRecord(careerRecord(job.metadata?.localizedContent)[locale]);
    const localized = typeof candidate.title==='string' && candidate.title.trim() && typeof candidate.description==='string' && candidate.description.trim() ? candidate : {};
    const geography = await this.references.displayGeography?.(job.countryReferenceId, job.cityReferenceId, locale);
    return {
      id: job.id, publicId: job.publicId, slug: job.slug, title: localized.title || job.title,
      description: localized.description || job.description, opportunityType: job.opportunityType, employmentType: job.employmentType,
      jobCategory: job.jobCategory, countryReferenceId: job.countryReferenceId, cityReferenceId: job.cityReferenceId,
      country: geography?.country || job.country, city: geography?.city || job.city,
      employerId: job.employerId, applicationDeadline: job.applicationDeadline, externalPostingUrl: job.externalPostingUrl,
      salaryRange: job.salaryRange && /^\d{1,20}$/.test(String(job.salaryRange.minMinorUnits)) && /^\d{1,20}$/.test(String(job.salaryRange.maxMinorUnits)) ? {
        minMinorUnits: job.salaryRange.minMinorUnits, maxMinorUnits: job.salaryRange.maxMinorUnits,
        currencyCode: job.salaryRange.currencyCode, scale: job.salaryRange.scale, period: job.salaryRange.period, basis: job.salaryRange.basis,
      } : null, requiredSkills: job.requiredSkills, educationRequirement: job.educationRequirement,
      languageRequirements: job.languageRequirements, remoteOption: job.remoteOption, updatedAt: job.updatedAt,
      metadata: careerPublicMetadata(job.metadata),
      employer: employer ? { id: employer.id, publicId: employer.publicId, slug: employer.slug, displayName: employer.displayName,
        employerType: employer.employerType, industry: employer.industry, country: employer.country, city: employer.city,
        websiteUrl: employer.websiteUrl, description: employer.description } : undefined,
    };
  }
}
