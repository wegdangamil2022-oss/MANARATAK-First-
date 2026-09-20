export const COURSE_PUBLISHED_EVENT_TYPE = 'CoursePublished';
export const COURSE_PUBLISHED_EVENT_CATEGORY = 'LearningPlatform';
export const COURSE_PUBLISHED_EVENT_VERSION = '1.0.0';

export interface CoursePublishedEventPayload {
  courseId: string;
  publicId: string;
  slug: string;
  courseVersion: number;
  originType: string;
  accessType: string;
  publishedAt: Date | string;
  sourcePhase: 'Phase 13 - Learning Platform';
}
