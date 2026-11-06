import { describe, expect, it } from 'vitest';
import { scholarshipImportSourceReview } from '../../src/scholarships/import-center/ScholarshipImportSourceReview';
import { academicOfferFixture } from './ScholarshipAcademicOfferFixture';
import { scholarshipImportReviewFingerprint } from '../../src/scholarships/import-center/ScholarshipImportReviewDecisionCodec';

describe('reviewed source academic offers', () => {
  it('preserves per-degree source items, bundles, repeated labels and conditional language without inventing programme identities', () => {
    const { raw, verification } = academicOfferFixture();
    const before = JSON.stringify(raw);
    const result = scholarshipImportSourceReview(raw, verification);
    expect(result.valid).toBe(true);
    expect(result).toMatchObject({
      academicOffer: {
        groups: [
          {
            sourceGroupId: 'source-group-2',
            degreeLabel: 'بكالوريوس',
            items: raw.metadata.sourcePresentation.degreeGroups[1].items,
          },
          {
            sourceGroupId: 'source-group-3',
            degreeLabel: 'ماجستير',
            items: ['الرياضيات والفيزياء.'],
          },
          {
            sourceGroupId: 'source-group-4',
            degreeLabel: 'دكتوراه',
            items: ['الرياضيات والفيزياء.'],
          },
        ],
      },
    });
    expect(result.payload.degreeLevel).toBe(raw.degreeLevel);
    expect(result.payload.studyLanguage).toBe(raw.studyLanguage);
    expect(result.payload.metadata?.rawSourceSections).toEqual(raw.metadata.rawSourceSections);
    expect(JSON.stringify(raw)).toBe(before);
    const base = {
      state: 'UNRESOLVED',
      canonicalReferenceId: null,
      canonicalPublicId: null,
      canonicalStandardCode: null,
    };
    const entries = [
      {
        ...base,
        requirementKey: 'degree',
        target: 'DEGREE_LEVEL' as const,
        rawValue: raw.degreeLevel,
      },
      {
        ...base,
        requirementKey: 'language',
        target: 'LANGUAGE' as const,
        rawValue: raw.studyLanguage,
      },
      {
        ...base,
        requirementKey: 'major',
        target: 'MAJOR' as const,
        rawValue: 'الرياضيات والفيزياء.',
      },
      {
        ...base,
        requirementKey: 'unrelated-major',
        target: 'MAJOR' as const,
        rawValue: 'Invented',
      },
      {
        ...base,
        requirementKey: 'program',
        target: 'ACADEMIC_PROGRAM' as const,
        rawValue: 'Unreviewed actual programme',
      },
    ];
    expect(result.contextualize(entries).map((x) => x.state)).toEqual([
      'SOURCE_ONLY',
      'SOURCE_ONLY',
      'SOURCE_ONLY',
      'UNRESOLVED',
      'UNRESOLVED',
    ]);
    expect(
      result.contextualize([
        { ...entries[2], state: 'RESOLVED', canonicalReferenceId: 'prior-major-id' },
      ])[0],
    ).toMatchObject({ state: 'REVIEW_REQUIRED', canonicalReferenceId: 'prior-major-id' });
  });

  it('rejects incomplete, reordered, duplicated, mismatched or forged source groups and degree labels', () => {
    for (const change of [
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.review.academicOffer.groups.pop();
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.review.academicOffer.groups.reverse();
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.review.academicOffer.groups[1].sourceGroupId = 'source-group-2';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.review.academicOffer.groups[0].degreeLabel = 'دبلوم';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.review.academicOffer.groups[0].degreeLevelId =
          f.review.academicOffer.groups[1].degreeLevelId;
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.raw.metadata.sourcePresentation.degreeGroups[1].items.pop();
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.raw.metadata.sourcePresentation.degreeGroups[1].title = 'الماجستير';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.raw.degreeLevel += ' ودبلوم';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.raw.studyLanguage = 'الإنجليزية';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.raw.metadata.sourceBasicFields['لغة الدراسة'] = 'Different';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.review.academicListEvidence = '';
      },
      (f: ReturnType<typeof academicOfferFixture>) => {
        f.raw.metadata.rawSourceSections['الدرجات التعليمية والتخصصات المتاحة'] =
          '1. Unheaded real item.\n' +
          f.raw.metadata.rawSourceSections['الدرجات التعليمية والتخصصات المتاحة'];
      },
    ]) {
      const f = academicOfferFixture();
      change(f);
      f.review.rawPayloadFingerprint = scholarshipImportReviewFingerprint(f.raw);
      expect(scholarshipImportSourceReview(f.raw, f.verification).valid).toBe(false);
    }
  });

  it('requires a verified, exact-payload review and never activates raw metadata as a review', () => {
    const f = academicOfferFixture();
    expect(
      scholarshipImportSourceReview(f.raw, { ...f.verification, state: 'PENDING' }).valid,
    ).toBe(false);
    f.raw.scholarshipName = 'Changed';
    expect(scholarshipImportSourceReview(f.raw, f.verification).valid).toBe(false);
    expect(
      scholarshipImportSourceReview({
        ...f.raw,
        metadata: { ...f.raw.metadata, reviewedAcademicOffer: f.review.academicOffer },
      }),
    ).not.toHaveProperty('academicOffer');
  });
});
