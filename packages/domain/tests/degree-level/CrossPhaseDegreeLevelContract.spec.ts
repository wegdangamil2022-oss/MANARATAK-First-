import { describe, expect, it } from 'vitest';
import { CANONICAL_DEGREE_LEVEL_CODES, MajorPublicationReadinessPolicy, MajorImportCompletenessState, MajorStatus } from '../../src';

describe('Cross-phase DegreeLevel contract', () => {
  it('keeps the Phase 8 canonical code set as the shared source contract', () => {
    expect(CANONICAL_DEGREE_LEVEL_CODES).toEqual([
      'ASSOCIATE', 'DIPLOMA', 'BACHELOR', 'MASTER', 'FELLOWSHIP', 'DOCTORATE', 'CERTIFICATE'
    ]);
  });

  it('blocks Major publication when the Phase 8 DegreeLevel identity is absent', () => {
    const result = new MajorPublicationReadinessPolicy().evaluate({
      id: 'major-1', publicId: 'MJR-0001', slug: 'major-1', canonicalName: 'Major',
      canonicalDedupKey: 'major', displayName: 'Major', status: MajorStatus.READY_TO_PUBLISH,
      completenessStatus: MajorImportCompletenessState.COMPLETE, academicFieldId: 'taxonomy-1',
      officialSourceUrl: 'https://example.edu/major', profiles: [],
    });
    expect(result.blockingIssues.map((issue) => issue.code)).toContain('MAJOR_CANONICAL_DEGREE_REFERENCE_MISSING');
  });
});
