export const COURSE_ENROLLED_EVENT_TYPE = 'CourseEnrolled';
export const COURSE_PROGRESS_UPDATED_EVENT_TYPE = 'CourseProgressUpdated';

export interface CourseEnrolledEventPayload {
  courseId: string;
  studentReferenceId: string;
  enrollmentId: string;
  enrollmentStatus: string;
  progressPercentage: number;
  enrolledAt: string;
}

export interface CourseProgressUpdatedEventPayload {
  courseId: string;
  studentReferenceId: string;
  enrollmentId: string;
  lessonId: string;
  lessonProgressPercentage: number;
  progressPercentage: number;
  enrollmentStatus: string;
  occurredAt: string;
}
