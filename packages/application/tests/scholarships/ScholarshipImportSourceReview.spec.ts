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
