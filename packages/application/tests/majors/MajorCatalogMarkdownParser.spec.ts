import { describe, expect, it } from 'vitest';
import { ImportTargetDomain } from '@manaratak/domain';
import { MajorCatalogMarkdownParser } from '../../src/majors/services/MajorCatalogMarkdownParser';

describe('MajorCatalogMarkdownParser', () => {
  it('parses bachelor catalog rows as major identity records', () => {
    const result = MajorCatalogMarkdownParser.parse(`
## 5. القائمة الكاملة حسب الكليات
## 5.11 كلية الحوسبة وتقنية المعلومات

| الرمز | الاسم بالعربية | الاسم بالإنجليزية |
|---|---|---|
| MJR-0001 | علوم الحاسوب | Computer Science |
| MJR-0002 | هندسة البرمجيات | Software Engineering |
`, 'BACHELOR');

    expect(result.rows).toHaveLength(2);
    expect(result.targetDomain).toBe(ImportTargetDomain.Majors);
    expect(result.rows[0]).toMatchObject({
      code: 'MJR-0001',
      catalogKind: 'BACHELOR',
      degreeLevel: 'Bachelor',
      canonicalMajorName: 'Computer Science',
      collegeOrFaculty: 'كلية الحوسبة وتقنية المعلومات',
    });
  });

  it('parses master and doctorate catalogs with level profiles', () => {
    const master = MajorCatalogMarkdownParser.parse('# القائمة الكاملة حسب المجالات الأكاديمية\n| MAS-0001 | العلوم الطبية | Medical Sciences | MSc | بحثي | امتداد |\n', 'MASTER');
    const doctorate = MajorCatalogMarkdownParser.parse('# القائمة الكاملة حسب المجالات الأكاديمية\n| DOC-0001 | العلوم الطبية | Medical Sciences | PhD | بحثية | امتداد |\n', 'DOCTORATE');

    expect(master.rows[0]).toMatchObject({
      classificationCode: 'MAS-0001',
      degreeLevel: 'Master',
      targetDomain: ImportTargetDomain.Majors,
    });
    expect(doctorate.rows[0]).toMatchObject({
      classificationCode: 'DOC-0001',
      degreeLevel: 'Doctorate',
      targetDomain: ImportTargetDomain.Majors,
    });
  });

  it('parses fellowships separately from majors', () => {
    const result = MajorCatalogMarkdownParser.parse('| FEL-0001 | زمالة طب القلب | Adult Cardiology Fellowship | زمالة تدريبية سريرية | القلب والأوعية | بعد تدريب مناسب | مطلوب |\n', 'FELLOWSHIP');

    expect(result.targetDomain).toBe(ImportTargetDomain.Fellowships);
    expect(result.rows[0]).toMatchObject({
      code: 'FEL-0001',
      catalogKind: 'FELLOWSHIP',
      canonicalMajorName: 'Adult Cardiology Fellowship',
      fellowshipType: 'زمالة تدريبية سريرية',
      professionalDomain: 'القلب والأوعية',
    });
  });
});
