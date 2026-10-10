import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { UniversityAcademicProgramAuthoringInput } from '@manaratak/domain';
import { PrismaUniversityRepository } from '../../src/universities/PrismaUniversityRepository';
import { UniversityCanonicalRelationshipValidator, type UniversityRelationshipValidationClient } from '../../src/universities/UniversityCanonicalRelationshipValidator';

const input = (): UniversityAcademicProgramAuthoringInput => ({
  sourceProgramName: 'Computer Science', degreeLevelId: 'degree', majorId: 'major',
  majorMappingState: 'CANONICALLY_MAPPED', campusIds: ['campus'],
  admissionRequirements: [{ internationalTestId: 'test', testVariantId: 'variant', testVersionId: 'version', minimumScore: 6.5 }],
});
function fixture() {
  const client = {
    university: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'university' }) },
    degreeLevel: { findUnique: vi.fn().mockResolvedValue({ id: 'degree', status: 'ACTIVE' }) },
    major: { findUnique: vi.fn().mockResolvedValue({ id: 'major', status: 'PUBLISHED' }) },
    majorLevelProfile: { findFirst: vi.fn().mockResolvedValue({ id: 'profile' }) },
    internationalTest: { findUnique: vi.fn().mockResolvedValue({ id: 'test', status: 'PUBLISHED' }) },
    internationalTestVariant: { findUnique: vi.fn().mockResolvedValue({ testId: 'test' }) },
    internationalTestVersion: { findUnique: vi.fn().mockResolvedValue({ testId: 'test' }) },
    universityCampus: { findMany: vi.fn().mockResolvedValue([{ id: 'campus' }]), deleteMany: vi.fn(), create: vi.fn() },
    universityOrganizationUnit: { findFirst: vi.fn().mockResolvedValue({ id: 'unit' }) },
    universityAcademicProgram: { findFirst: vi.fn().mockResolvedValue({ id: 'program' }), deleteMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    universityProgramCampus: { deleteMany: vi.fn(), createMany: vi.fn() },
    universityProgramAdmissionRequirement: { deleteMany: vi.fn(), create: vi.fn() },
  };
  return { client, repository: new PrismaUniversityRepository(client as unknown as PrismaClient), validator: new UniversityCanonicalRelationshipValidator(client as unknown as UniversityRelationshipValidationClient) };
}
describe('M10-16 University program persistence integrity', () => {
  it.each(['authoring', 'normalized'] as const)('rejects duplicate admission requirements before any %s write', async route => {
    const f = fixture(); const data = input(); data.admissionRequirements!.push({ ...data.admissionRequirements![0] });
    const operation = route === 'authoring' ? f.repository.upsertAcademicProgram('university', 'program', data) : f.repository.replaceNormalizedDetails('university', { academicPrograms: [{ sourceProgramName: 'CS', degreeLevelId: 'degree', majorId: 'major', majorMappingState: 'CANONICALLY_MAPPED', admissionRequirements: [{ internationalTestId: 'test' }, { internationalTestId: 'test' }] }] });
    await expect(operation).rejects.toThrow('UNIVERSITY_ADMISSION_TEST_REQUIREMENT_DUPLICATE');
    expect(f.client.universityAcademicProgram.deleteMany).not.toHaveBeenCalled();
    expect(f.client.universityAcademicProgram.update).not.toHaveBeenCalled();
    expect(f.client.universityAcademicProgram.create).not.toHaveBeenCalled();
  });
  it.each([NaN, Infinity, -Infinity])('rejects non-finite admission minimum %s through both validators', async minimumScore => {
    const f = fixture(); const data = input(); data.admissionRequirements![0].minimumScore = minimumScore;
    await expect(f.validator.validateProgramAuthoring('university', data)).rejects.toThrow('UNIVERSITY_ADMISSION_TEST_MINIMUM_SCORE_INVALID');
    await expect(f.validator.validate({ academicPrograms: [{ sourceProgramName: 'CS', degreeLevelId: 'degree', majorMappingState: 'UNMAPPED', admissionRequirements: [{ internationalTestId: 'test', minimumScore }] }] })).rejects.toThrow('UNIVERSITY_ADMISSION_TEST_MINIMUM_SCORE_INVALID');
  });
  it('rejects a claimed canonical Major mapping without a target', async () => {
    const f = fixture(); const data = input(); data.majorId = null;
    await expect(f.validator.validateProgramAuthoring('university', data)).rejects.toThrow('UNIVERSITY_PROGRAM_MAJOR_REFERENCE_REQUIRED');
    expect(f.client.major.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a foreign campus before changing the existing program', async () => {
    const f = fixture(); f.client.universityCampus.findMany.mockResolvedValue([]);
    await expect(f.repository.upsertAcademicProgram('university', 'program', input())).rejects.toThrow('UNIVERSITY_PROGRAM_CAMPUS_NOT_FOUND');
    expect(f.client.universityCampus.findMany).toHaveBeenCalledWith({ where: { universityId: 'university', id: { in: ['campus'] } }, select: { id: true } });
    expect(f.client.universityAcademicProgram.update).not.toHaveBeenCalled();
    expect(f.client.universityProgramCampus.deleteMany).not.toHaveBeenCalled();
  });
  it('retains optional scores and different reviewed variants without inferring thresholds', async () => {
    const f = fixture(); const data = input(); data.admissionRequirements![0].minimumScore = null;
    data.admissionRequirements!.push({ internationalTestId: 'test', minimumScore: 0.5 });
    await expect(f.validator.validateProgramAuthoring('university', data)).resolves.toBeUndefined();
  });
});
