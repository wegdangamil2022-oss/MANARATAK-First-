import { describe, expect, it } from 'vitest';
import { ScholarshipImportScreeningReader } from '../../src/scholarships/import-center/ScholarshipImportScreeningReader';
import { scholarshipImportLanguagePolicy } from '../../src/scholarships/import-center/ScholarshipImportLanguagePolicy';

const payload = { _domainHandoff: { canonicalScreening: [
  { target: 'MAJOR', state: 'UNRESOLVED', rawValue: 'History' },
  { target: 'MAJOR', state: 'UNRESOLVED', rawValue: 'Law' },
  { target: 'INTERNATIONAL_TEST', state: 'UNRESOLVED', rawValue: 'IELTS Academic' },
  { target: 'INTERNATIONAL_TEST', state: 'RESOLVED', rawValue: 'TOEFL iBT', canonicalReferenceId: 'toefl-id' },
] } };
describe('Scholarship import requirement isolation', () => {
  it('creates stable, distinct review keys for historical multi-value targets', () => {
    const entries = ScholarshipImportScreeningReader.entries(payload);
    expect(new Set(entries.map(item => item.requirementKey)).size).toBe(4);
    const reversed = ScholarshipImportScreeningReader.entries({ _domainHandoff: { canonicalScreening: [...payload._domainHandoff.canonicalScreening].reverse() } });
    expect(new Map(entries.map(item => [item.rawValue, item.requirementKey])))
      .toEqual(new Map(reversed.map(item => [item.rawValue, item.requirementKey])));
    expect(ScholarshipImportScreeningReader.findRequirement(payload, 'MAJOR')).toBeNull();
  });
  it('applies a decision only to its exact source requirement', () => {
    const history = ScholarshipImportScreeningReader.entries(payload)[0];
    const decision = { fieldOrRequirementKey: history.requirementKey, canonicalEntityType: 'MAJOR',
      rawValue: 'History', resolutionType: 'RESOLVED', canonicalId: 'history-id', decisionId: 'review-1' };
    const result = ScholarshipImportScreeningReader.resolve(payload, [decision]);
    expect(result.entries[0].canonicalReferenceId).toBe('history-id');
    expect(result.entries[1].state).toBe('UNRESOLVED');
    expect(ScholarshipImportScreeningReader.resolve(payload, [{ ...decision, fieldOrRequirementKey: 'MAJOR' }]).decisionIds).toEqual([]);
    expect(ScholarshipImportScreeningReader.resolve(payload, [{ ...decision, rawValue: 'Law' }]).decisionIds).toEqual([]);
    expect(ScholarshipImportScreeningReader.resolve(payload, [{ ...decision, canonicalEntityType: 'COUNTRY' }]).decisionIds).toEqual([]);
  });
});

const languagePayload = () => ({ scholarshipName: 'Reviewed scholarship', officialSourceUrl: 'https://example.edu/admissions',
  metadata: { internationalTests: ['IELTS Academic', 'TOEFL iBT'], conditionalLanguageEvidence: {
    policy: 'ALTERNATIVE_EVIDENCE_WITH_EXEMPTIONS_NOT_ALL_REQUIRED', officialSourceUrl: 'https://example.edu/admissions',
    summary: 'One accepted language evidence unless exempt.', scoreConversion: false,
    alternatives: [{ sourceLabel: 'IELTS Academic', minimumOverall: 7 }, { sourceLabel: 'TOEFL iBT', minimumOverall: 100, scale: '0-120 as published' }],
    exemptions: 'English-taught graduates except applicants subject to regional rules.',
    testDateMustBeAfter: '2025-09-01', excludedModes: ['Home Edition', 'One Skill Retake'], delivery: 'Direct scores from the test organization.',
  } } });
describe('Scholarship conditional language mapping', () => {
  it('preserves alternatives, scores, exemptions and delivery in one visible condition', () => {
    const policy = scholarshipImportLanguagePolicy(languagePayload());
    expect(policy.valid).toBe(true);
    expect(policy.item).toMatchObject({ operatorCode: 'ANY_OF_WITH_EXEMPTIONS', itemTypeCode: 'LANGUAGE_PROFICIENCY', metadata: { automatedEligibility: false, scoreConversion: false } });
    for (const text of ['IELTS Academic: 7', 'TOEFL iBT: 100', 'regional rules', '2025-09-01', 'Home Edition', 'Direct scores']) expect(policy.item?.valueText).toContain(text);
    expect(policy.item?.internationalTestId).toBeUndefined();
  });
  it('rejects incomplete or inconsistent conditional evidence instead of flattening it', () => {
    const missing = languagePayload(); missing.metadata.internationalTests.push('Unreviewed test');
    expect(scholarshipImportLanguagePolicy(missing).valid).toBe(false);
    const invalidDate = languagePayload(); invalidDate.metadata.conditionalLanguageEvidence.testDateMustBeAfter = '2025-02-30';
    expect(scholarshipImportLanguagePolicy(invalidDate).valid).toBe(false);
    const wrongSource = languagePayload(); wrongSource.metadata.conditionalLanguageEvidence.officialSourceUrl = 'https://other.edu/';
    expect(scholarshipImportLanguagePolicy(wrongSource).valid).toBe(false);
  });
});
