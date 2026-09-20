import {
  INotificationDeliveryGateway,
  INotificationDeliveryRepository,
  INotificationPreferenceGateway,
  NotificationChannel,
  NotificationDeliveryCandidate,
  NotificationRecipientReference,
} from '@manaratak/domain';
import { BackgroundJobHandlerContext, IBackgroundJobHandler } from '../workers/DurableBackgroundJobContracts';

export const NOTIFICATION_DELIVERY_JOB_TYPE = 'notification.delivery.sweep';
const DELIVERY_CONCURRENCY = 5;

export class NotificationDeliveryBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = NOTIFICATION_DELIVERY_JOB_TYPE;

  public constructor(
    private readonly repository: INotificationDeliveryRepository,
    private readonly gateway: INotificationDeliveryGateway,
    private readonly preferences: INotificationPreferenceGateway,
  ) {}

  public async handle(payload: Readonly<Record<string, unknown>>, context: BackgroundJobHandlerContext): Promise<void> {
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const limit = typeof payload.limit === 'number' && Number.isInteger(payload.limit)
      ? Math.max(1, Math.min(payload.limit, 20))
      : 20;
    const leaseMs = typeof payload.leaseMs === 'number' && Number.isInteger(payload.leaseMs)
      ? Math.max(180_000, Math.min(payload.leaseMs, 600_000))
      : 600_000;
    const maxDeliveriesPerRecipientPerHour = typeof payload.maxDeliveriesPerRecipientPerHour === 'number' && Number.isInteger(payload.maxDeliveriesPerRecipientPerHour)
      ? Math.max(1, Math.min(payload.maxDeliveriesPerRecipientPerHour, 1_000))
      : 30;
    const workerId = `notification:${context.jobReference}:${context.attempt}`;
    const candidates = await this.repository.claimDue(workerId, new Date(), limit, leaseMs, maxDeliveriesPerRecipientPerHour);

    for (let offset = 0; offset < candidates.length; offset += DELIVERY_CONCURRENCY) {
      if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
      await Promise.all(candidates.slice(offset, offset + DELIVERY_CONCURRENCY).map(candidate => this.deliverCandidate(candidate, context)));
    }
  }

  private async deliverCandidate(candidate: NotificationDeliveryCandidate, context: BackgroundJobHandlerContext): Promise<void> {
    try {
      if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
      const recipient = NotificationRecipientReference.create(candidate.recipientReference);
      const allowedChannels: string[] = [];
      for (const value of candidate.channels) {
        const channel = NotificationChannel.create(value);
        if (!await this.preferences.hasOptedOut(recipient, channel)) allowedChannels.push(channel.toString());
      }
      if (allowedChannels.length === 0) {
        const applied = await this.repository.markSuppressed(candidate, 'NOTIFICATION_RECIPIENT_OPTED_OUT', new Date());
        if (!applied) throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
        return;
      }
      const result = await this.gateway.deliver({ ...candidate, channels: allowedChannels }, `${context.idempotencyKey}:${candidate.id}:${candidate.attempt}`);
      const applied = await this.repository.markDelivered(candidate, result, new Date());
      if (!applied) throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
    } catch (error) {
      if (context.signal.aborted) throw context.signal.reason ?? error;
      if (error instanceof Error && error.message === 'NOTIFICATION_DELIVERY_LEASE_LOST') throw error;
      const deadLetter = candidate.attempt >= candidate.maxAttempts;
      const backoffMs = Math.min(1_000 * 2 ** Math.max(0, candidate.attempt - 1), 15 * 60_000);
      const raw = error instanceof Error ? error.message : 'NOTIFICATION_DELIVERY_FAILED';
      const safe = raw.replace(/(password|token|secret|authorization)\s*[=:]\s*\S+/gi, '$1=[REDACTED]').slice(0, 500);
      const nextAttemptAt = deadLetter
        ? new Date('9999-12-31T23:59:59.999Z')
        : new Date(Date.now() + backoffMs);
      const applied = await this.repository.markFailed(candidate, 'NOTIFICATION_DELIVERY_FAILED', safe, nextAttemptAt, deadLetter);
      if (!applied) throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
    }
  }
}
