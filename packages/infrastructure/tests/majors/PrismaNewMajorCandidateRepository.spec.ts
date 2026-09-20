import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaNewMajorCandidateRepository } from '../../src/majors/PrismaNewMajorCandidateRepository';

describe('PrismaNewMajorCandidateRepository', () => {
  let prisma: any;
  let repository: PrismaNewMajorCandidateRepository;

  beforeEach(() => {
    prisma = {
      universityAcademicProgram: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      scholarshipMajorTarget: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      scholarshipEligibilityItem: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    repository = new PrismaNewMajorCandidateRepository(prisma);
  });

  it('discovers only unresolved, active university programs', async () => {
    await repository.list({ page: 1, pageSize: 25, sourceType: 'UNIVERSITY_PROGRAM' });

    expect(prisma.universityAcademicProgram.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        majorId: null,
        majorMappingState: { in: ['MAJOR_REVIEW_REQUIRED', 'UNMAPPED'] },
        status: { notIn: ['INACTIVE', 'ARCHIVED'] },
      }),
    }));
    expect(prisma.scholarshipMajorTarget.findMany).not.toHaveBeenCalled();
  });

  it('does not surface archived scholarship relations as new-major candidates', async () => {
    await repository.list({ page: 1, pageSize: 25, sourceType: 'SCHOLARSHIP_MAJOR_TARGET' });

    expect(prisma.scholarshipMajorTarget.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        majorId: null,
        resolutionStatus: { notIn: ['RESOLVED', 'NOT_APPLICABLE'] },
        scholarship: { is: { status: { not: 'ARCHIVED' } } },
      }),
    }));
  });

  it('resolves a candidate with guarded writes that cannot overwrite an existing major link', async () => {
    prisma.universityAcademicProgram.findMany.mockResolvedValue([{
      id: 'program-1', sourceProgramName: 'New Engineering Major', degreeLevelId: 'degree-bachelor',
      degreeLevel: { id: 'degree-bachelor', canonicalCode: 'BACHELOR', displayName: 'Bachelor' },
      organizationUnit: { name: 'Faculty of Engineering' }, status: 'ACTIVE',
      university: { id: 'uni-1', publicId: 'INS-1', displayName: 'University 1', officialSourceUrl: 'https://u.example', sourceUrl: null, status: 'PUBLISHED' },
      createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-02'),
    }]);
    const listed = await repository.list({ page: 1, pageSize: 25, sourceType: 'UNIVERSITY_PROGRAM' });
    prisma.universityAcademicProgram.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.resolve(listed.data[0].candidateKey, 'major-1');

    expect(prisma.universityAcademicProgram.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['program-1'] },
        majorId: null,
        majorMappingState: { in: ['MAJOR_REVIEW_REQUIRED', 'UNMAPPED'] },
      },
      data: { majorId: 'major-1', majorMappingState: 'CANONICALLY_MAPPED' },
    });
    expect(result.universityPrograms).toBe(1);
  });
});
