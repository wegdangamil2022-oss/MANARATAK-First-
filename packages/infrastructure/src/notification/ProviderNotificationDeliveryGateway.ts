import type {
  INotificationDeliveryGateway,
  NotificationDeliveryCandidate,
  NotificationDeliveryResult,
} from '@manaratak/domain';
import {
  SignedProviderHttpClient,
  SignedProviderHttpClientOptions,
} from '../provider-http/SignedProviderHttpClient';
interface ProviderReceipt {
  found?: boolean;
  idempotencySupported?: boolean;
  idempotencyKey?: string;
  accepted?: boolean;
  delivered?: boolean;
  providerMessageId?: string;
}
/** Configured does not certify provider delivery. The provider must implement durable key reconciliation. */
export class ProviderNotificationDeliveryGateway implements INotificationDeliveryGateway {
  private readonly client: SignedProviderHttpClient | null;
  get capabilityStatus(): 'CONFIGURED_RUNTIME_PENDING' | 'IN_APP_ONLY' {
    return this.client ? 'CONFIGURED_RUNTIME_PENDING' : 'IN_APP_ONLY';
  }
  constructor(options?: SignedProviderHttpClientOptions) {
    this.client = options
      ? new SignedProviderHttpClient({
          ...options,
          timeoutMs: Math.min(options.timeoutMs ?? 10000, 30000),
        })
      : null;
  }
  async checkReadiness(signal?: AbortSignal) {
    if (!this.client)
      return {
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        error: 'NOTIFICATION_PROVIDER_NOT_CONFIGURED',
        details: { capabilityStatus: 'NOT_CONFIGURED' },
      };
    return this.client.checkReadiness('notification-delivery', signal);
  }

  async deliver(
    candidate: NotificationDeliveryCandidate,
    key: string,
  ): Promise<NotificationDeliveryResult> {
    if (
      candidate.channels.length !== 1 ||
      !['IN_APP', 'EMAIL', 'PUSH'].includes(candidate.channels[0])
    )
      throw new Error('NOTIFICATION_SINGLE_APPROVED_CHANNEL_REQUIRED');
    const channel = candidate.channels[0];
    if (key !== `notification:${candidate.id}:${channel}`)
      throw new Error('NOTIFICATION_DELIVERY_KEY_MISMATCH');
    if (channel === 'IN_APP') return { status: 'DELIVERED' };
    if (!this.client) throw new Error('NOTIFICATION_EXTERNAL_PROVIDER_NOT_CONFIGURED');
    // Lookup is mandatory before resubmission, including after an uncertain timeout or lease loss.
    const prior = await this.client.json<ProviderReceipt>(
      'GET',
      `/v1/notifications/deliveries/${encodeURIComponent(key)}`,
    );
    if (
      prior?.idempotencySupported !== true ||
      prior.idempotencyKey !== key ||
      typeof prior.found !== 'boolean'
    )
      throw new Error('NOTIFICATION_PROVIDER_RECONCILIATION_REQUIRED');
    if (candidate.acceptedChannels?.includes(channel) && !prior.found)
      throw new Error('NOTIFICATION_ACCEPTED_KEY_NOT_FOUND');
    const receipt = prior.found
      ? prior
      : await this.client.json<ProviderReceipt>(
          'POST',
          '/v1/notifications/deliver',
          {
            intentId: candidate.id,
            reference: candidate.reference,
            templateId: candidate.templateId,
            recipientReference: candidate.recipientReference,
            variables: candidate.variables,
            locale: candidate.locale,
            contents: candidate.contents,
            channels: [channel],
          },
          { idempotencyKey: key },
        );
    if (
      receipt?.accepted !== true ||
      receipt.idempotencyKey !== key ||
      receipt.idempotencySupported !== true
    )
      throw new Error('NOTIFICATION_PROVIDER_NOT_ACCEPTED');
    return {
      status: receipt.delivered === true ? 'DELIVERED' : 'ACCEPTED',
      providerMessageId: receipt.providerMessageId ?? null,
    };
  }
}
