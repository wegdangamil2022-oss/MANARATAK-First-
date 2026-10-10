import { describe, expect, it } from 'vitest';
import { UniversityPublicationReadinessPolicy, UniversityImportCompletenessState,
  UniversityStatus, type UniversityDto } from '@manaratak/domain';

const ready = (): UniversityDto => ({
  id: 'university-1',
  publicId: 'INS-KOR-0001',
  slug: 'university',
  canonicalName: 'Example University',
  canonicalDedupKey: 'example-kr',
  displayName: 'Example University',
  countryReferenceId: 'country-1',
  status: UniversityStatus.READY_TO_PUBLISH,
  completenessStatus: UniversityImportCompletenessState.COMPLETE,
  academicPrograms: [{
    id: 'program-1', universityId: 'university-1', sourceProgramName: 'Physics',
    normalizedName: 'physics', degreeLevelId: 'degree-1',
    majorId: 'major-1', major: { status: 'PUBLISHED' },
    majorMappingState: 'CANONICALLY_MAPPED', status: 'ACTIVE',
    campusIds: [], admissionRequirements: [],
  }],
});

describe('University publication gates', () => {
  const policy = new UniversityPublicationReadinessPolicy();
  it('admits a complete institution with published canonical program links', () => {
    expect(policy.evaluate(ready()).blockingIssues).toEqual([]);
  });
  it('blocks unresolved major review and unapproved canonical major', () => {
    const entity = ready();
    entity.academicPrograms![0].majorId = null;
    entity.academicPrograms![0].majorMappingState = 'MAJOR_REVIEW_REQUIRED';
    expect(policy.evaluate(entity).blockingIssues.map(issue => issue.code))
      .toContain('UNIVERSITY_PROGRAM_MAJOR_REVIEW_REQUIRED');
    entity.academicPrograms![0].majorId = 'major-1';
    entity.academicPrograms![0].majorMappingState = 'CANONICALLY_MAPPED';
    entity.academicPrograms![0].major = { status: 'READY_TO_REVIEW' };
    expect(policy.evaluate(entity).blockingIssues.map(issue => issue.code))
      .toContain('UNIVERSITY_PROGRAM_MAJOR_NOT_PUBLISHED');
  });
});
