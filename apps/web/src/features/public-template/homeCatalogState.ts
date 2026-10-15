import type { Course } from './types';

export type HomeCatalogStatus = 'loading' | 'ready' | 'empty' | 'unavailable';

export interface HomeCoursePreview {
  status: HomeCatalogStatus;
  courses: Course[];
}

export interface HomeCoursePreviews {
  global: HomeCoursePreview;
  native: HomeCoursePreview;
}

/** A successful empty response is different from an unavailable owner. */
export function homeCatalogStatus(status: HomeCatalogStatus | undefined, count: number): HomeCatalogStatus {
  if (status === 'loading' || status === 'unavailable') return status;
  return count > 0 ? 'ready' : 'empty';
}
