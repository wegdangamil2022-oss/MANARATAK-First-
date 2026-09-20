import {
  IOutboxDeliveryGateway,
  OutboxDeliveryContext,
  TransactionalOutboxEntry,
  StudentWorkspaceIntegrationEventDto,
} from '@manaratak/domain';
import { StudentWorkspaceUseCases } from './StudentWorkspaceUseCases';

/**
 * Anti-corruption bridge from authoritative owner-domain outbox events into the
 * Phase 15 idempotent inbox. Unsupported events are never claimed by the
 * worker, and non-human Identity events are intentionally ignored.
 */
export class StudentWorkspaceOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  public constructor(private readonly students: StudentWorkspaceUseCases) {}

  public async deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext): Promise<void> {
    if (context.idempotencyKey !== entry.id) throw new Error('STUDENT_WORKSPACE_IDEMPOTENCY_KEY_MISMATCH');
    const event = this.map(entry);
    if (!event) return;
    await this.students.consumeIntegrationEvent(event);
  }

  private map(entry: TransactionalOutboxEntry): StudentWorkspaceIntegrationEventDto | null {
    const payload = entry.payload as Record<string, unknown>;
    if (entry.domain === 'IDENTITY') {
      if (String(payload.identityType ?? '') !== 'Human') return null;
      const identityId = String(payload.identityId ?? entry.aggregate?.aggregateId ?? '');
      if (!identityId) throw new Error('STUDENT_WORKSPACE_IDENTITY_REFERENCE_REQUIRED');
      if (entry.eventType === 'IdentityCreated.v1') {
        return this.event(entry, identityId, 'StudentIdentityCreated', 'تم إنشاء هوية الطالب', { identityType: 'Human' });
      }
      if (entry.eventType === 'IdentityStatusChanged.v1' && payload.newStatus === 'SUSPENDED') {
        return this.event(entry, identityId, 'StudentIdentitySuspended', 'تم تعليق هوية الطالب', { oldStatus: payload.oldStatus, newStatus: payload.newStatus });
      }
      if (entry.eventType === 'IdentityStatusChanged.v1' && (payload.newStatus === 'ARCHIVED' || payload.newStatus === 'PURGED')) {
        return this.event(entry, identityId, 'StudentIdentityArchived', 'تمت أرشفة هوية الطالب', { oldStatus: payload.oldStatus, newStatus: payload.newStatus });
      }
      return null;
    }

    if (entry.domain === 'COURSES' && ['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted'].includes(entry.eventType)) {
      const studentReferenceId = String(payload.studentReferenceId ?? '');
      const courseId = String(payload.courseId ?? '');
      if (!studentReferenceId || !courseId) throw new Error('STUDENT_WORKSPACE_LEARNING_EVENT_REFERENCE_REQUIRED');
      const metadata = {
        courseId,
        enrollmentId: payload.enrollmentId,
        progressPercentage: payload.progressPercentage,
        status: payload.enrollmentStatus ?? (entry.eventType === 'CourseCompleted' ? 'COMPLETED' : 'ACTIVE'),
        enrolledAt: payload.enrolledAt,
        completedAt: payload.completedAt,
        courseVersion: payload.courseVersion,
        eventVersion: entry.metadata.eventVersion ?? entry.metadata.schemaVersion ?? '1.0.0',
      };
      const title = entry.eventType === 'CourseEnrolled' ? 'تم التسجيل في الدورة' : entry.eventType === 'CourseCompleted' ? 'تم إكمال الدورة' : 'تم تحديث تقدم الدورة';
      return this.event(entry, studentReferenceId, entry.eventType, title, metadata, String(payload.enrollmentId ?? payload.completionId ?? courseId));
    }
    return null;
  }

  private event(
    entry: TransactionalOutboxEntry,
    studentReferenceId: string,
    eventType: string,
    title: string,
    metadata: Record<string, unknown>,
    sourceReferenceId?: string,
  ): StudentWorkspaceIntegrationEventDto {
    return {
      eventId: entry.id,
      studentReferenceId,
      eventType,
      sourceDomain: entry.domain,
      sourceReferenceId: sourceReferenceId ?? entry.aggregate?.aggregateId ?? null,
      title,
      occurredAt: entry.createdAt,
      metadata: { ...metadata, correlationId: entry.correlationId ?? null, causationId: entry.causationId ?? null },
    };
  }
}
