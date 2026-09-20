import { describe, expect, it } from 'vitest';
import { MajorCompletenessClassifier, MajorImportCompletenessState } from '../../src';

describe('MajorCompletenessClassifier canonical readiness', () => {
  it('does not classify free-text-only content as complete', () => {
    const result = MajorCompletenessClassifier.classify({
      canonicalMajorName: 'Computer Science',
      degreeLevel: 'Bachelor',
      academicFieldOrDiscipline: 'Computing',
      collegeOrFaculty: 'College of Computing',
      officialSourceUrl: 'https://example.edu/major'
    });

    expect(result.state).toBe(MajorImportCompletenessState.NEEDS_REVIEW);
    expect(result.missingFields).toContain('degreeLevelId');
    expect(result.missingFields).toContain('GAP_TAXONOMY_TRUE');
  });

  it('requires canonical degree, taxonomy, source identity, and no critical mapping gaps', () => {
    const result = MajorCompletenessClassifier.classify({
      canonicalMajorName: 'Computer Science',
      degreeLevelId: 'degree-bachelor',
      disciplineId: 'taxonomy-computer-science',
      officialSourceUrl: 'https://example.edu/major'
    });

    expect(result).toEqual({ state: MajorImportCompletenessState.COMPLETE });
  });
});
