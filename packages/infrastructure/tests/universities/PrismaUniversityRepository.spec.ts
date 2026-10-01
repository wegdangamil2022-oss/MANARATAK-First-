import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaUniversityRepository } from '../../src/universities/PrismaUniversityRepository';

describe('PrismaUniversityRepository', () => {
  let mockPrisma: any;
  let repository: PrismaUniversityRepository;

  beforeEach(() => {
    mockPrisma = {
      universityOrganizationUnit: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      university: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    repository = new PrismaUniversityRepository(mockPrisma as any);
  });


  it('lists canonical faculty/college units and ignores inactive programs in unresolved-major counts', async () => {
    mockPrisma.universityOrganizationUnit.findMany.mockResolvedValue([{
      id: 'unit-1', universityId: 'uni-1', campusId: null, parentOrganizationUnitId: null,
      unitType: 'FACULTY', name: 'Faculty of Engineering', status: 'ACTIVE',
      university: { id: 'uni-1', publicId: 'INS-1', displayName: 'University 1' },
      programs: [
        { majorId: 'major-cs', majorMappingState: 'CANONICALLY_MAPPED', status: 'ACTIVE' },
        { majorId: null, majorMappingState: 'UNMAPPED', status: 'REVIEW_REQUIRED' },
        { majorId: null, majorMappingState: 'UNMAPPED', status: 'INACTIVE' },
      ],
    }]);
    mockPrisma.universityOrganizationUnit.count.mockResolvedValue(1);

    const result = await repository.listOrganizationUnits!({ page: 1, pageSize: 50 });

    expect(mockPrisma.universityOrganizationUnit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { unitType: { in: ['FACULTY', 'COLLEGE', 'SCHOOL'] } },
    }));
    expect(result.data[0]).toMatchObject({
      programCount: 3,
      activeProgramCount: 1,
      mappedMajorCount: 1,
      unresolvedMajorCount: 1,
    });
  });

  it('update merges existing optional fields correctly', async () => {
    mockPrisma.university.findUnique.mockResolvedValue({
      id: 'db-id-1',
      optionalFields: {
        oldField: 'oldValue',
      },
    });

    mockPrisma.university.update.mockResolvedValue({
      id: 'db-id-1',
      displayName: 'New Name',
      optionalFields: {
        oldField: 'oldValue',
        newField: 'newValue',
      },
    });

    const result = await repository.update('db-id-1', {
      displayName: 'New Name',
      optionalFields: { newField: 'newValue' },
    });

    expect(mockPrisma.university.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'db-id-1' },
        data: expect.objectContaining({
          displayName: 'New Name',
          optionalFields: {
            oldField: 'oldValue',
            newField: 'newValue',
          },
        }),
      }),
    );

    expect(result.optionalFields).toMatchObject({ oldField: 'oldValue', newField: 'newValue' });
  });

  it('findByDedupKey returns mapped dto', async () => {
    mockPrisma.university.findUnique.mockResolvedValue({
      id: 'db-id-1',
      canonicalDedupKey: 'test|key',
      optionalFields: { foo: 'bar' },
    });

    const result = await repository.findByDedupKey('test|key');

    expect(mockPrisma.university.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { canonicalDedupKey: 'test|key' },
      }),
    );
    expect(result.id).toBe('db-id-1');
    expect(result.optionalFields).toMatchObject({ foo: 'bar' });
  });

  it('never allows optional fields to shadow canonical identity or relationships', async () => {
    mockPrisma.university.findUnique.mockResolvedValue({
      id: 'db-id-1',
      publicId: 'INS-USA-0001',
      displayName: 'Canonical University',
      countryReferenceId: null,
      academicPrograms: [],
      status: 'READY_TO_REVIEW',
      completenessStatus: 'NEEDS_REVIEW',
      optionalFields: {
        publicId: 'INS-FAKE-9999',
        displayName: 'Shadow University',
        countryReferenceId: 'fake-country-id',
        academicPrograms: [{ majorId: 'fake-major' }],
        description: 'Allowed legacy presentation field',
      },
    });

    const result = await repository.findById('db-id-1');

    expect(result).toMatchObject({
      publicId: 'INS-USA-0001',
      displayName: 'Canonical University',
      countryReferenceId: null,
      academicPrograms: [],
      description: 'Allowed legacy presentation field',
    });
    expect(result?.optionalFields).toEqual({ description: 'Allowed legacy presentation field' });
  });

  it('removes reserved canonical keys before persisting optional fields', async () => {
    mockPrisma.university.findUnique.mockResolvedValue({ id: 'db-id-1', optionalFields: {} });
    mockPrisma.university.update.mockImplementation(async ({ data }: any) => ({
      id: 'db-id-1',
      publicId: 'INS-USA-0001',
      status: 'READY_TO_REVIEW',
      completenessStatus: 'NEEDS_REVIEW',
      ...data,
    }));

    await repository.update('db-id-1', {
      optionalFields: {
        countryReferenceId: 'fake-country-id',
        status: 'PUBLISHED',
        description: 'Allowed field',
      },
    });

    expect(mockPrisma.university.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ optionalFields: { description: 'Allowed field' } }),
      }),
    );
  });


  it('maps AcademicProgram read models with canonical Degree/Major/Test identities', async () => {
    mockPrisma.university.findUnique.mockResolvedValue({
      id: 'db-id-1', publicId: 'INS-YEM-0001', status: 'READY_TO_REVIEW', completenessStatus: 'COMPLETE', optionalFields: {},
      academicPrograms: [{
        id: 'program-1', universityId: 'db-id-1', sourceReferenceId: 'src-program-1', sourceProgramName: 'Computer Science', normalizedName: 'computer science',
        degreeLevelId: 'degree-bachelor', majorId: 'major-cs', majorMappingState: 'CANONICALLY_MAPPED', status: 'ACTIVE', metadata: null,
        campuses: [{ campusId: 'campus-1' }],
        admissionRequirements: [{ id: 'req-1', academicProgramId: 'program-1', internationalTestId: 'test-ielts', testVariantId: null, testVersionId: null, minimumScore: 6.5, sectionScores: null, validityMetadata: null, restrictionMetadata: null, status: 'ACTIVE' }],
      }],
    });
    const result = await repository.findById('db-id-1');
    expect(result?.academicPrograms?.[0]).toMatchObject({
      id: 'program-1', universityId: 'db-id-1', degreeLevelId: 'degree-bachelor', majorId: 'major-cs', campusIds: ['campus-1'],
      admissionRequirements: [expect.objectContaining({ internationalTestId: 'test-ielts' })],
    });
  });

  it('filters university geography through canonical Country/Region/City ids', async () => {
    mockPrisma.university.findMany.mockResolvedValue([]);
    mockPrisma.university.count.mockResolvedValue(0);
    await repository.list({ countryReferenceId: 'country-ye', regionReferenceId: 'region-aden', cityReferenceId: 'city-aden' });
    expect(mockPrisma.university.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ countryReferenceId: 'country-ye', regionReferenceId: 'region-aden', cityReferenceId: 'city-aden' }),
    }));
  });

  it('lists universities by canonical countryReferenceId instead of country display text', async () => {
    mockPrisma.university.findMany.mockResolvedValue([]);
    mockPrisma.university.count.mockResolvedValue(0);

    await repository.list({
      country: 'Saudi Arabia',
      countryReferenceId: 'country-sa',
      page: 1,
      pageSize: 10,
    });

    expect(mockPrisma.university.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          countryReferenceId: 'country-sa',
        }),
      }),
    );
    expect(mockPrisma.university.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          country: 'Saudi Arabia',
        }),
      }),
    );
  });

  it('does not apply legacy country text filters unless compatibility is explicitly enabled', async () => {
    mockPrisma.university.findMany.mockResolvedValue([]);
    mockPrisma.university.count.mockResolvedValue(0);

    await repository.list({ country: 'Saudi Arabia', page: 1, pageSize: 10 });

    expect(mockPrisma.university.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('can temporarily apply country text filters when migration compatibility is enabled', async () => {
    const compatRepository = new PrismaUniversityRepository(mockPrisma as any, true);
    mockPrisma.university.findMany.mockResolvedValue([]);
    mockPrisma.university.count.mockResolvedValue(0);

    await compatRepository.list({ country: 'Saudi Arabia', page: 1, pageSize: 10 });

    expect(mockPrisma.university.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { country: 'Saudi Arabia' },
      }),
    );
  });
});
