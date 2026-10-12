import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  CareerEmployerStatus,
  CareerJobStatus,
  CareerOpportunityType,
  EmploymentType,
  ICareerRepository
} from '@manaratak/domain';
import { CareerAdminUseCases } from '../../src/career-alumni/use-cases/CareerAdminUseCases';

describe('CareerAdminUseCases', () => {
  let repository: ICareerRepository;
  let useCases: CareerAdminUseCases;

  const employer = {
    id: 'emp-1',
    publicId: 'career_emp_1',
    slug: 'tech-company',
    canonicalName: 'tech company',
    canonicalDedupKey: 'tech company|Yemen|PRIVATE_COMPANY',
    displayName: 'Tech Company',
    employerType: 'PRIVATE_COMPANY',
    countryReferenceId: 'country-ye',
    country: 'Yemen',
    verificationStatus: CareerEmployerStatus.UNVERIFIED,
    websiteUrl: 'https://employer.example',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  const job = {
    id: 'job-1',
    publicId: 'career_job_1',
    slug: 'software-engineer-tech-company',
    canonicalTitle: 'software engineer',
    canonicalDedupKey: 'software engineer|emp-1|Yemen|Sana’a|FULL_TIME',
    title: 'Software Engineer',
    opportunityType: CareerOpportunityType.JOB,
    employmentType: EmploymentType.FULL_TIME,
    jobCategory: 'Engineering',
    description: 'Build software.',
    countryReferenceId: 'country-ye',
    cityReferenceId: 'city-sanaa',
    country: 'Yemen',
    city: 'Sana’a',
    status: CareerJobStatus.READY_TO_REVIEW,
    employerId: 'emp-1',
    remoteOption: false,
    applicationDeadline: new Date('2026-02-01T00:00:00Z'),
    metadata: { sourceUrl: 'https://employer.example/jobs', applicationChannel: 'INTERNAL' },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  const verifiedEmployer = { ...employer, verificationStatus: CareerEmployerStatus.VERIFIED, metadata: { _career: { makerActorId: 'maker', verification: { reviewerActorId: 'reviewer', subjectEmployerId: employer.id, sourceUrl: employer.websiteUrl, expiresAt: '2026-03-01T00:00:00Z' } } } };
  const dedup = (title: string, city = 'GLOBAL') => createHash('sha256').update(JSON.stringify([title, 'emp-1', 'country-ye', city, EmploymentType.FULL_TIME, CareerOpportunityType.JOB, 'CURRENT', 'MANUAL'])).digest('hex');
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    repository = {
      createEmployer: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'emp-1', createdAt: new Date(), updatedAt: new Date(), version: 1, ...data })),
      updateEmployer: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...employer, id, ...data })),
      findEmployerById: vi.fn().mockResolvedValue(employer),
      findEmployerBySlug: vi.fn(),
      findEmployerByDedupKey: vi.fn().mockResolvedValue(null),
      listEmployers: vi.fn(),
      createJob: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'job-1', createdAt: new Date(), updatedAt: new Date(), version: 1, ...data })),
      updateJob: vi.fn(),
      findJobById: vi.fn().mockResolvedValue(job),
      findJobBySlug: vi.fn(),
      findJobByDedupKey: vi.fn().mockResolvedValue(null),
      updateJobStatus: vi.fn(),
      listJobs: vi.fn(),
      listPublishedJobs: vi.fn()
    };
    useCases = new CareerAdminUseCases(repository, {
      resolveCountryReference: vi.fn(async (value: string) => ({ id: value === 'Yemen' ? 'country-ye' : value, label: value })),
      resolveCityReference: vi.fn(async (value: string) => ({ id: value === 'Sana’a' ? 'city-sanaa' : value, label: value })),
    });
  });

  it('creates recruitment employer metadata without raw logo URLs', async () => {
    const result = await useCases.createEmployer({
      displayName: 'Tech Company',
      employerType: 'PRIVATE_COMPANY',
      country: 'Yemen'
    });

    expect(result.slug).toMatch(/^tech-company-[0-9a-f]{12}$/);
    expect(result.verificationStatus).toBe(CareerEmployerStatus.UNVERIFIED);
  });

  it('passes the resolved country ID when validating a city reference', async () => {
    const cityResolver = vi.fn(async (value: string, expectedCountryReferenceId?: string) => ({ id: value === 'Sana’a' ? 'city-sanaa' : value, label: value }));
    useCases = new CareerAdminUseCases(repository, {
      resolveCountryReference: vi.fn(async () => ({ id: 'country-ye', label: 'YE' })),
      resolveCityReference: cityResolver,
    });
    await useCases.createEmployer({ displayName: 'City Employer', employerType: 'PRIVATE_COMPANY', country: 'Yemen', city: 'Sana’a' });
    expect(cityResolver).toHaveBeenCalledWith('Sana’a', 'country-ye');
  });

  it('creates jobs in READY_TO_REVIEW state', async () => {
    const result = await useCases.createJob({
      title: 'Software Engineer',
      opportunityType: CareerOpportunityType.JOB,
      employmentType: EmploymentType.FULL_TIME,
      jobCategory: 'Engineering',
      description: 'Build software.',
      country: 'Yemen',
      employerId: 'emp-1'
    });

    expect(result.status).toBe(CareerJobStatus.READY_TO_REVIEW);
    expect(repository.createJob).toHaveBeenCalledWith(expect.objectContaining({
      canonicalDedupKey: dedup('software engineer')
    }));
  });


  it('creates an Arabic employer with non-empty canonical identity and Unicode slug', async () => {
    const result = await useCases.createEmployer({
      displayName: 'شركةُ البُراق للتقنية',
      employerType: 'PRIVATE_COMPANY',
      country: 'Yemen'
    });
    expect(result.canonicalName).toBe('شركة البراق للتقنية');
    expect(result.slug).toMatch(/^شركة-البراق-للتقنية-[0-9a-f]{12}$/u);
  });

  it('keeps distinct Arabic job titles distinct under identical non-title dimensions', async () => {
    const first = await useCases.createJob({
      title: 'مُهندس برمجيات',
      opportunityType: CareerOpportunityType.JOB,
      employmentType: EmploymentType.FULL_TIME,
      jobCategory: 'Engineering',
      description: 'Build software.',
      country: 'Yemen',
      employerId: 'emp-1'
    });
    const second = await useCases.createJob({
      title: 'محلل نظم',
      opportunityType: CareerOpportunityType.JOB,
      employmentType: EmploymentType.FULL_TIME,
      jobCategory: 'Engineering',
      description: 'Analyze systems.',
      country: 'Yemen',
      employerId: 'emp-1'
    });
    expect(first.canonicalTitle).toBe('مهندس برمجيات');
    expect(second.canonicalTitle).toBe('محلل نظم');
    expect(first.canonicalDedupKey).not.toBe(second.canonicalDedupKey);
    expect(first.slug).toContain('مهندس-برمجيات');
  });

  it('keeps canonical country and city IDs in hashed job identity', async () => {
    const input = { title: 'Engineer', opportunityType: CareerOpportunityType.JOB, employmentType: EmploymentType.FULL_TIME, jobCategory: 'Engineering', description: 'Build software.', countryReferenceId: 'country-ye', employerId: 'emp-1' };
    const first = await useCases.createJob(input);
    const otherCountry = await useCases.createJob({ ...input, countryReferenceId: 'country-sa' });
    const otherCity = await useCases.createJob({ ...input, cityReferenceId: 'city-sanaa' });
    expect(new Set([first.canonicalDedupKey, otherCountry.canonicalDedupKey, otherCity.canonicalDedupKey]).size).toBe(3);
    expect(first.canonicalDedupKey).toBe(dedup('engineer'));
  });

  it('recomputes Arabic canonical title during update without erasing Unicode letters', async () => {
    vi.mocked(repository.updateJob).mockImplementation(async (_id, data) => ({ ...job, ...data }));
    const result = await useCases.updateJob('job-1', { title: 'إدارةُ المشاريع' }, 1);
    expect(result.canonicalTitle).toBe('ادارة المشاريع');
    expect(result.canonicalDedupKey).toBe(createHash('sha256').update(JSON.stringify(['ادارة المشاريع', 'emp-1', 'country-ye', 'city-sanaa', EmploymentType.FULL_TIME, CareerOpportunityType.JOB, 'CURRENT', job.metadata.sourceUrl])).digest('hex'));
    expect(result.canonicalDedupKey).not.toBe(job.canonicalDedupKey);
  });

  it('prevents publishing before READY_TO_PUBLISH', async () => {
    vi.mocked(repository.findJobById).mockResolvedValueOnce({ ...job, employer: verifiedEmployer });
    await expect(useCases.publish('job-1', 1)).rejects.toThrow('READY_TO_PUBLISH');
    expect(repository.updateJobStatus).not.toHaveBeenCalled();
  });


  it('requires a verified employer before publishing', async () => {
    (repository.findJobById as any).mockResolvedValueOnce({ ...job, status: CareerJobStatus.READY_TO_PUBLISH, employer });
    await expect(useCases.publish('job-1', 1)).rejects.toThrow('CAREER_EMPLOYER_NOT_VERIFIED');
    expect(repository.updateJobStatus).not.toHaveBeenCalled();
  });

  it('publishes a reviewed job for a verified employer', async () => {
    (repository.findJobById as any).mockResolvedValueOnce({ ...job, status: CareerJobStatus.READY_TO_PUBLISH, employer: verifiedEmployer });
    (repository.findEmployerById as any).mockResolvedValueOnce({ ...employer, verificationStatus: CareerEmployerStatus.VERIFIED });
    await useCases.publish('job-1', 1);
    expect(repository.updateJobStatus).toHaveBeenCalledWith('job-1', CareerJobStatus.PUBLISHED, 1);
  });

  it('supports explicit employer verification and suspension', async () => {
    await expect(useCases.setEmployerStatus('emp-1', CareerEmployerStatus.VERIFIED, 1)).rejects.toThrow('CAREER_VERIFICATION_EVIDENCE_REQUIRED');
    expect(repository.updateEmployer).not.toHaveBeenCalled();
    const evidence = { sourceUrl: 'https://employer.example/about', reason: 'Verified official employer evidence', expiresAt: '2026-03-01T00:00:00Z' };
    await useCases.setEmployerStatus('emp-1', CareerEmployerStatus.VERIFIED, 1, evidence);
    expect(repository.updateEmployer).toHaveBeenCalledWith('emp-1', expect.objectContaining({ verificationStatus: CareerEmployerStatus.VERIFIED, metadata: expect.objectContaining({ _career: expect.objectContaining({ verification: expect.objectContaining(evidence) }) }) }), 1);
    await useCases.setEmployerStatus('emp-1', CareerEmployerStatus.SUSPENDED, 1);
    expect(repository.updateEmployer).toHaveBeenLastCalledWith('emp-1', { verificationStatus: CareerEmployerStatus.SUSPENDED }, 1);
  });
});
