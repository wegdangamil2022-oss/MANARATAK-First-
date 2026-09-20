import { describe, expect, it } from 'vitest';
import { ImportTargetDomain } from '@manaratak/domain';
import { MajorDetailDossierMarkdownParser } from '../../src/majors/services/MajorDetailDossierMarkdownParser';

describe('MajorDetailDossierMarkdownParser', () => {
  it('parses bachelor detail dossiers into reviewed content blocks', () => {
    const result = MajorDetailDossierMarkdownParser.parse(`
# 1. الطب والجراحة — Medicine and Surgery

| الرمز | MJR-0001 |
|---|---|

## 1. البيانات الأساسية
Bachelor profile data.

## 2. النبذة
Detailed overview.
`, 'BACHELOR');

    expect(result.rows).toHaveLength(1);
    expect(result.targetDomain).toBe(ImportTargetDomain.Majors);
    expect(result.rows[0]).toMatchObject({
      code: 'MJR-0001',
      catalogKind: 'BACHELOR',
      degreeLevel: 'Bachelor',
      canonicalMajorName: 'Medicine and Surgery',
      sourceImportMode: 'DETAIL_DOSSIER',
    });
    expect(result.rows[0].contentBlocks).toHaveLength(2);
    expect(result.rows[0].contentBlocks[0]).toMatchObject({
      title: 'البيانات الأساسية',
      reviewStatus: 'NEEDS_REVIEW',
    });
  });

  it('parses master and doctorate detail dossiers as major level details', () => {
    const master = MajorDetailDossierMarkdownParser.parse(`
# 1. العلوم الطبية — Medical Sciences

| الرمز | MAS-0001 |
|---|---|

## 1. نوع الماجستير
Professional or research master.
`, 'MASTER');

    const doctorate = MajorDetailDossierMarkdownParser.parse(`
# 1. العلوم الطبية — Medical Sciences

| الرمز | DOC-0001 |
|---|---|

## 1. موضوعات البحث
Research areas.
`, 'DOCTORATE');

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

  it('parses fellowship detail dossiers separately from academic majors', () => {
    const result = MajorDetailDossierMarkdownParser.parse(`
# 1. زمالة طب القلب للبالغين — Adult Cardiology Fellowship

| الرمز | FEL-0001 |
|---|---|

## 1. الفئة المستهدفة
Licensed physicians.

## 2. التدريب
Clinical rotations.
`, 'FELLOWSHIP');

    expect(result.targetDomain).toBe(ImportTargetDomain.Fellowships);
    expect(result.rows[0]).toMatchObject({
      code: 'FEL-0001',
      catalogKind: 'FELLOWSHIP',
      canonicalMajorName: 'Adult Cardiology Fellowship',
      sourceImportMode: 'DETAIL_DOSSIER',
    });
    expect(result.rows[0].degreeLevel).toBeUndefined();
    expect(result.rows[0].contentBlocks.map((block) => block.title)).toEqual(['الفئة المستهدفة', 'التدريب']);
  });
});
