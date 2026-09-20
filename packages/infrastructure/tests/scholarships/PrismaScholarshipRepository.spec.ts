import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaScholarshipRepository } from '../../src/scholarships/PrismaScholarshipRepository';

describe('PrismaScholarshipRepository', () => {
  let mockPrisma: any;
  let repository: PrismaScholarshipRepository;

  beforeEach(() => {
    mockPrisma = {
      scholarship: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    repository = new PrismaScholarshipRepository(mockPrisma as any);
  });

  it('writes normalized root fields and child relations while retaining legacy evidence', async () => {
    const payload: any = {
      publicId: 'schol-123',
      slug: 'test-slug',
      canonicalName: 'Test',
      canonicalDedupKey: 'test|key',
      displayName: 'Test Scholarship',
      providerName: 'Test Provider',
      status: 'IMPORTED',
      completenessStatus: 'COMPLETE',
      applicationLink: 'https://example.com/apply',
      officialSourceUrl: 'https://example.com/official',
      sourceLocale: 'en',
      fundingCoverage: 'Tuition and Fees',
      benefits: [
        {
          benefitKey: 'tuition',
          benefitTypeCode: 'TUITION',
          valueText: 'Full tuition',
        },
      ],
      optionalFields: { customField: 'legacy-evidence-only' },
    };

    mockPrisma.scholarship.create.mockResolvedValue({
      ...payload,
      id: 'db-id-123',
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
      applicationUrl: 'https://example.com/apply',
      optionalFields: {
        fundingCoverage: 'Tuition and Fees',
        applicationLink: 'https://example.com/apply',
        customField: 'legacy-evidence-only',
      },
      benefits: [
        {
          id: 'benefit-1',
          scholarshipId: 'db-id-123',
          benefitKey: 'tuition',
          benefitTypeCode: 'TUITION',
          valueText: 'Full tuition',
        },
      ],
      degreeTargets: [],
      majorTargets: [],
      eligibilityItems: [],
      requiredDocuments: [],
      sourceEvidence: [],
      universityLinks: [],
    });

    const result = await repository.create(payload);

    expect(mockPrisma.scholarship.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        publicId: 'schol-123',
        applicationUrl: 'https://example.com/apply',
        officialSourceUrl: 'https://example.com/official',
        sourceLocale: 'en',
        benefits: {
          create: [
            expect.objectContaining({
              benefitKey: 'tuition',
              benefitTypeCode: 'TUITION',
            }),
          ],
        },
      }),
      include: expect.objectContaining({
        benefits: true,
        degreeTargets: true,
        majorTargets: true,
        sourceEvidence: true,
        universityLinks: true,
      }),
    });
    expect(result.fundingCoverage).toBe('Tuition and Fees');
    expect((result as any).customField).toBeUndefined();
    expect(result.optionalFields).toHaveProperty('customField', 'legacy-evidence-only');
    expect(result.benefits?.[0].benefitKey).toBe('tuition');
  });

  it('does not flatten arbitrary optionalFields keys into the domain DTO root', async () => {
    mockPrisma.scholarship.findUnique.mockResolvedValue({
      id: 'db-id-123',
      publicId: 'schol-123',
      slug: 'test',
      canonicalName: 'Test',
      canonicalDedupKey: 'test|key',
      displayName: 'Test',
      status: 'PUBLISHED',
      completenessStatus: 'COMPLETE',
      optionalFields: {
        fundingCoverage: 'Full funding',
        arbitraryExperimentalKey: 'must-not-leak',
      },
      benefits: [],
      degreeTargets: [],
      majorTargets: [],
      eligibilityItems: [],
      requiredDocuments: [],
      sourceEvidence: [],
      universityLinks: [],
      createdAt: new Date('2026-08-20T00:00:00Z'),
      updatedAt: new Date('2026-08-20T00:00:00Z'),
    });

    const result = await repository.findById('db-id-123');

    expect(result?.fundingCoverage).toBe('Full funding');
    expect((result as any)?.arbitraryExperimentalKey).toBeUndefined();
    expect(result?.optionalFields).toHaveProperty('arbitraryExperimentalKey', 'must-not-leak');
  });

  it('listPublished requests only PUBLISHED scholarships and includes normalized children', async () => {
    mockPrisma.scholarship.findMany.mockResolvedValue([]);
    mockPrisma.scholarship.count.mockResolvedValue(0);

    await repository.listPublished({ page: 1 });

    expect(mockPrisma.scholarship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ publicationStatus: 'PUBLISHED' }),
        include: expect.objectContaining({
          benefits: true,
          requiredDocuments: true,
          universityLinks: true,
        }),
      }),
    );
  });

  it('applies combined admin filters before page-two pagination and preserves database totals', async () => {
    mockPrisma.scholarship.findMany.mockResolvedValue([]);
    mockPrisma.scholarship.count.mockResolvedValue(41);
    const result = await repository.list({
      page: 2, pageSize: 20, countryReferenceId: 'country-sa', degreeLevelId: 'degree-bachelor',
      majorId: 'major-cs', internationalTestId: 'test-ielts', universityId: 'university-1', academicProgramId: 'program-1',
      fundingCoverage: 'FULL', sponsorName: 'Ministry', verificationStatus: 'VERIFIED' as any, query: 'engineering',
    });
    expect(mockPrisma.scholarship.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 20, take: 20,
      where: expect.objectContaining({ verificationStatus: 'VERIFIED', AND: expect.any(Array) }),
    }));
    const where = mockPrisma.scholarship.findMany.mock.calls[0][0].where;
    expect(where.countryReferenceId).toBe('country-sa');
    expect(JSON.stringify(where)).not.toContain('primaryCountry');
    expect(JSON.stringify(where)).not.toContain('countrySourceLabel');
    expect(JSON.stringify(where)).not.toContain('sourceLabel');
    expect(JSON.stringify(where)).toContain('degreeTargets');
    expect(JSON.stringify(where)).toContain('majorTargets');
    expect(JSON.stringify(where)).toContain('internationalTestId');
    expect(JSON.stringify(where)).toContain('universityLinks');
    expect(JSON.stringify(where)).toContain('academicProgramId');
    expect(JSON.stringify(where)).toContain('benefits');
    expect(result).toMatchObject({ total: 41, page: 2, totalPages: 3 });
  });


  it('applies public relationship filters only through canonical ids', async () => {
    mockPrisma.scholarship.findMany.mockResolvedValue([]);
    mockPrisma.scholarship.count.mockResolvedValue(0);
    await repository.listPublished({
      countryReferenceId: 'country-qa', studyLanguageReferenceId: 'language-en', currencyReferenceId: 'currency-usd',
      degreeLevelId: 'degree-phd', majorId: 'major-cs', internationalTestId: 'test-ielts',
      universityId: 'university-qu', academicProgramId: 'program-cs-phd', page: 1,
    });
    const where = mockPrisma.scholarship.findMany.mock.calls[0][0].where;
    const serialized = JSON.stringify(where);
    expect(where.countryReferenceId).toBe('country-qa');
    expect(where.studyLanguageReferenceId).toBe('language-en');
    expect(serialized).toContain('currencyReferenceId');
    expect(serialized).toContain('degreeLevelId');
    expect(serialized).toContain('majorId');
    expect(serialized).toContain('internationalTestId');
    expect(serialized).toContain('universityId');
    expect(serialized).toContain('academicProgramId');
    expect(serialized).not.toContain('sourceLabel');
    expect(serialized).not.toContain('countrySourceLabel');
  });

  it('derives dashboard counters from unbounded database count queries', async () => {
    mockPrisma.scholarship.count
      .mockResolvedValueOnce(503).mockResolvedValueOnce(220).mockResolvedValueOnce(31).mockResolvedValueOnce(44)
      .mockResolvedValueOnce(27).mockResolvedValueOnce(19).mockResolvedValueOnce(155).mockResolvedValueOnce(7);
    await expect(repository.getAdminSummary()).resolves.toEqual({
      all: 503, imported: 220, missingFields: 31, needsVerification: 44,
      needsTranslation: 27, readyToPublish: 19, published: 155, archived: 7,
    });
    expect(mockPrisma.scholarship.count).toHaveBeenCalledTimes(8);
    expect(mockPrisma.scholarship.findMany).not.toHaveBeenCalled();
  });
});
