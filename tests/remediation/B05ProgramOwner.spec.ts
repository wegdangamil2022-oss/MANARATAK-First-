import { describe, expect, it, vi } from 'vitest';
import { PrismaUniversityProgramReadPort } from '../../packages/infrastructure/src/universities/PrismaUniversityProgramReadPort';
import { PrismaScholarshipRepository } from '../../packages/infrastructure/src/scholarships/PrismaScholarshipRepository';
import { PrismaScholarshipCanonicalLookupGateway } from '../../packages/infrastructure/src/scholarships/PrismaScholarshipCanonicalLookupGateway';
import { isPublicScholarshipUniversityLink } from '../../packages/domain/src/public-boundaries/PublicOwnerPolicy';
import { projectPublishedScholarship } from '../../packages/application/src/scholarships/use-cases/ScholarshipPublicProjection';
const program = (change: Record<string, unknown> = {}) => ({
  id: 'program',
  universityId: 'university',
  degreeLevelId: 'degree',
  majorId: 'major',
  sourceProgramName: 'Owner program',
  normalizedName: 'owner program',
  status: 'ACTIVE',
  majorMappingState: 'CANONICALLY_MAPPED',
  university: {
    status: 'PUBLISHED',
    countryReference: { isActive: true, lifecycleState: 'ACTIVE' },
    regionReferenceId: null,
    cityReferenceId: null,
  },
  major: {
    status: 'PUBLISHED',
    levelProfiles: [
      {
        degreeLevelId: 'degree',
        status: 'PUBLISHED',
        id: 'profile',
        currentPublishedVersionId: 'published-version',
        currentPublishedVersion: { id: 'published-version', majorId: 'major', profileId: 'profile', status: 'PUBLISHED' },
      },
    ],
  },
  ...change,
});
function setup(rows = [program()]) {
  const delegate = { findMany: vi.fn(async () => rows) };
  const owner = new PrismaUniversityProgramReadPort({
    universityAcademicProgram: delegate,
  } as never);
  const scholarship = {
    create: vi.fn(async () => ({ id: 'scholarship', universityLinks: [] })),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findUnique: vi.fn(async () => ({
      id: 'scholarship',
      universityLinks: [
        { academicProgramId: 'program', universityId: 'university', resolutionStatus: 'RESOLVED' },
      ],
    })),
  };
  // This client has no university/program delegates: consumers cannot issue owner ORM queries.
  const db = { scholarship };
  const repo = new PrismaScholarshipRepository(db as never, false, owner);
  return { owner, delegate, db, repo, scholarship };
}
describe('B05 versioned owner program read contract', () => {
  it('returns exact bounded owner/degree/publication proof without matching labels', async () => {
    const h = setup([program(), program({ id: 'out-of-scope' })]);
    expect(await h.owner.findByIds(['program'])).toEqual([
      {
        contractVersion: 1,
        id: 'program',
        universityId: 'university',
        degreeLevelId: 'degree',
        majorId: 'major',
        canonicalName: 'owner program',
        displayName: 'Owner program',
        degreeLabel: undefined,
        majorLabel: undefined,
        studyLanguages: [],
        status: 'ACTIVE',
        publiclyEligible: true,
      },
    ]);
    expect(h.delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['program'] } }, take: 501 }),
    );
    await expect(h.owner.findByIds([' Owner program '])).rejects.toThrow('ID_INVALID');
    await expect(
      h.owner.findByIds(Array.from({ length: 501 }, (_, i) => String(i))),
    ).rejects.toThrow('SCOPE_TOO_LARGE');
  });
  it.each([
    { status: 'ARCHIVED' },
    { majorMappingState: 'UNRESOLVED' },
    { university: { status: 'DRAFT' } },
    { university: { status: 'PUBLISHED', countryReference: null } },
    { university: { status: 'PUBLISHED', countryReference: { isActive: false, lifecycleState: 'ACTIVE' } } },
    { university: { status: 'PUBLISHED', countryReference: { isActive: true, lifecycleState: 'ARCHIVED' } } },
    { major: { status: 'DRAFT', levelProfiles: [] } },
    {
      major: {
        status: 'PUBLISHED',
        levelProfiles: [
          { degreeLevelId: 'other-degree', status: 'PUBLISHED', currentPublishedVersionId: 'v' },
        ],
      },
    },
    {
      major: {
        status: 'PUBLISHED',
        levelProfiles: [
          { degreeLevelId: 'degree', status: 'PUBLISHED', currentPublishedVersionId: null },
        ],
      },
    },
  ])('rejects unpublished/inexact owner proof %j', async (change) => {
    const h = setup([program(change)]);
    expect(await h.owner.findPublished({ academicProgramId: 'program' })).toEqual([]);
    expect(
      await new PrismaScholarshipCanonicalLookupGateway({} as never, h.owner).findCandidates(
        'ACADEMIC_PROGRAM',
        { target: 'ACADEMIC_PROGRAM', canonicalId: 'program' },
      ),
    ).toEqual([]);
    await expect(
      h.repo.create({ universityLinks: [{ academicProgramId: 'program' }] } as never),
    ).rejects.toThrow('NOT_PUBLISHED');
    expect(h.scholarship.create).not.toHaveBeenCalled();
  });
  it('rejects foreign university and degree even when an imprecise delegate returns the row', async () => {
    const h = setup();
    expect(
      await h.owner.findPublished({ universityId: 'foreign', academicProgramId: 'program' }),
    ).toEqual([]);
    expect(
      await h.owner.findPublished({
        degreeLevelId: 'foreign-degree',
        academicProgramId: 'program',
      }),
    ).toEqual([]);
    await expect(
      h.repo.create({
        universityLinks: [{ academicProgramId: 'program', universityId: 'foreign' }],
      } as never),
    ).rejects.toThrow('UNIVERSITY_MISMATCH');
    expect(h.scholarship.create).not.toHaveBeenCalled();
  });
  it('normalizes a verified implied parent only, preserving unresolved source-only rows', async () => {
    const h = setup();
    await h.repo.create({
      universityLinks: [
        { academicProgramId: 'program', sourceLabel: 'evidence' },
        { sourceLabel: 'unresolved owner', resolutionStatus: 'UNRESOLVED' },
      ],
    } as never);
    const data = h.scholarship.create.mock.calls[0][0].data;
    expect(data.universityLinks.create).toEqual([
      expect.objectContaining({
        academicProgramId: 'program',
        universityId: 'university',
        resolutionStatus: 'RESOLVED',
      }),
      expect.objectContaining({ sourceLabel: 'unresolved owner', resolutionStatus: 'UNRESOLVED' }),
    ]);
  });
  it('returns no name-only candidate and never resolves a request in another parent/degree scope', async () => {
    const h = setup();
    const lookup = new PrismaScholarshipCanonicalLookupGateway({} as never, h.owner);
    expect(
      await lookup.findCandidates('ACADEMIC_PROGRAM', {
        target: 'ACADEMIC_PROGRAM',
        rawValue: 'Owner program',
      }),
    ).toEqual([]);
    expect(h.delegate.findMany).not.toHaveBeenCalled();
    expect(
      await lookup.findCandidates('ACADEMIC_PROGRAM', {
        target: 'ACADEMIC_PROGRAM',
        canonicalId: 'program',
        degreeLevelId: 'wrong',
      }),
    ).toEqual([]);
    expect(
      await lookup.findCandidates('ACADEMIC_PROGRAM', {
        target: 'ACADEMIC_PROGRAM',
        canonicalId: 'program',
        universityId: 'university',
        degreeLevelId: 'degree',
      }),
    ).toEqual([expect.objectContaining({ id: 'program', ownerId: 'university' })]);
  });
  it('hydrates public publication proof via the owner port rather than nested program joins', async () => {
    const h = setup();
    const dto = await h.repo.findById('scholarship');
    expect(
      h.scholarship.findUnique.mock.calls[0][0].include.universityLinks.include,
    ).not.toHaveProperty('academicProgram');
    expect(isPublicScholarshipUniversityLink(dto!.universityLinks![0] as never)).toBe(true);
    const publicDto = projectPublishedScholarship(dto!, 'Scholarship');
    expect(publicDto.universityLinks).toEqual([
      expect.objectContaining({ academicProgramId: 'program', universityId: 'university' }),
    ]);
    expect(JSON.stringify(publicDto)).not.toContain('ownerProof');
    expect(
      isPublicScholarshipUniversityLink({
        ...dto!.universityLinks![0],
        universityId: 'foreign',
      } as never),
    ).toBe(false);
  });
  it('binds owner reads to the supplied transaction without falling back to the global client', async () => {
    const h = setup();
    const scoped = {
      universityAcademicProgram: {
        findMany: vi.fn(async () => [program({ universityId: 'transaction-owner' })]),
      },
    };
    const bound = h.owner.withTransaction({
      boundaryId: 'boundary',
      transactionClient: scoped,
    } as never);
    expect((await bound.findByIds(['program']))[0].universityId).toBe('transaction-owner');
    expect(h.delegate.findMany).not.toHaveBeenCalled();
    expect(() => h.owner.withTransaction({ boundaryId: '' })).toThrow('TRANSACTION_REQUIRED');
  });
  it('binds the scholarship writer and owner proof to the same atomic transaction', async () => {
    const h = setup();
    const create = vi.fn(async () => ({ id: 'scholarship', universityLinks: [] }));
    const scoped = {
      universityAcademicProgram: {
        findMany: vi.fn(async () => [program({ universityId: 'transaction-owner' })]),
      },
      scholarship: { create },
    };
    const writer = h.repo.withTransaction({
      boundaryId: 'write-boundary',
      transactionClient: scoped,
    } as never);
    await writer.create({ universityLinks: [{ academicProgramId: 'program' }] } as never);
    expect(create.mock.calls[0][0].data.universityLinks.create[0].universityId).toBe(
      'transaction-owner',
    );
    expect(h.delegate.findMany).not.toHaveBeenCalled();
  });
  it('keeps missing owners unresolved and omits missing owner proof from public relations', async () => {
    const h = setup([]);
    await expect(
      h.repo.create({ universityLinks: [{ academicProgramId: 'program' }] } as never),
    ).rejects.toThrow('NOT_FOUND');
    const dto = await h.repo.findById('scholarship');
    expect(projectPublishedScholarship(dto!, 'Scholarship').universityLinks).toEqual([]);
  });
  it('hydrates a large valid page in bounded owner batches without dropping its tail', async () => {
    const h = setup();
    const ids = Array.from({ length: 501 }, (_, i) => `program-${i}`);
    h.scholarship.findUnique.mockResolvedValue({
      id: 'scholarship',
      universityLinks: ids.map((id) => ({
        academicProgramId: id,
        universityId: 'university',
        resolutionStatus: 'RESOLVED',
      })),
    });
    h.delegate.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => program({ id })),
    );
    const dto = await h.repo.findById('scholarship');
    expect(h.delegate.findMany.mock.calls.map((call) => call[0].where.id.in.length)).toEqual([
      500, 1,
    ]);
    expect(dto!.universityLinks).toHaveLength(501);
    expect(isPublicScholarshipUniversityLink(dto!.universityLinks![500] as never)).toBe(true);
  });
  it('fails explicitly on oversized public scopes instead of returning a sampled global total', async () => {
    const h = setup(Array.from({ length: 501 }, (_, i) => program({ id: String(i) })));
    await expect(h.owner.findPublished({ universityId: 'university' })).rejects.toThrow(
      'REQUIRES_PAGED_QUERY',
    );
  });
});
