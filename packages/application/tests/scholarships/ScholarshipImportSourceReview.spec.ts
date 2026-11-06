import { describe, expect, it } from 'vitest';
import { scholarshipImportSourceReview } from '../../src/scholarships/import-center/ScholarshipImportSourceReview';
import { scholarshipImportReviewFingerprint } from '../../src/scholarships/import-center/ScholarshipImportReviewDecisionCodec';

function fixture() {
  const raw = { scholarshipName: 'Example', officialSourceUrl: 'https://academy.example.edu/admissions',
    eligibleMajorsOrFields: ['History', 'Economics'], coverageDetails: 'Original unreviewed funding text',
    metadata: { internationalTests: ['IELTS Academic'], conditionalLanguageEvidence: {
      policy: 'ALTERNATIVE_EVIDENCE_WITH_EXEMPTIONS_NOT_ALL_REQUIRED', officialSourceUrl: 'https://academy.example.edu/admissions',
      summary: 'One evidence route, subject to exemptions', alternatives: [{ sourceLabel: 'IELTS Academic', minimumOverall: 7 }],
      exemptions: 'Eligible international applicants only', testDateMustBeAfter: '2025-09-01', excludedModes: ['IELTS Online'],
      delivery: 'Official delivery', scoreConversion: false,
    } } };
  const review = { version: 1, rawPayloadFingerprint: scholarshipImportReviewFingerprint(raw), officialSourceUrls: [raw.officialSourceUrl, 'https://academy.example.edu/faq'],
    reason: 'Official admissions permits any prior degree field; these are research areas.',
    researchAreas: { classification: 'PROGRAM_RESEARCH_AREAS_NOT_PRIOR_DEGREE_RESTRICTIONS', sourceLabels: ['History', 'Economics'] },
    languageEvidence: 'CONDITIONAL_SOURCE_EVIDENCE_WITHOUT_CANONICAL_TEST_LINKS', corrections: { coverageDetails: 'Year one; year two requires a further approved application.' } };
  const verification = { state: 'VERIFIED' as const, evidence: { sourceReview: review } };
  return { raw, review, verification };
}

describe('ScholarshipImportSourceReview', () => {
  it('reviews a date-only source deadline without inventing a closing instant or replacing contradictory evidence', () => {
    const raw = { scholarshipName: 'KAS-SAIIA', officialSourceUrl: 'https://source.example/awards',
      metadata: { sourceBasicFields: { 'الموعد النهائي': '1 سبتمبر 2026' }, sourcePresentation: { deadlineText: '1 سبتمبر 2026' } } };
    const review = { version: 1, rawPayloadFingerprint: scholarshipImportReviewFingerprint(raw), officialSourceUrls: [raw.officialSourceUrl],
      reason: 'Literal source calendar day reviewed; no timezone or closing time supplied.', dateOnlyDeadline: { sourceText: '1 سبتمبر 2026' } };
    const before = JSON.stringify(raw);
    const result = scholarshipImportSourceReview(raw, { state: 'VERIFIED', evidence: { sourceReview: review } });
    expect(result).toMatchObject({ valid: true, reviewedDeadline: true, reviewedDeadlineAbsence: false });
    expect(result.payload.metadata).toMatchObject({ deadlineMode: 'DATE_ONLY', sourceDeadlineDate: '2026-09-01' });
    expect(result.payload.applicationDeadline).toBeUndefined();
    expect(JSON.stringify(raw)).toBe(before);
    for (const changed of [
      { ...raw, applicationDeadline: '2026-09-01T12:00:00Z' },
      { ...raw, metadata: { ...raw.metadata, deadlineMode: 'ROLLING' } },
      { ...raw, metadata: { ...raw.metadata, sourcePresentation: { deadlineText: 'Different source date' } } },
      { ...raw, metadata: { ...raw.metadata, sourceBasicFields: {} } },
    ]) expect(scholarshipImportSourceReview(changed, { state: 'VERIFIED', evidence: { sourceReview: {
      ...review, rawPayloadFingerprint: scholarshipImportReviewFingerprint(changed),
    } } }).valid).toBe(false);
    expect(scholarshipImportSourceReview(raw, { state: 'VERIFIED', evidence: { sourceReview: {
      ...review, dateOnlyDeadline: { sourceText: '15 يناير 2026' },
    } } }).valid).toBe(false);
    expect(scholarshipImportSourceReview(raw, { state: 'VERIFIED', evidence: { sourceReview: {
      ...review, deadlineEvidence: 'ABSENT_FROM_SOURCE_BASIC_FIELDS',
    } } }).valid).toBe(false);
  });
  it('supersedes only a literal academic preamble without rewriting the staged source or clearing actual majors', () => {
    const raw = { scholarshipName: 'ELTE', officialSourceUrl: 'https://elte.example/awards',
      eligibleMajorsOrFields: ['Programmes depend on the sending partner.', 'Mathematics and Physics.', 'Computer Science.'],
      metadata: { rawSourceSections: { 'التخصصات المتاحة': 'Programmes depend on the sending partner.\n\n**Bachelor**\n1. Mathematics and Physics.\n\n**Master**\n1. Computer Science.' } } };
    const review = { version: 1, rawPayloadFingerprint: scholarshipImportReviewFingerprint(raw),
      officialSourceUrls: [raw.officialSourceUrl], reason: 'Preserve context separately from literal numbered academic entries.', academicListEvidence: 'NUMBERED_SOURCE_ITEMS_ONLY' };
    const before = JSON.stringify(raw);
    const result = scholarshipImportSourceReview(raw, { state: 'VERIFIED', evidence: { sourceReview: review } });
    expect(result.valid).toBe(true);
    expect(result.payload.eligibleMajorsOrFields).toEqual(['Mathematics and Physics.', 'Computer Science.']);
    expect(result.payload.metadata?.rawSourceSections).toEqual(raw.metadata.rawSourceSections);
    const entries = raw.eligibleMajorsOrFields.map((rawValue, i) => ({ requirementKey: `major-${i}`, target: 'MAJOR' as const,
      rawValue, state: 'UNRESOLVED', canonicalReferenceId: null, canonicalPublicId: null, canonicalStandardCode: null }));
    expect(result.contextualize(entries).map(item => item.state)).toEqual(['SOURCE_ONLY', 'UNRESOLVED', 'UNRESOLVED']);
    expect(JSON.stringify(raw)).toBe(before);
    for (const changed of [
      { ...raw, eligibleMajorsOrFields: [...raw.eligibleMajorsOrFields, 'Invented label'] },
      { ...raw, eligibleMajorsOrFields: ['Programmes depend on the sending partner.', 'Computer Science.', 'Mathematics and Physics.'] },
      { ...raw, metadata: { rawSourceSections: { 'التخصصات المتاحة': 'Unnumbered context only.' } } },
      { ...raw, metadata: {} },
    ]) expect(scholarshipImportSourceReview(changed, { state: 'VERIFIED', evidence: { sourceReview: {
      ...review, rawPayloadFingerprint: scholarshipImportReviewFingerprint(changed),
    } } }).valid).toBe(false);
    expect(scholarshipImportSourceReview(raw, { state: 'PENDING', evidence: { sourceReview: review } }).valid).toBe(false);
    expect(scholarshipImportSourceReview(raw, { state: 'VERIFIED', evidence: { sourceReview: { ...review,
      researchAreas: { classification: 'PROGRAM_RESEARCH_AREAS_NOT_PRIOR_DEGREE_RESTRICTIONS', sourceLabels: raw.eligibleMajorsOrFields },
    } } }).valid).toBe(false);
  });
  it('records reviewed absence of a source deadline without inventing a date or changing source evidence', () => {
    const { raw, review } = fixture();
    const source = { ...raw, metadata: { ...raw.metadata,
      sourceBasicFields: { 'اسم المنحة': 'Example' }, sourcePresentation: { deadlineText: '' },
    } };
    const decision = { ...review, rawPayloadFingerprint: scholarshipImportReviewFingerprint(source), deadlineEvidence: 'ABSENT_FROM_SOURCE_BASIC_FIELDS' };
    const before = JSON.stringify(source);
    const result = scholarshipImportSourceReview(source, { state: 'VERIFIED', evidence: { sourceReview: decision } });
    expect(result.valid).toBe(true);
    expect(result.payload.metadata?.deadlineMode).toBe('NOT_STATED_IN_SOURCE');
    expect(result.payload.applicationDeadline).toBeUndefined();
    expect(JSON.stringify(source)).toBe(before);
    for (const changed of [
      { ...source, applicationDeadline: '2027-01-01' },
      { ...source, metadata: { ...source.metadata, sourceBasicFields: { 'اسم المنحة': 'Example', 'الموعد النهائي': 'November 2027' } } },
      { ...source, metadata: { ...source.metadata, sourcePresentation: { deadlineText: 'November 2027' } } },
      { ...source, metadata: { ...source.metadata, deadlineType: 'FIXED' } },
      { ...source, metadata: { ...source.metadata, sourceBasicFields: undefined } },
    ]) {
      expect(scholarshipImportSourceReview(changed, { state: 'VERIFIED', evidence: { sourceReview: {
        ...decision, rawPayloadFingerprint: scholarshipImportReviewFingerprint(changed),
      } } }).valid).toBe(false);
    }
  });
  it('retains eligibility review enrichment without replacing the original source criteria', () => {
    const { raw, review, verification } = fixture();
    const source = { ...raw, eligibilityCriteria: 'Literal source only.' };
    const decision = { ...review, rawPayloadFingerprint: scholarshipImportReviewFingerprint(source), corrections: { ...review.corrections, eligibilityCriteria: 'Expanded official restrictions must stay in evidence.' } };
    const result = scholarshipImportSourceReview(source, { ...verification, evidence: { sourceReview: decision } });
    expect(result.valid).toBe(true);
    expect(result.payload.eligibilityCriteria).toBe(source.eligibilityCriteria);
    expect(result.payload.metadata?.reviewedSourceInterpretation).toMatchObject({ corrections: { eligibilityCriteria: 'Expanded official restrictions must stay in evidence.' } });
  });
  it('retains all source context without inventing majors or test foreign keys', () => {
    const { raw, verification } = fixture();
    const before = JSON.stringify(raw);
    const result = scholarshipImportSourceReview(raw, verification);
    expect(result.valid).toBe(true);
    expect(result.payload.eligibleMajorsOrFields).toBeUndefined();
    expect(result.payload.metadata?.researchAreas).toEqual(['History', 'Economics']);
    expect(result.payload.coverageDetails).toContain('requires a further approved application');
    const item = { requirementKey: 'k', target: 'MAJOR' as const, rawValue: 'History', state: 'UNRESOLVED', canonicalReferenceId: null, canonicalPublicId: null, canonicalStandardCode: null };
    expect(result.contextualize([item, { ...item, target: 'INTERNATIONAL_TEST', rawValue: 'IELTS Academic' }, { ...item, target: 'ACADEMIC_PROGRAM', rawValue: 'Program' }]).map(entry => entry.state)).toEqual(['SOURCE_ONLY', 'SOURCE_ONLY', 'UNRESOLVED']);
    expect(JSON.stringify(raw)).toBe(before);
  });
  it('rejects changed source, incomplete or duplicate labels, unverified review and untrusted URLs', () => {
    for (const change of [
      (f: ReturnType<typeof fixture>) => { f.raw.coverageDetails = 'Changed'; },
      (f: ReturnType<typeof fixture>) => { f.review.researchAreas.sourceLabels.pop(); },
      (f: ReturnType<typeof fixture>) => { f.review.researchAreas.sourceLabels = ['History', 'History']; },
      (f: ReturnType<typeof fixture>) => { f.review.officialSourceUrls.push('https://untrusted.example/faq'); },
      (f: ReturnType<typeof fixture>) => { f.review.officialSourceUrls[0] = 'http://academy.example.edu/admissions'; },
    ]) { const f = fixture(); change(f); expect(scholarshipImportSourceReview(f.raw, f.verification).valid).toBe(false); }
    const f = fixture();
    expect(scholarshipImportSourceReview(f.raw, { ...f.verification, state: 'PENDING' }).valid).toBe(false);
  });
  it('cannot change identity, deadlines, links or use malformed language evidence', () => {
    const f = fixture();
    expect(scholarshipImportSourceReview(f.raw, { ...f.verification, evidence: { sourceReview: { ...f.review, corrections: { applicationDeadline: '2030-01-01' } } } }).valid).toBe(false);
    f.raw.metadata.conditionalLanguageEvidence.alternatives = [];
    f.review.rawPayloadFingerprint = scholarshipImportReviewFingerprint(f.raw);
    expect(scholarshipImportSourceReview(f.raw, f.verification).valid).toBe(false);
  });
  it('does not interpret unreviewed source or use unrelated evidence', () => {
    const f = fixture();
    const result = scholarshipImportSourceReview(f.raw);
    expect(result).toMatchObject({ present: false, valid: true, payload: f.raw });
  });
});
