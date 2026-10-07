import {
  INotificationIntentRepository,
  INotificationTemplateRepository,
  NotificationIntentSummary,
} from '@manaratak/domain';
import { INotificationPreferenceGateway } from '@manaratak/domain';
import { NotificationIntent } from '@manaratak/domain';
import { NotificationId } from '@manaratak/domain';
import { NotificationReference } from '@manaratak/domain';
import { TemplateId } from '@manaratak/domain';
import { NotificationRecipientReference } from '@manaratak/domain';
import { TemplateVariable } from '@manaratak/domain';
import { SchedulingMetadata } from '@manaratak/domain';
import { ExpirationMetadata } from '@manaratak/domain';
import { RetryMetadata } from '@manaratak/domain';
import { CreateIntentDto } from '../dtos/NotificationDtos';

export class ManageNotificationIntentsUseCase {
  constructor(
    private readonly intentRepository: INotificationIntentRepository,
    private readonly preferenceGateway: INotificationPreferenceGateway,
    private readonly templateRepository?: INotificationTemplateRepository,
  ) {}

  public async createIntent(dto: CreateIntentDto): Promise<void> {
    const id = NotificationId.create(dto.id);
    const reference = NotificationReference.create(dto.reference);
    const templateId = TemplateId.create(dto.templateId);
    const recipient = NotificationRecipientReference.create(dto.recipientReference);

    const variables = Object.entries(dto.variables).map(([k, v]) => TemplateVariable.create(k, v));

    const schedulingMetadata = dto.scheduledAt
      ? SchedulingMetadata.create(dto.scheduledAt)
      : undefined;
    const expirationMetadata = dto.expiresAt ? ExpirationMetadata.create(dto.expiresAt) : undefined;
    const retryMetadata =
      dto.retryMaxRetries !== undefined || dto.retryBackoffMs !== undefined
        ? RetryMetadata.create(dto.retryMaxRetries ?? 5, dto.retryBackoffMs ?? 1000)
        : undefined;

    const template = await this.templateRepository?.findById(templateId);
    if (!template) throw new Error('NOTIFICATION_TEMPLATE_NOT_FOUND');
    for (const name of template.requiredVariables) {
      if (typeof dto.variables[name] !== 'string' || !dto.variables[name].trim())
        throw new Error(`NOTIFICATION_REQUIRED_VARIABLE_MISSING:${name}`);
    }
    if (dto.expiresAt && dto.expiresAt.getTime() <= Date.now())
      throw new Error('NOTIFICATION_ALREADY_EXPIRED');
    if (dto.scheduledAt && dto.expiresAt && dto.scheduledAt >= dto.expiresAt)
      throw new Error('NOTIFICATION_EXPIRATION_BEFORE_SCHEDULE');
    const optedOutByChannel = await Promise.all(
      template.channels.map((channel) => this.preferenceGateway.hasOptedOut(recipient, channel)),
    );
    const optedOut = optedOutByChannel.length > 0 && optedOutByChannel.every(Boolean);

    if (optedOut) {
      // Retain an intent receipt even when all channels are opted out.
      const intent = NotificationIntent.create(
        id,
        reference,
        templateId,
        recipient,
        variables,
        schedulingMetadata,
        expirationMetadata,
        retryMetadata,
      );
      intent.cancel();
      await this.intentRepository.save(intent);
      return;
    }

    const intent = NotificationIntent.create(
      id,
      reference,
      templateId,
      recipient,
      variables,
      schedulingMetadata,
      expirationMetadata,
      retryMetadata,
    );

    await this.intentRepository.save(intent);
  }

  public listIntents(limit = 100): Promise<NotificationIntentSummary[]> {
    return this.intentRepository.list(Math.max(1, Math.min(limit, 500)));
  }

  public cancelIntent(id: string): Promise<void> {
    if (!id.trim()) throw new Error('NOTIFICATION_INTENT_ID_REQUIRED');
    return this.intentRepository.cancel(id.trim());
  }

  public retryIntent(id: string): Promise<void> {
    if (!id.trim()) throw new Error('NOTIFICATION_INTENT_ID_REQUIRED');
    return this.intentRepository.retry(id.trim());
  }
}
