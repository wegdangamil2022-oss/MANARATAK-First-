import { describe, expect, it } from 'vitest';
import {
  ScholarshipCompletenessClassifier,
  ScholarshipCompletenessState,
  ScholarshipDeduplicationService,
  ScholarshipNamingService,
} from '../../src';

describe('WP12-5 Scholarship cleaner, dedupe and completeness rules', () => {
  it('cleans the Qatar University example while preserving raw title and extracted semantics', () => {
    const result = ScholarshipNamingService.clean(
      'منحة جامعة قطر لدراسة الدكتوراه ممولة بالكامل 2027',
      ['منحة جامعة قطر للدكتوراه 2027 - التقديم مفتوح'],
    );

    expect(result.rawSourceTitle).toBe('منحة جامعة قطر لدراسة الدكتوراه ممولة بالكامل 2027');
    expect(result.cleanedScholarshipName).toBe('منحة جامعة قطر 2027');
    expect(result.detectedYear).toBe('2027');
    expect(result.extracted.fundingTypeCode).toBe('FULLY_FUNDED');
    expect(result.extracted.degreeLevelLabels).toContain('DOCTORATE');
    expect(result.sourceAliases).toEqual(['منحة جامعة قطر للدكتوراه 2027 - التقديم مفتوح']);
  });

  it('builds the approved provider + cleaned name + year/NO_YEAR key', () => {
    const withYear = ScholarshipDeduplicationService.buildKey({
      cleanedScholarshipName: 'منحة جامعة قطر 2027',
      providerName: 'Qatar University',
      providerCanonicalPublicId: 'INS-QA-001',
      year: '2027',
    });
    const withoutYear = ScholarshipDeduplicationService.buildKey({
      cleanedScholarshipName: 'Global Research Scholarship',
      providerName: 'Example Foundation',
    });

    expect(withYear.duplicateKey).toBe('V2|INS-QA-001|منحة جامعة قطر 2027|2027|NO_COUNTRY|NO_OFFICIAL_URL');
    expect(withoutYear.duplicateKey).toBe(
      'V2|example foundation|global research scholarship|NO_YEAR|NO_COUNTRY|NO_OFFICIAL_URL',
    );
  });

  it('never silently merges a duplicate-key collision', () => {
    const result = ScholarshipDeduplicationService.assess({
      cleanedScholarshipName: 'Example Scholarship',
      providerName: 'Example Foundation',
      year: '2027',
    }, [
      { id: 'sch-1', publicId: 'SCH-1' },
      { id: 'sch-2', publicId: 'SCH-2' },
    ]);

    expect(result.state).toBe('COLLISION_REVIEW');
    expect(result.requiresReview).toBe(true);
    expect(result.matches).toHaveLength(2);
  });

  it('uses layer A as the transfer identity threshold', () => {
    const result = ScholarshipCompletenessClassifier.classify({
      scholarshipName: 'Example Scholarship',
      sourceTraceable: true,
    });

    expect(result.state).toBe(ScholarshipCompletenessState.INCOMPLETE);
    expect(result.identityMissingFields).toEqual(['provider']);
  });

  it('uses layer B for review while layer C remains enrichment-only', () => {
    const review = ScholarshipCompletenessClassifier.classify({
      scholarshipName: 'Example Scholarship',
      cleanedScholarshipName: 'Example Scholarship',
      providerName: 'Example Foundation',
      sourceTraceable: true,
    });
    const complete = ScholarshipCompletenessClassifier.classify({
      scholarshipName: 'Example Scholarship',
      cleanedScholarshipName: 'Example Scholarship',
      providerName: 'Example Foundation',
      sourceTraceable: true,
      isFullyFunded: true,
      fundingCoverage: 'Tuition and stipend',
      studyCountry: 'Exampleland',
      degreeLevel: 'Master',
      eligibilityCriteria: 'Published eligibility criteria',
      requiredDocuments: ['Passport'],
      applicationDeadline: '2027-03-01',
    });

    expect(review.state).toBe(ScholarshipCompletenessState.NEEDS_REVIEW);
    expect(review.coreMissingFields.length).toBeGreaterThan(0);
    expect(complete.state).toBe(ScholarshipCompletenessState.COMPLETE);
    expect(complete.optionalMissingFields).toContain('studyLanguage');
    expect(complete.missingFields).toEqual([]);
  });
});
