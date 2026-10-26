import {
  INotificationTemplateRepository,
  IOutboxDeliveryGateway,
  NotificationChannel,
  NotificationLocaleReference,
  NotificationTemplate,
  OutboxDeliveryContext,
  TemplateId,
  TransactionalOutboxEntry,
} from '@manaratak/domain';
import { ManageNotificationIntentsUseCase } from './ManageNotificationIntentsUseCase';

interface NotificationMapping {
  recipientReference: string;
  templateId: string;
  variables: Record<string, string>;
}

/**
 * Explicit event -> notification-intent bridge. It only maps events whose
 * owner payload carries an authoritative recipient reference; it never guesses
 * recipients from public data or unrelated relationships.
 */
export class NotificationOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  public constructor(
    private readonly intents: ManageNotificationIntentsUseCase,
    private readonly templates: INotificationTemplateRepository,
  ) {}

  public async deliver(
    entry: TransactionalOutboxEntry,
    context: OutboxDeliveryContext,
  ): Promise<void> {
    if (context.idempotencyKey !== entry.id)
      throw new Error('NOTIFICATION_OUTBOX_IDEMPOTENCY_KEY_MISMATCH');
    const mapping = this.map(entry);
    if (!mapping) return;
    await this.ensureSystemTemplate(mapping.templateId);
    await this.intents.createIntent({
      id: `notification:${entry.id}`,
      reference: `event:${entry.id}`,
      templateId: mapping.templateId,
      recipientReference: mapping.recipientReference,
      variables: mapping.variables,
      retryMaxRetries: 5,
      retryBackoffMs: 1_000,
    });
  }

  private map(entry: TransactionalOutboxEntry): NotificationMapping | null {
    const payload = entry.payload as Record<string, unknown>;
    if(entry.domain==='REVIEW_QUEUE'&&entry.eventType==='ReviewWorkAssigned.v1') return {
      recipientReference:this.required(payload.recipientReference,'NOTIFICATION_REVIEW_RECIPIENT_REQUIRED'),
      templateId:'system.ReviewWorkAssigned.v1',
      variables:{eventType:entry.eventType,actionUrl:'/admin/review-queue'},
    };
    if (
      entry.domain === 'COURSES' &&
      ['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted'].includes(entry.eventType)
    ) {
      const studentReferenceId = this.required(
        payload.studentReferenceId,
        'NOTIFICATION_STUDENT_REFERENCE_REQUIRED',
      );
      return {
        recipientReference: studentReferenceId,
        templateId: `system.${entry.eventType}`,
        variables: this.variables(entry, payload, [
          'courseId',
          'enrollmentId',
          'progressPercentage',
          'enrollmentStatus',
          'completedAt',
        ]),
      };
    }
    if (
      entry.domain === 'CERTIFICATES' &&
      [
        'CertificateIssued',
        'CertificateRevoked',
        'CertificateReissued',
        'CertificateRenewed',
        'CertificateExpired',
        'CertificateArchived',
      ].includes(entry.eventType)
    ) {
      if (
        entry.metadata?.sourcePhase !== 'Phase14' ||
        !['1.0', '2.0'].includes(String(entry.metadata.schemaVersion)) ||
        entry.aggregate?.aggregateType !== 'Certificate' ||
        entry.aggregate.aggregateId !== payload.certificateId
      )
        throw new Error('NOTIFICATION_OWNER_ENVELOPE_INVALID');
      return {
        recipientReference: this.required(
          payload.studentReferenceId,
          'NOTIFICATION_STUDENT_REFERENCE_REQUIRED',
        ),
        templateId: `system.${entry.eventType}`,
        variables: this.variables(entry, payload, ['certificateId', 'status']),
      };
    }
    if (
      entry.domain === 'CAREER' &&
      [
        'CareerApplicationSubmitted.v1',
        'CareerApplicationReviewed.v1',
        'CareerApplicationWithdrawn.v1',
      ].includes(entry.eventType)
    ) {
      if (entry.metadata?.schemaVersion !== 1 || entry.aggregate?.aggregateId !== payload.id)
        throw new Error('NOTIFICATION_OWNER_ENVELOPE_INVALID');
      return {
        recipientReference: this.required(
          payload.studentReferenceId,
          'NOTIFICATION_STUDENT_REFERENCE_REQUIRED',
        ),
        templateId: `system.${entry.eventType}`,
        variables: this.variables(entry, payload, ['id', 'jobId', 'status']),
      };
    }
    if (
      entry.domain === 'SERVICES' &&
      [
        'ServiceRequested.v1',
        'ServiceFulfillmentStatusChanged.v1',
        'ServiceCancellationFinancePending.v1',
        'ServiceProviderAssigned.v1',
        'ServiceSlaBreached.v1',
      ].includes(entry.eventType)
    ) {
      const studentReferenceId =
        typeof payload.studentReferenceId === 'string' ? payload.studentReferenceId.trim() : '';
      if (!studentReferenceId) return null;
      return {
        recipientReference: studentReferenceId,
        templateId: `system.${entry.eventType}`,
        variables: this.variables(entry, payload, [
          'serviceId',
          'requestId',
          'publicId',
          'status',
          'providerReferenceId',
          'financeInvoicePublicId',
        ]),
      };
    }
    return null;
  }

  private async ensureSystemTemplate(templateId: string): Promise<void> {
    const id = TemplateId.create(templateId);
    await this.templates.save(
      NotificationTemplate.create(
        id,
        [NotificationChannel.create('IN_APP')],
        ['eventType'],
        [NotificationLocaleReference.create('ar'), NotificationLocaleReference.create('en')],
      ),
    );
  }

  private variables(
    entry: TransactionalOutboxEntry,
    payload: Record<string, unknown>,
    allowed: readonly string[],
  ): Record<string, string> {
    const variables: Record<string, string> = { eventType: entry.eventType };
    for (const key of allowed) {
      const value = payload[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        variables[key] = String(value);
    }
    return variables;
  }

  private required(value: unknown, code: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) throw new Error(code);
    return normalized;
  }
}
