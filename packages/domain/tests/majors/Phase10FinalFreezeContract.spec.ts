import { describe, expect, it } from 'vitest';
import {
  MajorImportCompletenessState,
  MajorPublicationReadinessPolicy,
  MajorStatus,
  Phase11MajorConsumptionContract,
} from '../../src';

describe('Phase 10 final source-freeze contracts', () => {
  it('requires canonical Major and DegreeLevel references for a matched Phase 11 program', () => {
    expect(Phase11MajorConsumptionContract.validate({
      sourceProgramName: 'Computer Science',
      status: 'MATCHED',
    }).blockingCode).toBe('CANONICAL_MAJOR_ID_REQUIRED');

    expect(Phase11MajorConsumptionContract.validate({
      sourceProgramName: 'Computer Science',
      majorId: 'major-canonical-id',
      status: 'MATCHED',
    }).blockingCode).toBe('CANONICAL_DEGREE_LEVEL_ID_REQUIRED');
  });

  it('preserves unresolved programs without creating fake Major or taxonomy identities', () => {
    const decision = Phase11MajorConsumptionContract.validate({
      sourceProgramName: 'Unresolved interdisciplinary program',
      status: 'MAJOR_REVIEW_REQUIRED',
    });

    expect(decision.acceptable).toBe(true);
    expect(decision.createsMajorIdentity).toBe(false);
    expect(decision.createsTaxonomyIdentity).toBe(false);
  });

  it('blocks publication when canonical DegreeLevel, taxonomy, source, or mappings are missing', () => {
    const result = new MajorPublicationReadinessPolicy().evaluate({
      id: 'major-1',
      publicId: 'MJR-0001',
      slug: 'computer-science',
      canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science',
      displayName: 'Computer Science',
      status: MajorStatus.READY_TO_PUBLISH,
      completenessStatus: MajorImportCompletenessState.NEEDS_REVIEW,
    });

    const codes = result.blockingIssues.map((issue) => issue.code);
    expect(codes).toContain('MAJOR_INCOMPLETE');
    expect(codes).toContain('MAJOR_CANONICAL_DEGREE_REFERENCE_MISSING');
    expect(codes).toContain('MAJOR_CANONICAL_TAXONOMY_REFERENCE_MISSING');
    expect(codes).toContain('MAJOR_SOURCE_IDENTITY_MISSING');
  });

  it('does not combine DegreeLevel from one profile with taxonomy from a different profile', () => {
    const result = new MajorPublicationReadinessPolicy().evaluate({
      id: 'major-1',
      publicId: 'MJR-0001',
      slug: 'computer-science',
      canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science',
      displayName: 'Computer Science',
      status: MajorStatus.READY_TO_PUBLISH,
      completenessStatus: MajorImportCompletenessState.COMPLETE,
      officialSourceUrl: 'https://example.edu/majors/computer-science',
      profiles: [
        { id: 'profile-degree', level: 'BACHELOR', degreeLevelId: 'degree-bachelor' },
        { id: 'profile-taxonomy', level: 'MASTER', academicFieldId: 'taxonomy-computing' },
      ],
    });

    expect(result.blockingIssues.map(issue => issue.code)).toContain(
      'MAJOR_PROFILE_SCOPED_PUBLICATION_REFERENCE_MISSING',
    );
  });
});
