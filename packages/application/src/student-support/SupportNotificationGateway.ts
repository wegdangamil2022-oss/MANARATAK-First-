import { createHash } from 'node:crypto';
import {
  NotificationTemplate,
  TemplateId,
  NotificationChannel,
  NotificationLocaleReference,
  type INotificationTemplateRepository,
  type IOutboxDeliveryGateway,
  type OutboxDeliveryContext,
  type TransactionalOutboxEntry,
} from '@manaratak/domain';
import type { ManageNotificationIntentsUseCase } from '../notification/use-cases/ManageNotificationIntentsUseCase';
/** Saves in-app intents through the notification owner. It never sends mail or exposes message text. */
export class SupportNotificationGateway implements IOutboxDeliveryGateway {
  constructor(
    private readonly intents: ManageNotificationIntentsUseCase,
    private readonly templates: INotificationTemplateRepository,
    private readonly recipients: (
      caseId: string,
      audience: 'STUDENT' | 'TEAM',
    ) => Promise<string[]>,
  ) {}
  async deliver(entry: TransactionalOutboxEntry, context: OutboxDeliveryContext) {
    if (
      entry.domain !== 'STUDENT_SUPPORT' ||
      entry.eventType !== 'StudentSupportNotificationRequested'
    )
      return;
    if (
      context.idempotencyKey !== entry.id ||
      entry.aggregate?.aggregateType !== 'SUPPORT_CASE' ||
      entry.aggregate.aggregateId !== entry.payload.caseId ||
      typeof entry.payload.caseId !== 'string' ||
      !['STUDENT', 'TEAM'].includes(String(entry.payload.audience)) ||
      !['CREATED', 'REPLY', 'STATUS_CHANGED'].includes(String(entry.payload.publicEvent))
    )
      throw Error('SUPPORT_NOTIFICATION_ENVELOPE_INVALID');
    const audience = entry.payload.audience as 'STUDENT' | 'TEAM',
      caseId = entry.payload.caseId;
    const recipients = [...new Set(await this.recipients(caseId, audience))];
    if (!recipients.length) throw Error('SUPPORT_NOTIFICATION_RECIPIENT_UNASSIGNED');
    const templateId = 'system.StudentSupportUpdate.v1',
      id = TemplateId.create(templateId);
    let template = await this.templates.findById(id);
    if (!template) {
      const candidate = NotificationTemplate.create(
        id,
        [NotificationChannel.create('IN_APP')],
        ['eventType', 'actionUrl'],
        [NotificationLocaleReference.create('ar'), NotificationLocaleReference.create('en')],
        {
          ar: {
            subject: 'تحديث طلب الدعم',
            body: 'يوجد تحديث في طلب الدعم. افتح مساحة الدعم للاطلاع عليه.',
          },
          en: {
            subject: 'Support case update',
            body: 'A support case has an update. Open your support workspace to review it.',
          },
        },
      );
      try {
        await this.templates.save(candidate, { createOnly: true });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
      template = await this.templates.findById(id);
    }
    if (
      !template ||
      template.channels.length !== 1 ||
      template.channels[0].toString() !== 'IN_APP' ||
      template.requiredVariables.some((v) => !['eventType', 'actionUrl'].includes(v))
    )
      throw Error('SUPPORT_NOTIFICATION_TEMPLATE_POLICY_INVALID');
    for (const recipientReference of recipients) {
      const digest = createHash('sha256')
        .update(entry.id + ':' + recipientReference)
        .digest('hex');
      await this.intents.createIntent({
        id: 'support:' + digest,
        reference: 'support-event:' + entry.id + ':' + digest.slice(0, 16),
        templateId,
        recipientReference,
        purpose: 'TRANSACTIONAL',
        variables: {
          eventType: String(entry.payload.publicEvent),
          actionUrl:
            audience === 'STUDENT'
              ? '/student?tab=support&case=' + encodeURIComponent(caseId)
              : '/admin/students/support?tab=inbox&ticket=' + encodeURIComponent(caseId),
        },
      });
    }
  }
}
