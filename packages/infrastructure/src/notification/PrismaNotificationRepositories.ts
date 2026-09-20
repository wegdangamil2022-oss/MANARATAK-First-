import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  INotificationDeliveryRepository,
  INotificationIntentRepository,
  INotificationPreferenceGateway,
  INotificationTemplateRepository,
  NotificationChannel,
  NotificationDeliveryCandidate,
  NotificationDeliveryResult,
  NotificationIntent,
  NotificationIntentState,
  NotificationIntentSummary,
  NotificationLocaleReference,
  NotificationRecipientReference,
  NotificationTemplate,
  NotificationTemplateSummary,
  TemplateId,
} from '@manaratak/domain';

const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export class PrismaNotificationIntentRepository implements INotificationIntentRepository, INotificationDeliveryRepository {
  public constructor(private readonly prisma: PrismaClient) {}
  private get db(): any { return this.prisma as any; }

  public async save(intent: NotificationIntent): Promise<void> {
    const now = new Date();
    await this.db.notificationIntentRecord.upsert({
      where: { id: intent.id.toString() },
      create: {
        id: intent.id.toString(), reference: intent.reference.toString(), templateId: intent.templateId.toString(),
        recipientReference: intent.recipient.toString(),
        variables: json(Object.fromEntries(intent.variables.map(variable => [variable.name, variable.value]))),
        scheduledAt: intent.scheduling?.scheduledAt ?? null, expiresAt: intent.expiration?.expiresAt ?? null,
        retryMaxRetries: intent.retry?.maxRetries ?? 5, retryBackoffMs: intent.retry?.backoffMs ?? 1000,
        state: intent.getState(), deliveryState: intent.getState() === NotificationIntentState.CANCELLED ? 'CANCELLED' : 'PENDING',
        nextAttemptAt: intent.scheduling?.scheduledAt ?? now,
      },
      update: {
        state: intent.getState(), deliveryState: intent.getState() === NotificationIntentState.CANCELLED ? 'CANCELLED' : undefined,
      },
    });
  }

  public async list(limit = 100): Promise<NotificationIntentSummary[]> {
    return (await this.db.notificationIntentRecord.findMany({ orderBy: { createdAt: 'desc' }, take: limit })).map((row: any) => ({
      id: row.id, reference: row.reference, templateId: row.templateId, recipientReference: row.recipientReference,
      state: row.state, deliveryState: row.deliveryState, attempts: row.attempts, nextAttemptAt: row.nextAttemptAt,
      deliveredAt: row.deliveredAt, lastErrorCode: row.lastErrorCode, createdAt: row.createdAt, updatedAt: row.updatedAt,
    }));
  }

  public async cancel(id: string): Promise<void> {
    const result = await this.db.notificationIntentRecord.updateMany({ where: { id, deliveryState: { not: 'DELIVERED' } }, data: { state: 'CANCELLED', deliveryState: 'CANCELLED', leaseWorkerId: null, leaseToken: null, leaseUntil: null } });
    if (result.count !== 1) throw new Error('NOTIFICATION_INTENT_NOT_CANCELLABLE');
  }

  public async retry(id: string): Promise<void> {
    const result = await this.db.notificationIntentRecord.updateMany({
      where: { id, state: 'CREATED', deliveryState: { in: ['FAILED', 'DEAD_LETTER'] } },
      data: { deliveryState: 'PENDING', nextAttemptAt: new Date(), leaseWorkerId: null, leaseToken: null, leaseUntil: null, lastErrorCode: null, lastErrorMessage: null },
    });
    if (result.count !== 1) throw new Error('NOTIFICATION_INTENT_NOT_RETRYABLE');
  }

  public async claimDue(workerId: string, now: Date, limit: number, leaseMs: number, maxDeliveriesPerRecipientPerHour: number): Promise<NotificationDeliveryCandidate[]> {
    const leaseUntil = new Date(now.getTime() + leaseMs);
    return this.db.$transaction(async (tx: any) => {
      const rows = await tx.$queryRawUnsafe(
        `SELECT i.*, t."channels"
           FROM "NotificationIntentRecord" i
           JOIN "NotificationTemplateRecord" t ON t."id" = i."templateId"
          WHERE i."state" = 'CREATED'
            AND (i."expiresAt" IS NULL OR i."expiresAt" > $1)
            AND i."nextAttemptAt" <= $1
            AND (i."deliveryState" IN ('PENDING','FAILED') OR (i."deliveryState" = 'PROCESSING' AND i."leaseUntil" < $1))
            AND (
              SELECT COUNT(*)
                FROM "NotificationDeliveryReceipt" r
                JOIN "NotificationIntentRecord" recent_i ON recent_i."id" = r."intentId"
               WHERE recent_i."recipientReference" = i."recipientReference"
                 AND r."status" = 'DELIVERED'
                 AND r."createdAt" > ($1 - INTERVAL '1 hour')
            ) < $3
          ORDER BY i."nextAttemptAt" ASC, i."createdAt" ASC
          FOR UPDATE OF i SKIP LOCKED
          LIMIT $2`,
        now, limit, maxDeliveriesPerRecipientPerHour,
      ) as any[];
      const claimed: NotificationDeliveryCandidate[] = [];
      for (const row of rows) {
        const leaseToken = randomUUID();
        const applied = await tx.notificationIntentRecord.updateMany({
          where: { id: row.id, OR: [{ deliveryState: { in: ['PENDING', 'FAILED'] } }, { deliveryState: 'PROCESSING', leaseUntil: { lt: now } }] },
          data: { deliveryState: 'PROCESSING', leaseWorkerId: workerId, leaseToken, leaseUntil, attempts: { increment: 1 } },
        });
        if (applied.count !== 1) continue;
        claimed.push({
          id: row.id, reference: row.reference, templateId: row.templateId, recipientReference: row.recipientReference,
          variables: (row.variables ?? {}) as Record<string, string>, channels: Array.isArray(row.channels) ? row.channels : [],
          attempt: Number(row.attempts) + 1, maxAttempts: Number(row.retryMaxRetries) + 1, leaseToken, leaseUntil,
        });
      }
      return claimed;
    });
  }

  public async markDelivered(candidate: NotificationDeliveryCandidate, result: NotificationDeliveryResult, deliveredAt: Date): Promise<boolean> {
    return this.db.$transaction(async (tx: any) => {
      const applied = await tx.notificationIntentRecord.updateMany({
        where: { id: candidate.id, deliveryState: 'PROCESSING', leaseToken: candidate.leaseToken, leaseUntil: { gte: deliveredAt } },
        data: { deliveryState: 'DELIVERED', deliveredAt, leaseWorkerId: null, leaseToken: null, leaseUntil: null, lastErrorCode: null, lastErrorMessage: null },
      });
      if (applied.count !== 1) return false;
      await tx.notificationDeliveryReceipt.upsert({
        where: { intentId_attempt: { intentId: candidate.id, attempt: candidate.attempt } },
        create: { id: randomUUID(), intentId: candidate.id, attempt: candidate.attempt, status: 'DELIVERED', providerMessageId: result.providerMessageId ?? null, metadata: json(result.metadata ?? {}) },
        update: { status: 'DELIVERED', providerMessageId: result.providerMessageId ?? null, metadata: json(result.metadata ?? {}) },
      });
      return true;
    });
  }

  public async markFailed(candidate: NotificationDeliveryCandidate, code: string, message: string, nextAttemptAt: Date, deadLetter: boolean): Promise<boolean> {
    const now = new Date();
    return this.db.$transaction(async (tx: any) => {
      const applied = await tx.notificationIntentRecord.updateMany({
        where: { id: candidate.id, deliveryState: 'PROCESSING', leaseToken: candidate.leaseToken, leaseUntil: { gte: now } },
        data: { deliveryState: deadLetter ? 'DEAD_LETTER' : 'FAILED', nextAttemptAt, leaseWorkerId: null, leaseToken: null, leaseUntil: null, lastErrorCode: code, lastErrorMessage: message.slice(0, 500) },
      });
      if (applied.count !== 1) return false;
      await tx.notificationDeliveryReceipt.upsert({
        where: { intentId_attempt: { intentId: candidate.id, attempt: candidate.attempt } },
        create: { id: randomUUID(), intentId: candidate.id, attempt: candidate.attempt, status: deadLetter ? 'DEAD_LETTER' : 'FAILED', errorCode: code },
        update: { status: deadLetter ? 'DEAD_LETTER' : 'FAILED', errorCode: code },
      });
      return true;
    });
  }
  public async markSuppressed(candidate: NotificationDeliveryCandidate, reasonCode: string, suppressedAt: Date): Promise<boolean> {
    return this.db.$transaction(async (tx: any) => {
      const applied = await tx.notificationIntentRecord.updateMany({
        where: { id: candidate.id, deliveryState: 'PROCESSING', leaseToken: candidate.leaseToken, leaseUntil: { gte: suppressedAt } },
        data: { deliveryState: 'SUPPRESSED', deliveredAt: null, leaseWorkerId: null, leaseToken: null, leaseUntil: null, lastErrorCode: reasonCode, lastErrorMessage: null },
      });
      if (applied.count !== 1) return false;
      await tx.notificationDeliveryReceipt.upsert({
        where: { intentId_attempt: { intentId: candidate.id, attempt: candidate.attempt } },
        create: { id: randomUUID(), intentId: candidate.id, attempt: candidate.attempt, status: 'SUPPRESSED', errorCode: reasonCode },
        update: { status: 'SUPPRESSED', errorCode: reasonCode },
      });
      return true;
    });
  }

}

export class PrismaNotificationTemplateRepository implements INotificationTemplateRepository {
  public constructor(private readonly prisma: PrismaClient) {}
  private get db(): any { return this.prisma as any; }
  public async save(template: NotificationTemplate): Promise<void> {
    await this.db.notificationTemplateRecord.upsert({
      where: { id: template.id.toString() },
      create: { id: template.id.toString(), channels: json(template.channels.map(channel => channel.toString())), requiredVariables: json(template.requiredVariables), localizations: json(template.localizations.map(locale => locale.toString())) },
      update: { channels: json(template.channels.map(channel => channel.toString())), requiredVariables: json(template.requiredVariables), localizations: json(template.localizations.map(locale => locale.toString())), version: { increment: 1 } },
    });
  }
  public async findById(id: TemplateId): Promise<NotificationTemplate | null> {
    const row = await this.db.notificationTemplateRecord.findUnique({ where: { id: id.toString() } });
    if (!row) return null;
    return NotificationTemplate.create(TemplateId.create(row.id), (row.channels as string[]).map(NotificationChannel.create), row.requiredVariables as string[], (row.localizations as string[]).map(NotificationLocaleReference.create));
  }
  public async list(limit = 100): Promise<NotificationTemplateSummary[]> {
    return (await this.db.notificationTemplateRecord.findMany({ orderBy: { updatedAt: 'desc' }, take: limit })).map((row: any) => ({ id: row.id, channels: row.channels as string[], requiredVariables: row.requiredVariables as string[], localizations: row.localizations as string[], updatedAt: row.updatedAt }));
  }
}

export class PrismaStudentNotificationPreferenceGateway implements INotificationPreferenceGateway {
  public constructor(private readonly prisma: PrismaClient) {}
  public async hasOptedOut(recipient: NotificationRecipientReference, channel: NotificationChannel): Promise<boolean> {
    const row = await (this.prisma as any).studentWorkspace.findUnique({ where: { studentReferenceId: recipient.toString() }, select: { notificationMatrix: true } });
    if (!row) return false;
    const prefs = (row.notificationMatrix ?? {}) as Record<string, unknown>;
    const key = ({ EMAIL: 'email', PUSH: 'push', IN_APP: 'inApp' } as Record<string, string>)[channel.toString()];
    if (!key) return true;
    return prefs[key] === false;
  }
}
