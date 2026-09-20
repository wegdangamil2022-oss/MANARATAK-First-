import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import { unicodeSlugSegment } from '../../canonicalization/UnicodeCanonicalization';
import { canonicalizeCareerIdentityText } from '../../canonicalization/OwnerDomainIdentityPolicies';
import { createHash, randomUUID } from 'node:crypto';
import {
  CareerEmployerDto,
  CareerEmployerFilters,
  CareerEmployerStatus,
  CareerJobFilters,
  CareerJobPostingDto,
  CareerJobStatus,
  CareerOpportunityType,
  CreateCareerEmployerDto,
  CreateCareerJobPostingDto,
  EmploymentType,
  ICareerReferenceGateway,
  ICareerRepository,
  PaginatedCareerResult,
  UpdateCareerJobPostingDto,
} from '@manaratak/domain';

export interface CreateEmployerInput {
  displayName: string;
  employerType: string;
  industry?: string | null;
  countryReferenceId?: string | null;
  cityReferenceId?: string | null;
  /** Compatibility input; resolved through Phase 7 before persistence. */
  country?: string | null;
  city?: string | null;
  websiteUrl?: string | null;
  logoAssetId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateJobInput {
  title: string;
  opportunityType: CareerOpportunityType;
  employmentType: EmploymentType;
  jobCategory: string;
  description: string;
  countryReferenceId?: string;
  cityReferenceId?: string | null;
  /** Compatibility input; resolved through Phase 7 before persistence. */
  country?: string | null;
  city?: string | null;
  employerId: string;
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

export class CareerAdminUseCases {
  constructor(
    private readonly repository: ICareerRepository,
    private readonly references: ICareerReferenceGateway,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}

  public async createEmployer(input: CreateEmployerInput): Promise<CareerEmployerDto> {
    const canonicalName = canonicalizeCareerIdentityText(input.displayName);
    if (!canonicalName) throw new Error('Employer displayName is required');
    await assertAssetReferenceUsable(this.assetReferences, input.logoAssetId, { purpose: 'CAREER_EMPLOYER_LOGO' });

    const countryReferenceId = await this.resolveOptionalCountry(input.countryReferenceId ?? input.country);
    if ((input.cityReferenceId || input.city) && !countryReferenceId) throw new Error('CAREER_CITY_REQUIRES_COUNTRY');
    const cityReferenceId = await this.resolveOptionalCity(input.cityReferenceId ?? input.city, countryReferenceId ?? undefined);
    const canonicalDedupKey = [canonicalName, countryReferenceId || 'GLOBAL', input.employerType].join('|');
    if (await this.repository.findEmployerByDedupKey(canonicalDedupKey))
      throw new Error('A matching recruitment employer already exists');

    const data: CreateCareerEmployerDto = {
      ...input,
      countryReferenceId,
      cityReferenceId,
      publicId: `career_emp_${randomUUID()}`,
      slug: `${unicodeSlugSegment(input.displayName)}-${shortHash(canonicalDedupKey)}`,
      canonicalName,
      canonicalDedupKey,
      verificationStatus: CareerEmployerStatus.UNVERIFIED,
    };
    return this.repository.createEmployer(data);
  }

  public async createJob(input: CreateJobInput): Promise<CareerJobPostingDto> {
    this.ensureJobRequired(input);
    const employer = await this.repository.findEmployerById(input.employerId);
    if (!employer) throw new Error('Recruitment employer not found');
    const countryReferenceId = await this.references.resolveCountryReference(
      input.countryReferenceId ?? input.country ?? '',
    );
    const cityReferenceId = input.cityReferenceId || input.city
      ? await this.references.resolveCityReference(input.cityReferenceId ?? input.city ?? '', countryReferenceId.id)
      : null;
    const canonicalTitle = canonicalizeCareerIdentityText(input.title);
    if (!canonicalTitle) throw new Error('Job title must contain at least one Unicode letter or number');
    const canonicalDedupKey = [
      canonicalTitle,
      input.employerId,
      countryReferenceId.id,
      cityReferenceId?.id || 'REMOTE_OR_GLOBAL',
      input.employmentType,
    ].join('|');
    if (await this.repository.findJobByDedupKey(canonicalDedupKey))
      throw new Error('A matching job posting already exists');

    const data: CreateCareerJobPostingDto = {
      ...input,
      countryReferenceId: countryReferenceId.id,
      cityReferenceId: cityReferenceId?.id ?? null,
      publicId: `career_job_${randomUUID()}`,
      slug: `${unicodeSlugSegment(`${input.title}-${employer.displayName}`)}-${shortHash(canonicalDedupKey)}`,
      canonicalTitle,
      canonicalDedupKey,
      status: CareerJobStatus.READY_TO_REVIEW,
      remoteOption: Boolean(input.remoteOption),
    };
    return this.repository.createJob(data);
  }

  public async listEmployers(filters: CareerEmployerFilters): Promise<PaginatedCareerResult<CareerEmployerDto>> {
    return this.repository.listEmployers({ ...filters, pageSize: Math.min(filters.pageSize || 50, 50) });
  }

  public async setEmployerStatus(id: string, status: CareerEmployerStatus, expectedVersion: number): Promise<CareerEmployerDto> {
    this.assertExpectedVersion(expectedVersion);
    const employer = await this.repository.findEmployerById(id);
    if (!employer) throw new Error('Recruitment employer not found');
    if (status === CareerEmployerStatus.UNVERIFIED)
      throw new Error('Employer status cannot be reset to UNVERIFIED after review');
    if (employer.version !== expectedVersion) throw new Error('CAREER_EMPLOYER_VERSION_CONFLICT');
    return this.repository.updateEmployer(id, { verificationStatus: status }, expectedVersion);
  }

  public async updateJob(id: string, updates: UpdateCareerJobPostingDto, expectedVersion: number): Promise<CareerJobPostingDto> {
    this.assertExpectedVersion(expectedVersion);
    const existing = await this.getJob(id);
    if (existing.version !== expectedVersion) throw new Error('CAREER_JOB_VERSION_CONFLICT');
    const canonical: UpdateCareerJobPostingDto = { ...updates };
    const countryReferenceId = updates.countryReferenceId !== undefined || updates.country !== undefined
      ? (await this.references.resolveCountryReference(updates.countryReferenceId ?? updates.country ?? '')).id
      : existing.countryReferenceId;
    canonical.countryReferenceId = countryReferenceId;

    if (updates.cityReferenceId !== undefined || updates.city !== undefined) {
      canonical.cityReferenceId = updates.cityReferenceId === null || updates.city === null
        ? null
        : (await this.references.resolveCityReference(
            updates.cityReferenceId ?? updates.city ?? '',
            countryReferenceId,
          )).id;
    } else if ((updates.countryReferenceId !== undefined || updates.country !== undefined) && existing.cityReferenceId) {
      // Changing country cannot silently retain a city from another country.
      await this.references.resolveCityReference(existing.cityReferenceId, countryReferenceId);
    }

    const canonicalTitle = updates.title ? canonicalizeCareerIdentityText(updates.title) : existing.canonicalTitle;
    if (!canonicalTitle) throw new Error('Job title must contain at least one Unicode letter or number');
    const cityReferenceId = canonical.cityReferenceId === undefined ? existing.cityReferenceId : canonical.cityReferenceId;
    const employmentType = updates.employmentType ?? existing.employmentType;
    const canonicalDedupKey = [
      canonicalTitle,
      existing.employerId,
      countryReferenceId,
      cityReferenceId || 'REMOTE_OR_GLOBAL',
      employmentType,
    ].join('|');
    if (canonicalDedupKey !== existing.canonicalDedupKey) {
      const duplicate = await this.repository.findJobByDedupKey(canonicalDedupKey);
      if (duplicate && duplicate.id !== id) throw new Error('A matching job posting already exists');
    }
    return this.repository.updateJob(id, { ...canonical, canonicalTitle, canonicalDedupKey }, expectedVersion);
  }

  public async listJobs(filters: CareerJobFilters): Promise<PaginatedCareerResult<CareerJobPostingDto>> {
    return this.repository.listJobs(filters);
  }
  public async getJob(id: string): Promise<CareerJobPostingDto> {
    const job = await this.repository.findJobById(id);
    if (!job) throw new Error(`Career job with id ${id} not found`);
    return job;
  }
  public async markReadyToPublish(id: string, expectedVersion: number): Promise<CareerJobPostingDto> {
    this.assertExpectedVersion(expectedVersion);
    const job = await this.getJob(id);
    if (job.version !== expectedVersion) throw new Error('CAREER_JOB_VERSION_CONFLICT');
    if (job.status !== CareerJobStatus.READY_TO_REVIEW)
      throw new Error('Only READY_TO_REVIEW jobs can be marked READY_TO_PUBLISH');
    return this.repository.updateJobStatus(id, CareerJobStatus.READY_TO_PUBLISH, expectedVersion);
  }
  public async publish(id: string, expectedVersion: number): Promise<CareerJobPostingDto> {
    this.assertExpectedVersion(expectedVersion);
    const job = await this.getJob(id);
    if (job.version !== expectedVersion) throw new Error('CAREER_JOB_VERSION_CONFLICT');
    if (job.status !== CareerJobStatus.READY_TO_PUBLISH)
      throw new Error('Only READY_TO_PUBLISH jobs can be PUBLISHED');
    const employer = await this.repository.findEmployerById(job.employerId);
    if (!employer || employer.verificationStatus !== CareerEmployerStatus.VERIFIED)
      throw new Error('Only jobs from VERIFIED employers can be PUBLISHED');
    if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() <= Date.now())
      throw new Error('Expired job opportunities cannot be PUBLISHED');
    return this.repository.updateJobStatus(id, CareerJobStatus.PUBLISHED, expectedVersion);
  }
  public async archive(id: string, expectedVersion: number): Promise<CareerJobPostingDto> {
    this.assertExpectedVersion(expectedVersion);
    const job = await this.getJob(id);
    if (job.version !== expectedVersion) throw new Error('CAREER_JOB_VERSION_CONFLICT');
    return this.repository.updateJobStatus(id, CareerJobStatus.ARCHIVED, expectedVersion);
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error('CAREER_EXPECTED_VERSION_REQUIRED');
  }

  private async resolveOptionalCountry(value?: string | null): Promise<string | null> {
    return value ? (await this.references.resolveCountryReference(value)).id : null;
  }
  private async resolveOptionalCity(value?: string | null, expectedCountryReferenceId?: string): Promise<string | null> {
    return value ? (await this.references.resolveCityReference(value, expectedCountryReferenceId)).id : null;
  }
  private ensureJobRequired(input: CreateJobInput): void {
    const required = [input.title, input.jobCategory, input.description, input.employerId];
    if (required.some((value) => !value?.trim()) || !(input.countryReferenceId || input.country)?.trim())
      throw new Error('title, jobCategory, description, country reference, and employerId are required');
  }
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

