import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ScholarshipImportPayloadSchema } from '@manaratak/domain';
import { readScholarshipMasterGuide } from '../../scripts/import/ScholarshipMasterGuideReader';
import { projectUnifiedScholarship } from '../../scripts/import/ScholarshipUnifiedSourceProjection';
import { scholarshipSourceSectionLabel } from '../../packages/domain/src/scholarships/ScholarshipSourceSections';

const sourcePath =
  'workspace/import-sources/scholarships/MANARATAK_Scholarships_Master_2027_Through_1138.md';
const content = fs.readFileSync(sourcePath, 'utf8'),
  hash = createHash('sha256').update(content).digest('hex');
const records = readScholarshipMasterGuide(content);
describe('unified 2027 scholarship projection', () => {
  it('maps every actual section and basic field for every record, preserving immutable source evidence', () => {
    const sections = new Set([
      'المعلومات الأساسية',
      'نبذة عن المنحة',
      'الجامعات المشاركة',
      'التمويل والمزايا',
      'التخصصات المتاحة',
      'الشروط ومعايير التقديم',
      'المستندات المطلوبة',
      'ملاحظات مهمة',
      'رابط التقديم',
    ]);
    const fields = new Set([
      'اسم المنحة',
      'الجهة المانحة',
      'بلد الدراسة',
      'العام الأكاديمي',
      'لغة الدراسة',
      'الموعد النهائي',
      'الدرجة التعليمية',
      'نوع التمويل',
      'حالة المنحة',
    ]);
    for (const record of records) {
      const payload = projectUnifiedScholarship(record, sourcePath, hash);
      expect(ScholarshipImportPayloadSchema.safeParse(payload).success, record.sourceRecordId).toBe(
        true,
      );
      expect(
        Object.keys(record.fields).every((key) => sections.has(scholarshipSourceSectionLabel(key))),
      ).toBe(true);
      expect(
        Object.keys(payload.metadata!.sourceBasicFields as object).every((key) => fields.has(key)),
      ).toBe(true);
      expect(payload.metadata!.rawSourceBlock).toBe(record.rawContent);
      expect(payload.metadata!.sourceRecordSha256).toBe(
        createHash('sha256').update(record.rawContent).digest('hex'),
      );
      expect(payload.metadata!.sourceSectionCoverage).toEqual(Object.keys(record.fields));
      expect(payload.metadata!.notes).toBeTruthy();
    }
  });
  it('projects 0094 exactly into five benefits, six conditions, eight documents, source degree groups and two application links', () => {
    const payload = projectUnifiedScholarship(
      records.find((record) => record.displayNumber === '0094')!,
      sourcePath,
      hash,
    );
    expect(payload.scholarshipName).toBe('منحة أكاديمية يانتشينغ بجامعة بكين');
    expect(payload.metadata!.benefits).toHaveLength(5);
    expect(payload.requiredDocuments).toHaveLength(8);
    expect(payload.metadata!.sourcePresentation).toMatchObject({
      applicationStatus: 'لم تُفتح بعد',
      degreeGroups: [{ title: 'أولًا: الماجستير', items: expect.any(Array) }],
    });
    expect(payload.applicationLink).toBe('https://apply.yca.pku.edu.cn/');
    expect(payload.officialSourceUrl).toBe('https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm');
    expect(payload.targetUniversities).toEqual([]);
    expect(payload.applicationDeadline).toBeUndefined(); // A date-only source never invents an instant/timezone.
  });
  it('rejects duplicate identities and ambiguous eligibility aliases instead of silently losing source data', () => {
    const body =
      '### 🎓 منحة رقم 0001 — Example\n<!-- المعرّف الأصلي: NEW-001 -->\n#### 1. شروط الأهلية ومعايير التقديم\n1. A';
    expect(() => readScholarshipMasterGuide(body + '\n' + body)).toThrow('DUPLICATE_ID');
    expect(() => readScholarshipMasterGuide(body + '\n#### 2. الشروط ومعايير التقديم\nB')).toThrow(
      'DUPLICATE_ELIGIBILITY_SECTION',
    );
  });
});
