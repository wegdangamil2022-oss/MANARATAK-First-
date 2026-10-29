import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaScholarshipRepository } from '../../src/scholarships/PrismaScholarshipRepository';

describe('PrismaScholarshipRepository', () => {
  let mockPrisma: any;
  let repository: PrismaScholarshipRepository;
  let programReads: any;

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
    mockPrisma.$transaction = vi.fn(async (work: (client: unknown)=>unknown)=>work(mockPrisma));
    programReads = {findByIds: vi.fn(async (ids: string[]) => ids.map(id => ({contractVersion:1 as const,id,universityId:'university-1',degreeLevelId:'degree-bachelor',majorId:'major-cs',status:'ACTIVE',publiclyEligible:true,canonicalName:id,displayName:id}))),findPublished:vi.fn(async (query: {academicProgramId?:string;universityId?:string;degreeLevelId?:string})=>[{contractVersion:1 as const,id:query.academicProgramId??'program-1',universityId:query.universityId??'university-1',degreeLevelId:query.degreeLevelId??'degree-bachelor',majorId:'major-cs',status:'ACTIVE',publiclyEligible:true,canonicalName:'program',displayName:'Program'}]),withTransaction:vi.fn()};
    programReads.withTransaction.mockImplementation(()=>programReads);
    repository = new PrismaScholarshipRepository(mockPrisma as any, false, programReads);
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
        benefits: {include: {currency: {select: {isoCode: true, nameAr: true, name: true}}}},
        degreeTargets: {include: {degreeLevel: {select: {canonicalCode: true, nameEn: true, nameAr: true}}}},
        majorTargets: {include: {major: {select: {status: true}}}},
        sourceEvidence: true,
        universityLinks: {include: {university: {select: {id:true,status:true,displayName:true}}}},
      }),
    });
    expect(result.fundingCoverage).toBe('Tuition and Fees');
    expect((result as any).customField).toBeUndefined();
    expect(result.optionalFields).toHaveProperty('customField', 'legacy-evidence-only');
    expect(result.benefits?.[0].benefitKey).toBe('tuition');
  });

  it('links a reviewed owner draft only in an atomic draft with a matching resolved degree', async () => {
    const program = { contractVersion: 1, id: 'p1', universityId: 'u1', universityStatus: 'READY_TO_REVIEW', degreeLevelId: 'master', majorId: null, status: 'DRAFT', publiclyEligible: false };
    programReads.findByIds.mockResolvedValue([program]);
    const input: any = { publicId: 's', slug: 'draft', canonicalName: 'Draft', displayName: 'Draft', canonicalDedupKey: 'draft', status: 'IMPORTED', publicationStatus: 'DRAFT',
      degreeTargets: [{ targetKey: 'degree', degreeLevelId: 'master', resolutionStatus: 'RESOLVED' }], universityLinks: [{ linkKey: 'program', academicProgramId: 'p1', resolutionStatus: 'RESOLVED' }] };
    mockPrisma.scholarship.create.mockImplementation(async ({ data }: any) => ({ ...data, id: 's1', universityLinks: data.universityLinks.create, degreeTargets: [] }));
    await expect(repository.create(input)).rejects.toThrow('SCHOLARSHIP_ACADEMIC_PROGRAM_NOT_PUBLISHED');
    const bound = new PrismaScholarshipRepository(mockPrisma, true, programReads);
    await bound.create(input);
    expect(mockPrisma.scholarship.create.mock.calls[0][0].data.universityLinks.create[0]).toMatchObject({ academicProgramId: 'p1', universityId: 'u1' });
    for (const change of [{ publicationStatus: 'PUBLISHED' }, { degreeTargets: [] }, { universityLinks: [{ linkKey: 'program', academicProgramId: 'p1', universityId: 'wrong' }] }]) {
      await expect(bound.create({ ...input, ...change })).rejects.toThrow();
    }
    program.universityStatus = 'ARCHIVED';
    await expect(bound.create(input)).rejects.toThrow('SCHOLARSHIP_ACADEMIC_PROGRAM_NOT_PUBLISHED');
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

  it('round trips editable funding/source groups through existing metadata storage without replacing import evidence', async () => {
    const evidence = { sourceReview: { digest: 'source-digest' }, secondYearFunding: 'Conditional further application' };
    let stored: any = { id: 'sch-1', revision: 7, displayName: 'Scholarship', status: 'IMPORTED', publicationStatus: 'DRAFT', optionalFields: { retainedOriginalField: 'keep', metadata: evidence }, benefits: [], degreeTargets: [], majorTargets: [], eligibilityItems: [], requiredDocuments: [], sourceEvidence: [{ evidenceKey: 'source', sourceUrl: 'https://example.edu/original' }], universityLinks: [] };
    mockPrisma.$queryRaw = vi.fn().mockResolvedValue([]);
    mockPrisma.scholarship.findUnique.mockImplementation(async () => stored);
    mockPrisma.scholarship.update.mockImplementation(async ({ data }: any) => { stored = { ...stored, optionalFields: data.optionalFields, revision: stored.revision + 1 }; return stored; });
    const bound = new PrismaScholarshipRepository(mockPrisma, true, programReads);
    const metadata = { ...evidence, adminPresentation: { fundingGroups: [{ id: 'university-a', title: 'University A', benefitKeys: [] }], sourceGroups: [{ id: 's', title: 'Sources', links: [{ id: 'l', title: 'Admissions', url: 'https://example.edu/admissions' }] }] } };
    await bound.update('sch-1', { metadata });
    const reread = await bound.findById('sch-1');
    expect(reread?.metadata).toEqual(metadata);
    expect(reread?.optionalFields?.retainedOriginalField).toBe('keep');
    expect(reread?.sourceEvidence).toEqual([{ evidenceKey: 'source', sourceUrl: 'https://example.edu/original' }]);
    expect(mockPrisma.scholarship.update.mock.calls[0][0].data.sourceEvidence).toBeUndefined();
  });

  it('listPublished requests only PUBLISHED scholarships and includes normalized children', async () => {
    mockPrisma.scholarship.findMany.mockResolvedValue([]);
    mockPrisma.scholarship.count.mockResolvedValue(0);

    await repository.listPublished({ page: 1 });

    expect(mockPrisma.scholarship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ publicationStatus: 'PUBLISHED' }),
        include: expect.objectContaining({
          benefits: {include: {currency: {select: {isoCode: true, nameAr: true, name: true}}}},
          requiredDocuments: expect.objectContaining({include:{internationalTest:{select:{id:true,status:true,isPubliclyVisible:true,currentPublishedVersionId:true,currentPublishedVersion:{select:{id:true,testId:true,status:true}}}}}}),
          universityLinks: {include: {university: {select: {id:true,status:true,displayName:true}}}},
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
    expect(where).not.toHaveProperty('countrySourceLabel');
    expect(where).not.toHaveProperty('sourceLabel');
    expect(JSON.stringify(where)).toContain('degreeTargets');
    expect(JSON.stringify(where)).toContain('majorTargets');
    expect(JSON.stringify(where)).toContain('internationalTestId');
    expect(JSON.stringify(where)).toContain('universityLinks');
    expect(JSON.stringify(where)).toContain('academicProgramId');
    expect(JSON.stringify(where)).toContain('benefits');
    expect(result).toMatchObject({ total: 41, page: 2, totalPages: 3 });
  });


  it('uses exact canonical relation IDs without label alternatives in the admin list', async () => {
    mockPrisma.scholarship.findMany.mockResolvedValue([]);
    mockPrisma.scholarship.count.mockResolvedValue(0);
    await repository.list({ countryReferenceId: 'country-exact', degreeLevelId: 'degree-exact', majorId: 'major-exact', studyLanguageReferenceId: 'language-exact' });
    const where = mockPrisma.scholarship.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ countryReferenceId: 'country-exact', studyLanguageReferenceId: 'language-exact', AND: expect.arrayContaining([
      { degreeTargets: { some: { degreeLevelId: 'degree-exact' } } },
      { OR: [{ majorTargets: { some: { majorId: 'major-exact' } } }, { eligibilityItems: { some: { majorId: 'major-exact' } } }] },
    ]) });
    expect(JSON.stringify(where)).not.toMatch(/sourceLabel|countrySourceLabel|contains|nameAr|nameEn/);
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
    expect(where.studyLanguageReferenceId).toBeUndefined();
    expect(serialized).toContain('currencyReferenceId');
    expect(programReads.findPublished).toHaveBeenCalledWith({universityId:'university-qu',academicProgramId:'program-cs-phd',degreeLevelId:'degree-phd',majorId:'major-cs',languageReferenceId:'language-en'});
    expect(serialized).not.toContain('degreeTargets');
    expect(serialized).not.toContain('majorTargets');
    expect(serialized).toContain('internationalTestId');
    expect(serialized).toContain('universityId');
    expect(serialized).toContain('academicProgramId');
    expect(serialized).not.toContain('sourceLabel');
    expect(serialized).not.toContain('countrySourceLabel');
  });

  it('derives dashboard counters from unbounded database count queries', async () => {
    mockPrisma.scholarship.count
      .mockResolvedValueOnce(503).mockResolvedValueOnce(220).mockResolvedValueOnce(31).mockResolvedValueOnce(44)
      .mockResolvedValueOnce(27).mockResolvedValueOnce(19).mockResolvedValueOnce(155).mockResolvedValueOnce(7)
      .mockResolvedValueOnce(23).mockResolvedValueOnce(17);
    await expect(repository.getAdminSummary()).resolves.toEqual({
      all: 503, imported: 220, missingFields: 31, needsVerification: 44,
      needsTranslation: 27, readyToPublish: 19, published: 155, archived: 7, inReview:23, incomplete:17,
    });
    expect(mockPrisma.scholarship.count).toHaveBeenCalledTimes(10);
    expect(mockPrisma.scholarship.count).toHaveBeenNthCalledWith(9,{where:{status:'READY_TO_REVIEW'}});
    expect(mockPrisma.scholarship.count).toHaveBeenNthCalledWith(10,{where:{completenessStatus:'INCOMPLETE'}});
    expect(mockPrisma.scholarship.findMany).not.toHaveBeenCalled();
  });
});
