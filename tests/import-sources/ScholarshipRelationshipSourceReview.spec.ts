import { describe, expect, it } from 'vitest';
import { readScholarshipMasterGuide } from '../../scripts/import/ScholarshipMasterGuideReader';
import { reviewScholarshipRelationships } from '../../scripts/import/ScholarshipRelationshipSourceReview';

const source = (body: string) => `### منحة رقم 0001 — Example\n**المعرّف الأصلي:** \`SCH-OC-0001\`\n**المستويات الأكاديمية ضمن هذا الملف:** بكالوريوس فقط\n**حالة الاستيراد النهائية:** IMPORTED\n${body}`;

describe('scholarship relationship source review', () => {
  it('preserves alternative tests and waivers without turning them into mandatory requirements or score conversions', () => {
    const raw = source('#### 8. الشروط ومعايير التقديم\nTOEFL ITP 500 أو IELTS 6.0، أو إعفاء معتمد عند اشتراطه\n#### 10. المستندات المطلوبة\nIELTS اختياري بحسب إعلان البرنامج');
    const review = reviewScholarshipRelationships(readScholarshipMasterGuide(raw)[0]);
    expect(review.academicLevelsRaw).toBe('بكالوريوس فقط');
    expect(review.testEvidence).toHaveLength(2);
    expect(review.testEvidence[0]).toMatchObject({ sourceLineNumber: 6, mentions: ['TOEFL ITP', 'IELTS'], reviewTags: ['ALTERNATIVES', 'EXEMPTION', 'CONDITIONAL'], isRequired: null, internationalTestId: null });
    expect(review.testEvidence[1].reviewTags).toEqual(['OPTIONAL', 'CONDITIONAL']);
    expect(review.testEvidence.every(item => item.scoreInterpretation === 'NO_AUTOMATIC_SCALE_VARIANT_OR_SCORE_CONVERSION')).toBe(true);
    expect(review.canonicalAssignments).toBe(0);
    expect(review.importReady).toBe(false);
  });

  it('retains explicit source identities for validation without inventing links from names', () => {
    const review = reviewScholarshipRelationships(readScholarshipMasterGuide(source('#### 2. الجهة المانحة\nNamed University INS-USA-0001\n#### 7. التخصصات المتاحة\nComputing MJR-0001'))[0]);
    expect(review.sourceReferences.universityPublicIds).toEqual(['INS-USA-0001']);
    expect(review.sourceReferences.majorPublicIds).toEqual(['MJR-0001']);
    expect(review.canonicalAssignments).toBe(0);
    const namesOnly = reviewScholarshipRelationships(readScholarshipMasterGuide(source('#### 2. الجهة المانحة\nNamed University'))[0]);
    expect(namesOnly.sourceReferences.universityPublicIds).toEqual([]);
  });

  it('keeps test mentions in explanatory notes but does not link financing or unrelated titles as eligibility', () => {
    const raw = source('#### 6. المميزات والتمويل\nTOEFL course discount\n#### 9. ملاحظات مهمة\nTOEFL iBT scale and cycle need review\n#### 11. رابط التقديم\nhttps://apply.example/IELTS');
    const review = reviewScholarshipRelationships(readScholarshipMasterGuide(raw)[0]);
    expect(review.testEvidence).toHaveLength(1);
    expect(review.testEvidence[0].section).toBe('ملاحظات مهمة');
    expect(review.testEvidence[0].interpretation).toBe('REVIEW_REQUIRED');
  });
});
