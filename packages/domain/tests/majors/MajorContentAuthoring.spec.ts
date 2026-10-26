import { describe, it, expect } from 'vitest';
import {
  majorContentSlots,
  assertMajorContentGroup,
  selectMajorWorkingVersion,
  FELLOWSHIP_MAIN_SECTIONS,
} from '../../src/majors/MajorContentAuthoring';

describe('approved authoring templates and immutable working versions', () => {
  it.each([
    ['BACHELOR', 10, 14],
    ['MASTER', 16, 25],
    ['DOCTORATE', 19, 26],
    ['FELLOWSHIP', 18, 18],
  ] as const)('preserves every source slot for %s', (level, groups, total) => {
    const slots = Array.from({ length: groups }, (_, i) => majorContentSlots(level, i + 1)).flat();
    expect(slots).toHaveLength(total);
    expect(new Set(slots).size).toBe(total);
    expect(slots).toEqual(
      Array.from({ length: total }, (_, i) => String(i + 1).padStart(2, '0') + '-manual'),
    );
    expect(() => assertMajorContentGroup(level, groups + 1)).toThrow('GROUP_INVALID');
  });
  it('keeps the 18 official fellowship groups separate from technical publication coverage', () => {
    expect(FELLOWSHIP_MAIN_SECTIONS).toHaveLength(18);
    expect(FELLOWSHIP_MAIN_SECTIONS[0].title).toBe('معلومات الزمالة الأساسية');
    expect(FELLOWSHIP_MAIN_SECTIONS[17].title).toBe('المصادر والتحقق');
    expect(majorContentSlots('UNKNOWN', 1)).toEqual([]);
  });
  it('selects by version number rather than arrival order', () => {
    expect(
      selectMajorWorkingVersion([
        { id: 'new', versionNumber: 3, status: 'NEEDS_REVIEW' },
        { id: 'old', versionNumber: 1, status: 'DRAFT' },
      ])?.id,
    ).toBe('new');
  });
  it.each(['PUBLISHED', 'SUPERSEDED', 'ARCHIVED', 'REJECTED'])(
    'does not silently edit an older draft when the latest is %s',
    (status) => {
      expect(
        selectMajorWorkingVersion([
          { id: 'old', versionNumber: 1, status: 'DRAFT' },
          { id: 'latest', versionNumber: 2, status },
        ]),
      ).toBeUndefined();
    },
  );
  it('honors publication history even if status is later changed', () => {
    expect(
      selectMajorWorkingVersion([
        { id: 'historical', versionNumber: 2, status: 'DRAFT', publishedAt: new Date() },
      ]),
    ).toBeUndefined();
  });
});
