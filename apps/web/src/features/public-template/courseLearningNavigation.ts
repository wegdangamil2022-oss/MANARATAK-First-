import type { Course } from './types';

/** Public slugs/display names never identify a private learner workspace. */
export function courseLearnerPath(course: Course, locale: string): string | null {
  if (
    !['NATIVE_ABSHEER_COURSE', 'PAID_COURSE'].includes(course.originType ?? '') ||
    !course.ownerId?.trim()
  )
    return null;
  return `/${encodeURIComponent(locale)}/student/courses/${encodeURIComponent(course.ownerId)}`;
}
