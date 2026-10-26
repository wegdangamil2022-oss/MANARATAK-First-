import { describe, it, expect } from 'vitest';
import {
  normalizeCourseDeliveryPolicy,
  courseLessonAccess,
} from '../../src/courses/CourseDeliveryPolicy';
const a = '10000000-0000-4000-8000-000000000001',
  b = '10000000-0000-4000-8000-000000000002';
const curriculum = {
  modules: [{ id: 'm', position: 1, status: 'PUBLISHED' }],
  lessons: [
    { id: b, moduleId: 'm', position: 2, status: 'PUBLISHED' },
    { id: a, moduleId: 'm', position: 1, status: 'PUBLISHED' },
  ],
} as never;
describe('versioned course delivery policy', () => {
  it('defaults old snapshots to free ordering without manufacturing previews', () => {
    expect(
      courseLessonAccess(curriculum, normalizeCourseDeliveryPolicy(undefined), []).every(
        (row) => row.accessible && !row.previewAvailable,
      ),
    ).toBe(true);
  });
  it('requires actual previous completion and applies UTC release at the exact boundary', () => {
    const policy = normalizeCourseDeliveryPolicy({
      version: 1,
      sequence: 'SEQUENTIAL',
      lessons: { [b]: { preview: true, availableAt: '2026-10-27T00:00:00Z' } },
    });
    expect(
      courseLessonAccess(curriculum, policy, [], new Date('2026-10-26T00:00:00Z'))[1],
    ).toMatchObject({ accessible: false, lockReason: 'SCHEDULED', previewAvailable: false });
    expect(
      courseLessonAccess(curriculum, policy, [], new Date('2026-10-27T00:00:00Z'))[1],
    ).toMatchObject({ accessible: false, lockReason: 'PREVIOUS_LESSON', previewAvailable: true });
    expect(
      courseLessonAccess(
        curriculum,
        policy,
        [{ lessonId: a, progressPercentage: 100 }],
        new Date('2026-10-27T00:00:00Z'),
      )[1].accessible,
    ).toBe(true);
    expect(
      courseLessonAccess(
        curriculum,
        policy,
        [{ lessonId: a, progressPercentage: 99 }],
        new Date('2026-10-27T00:00:00Z'),
      )[1].accessible,
    ).toBe(false);
  });
  it.each([
    {
      version: 1,
      sequence: 'FREE',
      lessons: { [a]: { preview: true, availableAt: '2026-02-30T00:00:00Z' } },
    },
    {
      version: 1,
      sequence: 'FREE',
      lessons: { [a]: { preview: true, availableAt: '2026-10-26T00:00:00+03:00' } },
    },
    {
      version: 1,
      sequence: 'FREE',
      lessons: { [a]: { preview: true, availableAt: null, assetUrl: 'https://bad.invalid' } },
    },
    { version: 1, sequence: 'OPEN_ALL', lessons: {} },
  ])('rejects malformed/unbounded policy inputs', (value) =>
    expect(() => normalizeCourseDeliveryPolicy(value)).toThrow(),
  );
});
