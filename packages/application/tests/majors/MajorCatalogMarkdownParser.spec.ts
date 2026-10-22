import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ImportTargetDomain } from '@manaratak/domain';
import { MajorCatalogKind, MajorCatalogMarkdownParser } from '../../src/majors/services/MajorCatalogMarkdownParser';

describe('MajorCatalogMarkdownParser', () => {
  it.each<{
    file: string; kind: MajorCatalogKind; prefix: string; count: number;
  }>([
    { file: 'MANARATAK_Bachelor_Majors_By_Colleges_v1.0.md', kind: 'BACHELOR', prefix: 'MJR', count: 843 },
    { file: 'MANARATAK_Master_Specializations_By_Academic_Fields_v1.0.md', kind: 'MASTER', prefix: 'MAS', count: 1116 },
    { file: 'MANARATAK_Doctoral_Specializations_By_Academic_Fields_v1.0.md', kind: 'DOCTORATE', prefix: 'DOC', count: 1114 },
    { file: 'MANARATAK_Fellowships_By_Professional_Domains_v1.0.md', kind: 'FELLOWSHIP', prefix: 'FEL', count: 329 },
  ])('reads the actual $kind identity source without losing or duplicating codes', ({ file, kind, prefix, count }) => {
    const source = readFileSync(new URL(`../../../../workspace/phase-10-major-catalogs/${file}`, import.meta.url), 'utf8');
    const result = MajorCatalogMarkdownParser.parse(source, kind);

    expect(result.rows).toHaveLength(count);
    expect(result.rows.map(row => row.code)).toEqual(
      Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(4, '0')}`),
    );
    expect(result.rows.every(row => row.metadata.reviewStatus === 'NEEDS_REVIEW')).toBe(true);
    if (kind !== 'FELLOWSHIP') {
      expect(result.rows[0].academicFieldOrDiscipline).toBeUndefined();
    }
  });

  it.each(['Excluded titles', 'Cross-listed majors'])('keeps the %s section and its subsections out of a flat catalog', stopHeading => {
    const result = MajorCatalogMarkdownParser.parse(`
# MANARATAK_Bachelor_Majors_By_Colleges_v1.0.md
| MJR-0001 | علوم الحاسوب | Computer Science |
## ${stopHeading}
| MJR-9998 | مستبعد | Excluded |
### Review notes
| MJR-9999 | مكرر | Duplicate |
`, 'BACHELOR');

    expect(result.rows.map(row => row.code)).toEqual(['MJR-0001']);
  });

  it('does not treat a filename mentioned in an unrelated heading as a catalog', () => {
    const result = MajorCatalogMarkdownParser.parse(`
# Review of MANARATAK_Bachelor_Majors_By_Colleges_v1.0.md
| MJR-9999 | مثال | Example |
`, 'BACHELOR');
    expect(result.rows).toEqual([]);
  });

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
