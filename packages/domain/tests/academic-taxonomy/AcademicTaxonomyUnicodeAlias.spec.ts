import { describe, expect, it } from 'vitest';
import { normalizeAcademicTaxonomyAlias } from '../../src/academic-taxonomy/key';
describe('taxonomy alias Unicode policy', () => {
  it('equates canonical composition without stripping accents or scripts', () => {
    expect(normalizeAcademicTaxonomyAlias(' E\u0301COLE  ')).toBe(normalizeAcademicTaxonomyAlias('École'));
    expect(normalizeAcademicTaxonomyAlias('École')).not.toBe(normalizeAcademicTaxonomyAlias('Ecole'));
  });
  it.each(['علوم الحاسوب', '计算机科学', 'Информатика'])('preserves %s', alias => {
    expect(normalizeAcademicTaxonomyAlias(alias)).toBe(alias.toLowerCase());
  });
  it('collapses whitespace consistently and is idempotent', () => {
    const result = normalizeAcademicTaxonomyAlias(' Computer\u00a0\tScience ');
    expect(result).toBe('computer science');
    expect(normalizeAcademicTaxonomyAlias(result)).toBe(result);
  });
});
