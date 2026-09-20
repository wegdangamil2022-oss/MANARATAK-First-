export const COURSE_COMPLETED_EVENT_TYPE = 'CourseCompleted';
export const COURSE_COMPLETED_EVENT_CATEGORY = 'LearningPlatform';
export const COURSE_COMPLETED_EVENT_VERSION = '1.0.0';

export interface CourseCompletedEventPayload {
  courseId: string;
  studentReferenceId: string;
  completedAt: Date | string;
  completionId: string;
  eligibleForCertificate: boolean;
  certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform';
  sourcePhase: 'Phase 13 - Learning Platform';
}
