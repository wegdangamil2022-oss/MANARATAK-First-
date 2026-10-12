import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import { unicodeSlugSegment } from '../../canonicalization/UnicodeCanonicalization';
import { canonicalizeCareerIdentityText } from '../../canonicalization/OwnerDomainIdentityPolicies';
import { createHash, randomUUID } from 'node:crypto';
import {
  CareerEmployerDto, CareerEmployerFilters, CareerEmployerStatus, CareerJobFilters, CareerJobPostingDto,
  CareerJobStatus, CareerOpportunityType, EmploymentType, ICareerReferenceGateway, ICareerRepository,
  UpdateCareerEmployerDto, UpdateCareerJobPostingDto,
} from '@manaratak/domain';
import { assertCareerReady, careerGovernance, careerPublicMetadata, safeCareerUrl } from '../CareerPolicy';
export interface CreateEmployerInput {
  displayName: string; employerType: string; industry?: string | null; countryReferenceId?: string | null;
  cityReferenceId?: string | null; country?: string | null; city?: string | null; websiteUrl?: string | null;
  logoAssetId?: string | null; description?: string | null; metadata?: Record<string, unknown> | null;
}
export interface CreateJobInput {
  title: string; opportunityType: CareerOpportunityType; employmentType: EmploymentType; jobCategory: string;
  description: string; countryReferenceId?: string; cityReferenceId?: string | null; country?: string | null;
  city?: string | null; employerId: string; recruiterContactId?: string | null; applicationDeadline?: Date | string | null;
  externalPostingUrl?: string | null; salaryRange?: Record<string, unknown> | null; requiredSkills?: string[] | null;
  educationRequirement?: string | null; languageRequirements?: string[] | null; remoteOption?: boolean;
  metadata?: Record<string, unknown> | null;
}
export class CareerAdminUseCases {
  constructor(private readonly repository: ICareerRepository, private readonly references: ICareerReferenceGateway,
    private readonly assetReferences?: AssetReferencePolicy) {}
  forActor(context: { actorId: string; reason: string; correlationId: string }) {
    if (!this.repository.withActor) throw new Error('CAREER_AUDIT_REQUIRED');
    return new CareerAdminUseCases(this.repository.withActor(context), this.references, this.assetReferences);
  }
  async createEmployer(input: CreateEmployerInput): Promise<CareerEmployerDto> {
    const canonicalName = canonicalizeCareerIdentityText(input.displayName);
    if (!canonicalName) throw new Error('CAREER_EMPLOYER_NAME_REQUIRED');
    const country = input.countryReferenceId || input.country ? await this.references.resolveCountryReference(input.countryReferenceId || input.country!) : null;
    const city = input.cityReferenceId || input.city ? await this.references.resolveCityReference(input.cityReferenceId || input.city!, country?.id) : null;
    if (city && !country) throw new Error('CAREER_CITY_REQUIRES_COUNTRY');
    await assertAssetReferenceUsable(this.assetReferences, input.logoAssetId, { purpose: 'CAREER_EMPLOYER_LOGO' });
    if (input.websiteUrl) safeCareerUrl(input.websiteUrl);
    const key = [canonicalName, country?.id || 'GLOBAL', input.employerType].join('|');
    if (await this.repository.findEmployerByDedupKey(key)) throw new Error('CAREER_EMPLOYER_DUPLICATE');
    return this.repository.createEmployer({ ...input, metadata: {}, publicId: `career_emp_${randomUUID()}`,
      slug: `${unicodeSlugSegment(input.displayName)}-${hash(key)}`, canonicalName, canonicalDedupKey: key,
      countryReferenceId: country?.id ?? null, cityReferenceId: city?.id ?? null, country: country?.label ?? null,
      city: city?.label ?? null, verificationStatus: CareerEmployerStatus.UNVERIFIED });
  }
  async updateEmployer(id: string, input: UpdateCareerEmployerDto, expectedVersion: number) {
    version(expectedVersion);
    const current = await this.repository.findEmployerById(id);
    if (!current) throw new Error('CAREER_EMPLOYER_NOT_FOUND');
    if ('verificationStatus' in input || 'metadata' in input) throw new Error('CAREER_PROTECTED_FIELD');
    const merged = { ...current, ...input };
    const country = merged.countryReferenceId ? await this.references.resolveCountryReference(merged.countryReferenceId) : null;
    const city = merged.cityReferenceId ? await this.references.resolveCityReference(merged.cityReferenceId, country?.id) : null;
    if (city && !country) throw new Error('CAREER_CITY_REQUIRES_COUNTRY');
    if (merged.websiteUrl) safeCareerUrl(merged.websiteUrl);
    await assertAssetReferenceUsable(this.assetReferences, merged.logoAssetId, { purpose: 'CAREER_EMPLOYER_LOGO' });
    const canonicalName = canonicalizeCareerIdentityText(merged.displayName);
    if (!canonicalName) throw new Error('CAREER_EMPLOYER_NAME_REQUIRED');
    const key = [canonicalName, country?.id || 'GLOBAL', merged.employerType].join('|');
    const duplicate = await this.repository.findEmployerByDedupKey(key);
    if (duplicate && duplicate.id !== id) throw new Error('CAREER_EMPLOYER_DUPLICATE');
    // Identity remains stable; persistence resets verification for material edits.
    return this.repository.updateEmployer(id, { ...input, country: country?.label ?? null, city: city?.label ?? null,
      ...({ canonicalName, canonicalDedupKey: key } as object) }, expectedVersion);
  }
  async setEmployerStatus(id: string, status: CareerEmployerStatus, expectedVersion: number,
    evidence?: { sourceUrl: string; reason: string; expiresAt: string; assetId?: string }) {
    version(expectedVersion);
    const employer = await this.repository.findEmployerById(id);
    if (!employer) throw new Error('CAREER_EMPLOYER_NOT_FOUND');
    if (status === CareerEmployerStatus.UNVERIFIED) throw new Error('CAREER_TRANSITION_INVALID');
    if (status === CareerEmployerStatus.VERIFIED) {
      if (!evidence || !evidence.reason.trim() || !Number.isFinite(Date.parse(evidence.expiresAt)) || Date.parse(evidence.expiresAt) <= Date.now()) throw new Error('CAREER_VERIFICATION_EVIDENCE_REQUIRED');
      safeCareerUrl(evidence.sourceUrl);
      if (!employer.websiteUrl || new URL(evidence.sourceUrl).hostname !== new URL(safeCareerUrl(employer.websiteUrl)).hostname)
        throw new Error('CAREER_SOURCE_DOMAIN_MISMATCH');
      const asset = await assertAssetReferenceUsable(this.assetReferences, evidence.assetId, { purpose: 'CAREER_EMPLOYER_VERIFICATION' });
      return this.repository.updateEmployer(id, { verificationStatus: status,
        metadata: { ...employer.metadata, _career: { ...careerGovernance(employer), verification: {
          sourceUrl: evidence.sourceUrl, reason: evidence.reason, expiresAt: evidence.expiresAt,
          checkedAt: new Date().toISOString(), evidenceAssetId: evidence.assetId ?? null, evidenceHash: asset?.checksum?.hash ?? null,
        } } } }, expectedVersion);
    }
    return this.repository.updateEmployer(id, { verificationStatus: status }, expectedVersion);
  }
  async createJob(input: CreateJobInput) {
    const employer = await this.repository.findEmployerById(input.employerId);
    if (!employer) throw new Error('CAREER_EMPLOYER_NOT_FOUND');
    const country = await this.references.resolveCountryReference(input.countryReferenceId || input.country || '');
    const city = input.cityReferenceId || input.city ? await this.references.resolveCityReference(input.cityReferenceId || input.city!, country.id) : null;
    const title = canonicalizeCareerIdentityText(input.title);
    if (!title || !input.description.trim() || !input.jobCategory.trim()) throw new Error('CAREER_READINESS_BLOCKED');
    if (input.externalPostingUrl) safeCareerUrl(input.externalPostingUrl);
    const metadata = careerPublicMetadata(input.metadata);
    if (metadata.sourceUrl) safeCareerUrl(String(metadata.sourceUrl));
    const key = this.dedup({ ...input, countryReferenceId: country.id, cityReferenceId: city?.id ?? null, metadata }, title);
    if (await this.repository.findJobByDedupKey(key)) throw new Error('CAREER_JOB_DUPLICATE');
    return this.repository.createJob({ ...input, metadata, salaryRange: await this.salary(input.salaryRange),
      publicId: `career_job_${randomUUID()}`, slug: `${unicodeSlugSegment(input.title)}-${hash(key)}`,
      canonicalTitle: title, canonicalDedupKey: key, countryReferenceId: country.id, cityReferenceId: city?.id ?? null,
      country: country.label, city: city?.label ?? null, status: CareerJobStatus.READY_TO_REVIEW, remoteOption: !!input.remoteOption });
  }
  async updateJob(id: string, input: UpdateCareerJobPostingDto, expectedVersion: number) {
    version(expectedVersion);
    if ('employerId' in input || 'status' in input) throw new Error('CAREER_PROTECTED_FIELD');
    const existing = await this.getJob(id);
    const merged = { ...existing, ...input };
    if (merged.externalPostingUrl) safeCareerUrl(merged.externalPostingUrl);
    const country = await this.references.resolveCountryReference(merged.countryReferenceId || merged.country || '');
    const city = merged.cityReferenceId ? await this.references.resolveCityReference(merged.cityReferenceId, country.id) : null;
    const canonicalTitle = canonicalizeCareerIdentityText(merged.title);
    if (!canonicalTitle || !merged.description.trim()) throw new Error('CAREER_READINESS_BLOCKED');
    const metadata = input.metadata === undefined ? careerPublicMetadata(existing.metadata) : careerPublicMetadata(input.metadata);
    const key = this.dedup({ ...merged, metadata, countryReferenceId: country.id, cityReferenceId: city?.id ?? null }, canonicalTitle);
    const duplicate = await this.repository.findJobByDedupKey(key);
    if (duplicate && duplicate.id !== id) throw new Error('CAREER_JOB_DUPLICATE');
    return this.repository.updateJob(id, { ...input, metadata, canonicalTitle, canonicalDedupKey: key,
      salaryRange: await this.salary(merged.salaryRange), countryReferenceId: country.id, cityReferenceId: city?.id ?? null,
      country: country.label, city: city?.label ?? null }, expectedVersion);
  }
  async expireJobs(limit: number) { if (!this.repository.expireJobs) throw new Error('CAREER_AUDIT_REQUIRED'); return this.repository.expireJobs(limit); }
  listEmployers(filters: CareerEmployerFilters) { return this.repository.listEmployers(filters); }
  listJobs(filters: CareerJobFilters) { return this.repository.listJobs(filters); }
  async getJob(id: string) { const job = await this.repository.findJobById(id); if (!job) throw new Error('CAREER_JOB_NOT_FOUND'); return job; }
  async markReadyToPublish(id: string, expectedVersion: number, decision?: { reason: string; checklist: Record<string, boolean> }) {
    version(expectedVersion); const job = await this.getJob(id); assertCareerReady(job);
    if (!decision || !decision.reason.trim() || !['source', 'applicationLink', 'privacy', 'terms'].every(key => decision.checklist[key] === true)) throw new Error('CAREER_REVIEW_REQUIRED');
    return this.repository.updateJobStatus(id, CareerJobStatus.READY_TO_PUBLISH, expectedVersion, decision);
  }
  async publish(id: string, expectedVersion: number) {
    version(expectedVersion);
    const job = await this.getJob(id);
    if (job.status !== CareerJobStatus.READY_TO_PUBLISH) throw new Error('CAREER_JOB_REQUIRES_READY_TO_PUBLISH');
    assertCareerReady(job);
    return this.repository.updateJobStatus(id, CareerJobStatus.PUBLISHED, expectedVersion);
  }
  archive(id: string, expectedVersion: number) { version(expectedVersion); return this.repository.updateJobStatus(id, CareerJobStatus.ARCHIVED, expectedVersion); }
  unpublish(id: string, expectedVersion: number) { version(expectedVersion); return this.repository.updateJobStatus(id, CareerJobStatus.READY_TO_REVIEW, expectedVersion); }
  reject(id: string, expectedVersion: number) { version(expectedVersion); return this.repository.updateJobStatus(id, CareerJobStatus.REJECTED, expectedVersion); }
  private dedup(input: Partial<CareerJobPostingDto> & { employerId: string }, title: string) {
    return createHash('sha256').update(JSON.stringify([title, input.employerId, input.countryReferenceId, input.cityReferenceId || 'GLOBAL', input.employmentType,
      input.opportunityType, input.metadata?.recruitmentCycle || 'CURRENT', input.metadata?.sourceUrl || 'MANUAL'])).digest('hex');
  }
  private async salary(value?: Record<string, unknown> | null) {
    if (!value) return null;
    const min = String(value.minMinorUnits ?? ''), max = String(value.maxMinorUnits ?? '');
    if (!/^\d{1,20}$/.test(min) || !/^\d{1,20}$/.test(max) || BigInt(min) > BigInt(max) || !Number.isInteger(value.scale) || Number(value.scale) < 0 || Number(value.scale) > 6 || !['HOUR', 'MONTH', 'YEAR'].includes(String(value.period)) || !['GROSS', 'NET'].includes(String(value.basis))) throw new Error('CAREER_SALARY_INVALID');
    if (!this.references.resolveCurrencyReference) throw new Error('CAREER_CURRENCY_NOT_CONFIGURED');
    const currency = await this.references.resolveCurrencyReference(String(value.currencyCode));
    return { minMinorUnits: min, maxMinorUnits: max, scale: Number(value.scale), currencyCode: currency.code, period: value.period, basis: value.basis };
  }
}
function version(value: number) { if (!Number.isSafeInteger(value) || value < 1) throw new Error('CAREER_EXPECTED_VERSION_REQUIRED'); }
function hash(value: string) { return createHash('sha256').update(value).digest('hex').slice(0, 12); }
