import { StringValue } from './common';

export class NotificationId extends StringValue {
  private constructor(value: string) {
    super(value, 'Notification id');
  }
  static create(value: string): NotificationId {
    return new NotificationId(value);
  }
}
export class NotificationReference extends StringValue {
  private constructor(value: string) {
    super(value, 'Notification reference');
  }
  static create(value: string): NotificationReference {
    return new NotificationReference(value);
  }
}
export class TemplateId extends StringValue {
  private constructor(value: string) {
    super(value, 'Template id');
  }
  static create(value: string): TemplateId {
    return new TemplateId(value);
  }
}
export class NotificationRecipientReference extends StringValue {
  private constructor(value: string) {
    super(value, 'Notification recipient reference');
  }
  static create(value: string): NotificationRecipientReference {
    return new NotificationRecipientReference(value);
  }
}
export class NotificationChannel extends StringValue {
  private constructor(value: string) {
    super(value, 'Notification channel');
  }
  static create(value: string): NotificationChannel {
    return new NotificationChannel(value.toUpperCase());
  }
}
export class NotificationLocaleReference extends StringValue {
  private constructor(value: string) {
    super(value, 'Notification locale');
  }
  static create(value: string): NotificationLocaleReference {
    return new NotificationLocaleReference(value);
  }
}
export class TemplateVariable {
  private constructor(
    public readonly name: string,
    public readonly value: string,
  ) {
    if (!name.trim()) throw new Error('Template variable name is required');
  }
  static create(name: string, value: string): TemplateVariable {
    return new TemplateVariable(name, value);
  }
}
export class SchedulingMetadata {
  private constructor(public readonly scheduledAt: Date) {
    if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid notification schedule');
  }
  static create(value: Date): SchedulingMetadata {
    return new SchedulingMetadata(value);
  }
}
export class ExpirationMetadata {
  private constructor(public readonly expiresAt: Date) {
    if (Number.isNaN(expiresAt.getTime())) throw new Error('Invalid notification expiration');
  }
  static create(value: Date): ExpirationMetadata {
    return new ExpirationMetadata(value);
  }
}
export class RetryMetadata {
  private constructor(
    public readonly maxRetries: number,
    public readonly backoffMs: number,
  ) {
    if (
      !Number.isInteger(maxRetries) ||
      maxRetries < 0 ||
      !Number.isFinite(backoffMs) ||
      backoffMs < 0
    )
      throw new Error('Invalid retry metadata');
  }
  static create(maxRetries: number, backoffMs: number): RetryMetadata {
    return new RetryMetadata(maxRetries, backoffMs);
  }
}

export enum NotificationIntentState {
  CREATED = 'CREATED',
  CANCELLED = 'CANCELLED',
}
export class NotificationIntent {
  private state = NotificationIntentState.CREATED;
  private constructor(
    public readonly id: NotificationId,
    public readonly reference: NotificationReference,
    public readonly templateId: TemplateId,
    public readonly recipient: NotificationRecipientReference,
    public readonly variables: readonly TemplateVariable[],
    public readonly scheduling?: SchedulingMetadata,
    public readonly expiration?: ExpirationMetadata,
    public readonly retry?: RetryMetadata,
  ) {}
  static create(
    id: NotificationId,
    reference: NotificationReference,
    templateId: TemplateId,
    recipient: NotificationRecipientReference,
    variables: readonly TemplateVariable[],
    scheduling?: SchedulingMetadata,
    expiration?: ExpirationMetadata,
    retry?: RetryMetadata,
  ): NotificationIntent {
    return new NotificationIntent(
      id,
      reference,
      templateId,
      recipient,
      Object.freeze([...variables]),
      scheduling,
      expiration,
      retry,
    );
  }
  cancel(): void {
    this.state = NotificationIntentState.CANCELLED;
  }
  getState(): NotificationIntentState {
    return this.state;
  }
}

export type NotificationContents = Readonly<Record<string, { subject: string; body: string }>>;
export class NotificationTemplate {
  private constructor(
    public readonly id: TemplateId,
    public readonly channels: readonly NotificationChannel[],
    public readonly requiredVariables: readonly string[],
    public readonly localizations: readonly NotificationLocaleReference[],
    public readonly contents?: NotificationContents,
  ) {}
  static create(
    id: TemplateId,
    channels: readonly NotificationChannel[],
    requiredVariables: readonly string[],
    localizations: readonly NotificationLocaleReference[],
    contents?: NotificationContents,
  ): NotificationTemplate {
    if (!channels.length) throw new Error('Notification template requires at least one channel');
    return new NotificationTemplate(
      id,
      Object.freeze([...channels]),
      Object.freeze([...new Set(requiredVariables)]),
      Object.freeze([...localizations]),
      contents ? JSON.parse(JSON.stringify(contents)) : undefined,
    );
  }
}

export interface NotificationTemplateSummary {
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
  active?: boolean;
  version?: number;
  usageCount?: number;
  updatedAt?: Date;
}

export interface NotificationIntentSummary {
  id: string;
  reference: string;
  templateId: string;
  recipientReference: string;
  state: string;
  deliveryState: string;
  attempts: number;
  manualRetryCount?: number;
  nextAttemptAt?: Date | null;
  deliveredAt?: Date | null;
  lastErrorCode?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationDeliveryCandidate {
  id: string;
  reference: string;
  templateId: string;
  recipientReference: string;
  variables: Readonly<Record<string, string>>;
  channels: readonly string[];
  attempt: number;
  maxAttempts: number;
  epochAttempt?: number;
  acceptedChannels?: readonly string[];
  retryBackoffMs?: number;
  leaseToken: string;
  leaseUntil: Date;
  locale?: string;
  contents?: NotificationContents;
}

export interface NotificationDeliveryResult {
  status?: 'ACCEPTED' | 'DELIVERED';
  providerMessageId?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface NotificationIntentQuery {
  search?: string;
  recipientReference?: string;
  from?: Date;
  to?: Date;
  deliveryState?: string;
  templateId?: string;
  after?: { id: string; createdAt: Date };
}
export interface INotificationIntentRepository {
  save(intent: NotificationIntent): Promise<void>;
  list(limit?: number, query?: NotificationIntentQuery): Promise<NotificationIntentSummary[]>;
  retry(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  receipts(id: string): Promise<NotificationChannelReceipt[]>;
  summary(from: Date, to: Date): Promise<{ from: Date; to: Date; counts: Record<string, number> }>;
}
export interface INotificationTemplateRepository {
  save(template: NotificationTemplate, options?: { createOnly?: boolean }): Promise<void>;
  findById(id: TemplateId): Promise<NotificationTemplate | null>;
  deactivate(id: string, expectedVersion: number): Promise<void>;
  list(limit?: number): Promise<NotificationTemplateSummary[]>;
}
export interface INotificationRecipientGateway {
  assertEligible(recipientReference: string): Promise<{ locale: string }>;
}
export interface NotificationChannelReceipt {
  channel: string;
  status: string;
  attempts: number;
  providerMessageId?: string | null;
  errorCode?: string | null;
  updatedAt: Date;
}
export interface INotificationPreferenceGateway {
  hasOptedOut(
    recipient: NotificationRecipientReference,
    channel: NotificationChannel,
  ): Promise<boolean>;
}
export interface INotificationDeliveryRepository {
  claimDue(
    workerId: string,
    now: Date,
    limit: number,
    leaseMs: number,
    maxDeliveriesPerRecipientPerHour: number,
  ): Promise<NotificationDeliveryCandidate[]>;
  checkpointChannel(
    candidate: NotificationDeliveryCandidate,
    channel: string,
    result: NotificationDeliveryResult,
    at: Date,
  ): Promise<boolean>;
  suppressChannel(
    candidate: NotificationDeliveryCandidate,
    channel: string,
    at: Date,
  ): Promise<boolean>;
  markDelivered(
    candidate: NotificationDeliveryCandidate,
    result: NotificationDeliveryResult,
    deliveredAt: Date,
  ): Promise<boolean>;
  markFailed(
    candidate: NotificationDeliveryCandidate,
    code: string,
    message: string,
    nextAttemptAt: Date,
    deadLetter: boolean,
  ): Promise<boolean>;
  markSuppressed(
    candidate: NotificationDeliveryCandidate,
    reasonCode: string,
    suppressedAt: Date,
  ): Promise<boolean>;
}
export interface INotificationDeliveryGateway {
  deliver(
    candidate: NotificationDeliveryCandidate,
    idempotencyKey: string,
  ): Promise<NotificationDeliveryResult>;
}

/** Current source-owner eligibility, checked before sending a claimed notification. */
export interface INotificationDeliveryEligibilityPolicy {
  isEligible(candidate: NotificationDeliveryCandidate): Promise<boolean>;
}
