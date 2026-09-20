import { CourseCompletedEventPayload } from '@manaratak/domain';

export interface ICourseCompletionEventPublisher {
  publishCourseCompleted(payload: CourseCompletedEventPayload): Promise<void>;
}
