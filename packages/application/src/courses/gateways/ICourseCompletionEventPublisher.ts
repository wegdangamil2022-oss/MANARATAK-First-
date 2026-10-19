import { CourseCompletedEventPayload } from '@absheer/domain';

export interface ICourseCompletionEventPublisher {
  publishCourseCompleted(payload: CourseCompletedEventPayload): Promise<void>;
}
