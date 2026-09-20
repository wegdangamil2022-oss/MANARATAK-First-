import { CourseCompletedEventPayload } from '@manaratak/domain';
import { ICourseCompletionEventPublisher } from './ICourseCompletionEventPublisher';

/**
 * @deprecated P5 closure: Course completion is an atomic domain/application
 * mutation. Production code must use CourseProgressUseCases, which appends the
 * CourseCompleted event to the transactional outbox in the same mutation as
 * the completion/enrollment state change. A second publisher would create a
 * non-atomic bypass and is therefore fail-closed.
 */
export class EnterpriseCourseCompletionEventPublisher implements ICourseCompletionEventPublisher {
  public constructor(..._disabledLegacyDependencies: unknown[]) {}

  public async publishCourseCompleted(_payload: CourseCompletedEventPayload): Promise<void> {
    throw new Error('COURSE_COMPLETION_DIRECT_PUBLISH_FORBIDDEN_USE_ATOMIC_OUTBOX');
  }
}
