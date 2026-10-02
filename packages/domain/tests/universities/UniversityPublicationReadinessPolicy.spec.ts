import { describe, expect, it } from 'vitest';
import { UniversityPublicationReadinessPolicy } from '../../src/universities/UniversityPublicationReadinessPolicy';
import { UniversityImportCompletenessState, UniversityStatus } from '../../src/universities/universities';

describe('UniversityPublicationReadinessPolicy normalized program mappings', () => {
  it('blocks a CANONICALLY_MAPPED program whose canonical IDs are missing regardless of legacy status', () => {
    const result = new UniversityPublicationReadinessPolicy().evaluate({
      id: 'uni-1', publicId: 'INS-YEM-0001', slug: 'uni', canonicalName: 'University', canonicalDedupKey: 'uni', displayName: 'University',
      countryReferenceId: 'country-ye', status: UniversityStatus.READY_TO_PUBLISH,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
      academicPrograms: [{ id: 'program-1', universityId: 'uni-1', sourceProgramName: 'Computer Science', normalizedName: 'computer science', degreeLevelId: null, majorId: null, status: 'ACTIVE', majorMappingState: 'CANONICALLY_MAPPED', campusIds: [], admissionRequirements: [], metadata: null }],
    });
    expect(result.blockingIssues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'UNIVERSITY_PROGRAM_MAJOR_REFERENCE_MISSING',
      'UNIVERSITY_PROGRAM_DEGREE_REFERENCE_MISSING',
    ]));
  });

  it('evaluates nested AcademicProgram admission requirements as canonical P9 links', () => {
    const result = new UniversityPublicationReadinessPolicy().evaluate({
      id: 'uni-1', publicId: 'INS-YEM-0001', slug: 'uni', canonicalName: 'University', canonicalDedupKey: 'uni', displayName: 'University',
      countryReferenceId: 'country-ye', status: UniversityStatus.READY_TO_PUBLISH,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
      academicPrograms: [{
        id: 'program-1', universityId: 'uni-1', sourceProgramName: 'Computer Science', normalizedName: 'computer science',
        degreeLevelId: 'degree-bachelor', majorId: 'major-cs', status: 'ACTIVE', majorMappingState: 'CANONICALLY_MAPPED', campusIds: [], metadata: null,
        admissionRequirements: [{ id: 'req-1', academicProgramId: 'program-1', internationalTestId: '', status: 'ACTIVE' }],
      }],
    } as any);
    expect(result.blockingIssues.map(issue => issue.code)).toContain('UNIVERSITY_TEST_REFERENCE_MISSING');
  });

});
