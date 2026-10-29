import { describe, expect, it, vi } from 'vitest';
import { PrismaScholarshipCanonicalLookupGateway } from '../../src/scholarships/PrismaScholarshipCanonicalLookupGateway';

function createPrismaMock() {
  return {
    university: { findFirst: vi.fn() },
    universityAcademicProgram: { findUnique: vi.fn(), findMany: vi.fn() },
    referenceCountry: { findUnique: vi.fn(), findMany: vi.fn() },
    referenceLanguage: { findUnique: vi.fn(), findMany: vi.fn() },
    referenceCurrency: { findUnique: vi.fn(), findMany: vi.fn() },
    degreeLevel: { findUnique: vi.fn(), findMany: vi.fn() },
    major: { findUnique: vi.fn(), findMany: vi.fn() },
    majorAlias: { findMany: vi.fn() },
    internationalTest: { findUnique: vi.fn(), findMany: vi.fn() },
  };
}

describe('PrismaScholarshipCanonicalLookupGateway', () => {
  it('looks up University by exact canonical or public ID, never by name', async () => {
    const prisma = createPrismaMock();
    prisma.university.findFirst.mockResolvedValue({ id: 'u1', publicId: 'INS-YEM-0001', canonicalName: 'Sample University', displayName: 'Sample University' });
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('UNIVERSITY', { target: 'UNIVERSITY', canonicalId: 'INS-YEM-0001' });
    expect(prisma.university.findFirst).toHaveBeenCalledWith({ where: { OR: [{ id: 'INS-YEM-0001' }, { publicId: 'INS-YEM-0001' }] }, select: expect.any(Object) });
    expect(results[0].method).toBe('EXACT_PUBLIC_ID');
  });

  it('does not issue a University lookup for name-only input', async () => {
    const prisma = createPrismaMock();
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('UNIVERSITY', { target: 'UNIVERSITY', rawValue: 'University' });
    expect(results).toEqual([]);
    expect(prisma.university.findFirst).not.toHaveBeenCalled();
  });


  it('looks up AcademicProgram by exact canonical id only', async () => {
    const prisma = createPrismaMock();
    prisma.universityAcademicProgram.findMany.mockResolvedValue([{ id: 'program-1', universityId:'university-1', degreeLevelId:'phd', majorId:'major-1', status:'ACTIVE', majorMappingState:'CANONICALLY_MAPPED', university:{status:'PUBLISHED',countryReference:{isActive:true,lifecycleState:'ACTIVE'},regionReferenceId:null,cityReferenceId:null}, major:{status:'PUBLISHED',levelProfiles:[{id:'profile-1',degreeLevelId:'phd',status:'PUBLISHED',currentPublishedVersionId:'version-1',currentPublishedVersion:{id:'version-1',majorId:'major-1',profileId:'profile-1',status:'PUBLISHED'}}]}, sourceProgramName: 'Computer Science PhD', normalizedName: 'computer science phd' }]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('ACADEMIC_PROGRAM', { target: 'ACADEMIC_PROGRAM', canonicalId: 'program-1' });
    expect(prisma.universityAcademicProgram.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ['program-1'] },
      }),
      take: 501,
    }));
    expect(results[0]).toMatchObject({ id: 'program-1', method: 'EXACT_CANONICAL_ID' });
  });

  it('allows an explicit draft only in its exact university and degree scope', async () => {
    const row = { contractVersion: 1 as const, id: 'p', universityId: 'u', universityStatus: 'READY_TO_REVIEW', degreeLevelId: 'master', majorId: null, canonicalName: 'China Studies', displayName: 'China Studies', status: 'DRAFT', publiclyEligible: false };
    const reads = { findByIds: vi.fn(async () => [row]), findPublished: vi.fn(), withTransaction: vi.fn() };
    const gateway = new PrismaScholarshipCanonicalLookupGateway(createPrismaMock() as any, reads);
    const request = { target: 'ACADEMIC_PROGRAM' as const, canonicalId: 'p', universityId: 'u', degreeLevelId: 'master' };
    expect(await gateway.findCandidates('ACADEMIC_PROGRAM', request)).toMatchObject([{ id: 'p', lifecycle: 'DRAFT', ownerId: 'u' }]);
    for (const scope of [{ universityId: 'other' }, { degreeLevelId: 'bachelor' }, { universityId: undefined }, { degreeLevelId: undefined }]) {
      expect(await gateway.findCandidates('ACADEMIC_PROGRAM', { ...request, ...scope })).toEqual([]);
    }
    for (const status of ['ARCHIVED', 'REJECTED', 'INACTIVE']) {
      row.status = status;
      expect(await gateway.findCandidates('ACADEMIC_PROGRAM', request)).toEqual([]);
    }
    row.status = 'DRAFT';
    row.universityStatus = 'ARCHIVED';
    expect(await gateway.findCandidates('ACADEMIC_PROGRAM', request)).toEqual([]);
    expect(reads.findPublished).not.toHaveBeenCalled();
    expect(row.publiclyEligible).toBe(false);
  });

  it('does not resolve AcademicProgram from a free-text name', async () => {
    const prisma = createPrismaMock();
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('ACADEMIC_PROGRAM', { target: 'ACADEMIC_PROGRAM', rawValue: 'Computer Science PhD' });
    expect(results).toEqual([]);
    expect(prisma.universityAcademicProgram.findUnique).not.toHaveBeenCalled();
  });

  it('uses exact Country standard codes', async () => {
    const prisma = createPrismaMock();
    prisma.referenceCountry.findMany.mockResolvedValue([{ id: 'c1', iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen' }]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('COUNTRY', { target: 'COUNTRY', standardCode: 'YE' });
    expect(prisma.referenceCountry.findMany).toHaveBeenCalledWith({ where: { OR: [{ iso2Code: 'YE' }, { iso3Code: 'YE' }] } });
    expect(results[0].standardCode).toBe('YE');
  });

  it('resolves Language by exact stored name without creating one', async () => {
    const prisma = createPrismaMock();
    prisma.referenceLanguage.findMany.mockResolvedValue([{ id: 'l1', isoCode: 'ar', name: 'Arabic', nameAr: 'العربية', nativeName: 'العربية' }]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('LANGUAGE', { target: 'LANGUAGE', rawValue: 'Arabic' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('l1');
  });

  it('does not guess Currency from a symbol', async () => {
    const prisma = createPrismaMock();
    prisma.referenceCurrency.findMany.mockResolvedValue([]);
    await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('CURRENCY', { target: 'CURRENCY', rawValue: '$' });
    expect(prisma.referenceCurrency.findMany).toHaveBeenCalledWith({ where: { OR: [
      { name: { equals: '$', mode: 'insensitive' } },
      { nameAr: { equals: '$', mode: 'insensitive' } },
    ] } });
  });

  it('uses an exact stored DegreeLevel alias', async () => {
    const prisma = createPrismaMock();
    prisma.degreeLevel.findMany.mockResolvedValue([{ id: 'd1', canonicalCode: 'BACHELOR', nameEn: 'Bachelor', nameAr: 'بكالوريوس', aliases: ['Undergraduate'] }]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('DEGREE_LEVEL', { target: 'DEGREE_LEVEL', rawValue: 'Undergraduate' });
    expect(results[0].method).toBe('EXACT_ALIAS');
  });

  it('uses exact stored Major alias, not similarity', async () => {
    const prisma = createPrismaMock();
    prisma.major.findMany.mockResolvedValue([]);
    prisma.majorAlias.findMany.mockResolvedValue([{ normalizedAlias: 'artificial intelligence', major: { id: 'm1', publicId: 'MJR-0360', canonicalName: 'Artificial Intelligence', displayName: 'Artificial Intelligence' } }]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('MAJOR', { target: 'MAJOR', rawValue: 'Artificial Intelligence' });
    expect(prisma.majorAlias.findMany).toHaveBeenCalledWith({ where: { normalizedAlias: 'artificial intelligence' }, include: { major: true } });
    expect(results[0].method).toBe('EXACT_ALIAS');
  });

  it('surfaces multiple exact International Test matches for ambiguity handling', async () => {
    const prisma = createPrismaMock();
    prisma.internationalTest.findMany.mockResolvedValue([
      { id: 't1', publicId: 'TEST-A', canonicalName: 'Academic Test', displayName: 'Academic Test', abbreviation: null },
      { id: 't2', publicId: 'TEST-B', canonicalName: 'Academic Test', displayName: 'Academic Test', abbreviation: null },
    ]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('INTERNATIONAL_TEST', { target: 'INTERNATIONAL_TEST', rawValue: 'Academic Test' });
    expect(results).toHaveLength(2);
  });

  it('marks an exact International Test abbreviation explicitly', async () => {
    const prisma = createPrismaMock();
    prisma.internationalTest.findMany.mockResolvedValue([{ id: 't1', publicId: 'TEST-IELTS', canonicalName: 'International English Language Testing System', displayName: 'IELTS', abbreviation: 'IELTS' }]);
    const results = await new PrismaScholarshipCanonicalLookupGateway(prisma as any).findCandidates('INTERNATIONAL_TEST', { target: 'INTERNATIONAL_TEST', rawValue: 'IELTS' });
    expect(results[0].method).toBe('EXACT_ABBREVIATION');
  });
});
