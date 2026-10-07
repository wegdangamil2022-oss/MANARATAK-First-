import {
  INotificationDeliveryGateway,
  NotificationDeliveryCandidate,
  NotificationDeliveryResult,
} from '@manaratak/domain';
import {
  SignedProviderHttpClient,
  SignedProviderHttpClientOptions,
} from '../provider-http/SignedProviderHttpClient';

const APPROVED_CHANNELS = new Set(['EMAIL', 'PUSH', 'IN_APP']);

export class ProviderNotificationDeliveryGateway implements INotificationDeliveryGateway {
  private readonly client: SignedProviderHttpClient | null;
  public get capabilityStatus(): 'PRODUCTION_CAPABLE' | 'IN_APP_ONLY' {
    return this.client ? 'PRODUCTION_CAPABLE' : 'IN_APP_ONLY';
  }

  public constructor(options?: SignedProviderHttpClientOptions) {
    this.client = options ? new SignedProviderHttpClient(options) : null;
  }

  public async deliver(
    candidate: NotificationDeliveryCandidate,
    idempotencyKey: string,
  ): Promise<NotificationDeliveryResult> {
    if (
      !candidate.channels.length ||
      candidate.channels.some((channel) => !APPROVED_CHANNELS.has(channel))
    ) {
      throw new Error('NOTIFICATION_CHANNEL_NOT_APPROVED');
    }
    // IN_APP is persisted atomically with the delivery receipt by the repository.
    // External channels still require the configured provider.
    const externalChannels = candidate.channels.filter((channel) => channel !== 'IN_APP');
    if (!externalChannels.length)
      return { metadata: { channels: [...candidate.channels], inApp: true } };
    if (!this.client) throw new Error('NOTIFICATION_EXTERNAL_PROVIDER_NOT_CONFIGURED');
    const result = await this.client.json<{ providerMessageId?: string; accepted?: boolean }>(
      'POST',
      '/v1/notifications/deliver',
      {
        intentId: candidate.id,
        reference: candidate.reference,
        templateId: candidate.templateId,
        recipientReference: candidate.recipientReference,
        variables: candidate.variables,
        channels: externalChannels,
      },
      { idempotencyKey },
    );
    if (!result || result.accepted !== true) throw new Error('NOTIFICATION_PROVIDER_NOT_ACCEPTED');
    return {
      providerMessageId: result.providerMessageId ?? null,
      metadata: { accepted: true, channels: [...candidate.channels] },
    };
  }
}
