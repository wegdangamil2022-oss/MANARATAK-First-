import {
  IOutboxDeliveryGateway,
  OutboxDeliveryContext,
  TransactionalOutboxEntry,
  StudentWorkspaceIntegrationEventDto,
  IRoleAssignmentRepository,
  IIdentityRepository,
} from '@manaratak/domain';
import { StudentWorkspaceUseCases } from './StudentWorkspaceUseCases';

/**
 * Anti-corruption bridge from authoritative owner-domain outbox events into the
 * Phase 15 idempotent inbox. Unsupported events are never claimed by the
 * worker, and non-human Identity events are intentionally ignored.
 */
export class StudentWorkspaceOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  public constructor(private readonly students: StudentWorkspaceUseCases,
    private readonly assignments: IRoleAssignmentRepository, private readonly identities: IIdentityRepository) {}

  public async deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext): Promise<void> {
    if (context.idempotencyKey !== entry.id) throw new Error('STUDENT_WORKSPACE_IDEMPOTENCY_KEY_MISMATCH');
    const event = this.map(entry);
    if (!event) return;
    const identity = await this.identities.findById(event.studentReferenceId);
    if (!identity) throw new Error('STUDENT_WORKSPACE_IDENTITY_NOT_READY');
    if (identity.type !== 'Human') return;
    const roles = await this.assignments.findByIdentityId(event.studentReferenceId);
    if (!roles.some(role => role.roleId === 'student')) return;
    if (entry.domain === 'IDENTITY' && entry.eventType === 'IdentityStatusChanged.v1') {
      if (identity.status === 'ACTIVE') event.eventType = 'StudentIdentityActivated';
      else if (identity.status === 'SUSPENDED') event.eventType = 'StudentIdentitySuspended';
      else if (identity.status === 'ARCHIVED' || identity.status === 'PURGED') event.eventType = 'StudentIdentityArchived';
      else return;
    }
    await this.students.consumeIntegrationEvent(event);
    // Late assignment events must project the current owner lifecycle, not revive a suspended identity.
    if (event.eventType === 'StudentIdentityCreated' && ['SUSPENDED', 'ARCHIVED', 'PURGED'].includes(identity.status)) {
      await this.students.consumeIntegrationEvent({ ...event, eventId: `${entry.id}:lifecycle`,
        eventType: identity.status === 'SUSPENDED' ? 'StudentIdentitySuspended' : 'StudentIdentityArchived' });
    }
  }

  private map(entry: TransactionalOutboxEntry): StudentWorkspaceIntegrationEventDto | null {
    const payload = entry.payload as Record<string, unknown>;
    if (entry.domain === 'AUTHORIZATION' && entry.eventType === 'RoleAssignmentCreated' && payload.roleId === 'student') {
      const identityId = String(payload.identityId ?? '');
      if (!identityId) throw new Error('STUDENT_WORKSPACE_IDENTITY_REFERENCE_REQUIRED');
      return this.event(entry, identityId, 'StudentIdentityCreated', 'تم تفعيل شخصية الطالب', { roleId: 'student' });
    }
    if (entry.domain === 'IDENTITY') {
      if (String(payload.identityType ?? '') !== 'Human') return null;
      const identityId = String(payload.identityId ?? entry.aggregate?.aggregateId ?? '');
      if (!identityId) throw new Error('STUDENT_WORKSPACE_IDENTITY_REFERENCE_REQUIRED');
      if (entry.eventType === 'IdentityStatusChanged.v1' && payload.newStatus === 'SUSPENDED') {
        return this.event(entry, identityId, 'StudentIdentitySuspended', 'تم تعليق هوية الطالب', { oldStatus: payload.oldStatus, newStatus: payload.newStatus });
      }
      if (entry.eventType === 'IdentityStatusChanged.v1' && payload.newStatus === 'ACTIVE') {
        return this.event(entry, identityId, 'StudentIdentityActivated', 'تم تفعيل هوية الطالب', { newStatus: payload.newStatus });
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
