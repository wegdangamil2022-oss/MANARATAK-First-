import { CareerJobStatus, CareerOpportunityType, EmploymentType } from '../enums';
import { CareerEmployerDto } from './CareerEmployer';

export interface CareerJobPostingDto {
  id: string;
  publicId: string;
  slug: string;
  canonicalTitle: string;
  canonicalDedupKey: string;
  title: string;
  opportunityType: CareerOpportunityType;
  employmentType: EmploymentType;
  jobCategory: string;
  description: string;
  countryReferenceId: string;
  cityReferenceId?: string | null;
  /** Compatibility/source labels only. */
  country?: string | null;
  city?: string | null;
  status: CareerJobStatus;
  employerId: string;
  employer?: CareerEmployerDto;
  recruiterContactId?: string | null;
  applicationDeadline?: Date | string | null;
  externalPostingUrl?: string | null;
  salaryRange?: Record<string, unknown> | null;
  requiredSkills?: string[] | null;
  educationRequirement?: string | null;
  languageRequirements?: string[] | null;
  remoteOption: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  version: number;
}

export interface CreateCareerJobPostingDto extends Omit<CareerJobPostingDto, 'id' | 'createdAt' | 'updatedAt' | 'employer' | 'version'> {}

export interface UpdateCareerJobPostingDto {
  title?: string;
  opportunityType?: CareerOpportunityType;
  employmentType?: EmploymentType;
  jobCategory?: string;
  description?: string;
  countryReferenceId?: string;
  cityReferenceId?: string | null;
  country?: string | null;
  city?: string | null;
  status?: CareerJobStatus;
  recruiterContactId?: string | null;
  applicationDeadline?: Date | string | null;
  externalPostingUrl?: string | null;
  salaryRange?: Record<string, unknown> | null;
  requiredSkills?: string[] | null;
  educationRequirement?: string | null;
  languageRequirements?: string[] | null;
  remoteOption?: boolean;
  metadata?: Record<string, unknown> | null;
}

export type CareerJobRepositoryUpdateDto = UpdateCareerJobPostingDto & { canonicalTitle?: string; canonicalDedupKey?: string };

export interface CareerJobFilters {
  countOnly?: boolean;
  status?: CareerJobStatus;
  opportunityType?: CareerOpportunityType;
  employmentType?: EmploymentType;
  jobCategory?: string;
  countryReferenceId?: string;
  cityReferenceId?: string;
  employerId?: string;
  search?: string;
  remoteOption?: boolean;
  locale?: 'ar' | 'en';
  page?: number;
  pageSize?: number;
  cursor?: string;
  limit?: number;
}

export interface PaginatedCareerResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export type PublicCareerJobPostingDto = Pick<CareerJobPostingDto,
  'id' | 'publicId' | 'slug' | 'title' | 'opportunityType' | 'employmentType' | 'jobCategory' |
  'description' | 'countryReferenceId' | 'cityReferenceId' | 'country' | 'city' | 'employerId' |
  'applicationDeadline' | 'externalPostingUrl' | 'salaryRange' | 'requiredSkills' |
  'educationRequirement' | 'languageRequirements' | 'remoteOption' | 'updatedAt'> & {
    employer?: Pick<CareerEmployerDto, 'id' | 'publicId' | 'slug' | 'displayName' | 'employerType' | 'industry' | 'country' | 'city' | 'websiteUrl' | 'description'>;
    metadata: Record<string, unknown>;
  };
