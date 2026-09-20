import { INotificationDeliveryGateway, NotificationDeliveryCandidate, NotificationDeliveryResult } from '@manaratak/domain';
import { SignedProviderHttpClient, SignedProviderHttpClientOptions } from '../provider-http/SignedProviderHttpClient';

const APPROVED_CHANNELS = new Set(['EMAIL', 'PUSH', 'IN_APP']);

export class ProviderNotificationDeliveryGateway implements INotificationDeliveryGateway {
  private readonly client: SignedProviderHttpClient;
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;

  public constructor(options: SignedProviderHttpClientOptions) {
    this.client = new SignedProviderHttpClient(options);
  }

  public async deliver(candidate: NotificationDeliveryCandidate, idempotencyKey: string): Promise<NotificationDeliveryResult> {
    if (!candidate.channels.length || candidate.channels.some(channel => !APPROVED_CHANNELS.has(channel))) {
      throw new Error('NOTIFICATION_CHANNEL_NOT_APPROVED');
    }
    const result = await this.client.json<{ providerMessageId?: string; accepted?: boolean }>('POST', '/v1/notifications/deliver', {
      intentId: candidate.id,
      reference: candidate.reference,
      templateId: candidate.templateId,
      recipientReference: candidate.recipientReference,
      variables: candidate.variables,
      channels: candidate.channels,
    }, { idempotencyKey });
    if (!result || result.accepted !== true) throw new Error('NOTIFICATION_PROVIDER_NOT_ACCEPTED');
    return { providerMessageId: result.providerMessageId ?? null, metadata: { accepted: true, channels: [...candidate.channels] } };
  }
}
