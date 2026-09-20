import { StringValue } from './common';

export class NotificationId extends StringValue {
  private constructor(value: string) { super(value, 'Notification id'); }
  static create(value: string): NotificationId { return new NotificationId(value); }
}
export class NotificationReference extends StringValue {
  private constructor(value: string) { super(value, 'Notification reference'); }
  static create(value: string): NotificationReference { return new NotificationReference(value); }
}
export class TemplateId extends StringValue {
  private constructor(value: string) { super(value, 'Template id'); }
  static create(value: string): TemplateId { return new TemplateId(value); }
}
export class NotificationRecipientReference extends StringValue {
  private constructor(value: string) { super(value, 'Notification recipient reference'); }
  static create(value: string): NotificationRecipientReference { return new NotificationRecipientReference(value); }
}
export class NotificationChannel extends StringValue {
  private constructor(value: string) { super(value, 'Notification channel'); }
  static create(value: string): NotificationChannel { return new NotificationChannel(value.toUpperCase()); }
}
export class NotificationLocaleReference extends StringValue {
  private constructor(value: string) { super(value, 'Notification locale'); }
  static create(value: string): NotificationLocaleReference { return new NotificationLocaleReference(value); }
}
export class TemplateVariable {
  private constructor(public readonly name: string, public readonly value: string) {
    if (!name.trim()) throw new Error('Template variable name is required');
  }
  static create(name: string, value: string): TemplateVariable { return new TemplateVariable(name, value); }
}
export class SchedulingMetadata {
  private constructor(public readonly scheduledAt: Date) {
    if (Number.isNaN(scheduledAt.getTime())) throw new Error('Invalid notification schedule');
  }
  static create(value: Date): SchedulingMetadata { return new SchedulingMetadata(value); }
}
export class ExpirationMetadata {
  private constructor(public readonly expiresAt: Date) {
    if (Number.isNaN(expiresAt.getTime())) throw new Error('Invalid notification expiration');
  }
  static create(value: Date): ExpirationMetadata { return new ExpirationMetadata(value); }
}
export class RetryMetadata {
  private constructor(public readonly maxRetries: number, public readonly backoffMs: number) {
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || !Number.isFinite(backoffMs) || backoffMs < 0) throw new Error('Invalid retry metadata');
  }
  static create(maxRetries: number, backoffMs: number): RetryMetadata { return new RetryMetadata(maxRetries, backoffMs); }
}

export enum NotificationIntentState { CREATED='CREATED', CANCELLED='CANCELLED' }
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
  static create(id: NotificationId, reference: NotificationReference, templateId: TemplateId, recipient: NotificationRecipientReference, variables: readonly TemplateVariable[], scheduling?: SchedulingMetadata, expiration?: ExpirationMetadata, retry?: RetryMetadata): NotificationIntent {
    return new NotificationIntent(id, reference, templateId, recipient, Object.freeze([...variables]), scheduling, expiration, retry);
  }
  cancel(): void { this.state = NotificationIntentState.CANCELLED; }
  getState(): NotificationIntentState { return this.state; }
}

export class NotificationTemplate {
  private constructor(
    public readonly id: TemplateId,
    public readonly channels: readonly NotificationChannel[],
    public readonly requiredVariables: readonly string[],
    public readonly localizations: readonly NotificationLocaleReference[],
  ) {}
  static create(id: TemplateId, channels: readonly NotificationChannel[], requiredVariables: readonly string[], localizations: readonly NotificationLocaleReference[]): NotificationTemplate {
    if (!channels.length) throw new Error('Notification template requires at least one channel');
    return new NotificationTemplate(id, Object.freeze([...channels]), Object.freeze([...new Set(requiredVariables)]), Object.freeze([...localizations]));
  }
}

export interface NotificationTemplateSummary {
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
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
  leaseToken: string;
  leaseUntil: Date;
}

export interface NotificationDeliveryResult {
  providerMessageId?: string | null;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface INotificationIntentRepository {
  save(intent: NotificationIntent): Promise<void>;
  list(limit?: number): Promise<NotificationIntentSummary[]>;
  retry(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}
export interface INotificationTemplateRepository {
  save(template: NotificationTemplate): Promise<void>;
  findById(id: TemplateId): Promise<NotificationTemplate | null>;
  list(limit?: number): Promise<NotificationTemplateSummary[]>;
}
export interface INotificationPreferenceGateway { hasOptedOut(recipient: NotificationRecipientReference, channel: NotificationChannel): Promise<boolean>; }
export interface INotificationDeliveryRepository {
  claimDue(workerId: string, now: Date, limit: number, leaseMs: number, maxDeliveriesPerRecipientPerHour: number): Promise<NotificationDeliveryCandidate[]>;
  markDelivered(candidate: NotificationDeliveryCandidate, result: NotificationDeliveryResult, deliveredAt: Date): Promise<boolean>;
  markFailed(candidate: NotificationDeliveryCandidate, code: string, message: string, nextAttemptAt: Date, deadLetter: boolean): Promise<boolean>;
  markSuppressed(candidate: NotificationDeliveryCandidate, reasonCode: string, suppressedAt: Date): Promise<boolean>;
}
export interface INotificationDeliveryGateway {
  deliver(candidate: NotificationDeliveryCandidate, idempotencyKey: string): Promise<NotificationDeliveryResult>;
}
