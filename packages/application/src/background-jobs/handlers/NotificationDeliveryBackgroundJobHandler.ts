import { validateNotificationVariables } from '../../notification/NotificationVariablePolicy';
import {
  INotificationDeliveryGateway,
  INotificationRecipientGateway,
  INotificationDeliveryEligibilityPolicy,
  INotificationDeliveryRepository,
  INotificationPreferenceGateway,
  NotificationChannel,
  NotificationDeliveryCandidate,
  NotificationRecipientReference,
} from '@absheer/domain';
import {
  BackgroundJobHandlerContext,
  IBackgroundJobHandler,
} from '../workers/DurableBackgroundJobContracts';

export const NOTIFICATION_DELIVERY_JOB_TYPE = 'notification.delivery.sweep';
const DELIVERY_CONCURRENCY = 5;

export class NotificationDeliveryBackgroundJobHandler implements IBackgroundJobHandler {
  public readonly jobType = NOTIFICATION_DELIVERY_JOB_TYPE;

  public constructor(
    private readonly repository: INotificationDeliveryRepository,
    private readonly gateway: INotificationDeliveryGateway,
    private readonly preferences: INotificationPreferenceGateway,
    private readonly ownerEligibility?: INotificationDeliveryEligibilityPolicy,
    private readonly recipients?: INotificationRecipientGateway,
  ) {}

  public async handle(
    payload: Readonly<Record<string, unknown>>,
    context: BackgroundJobHandlerContext,
  ): Promise<void> {
    if (context.signal.aborted) throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
    const limit =
      typeof payload.limit === 'number' && Number.isInteger(payload.limit)
        ? Math.max(1, Math.min(payload.limit, 20))
        : 20;
    const leaseMs =
      typeof payload.leaseMs === 'number' && Number.isInteger(payload.leaseMs)
        ? Math.max(180_000, Math.min(payload.leaseMs, 600_000))
        : 600_000;
    const maxDeliveriesPerRecipientPerHour =
      typeof payload.maxDeliveriesPerRecipientPerHour === 'number' &&
      Number.isInteger(payload.maxDeliveriesPerRecipientPerHour)
        ? Math.max(1, Math.min(payload.maxDeliveriesPerRecipientPerHour, 1_000))
        : 30;
    const workerId = `notification:${context.jobReference}:${context.attempt}`;
    const candidates = await this.repository.claimDue(
      workerId,
      new Date(),
      limit,
      leaseMs,
      maxDeliveriesPerRecipientPerHour,
    );

    for (let offset = 0; offset < candidates.length; offset += DELIVERY_CONCURRENCY) {
      if (context.signal.aborted)
        throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
      await Promise.all(
        candidates
          .slice(offset, offset + DELIVERY_CONCURRENCY)
          .map((candidate) => this.deliverCandidate(candidate, context)),
      );
    }
  }

  private async deliverCandidate(
    candidate: NotificationDeliveryCandidate,
    context: BackgroundJobHandlerContext,
  ): Promise<void> {
    let activeChannel: string | undefined;
    try {
      if (context.signal.aborted)
        throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
      if (!this.recipients) throw new Error('NOTIFICATION_RECIPIENT_POLICY_NOT_CONFIGURED');
      const recipient = NotificationRecipientReference.create(candidate.recipientReference);
      const { locale } = await this.recipients.assertEligible(candidate.recipientReference);
      validateNotificationVariables(candidate.variables);
      // A claimed P15 reminder may have become stale since scheduling. Missing
      // policy or owner outage fails closed and remains retryable through this lease.
      if (candidate.templateId === 'student-application-deadline-v1' && !this.ownerEligibility)
        throw new Error('NOTIFICATION_OWNER_ELIGIBILITY_NOT_CONFIGURED');
      if (this.ownerEligibility && !(await this.ownerEligibility.isEligible(candidate))) {
        const applied = await this.repository.markSuppressed(
          candidate,
          'NOTIFICATION_OWNER_STATE_CHANGED',
          new Date(),
        );
        if (!applied) throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
        return;
      }
      // IN_APP is checkpointed before external calls. A subsequent provider failure
      // cannot hide it, and a retry claims only channels without terminal checkpoints.
      for (const value of [...candidate.channels].sort(
        (a, b) => Number(b === 'IN_APP') - Number(a === 'IN_APP'),
      )) {
        if (context.signal.aborted)
          throw context.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
        if (Date.now() >= candidate.leaseUntil.getTime())
          throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
        await this.recipients.assertEligible(candidate.recipientReference);
        if (this.ownerEligibility && !(await this.ownerEligibility.isEligible(candidate))) {
          if (
            !(await this.repository.markSuppressed(
              candidate,
              'NOTIFICATION_OWNER_STATE_CHANGED',
              new Date(),
            ))
          )
            throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
          return;
        }
        activeChannel = value;
        const channel = NotificationChannel.create(value);
        if (await this.preferences.hasOptedOut(recipient, channel)) {
          if (!(await this.repository.suppressChannel(candidate, value, new Date())))
            throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
          continue;
        }
        const result = await this.gateway.deliver(
          { ...candidate, locale, channels: [value] },
          `notification:${candidate.id}:${value}`,
        );
        if (
          !(await this.repository.checkpointChannel(
            { ...candidate, locale },
            value,
            result,
            new Date(),
          ))
        )
          throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
      }
      if (!(await this.repository.markDelivered(candidate, {}, new Date())))
        throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
    } catch (error) {
      if (context.signal.aborted) throw context.signal.reason ?? error;
      if (error instanceof Error && error.message === 'NOTIFICATION_DELIVERY_LEASE_LOST')
        throw error;
      const deadLetter = candidate.attempt >= candidate.maxAttempts;
      const backoffMs = Math.min(
        (candidate.retryBackoffMs ?? 1_000) *
          2 ** Math.max(0, (candidate.epochAttempt ?? candidate.attempt) - 1),
        15 * 60_000,
      );
      // Provider bodies/errors can contain recipient PII. Persist only bounded codes.
      const safe = 'Notification delivery failed; inspect authorized provider diagnostics.';
      const knownCodes = new Set([
        'NOTIFICATION_RECIPIENT_NOT_ELIGIBLE',
        'NOTIFICATION_PROJECTION_CONFLICT',
        'NOTIFICATION_OWNER_ELIGIBILITY_NOT_CONFIGURED',
        'NOTIFICATION_EXTERNAL_PROVIDER_NOT_CONFIGURED',
        'NOTIFICATION_PROVIDER_RECONCILIATION_REQUIRED',
        'NOTIFICATION_PROVIDER_NOT_ACCEPTED',
        'NOTIFICATION_ACCEPTED_KEY_NOT_FOUND',
        'NOTIFICATION_ACTION_URL_NOT_ALLOWED',
        'NOTIFICATION_VARIABLES_NOT_ALLOWED',
      ]);
      const code =
        error instanceof Error && knownCodes.has(error.message)
          ? error.message
          : 'NOTIFICATION_DELIVERY_FAILED';
      const nextAttemptAt = deadLetter
        ? new Date('9999-12-31T23:59:59.999Z')
        : new Date(Date.now() + backoffMs);
      const applied = await this.repository.markFailed(
        { ...candidate, channels: activeChannel ? [activeChannel] : candidate.channels },
        code,
        safe,
        nextAttemptAt,
        deadLetter,
      );
      if (!applied) throw new Error('NOTIFICATION_DELIVERY_LEASE_LOST');
    }
  }
}
