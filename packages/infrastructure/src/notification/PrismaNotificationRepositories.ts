import { createHash, randomUUID } from 'node:crypto';
import { notificationTemplateFallback } from './NotificationTemplateFallback';
import { StudentPrivateResultProtector } from '../students/StudentPrivateResultProtector';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  INotificationDeliveryRepository,
  IStudentWorkspaceDeliveryCache,
  INotificationIntentRepository,
  INotificationPreferenceGateway,
  INotificationTemplateRepository,
  NotificationChannel,
  NotificationDeliveryCandidate,
  NotificationDeliveryResult,
  NotificationIntent,
  NotificationIntentState,
  NotificationIntentSummary,
  NotificationIntentQuery,
  NotificationLocaleReference,
  NotificationRecipientReference,
  NotificationTemplate,
  NotificationTemplateSummary,
  TemplateId,
} from '@absheer/domain';

const variableFingerprint = (value: Record<string, string>) =>
  createHash('sha256')
    .update(JSON.stringify(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))))
    .digest('hex');
const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

export class PrismaNotificationIntentRepository
  implements INotificationIntentRepository, INotificationDeliveryRepository
{
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly cache?: IStudentWorkspaceDeliveryCache | null,
    private readonly protector?: StudentPrivateResultProtector,
    private readonly payloadRetentionDays = 30,
  ) {
    if (
      !Number.isInteger(payloadRetentionDays) ||
      payloadRetentionDays < 1 ||
      payloadRetentionDays > 90
    )
      throw new Error('NOTIFICATION_RETENTION_POLICY_INVALID');
  }
  public get payloadProtectionStatus() {
    return this.protector?.status() ?? 'NOT_CONFIGURED';
  }
  private get db(): any {
    return this.prisma as any;
  }

  public async save(intent: NotificationIntent): Promise<void> {
    if (this.protector?.status() !== 'READY')
      throw new Error('NOTIFICATION_PAYLOAD_PROTECTION_NOT_CONFIGURED');
    const submitted = Object.fromEntries(
      intent.variables.map((variable) => [variable.name, variable.value]),
    );
    const encrypted = this.protector.protect({
      intentId: intent.id.toString(),
      recipientReference: intent.recipient.toString(),
      variables: submitted,
    });
    const now = new Date();
    await this.db.$transaction(async (tx: any) => {
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "NotificationTemplateRecord" WHERE "id" = $1 FOR UPDATE',
        intent.templateId.toString(),
      );
      const template = await tx.notificationTemplateRecord.findUnique({
        where: { id: intent.templateId.toString() },
      });
      if (!template || template.active === false)
        throw new Error('NOTIFICATION_TEMPLATE_NOT_FOUND');
      const saved = await tx.notificationIntentRecord.upsert({
        where: { id: intent.id.toString() },
        create: {
          id: intent.id.toString(),
          reference: intent.reference.toString(),
          templateId: intent.templateId.toString(),
          channelsSnapshot: template.channels,
          contentsSnapshot:
            template.contents ??
            json(notificationTemplateFallback(intent.templateId.toString(), submitted)),
          recipientReference: intent.recipient.toString(),
          variablesFingerprint: variableFingerprint(
            Object.fromEntries(intent.variables.map((variable) => [variable.name, variable.value])),
          ),
          variables: {},
          variablesEncrypted: json(encrypted),
          scheduledAt: intent.scheduling?.scheduledAt ?? null,
          expiresAt: intent.expiration?.expiresAt ?? null,
          retryMaxRetries: intent.retry?.maxRetries ?? 5,
          retryBackoffMs: intent.retry?.backoffMs ?? 1000,
          state: intent.getState(),
          deliveryState:
            intent.getState() === NotificationIntentState.CANCELLED ? 'SUPPRESSED' : 'PENDING',
          nextAttemptAt: intent.scheduling?.scheduledAt ?? now,
        },
        // Replaying an intent must not reopen a cancelled or delivered record.
        update: {},
      });
      const submittedVariables = Object.fromEntries(
        intent.variables.map((variable) => [variable.name, variable.value]),
      );
      const sameVariables =
        Object.keys(saved.variables ?? {}).length === Object.keys(submittedVariables).length &&
        Object.entries(submittedVariables).every(([key, value]) => saved.variables[key] === value);
      if (
        saved.reference !== intent.reference.toString() ||
        saved.templateId !== intent.templateId.toString() ||
        saved.recipientReference !== intent.recipient.toString() ||
        !(saved.variablesFingerprint
          ? saved.variablesFingerprint === variableFingerprint(submittedVariables)
          : sameVariables) ||
        (saved.scheduledAt?.getTime() ?? null) !==
          (intent.scheduling?.scheduledAt.getTime() ?? null) ||
        (saved.expiresAt?.getTime() ?? null) !== (intent.expiration?.expiresAt.getTime() ?? null) ||
        saved.retryMaxRetries !== (intent.retry?.maxRetries ?? 5) ||
        saved.retryBackoffMs !== (intent.retry?.backoffMs ?? 1000)
      )
        throw new Error('NOTIFICATION_INTENT_ID_CONFLICT');
    });
  }

  public async list(
    limit = 100,
    query: NotificationIntentQuery = {},
  ): Promise<NotificationIntentSummary[]> {
    const where = {
      AND: [
        ...(query.recipientReference ? [{ recipientReference: query.recipientReference }] : []),
        ...(query.from || query.to
          ? [
              {
                createdAt: {
                  ...(query.from ? { gte: query.from } : {}),
                  ...(query.to ? { lt: query.to } : {}),
                },
              },
            ]
          : []),
        ...(query.deliveryState ? [{ deliveryState: query.deliveryState }] : []),
        ...(query.templateId ? [{ templateId: query.templateId }] : []),
        ...(query.search
          ? [
              {
                OR: [
                  { id: { contains: query.search, mode: 'insensitive' } },
                  { templateId: { contains: query.search, mode: 'insensitive' } },
                ],
              },
            ]
          : []),
        ...(query.after
          ? [
              {
                OR: [
                  { createdAt: { lt: query.after.createdAt } },
                  { createdAt: query.after.createdAt, id: { lt: query.after.id } },
                ],
              },
            ]
          : []),
      ],
    };
    return (
      await this.db.notificationIntentRecord.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      })
    ).map((row: any) => ({
      id: row.id,
      reference: row.reference,
      templateId: row.templateId,
      recipientReference: row.recipientReference,
      state: row.state,
      deliveryState: row.deliveryState,
      attempts: row.attempts,
      manualRetryCount: row.manualRetryCount,
      nextAttemptAt: row.nextAttemptAt,
      deliveredAt: row.deliveredAt,
      lastErrorCode: row.lastErrorCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  public async cancel(id: string): Promise<void> {
    const result = await this.db.notificationIntentRecord.updateMany({
      where: { id, state: 'CREATED', deliveryState: { in: ['PENDING', 'FAILED', 'DEAD_LETTER'] } },
      data: {
        state: 'CANCELLED',
        deliveryState: 'CANCELLED',
        leaseWorkerId: null,
        leaseToken: null,
        leaseUntil: null,
      },
    });
    if (result.count !== 1) throw new Error('NOTIFICATION_INTENT_NOT_CANCELLABLE');
  }

  public async retry(id: string): Promise<void> {
    const now = new Date();
    const changed = await this.db.$executeRawUnsafe(
      `UPDATE "NotificationIntentRecord"
      SET "deliveryState" = 'PENDING', "nextAttemptAt" = $2,
          "retryEpochStart" = "attempts", "manualRetryCount" = "manualRetryCount" + 1,
          "leaseWorkerId" = NULL, "leaseToken" = NULL, "leaseUntil" = NULL,
          "lastErrorCode" = NULL, "lastErrorMessage" = NULL, "updatedAt" = $2
      WHERE "id" = $1 AND "state" = 'CREATED' AND "deliveryState" IN ('FAILED','DEAD_LETTER')
        AND "manualRetryCount" < 3 AND ("expiresAt" IS NULL OR "expiresAt" > $2)`,
      id,
      now,
    );
    if (changed !== 1) throw new Error('NOTIFICATION_INTENT_NOT_RETRYABLE');
  }

  public async summary(from: Date, to: Date) {
    const groups = await this.db.notificationIntentRecord.groupBy({
      by: ['deliveryState'],
      where: { createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    });
    const where = { createdAt: { gte: from, lt: to } };
    const [channels, errors, oldest] = await Promise.all([
      this.db.notificationChannelDelivery.groupBy({
        by: ['channel', 'status'],
        where: { intent: where },
        _count: { _all: true },
      }),
      this.db.notificationIntentRecord.groupBy({
        by: ['lastErrorCode'],
        where: { ...where, lastErrorCode: { not: null } },
        _count: { _all: true },
      }),
      this.db.notificationIntentRecord.aggregate({
        where: { ...where, deliveryState: { in: ['PENDING', 'PROCESSING', 'FAILED'] } },
        _min: { nextAttemptAt: true },
      }),
    ]);
    return {
      from,
      to,
      channels: channels.map((row: any) => ({
        channel: row.channel,
        status: row.status,
        count: row._count._all,
      })),
      errors: errors.map((row: any) => ({
        code: /^[A-Z][A-Z0-9_]{0,100}$/.test(row.lastErrorCode)
          ? row.lastErrorCode
          : 'UNCLASSIFIED_ERROR',
        count: row._count._all,
      })),
      oldestPendingAt: oldest._min.nextAttemptAt,
      counts: Object.fromEntries(
        groups.map((row: any) => [row.deliveryState, row._count._all]),
      ) as Record<string, number>,
    };
  }

  public async receipts(id: string) {
    const rows = await this.db.notificationChannelDelivery.findMany({
      where: { intentId: id },
      orderBy: { channel: 'asc' },
    });
    const attempts = await this.db.notificationDeliveryReceipt.findMany({
      where: { intentId: id },
      orderBy: { attempt: 'asc' },
      take: 500,
    });
    return [
      ...rows.map((row: any) => ({
        channel: row.channel,
        status: row.status,
        attempts: row.attempts,
        // Provider message identifiers/metadata are intentionally not disclosed.
        updatedAt: row.updatedAt,
      })),
      ...attempts.map((row: any) => ({
        channel: 'ATTEMPT',
        status: row.status,
        attempts: row.attempt,
        updatedAt: row.createdAt,
        errorCode: row.errorCode,
      })),
    ];
  }

  private variablesForDelivery(row: any): Record<string, string> {
    if (!row.variablesEncrypted) return row.variables ?? {}; // Legacy backfill/reconciliation remains runtime-pending.
    if (!this.protector) throw new Error('NOTIFICATION_PAYLOAD_PROTECTION_NOT_CONFIGURED');
    const decoded = this.protector.unprotect(row.variablesEncrypted) as {
      intentId: string;
      recipientReference: string;
      variables: Record<string, string>;
    };
    if (
      decoded.intentId !== row.id ||
      decoded.recipientReference !== row.recipientReference ||
      variableFingerprint(decoded.variables) !== row.variablesFingerprint
    )
      throw new Error('NOTIFICATION_PAYLOAD_BINDING_CONFLICT');
    return decoded.variables;
  }

  public async purgePayloads(now: Date): Promise<void> {
    const before = new Date(now.getTime() - this.payloadRetentionDays * 86400000);
    const rows = await this.db.notificationIntentRecord.findMany({
      where: {
        payloadErasedAt: null,
        deliveryState: {
          in: ['DELIVERED', 'ACCEPTED', 'SUPPRESSED', 'CANCELLED', 'EXPIRED', 'DEAD_LETTER'],
        },
        createdAt: { lt: before },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { id: true, deliveryState: true, variables: true, variablesFingerprint: true },
    });
    for (const row of rows)
      await this.db.notificationIntentRecord.updateMany({
        where: {
          id: row.id,
          payloadErasedAt: null,
          deliveryState: {
            in: ['DELIVERED', 'ACCEPTED', 'SUPPRESSED', 'CANCELLED', 'EXPIRED', 'DEAD_LETTER'],
          },
          createdAt: { lt: before },
        },
        data: {
          variables: {},
          variablesEncrypted: Prisma.DbNull,
          variablesFingerprint:
            row.variablesFingerprint ?? variableFingerprint(row.variables ?? {}),
          payloadErasedAt: now,
          lastErrorMessage: null,
          ...(['DEAD_LETTER', 'ACCEPTED'].includes(row.deliveryState)
            ? { deliveryState: 'EXPIRED' }
            : {}),
        },
      });
    // Reservations only affect the sliding hour; old operational counters need not accumulate.
    await this.db.notificationRateReservation.deleteMany({ where: { reservedAt: { lt: before } } });
  }

  public async claimDue(
    workerId: string,
    now: Date,
    limit: number,
    leaseMs: number,
    maxDeliveriesPerRecipientPerHour: number,
  ): Promise<NotificationDeliveryCandidate[]> {
    // Bounded owner retention: retire terminal message variables 30 days after intent creation.
    // Keep only replay fingerprints and minimal receipts. P15 inbox retention stays with P15.
    await this.purgePayloads(now);
    const leaseUntil = new Date(now.getTime() + leaseMs);
    return this.db.$transaction(async (tx: any) => {
      await tx.notificationIntentRecord.updateMany({
        where: {
          state: 'CREATED',
          expiresAt: { lte: now },
          OR: [
            { deliveryState: { in: ['PENDING', 'FAILED'] } },
            { deliveryState: 'PROCESSING', leaseUntil: { lt: now } },
          ],
        },
        data: { deliveryState: 'EXPIRED', leaseWorkerId: null, leaseToken: null, leaseUntil: null },
      });
      const rows = (await tx.$queryRawUnsafe(
        `SELECT i.*, COALESCE(i."channelsSnapshot", t."channels") AS "channels"
           FROM "NotificationIntentRecord" i
           JOIN "NotificationTemplateRecord" t ON t."id" = i."templateId"
          WHERE i."state" = 'CREATED'
            AND (i."expiresAt" IS NULL OR i."expiresAt" > $1)
            AND i."nextAttemptAt" <= $1
            AND (i."deliveryState" IN ('PENDING','FAILED','ACCEPTED') OR (i."deliveryState" = 'PROCESSING' AND i."leaseUntil" < $1))
          ORDER BY i."nextAttemptAt" ASC, i."createdAt" ASC
          FOR UPDATE OF i SKIP LOCKED
          LIMIT $2`,
        now,
        limit,
      )) as any[];
      const claimed: NotificationDeliveryCandidate[] = [];
      for (const row of rows) {
        // Try-lock skips busy recipients rather than deadlocking batches in different orders.
        // The sliding-window reservation counts claimed and failed/uncertain attempts too.
        const [lock] = await tx.$queryRawUnsafe(
          'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 23)) AS locked',
          row.recipientReference,
        );
        if (!lock?.locked) continue;
        const reserved = await tx.notificationRateReservation.count({
          where: {
            recipientReference: row.recipientReference,
            reservedAt: { gt: new Date(now.getTime() - 3600000) },
          },
        });
        if (reserved >= maxDeliveriesPerRecipientPerHour) continue;
        const terminal = await tx.notificationChannelDelivery.findMany({
          where: { intentId: row.id },
          select: { channel: true, status: true },
        });
        const channels = (Array.isArray(row.channels) ? row.channels : []).filter(
          (channel: string) =>
            !terminal.some((c: any) => c.channel === channel && c.status !== 'ACCEPTED'),
        );
        const leaseToken = randomUUID();
        const applied = await tx.notificationIntentRecord.updateMany({
          where: {
            id: row.id,
            OR: [
              { deliveryState: { in: ['PENDING', 'FAILED', 'ACCEPTED'] } },
              { deliveryState: 'PROCESSING', leaseUntil: { lt: now } },
            ],
          },
          data: {
            deliveryState: 'PROCESSING',
            leaseWorkerId: workerId,
            leaseToken,
            leaseUntil,
            attempts: { increment: 1 },
          },
        });
        if (applied.count !== 1) continue;
        if (!row.variablesEncrypted && !row.payloadErasedAt) {
          if (this.protector?.status() !== 'READY')
            throw new Error('NOTIFICATION_PAYLOAD_PROTECTION_NOT_CONFIGURED');
          row.variablesFingerprint = variableFingerprint(row.variables ?? {});
          row.variablesEncrypted = this.protector.protect({
            intentId: row.id,
            recipientReference: row.recipientReference,
            variables: row.variables ?? {},
          });
          await tx.notificationIntentRecord.updateMany({
            where: { id: row.id, leaseToken },
            data: {
              variables: {},
              variablesEncrypted: json(row.variablesEncrypted),
              variablesFingerprint: row.variablesFingerprint,
            },
          });
        }
        if (!row.contentsSnapshot) {
          row.contentsSnapshot = notificationTemplateFallback(
            row.templateId,
            this.variablesForDelivery(row),
          );
          await tx.notificationIntentRecord.updateMany({
            where: { id: row.id, leaseToken },
            data: { contentsSnapshot: json(row.contentsSnapshot) },
          });
        }
        await tx.notificationRateReservation.create({
          data: {
            intentId: row.id,
            attempt: Number(row.attempts) + 1,
            recipientReference: row.recipientReference,
            reservedAt: now,
          },
        });
        claimed.push({
          id: row.id,
          reference: row.reference,
          templateId: row.templateId,
          recipientReference: row.recipientReference,
          variables: this.variablesForDelivery(row),
          contents: row.contentsSnapshot ?? undefined,
          channels,
          acceptedChannels: terminal
            .filter((c: any) => c.status === 'ACCEPTED')
            .map((c: any) => c.channel),
          attempt: Number(row.attempts) + 1,
          epochAttempt: Number(row.attempts) + 1 - Number(row.retryEpochStart ?? 0),
          maxAttempts: Number(row.retryEpochStart ?? 0) + Number(row.retryMaxRetries) + 1,
          retryBackoffMs: Number(row.retryBackoffMs),
          leaseToken,
          leaseUntil,
        });
      }
      return claimed;
    });
  }

  public async suppressChannel(
    candidate: NotificationDeliveryCandidate,
    channel: string,
    at: Date,
  ): Promise<boolean> {
    return this.checkpointChannel(candidate, channel, { metadata: { suppressed: true } }, at);
  }

  public async checkpointChannel(
    candidate: NotificationDeliveryCandidate,
    channel: string,
    result: NotificationDeliveryResult,
    deliveredAt: Date,
  ): Promise<boolean> {
    if (!candidate.channels.includes(channel)) throw new Error('NOTIFICATION_CHANNEL_NOT_CLAIMED');
    const applied = await this.db.$transaction(async (tx: any) => {
      const lease = await tx.notificationIntentRecord.updateMany({
        where: {
          id: candidate.id,
          state: 'CREATED',
          deliveryState: 'PROCESSING',
          leaseToken: candidate.leaseToken,
          leaseUntil: { gte: deliveredAt },
        },
        data: { leaseToken: candidate.leaseToken },
      });
      if (lease.count !== 1) return false;
      if (channel !== 'IN_APP' && !result.metadata?.suppressed && !result.status)
        throw new Error('NOTIFICATION_EXTERNAL_RECEIPT_REQUIRED');
      const status = result.metadata?.suppressed ? 'SUPPRESSED' : (result.status ?? 'DELIVERED');
      if (status !== 'SUPPRESSED') {
        if (channel === 'IN_APP') {
          const content = inAppContent(candidate);
          // Owner outbox projections may already contain this event. Reuse that
          // projection without changing its text or read state.
          const sourceEventId = candidate.reference.startsWith('event:')
            ? candidate.reference.slice('event:'.length)
            : `notification:${candidate.id}`;
          const projection = await tx.studentNotificationProjection.upsert({
            where: { sourceEventId },
            create: {
              id: randomUUID(),
              studentReferenceId: candidate.recipientReference,
              category: content.category,
              title: content.title,
              message: content.message,
              actionUrl: content.actionUrl,
              sourceEventId,
              occurredAt: deliveredAt,
            },
            update: {},
          });
          if (
            projection.studentReferenceId !== candidate.recipientReference ||
            projection.title !== content.title ||
            projection.message !== content.message ||
            projection.category !== content.category ||
            projection.actionUrl !== content.actionUrl
          )
            throw new Error('NOTIFICATION_PROJECTION_CONFLICT');
          const unreadNotifications = await tx.studentNotificationProjection.count({
            where: { studentReferenceId: candidate.recipientReference, readAt: null },
          });
          await tx.studentPersonalStatistics.updateMany({
            where: { studentReferenceId: candidate.recipientReference },
            data: { unreadNotifications },
          });
        }
      }
      await tx.notificationChannelDelivery.upsert({
        where: { intentId_channel: { intentId: candidate.id, channel } },
        create: {
          intentId: candidate.id,
          channel,
          status,
          attempts: candidate.attempt,
          providerMessageId: result.providerMessageId ?? null,
          updatedAt: deliveredAt,
        },
        update: {},
      });
      if (status === 'DELIVERED')
        await tx.notificationChannelDelivery.updateMany({
          where: { intentId: candidate.id, channel, status: 'ACCEPTED' },
          data: {
            status: 'DELIVERED',
            updatedAt: deliveredAt,
            providerMessageId: result.providerMessageId ?? null,
          },
        });
      return true;
    });
    if (applied && channel === 'IN_APP' && !result.metadata?.suppressed)
      await this.cache?.invalidate(candidate.recipientReference, 'notification-delivered');
    return applied;
  }

  public async markDelivered(
    candidate: NotificationDeliveryCandidate,
    result: NotificationDeliveryResult,
    deliveredAt: Date,
  ): Promise<boolean> {
    const delivered = await this.db.$transaction(async (tx: any) => {
      const row = await tx.notificationIntentRecord.findUnique({
        where: { id: candidate.id },
        select: { channelsSnapshot: true },
      });
      const channels = await tx.notificationChannelDelivery.findMany({
        where: { intentId: candidate.id },
      });
      if (
        !row ||
        !Array.isArray(row.channelsSnapshot) ||
        row.channelsSnapshot.some(
          (channel: string) => !channels.some((c: any) => c.channel === channel),
        )
      )
        throw new Error('NOTIFICATION_CHANNEL_CHECKPOINT_MISSING');
      const status = channels.every((c: any) => c.status === 'SUPPRESSED')
        ? 'SUPPRESSED'
        : channels.some((c: any) => c.status === 'ACCEPTED')
          ? 'ACCEPTED'
          : 'DELIVERED';
      const applied = await tx.notificationIntentRecord.updateMany({
        where: {
          id: candidate.id,
          deliveryState: 'PROCESSING',
          leaseToken: candidate.leaseToken,
          leaseUntil: { gte: deliveredAt },
        },
        data: {
          deliveryState: status,
          nextAttemptAt:
            status === 'ACCEPTED' ? new Date(deliveredAt.getTime() + 60000) : deliveredAt,
          deliveredAt: status === 'DELIVERED' ? deliveredAt : null,
          leaseWorkerId: null,
          leaseToken: null,
          leaseUntil: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      if (applied.count !== 1) return false;
      await tx.notificationDeliveryReceipt.upsert({
        where: { intentId_attempt: { intentId: candidate.id, attempt: candidate.attempt } },
        create: {
          id: randomUUID(),
          intentId: candidate.id,
          attempt: candidate.attempt,
          status,
          providerMessageId: result.providerMessageId ?? null,
          metadata: json(result.metadata ?? {}),
        },
        update: {
          status,
          providerMessageId: result.providerMessageId ?? null,
          metadata: json(result.metadata ?? {}),
        },
      });
      return true;
    });
    if (delivered && candidate.channels.includes('IN_APP'))
      await this.cache?.invalidate(candidate.recipientReference, 'notification-delivered');
    return delivered;
  }

  public async markFailed(
    candidate: NotificationDeliveryCandidate,
    code: string,
    message: string,
    nextAttemptAt: Date,
    deadLetter: boolean,
  ): Promise<boolean> {
    const now = new Date();
    return this.db.$transaction(async (tx: any) => {
      const applied = await tx.notificationIntentRecord.updateMany({
        where: {
          id: candidate.id,
          deliveryState: 'PROCESSING',
          leaseToken: candidate.leaseToken,
          leaseUntil: { gte: now },
        },
        data: {
          deliveryState: deadLetter ? 'DEAD_LETTER' : 'FAILED',
          nextAttemptAt,
          leaseWorkerId: null,
          leaseToken: null,
          leaseUntil: null,
          lastErrorCode: code,
          lastErrorMessage: message.slice(0, 500),
        },
      });
      if (applied.count !== 1) return false;
      await tx.notificationDeliveryReceipt.upsert({
        where: { intentId_attempt: { intentId: candidate.id, attempt: candidate.attempt } },
        create: {
          id: randomUUID(),
          intentId: candidate.id,
          attempt: candidate.attempt,
          status: deadLetter ? 'DEAD_LETTER' : 'FAILED',
          metadata: json({ channels: candidate.channels }),
          errorCode: code,
        },
        update: { status: deadLetter ? 'DEAD_LETTER' : 'FAILED', errorCode: code },
      });
      return true;
    });
  }
  public async markSuppressed(
    candidate: NotificationDeliveryCandidate,
    reasonCode: string,
    suppressedAt: Date,
  ): Promise<boolean> {
    return this.db.$transaction(async (tx: any) => {
      const applied = await tx.notificationIntentRecord.updateMany({
        where: {
          id: candidate.id,
          deliveryState: 'PROCESSING',
          leaseToken: candidate.leaseToken,
          leaseUntil: { gte: suppressedAt },
        },
        data: {
          deliveryState: 'SUPPRESSED',
          deliveredAt: null,
          leaseWorkerId: null,
          leaseToken: null,
          leaseUntil: null,
          lastErrorCode: reasonCode,
          lastErrorMessage: null,
        },
      });
      if (applied.count !== 1) return false;
      await tx.notificationDeliveryReceipt.upsert({
        where: { intentId_attempt: { intentId: candidate.id, attempt: candidate.attempt } },
        create: {
          id: randomUUID(),
          intentId: candidate.id,
          attempt: candidate.attempt,
          status: 'SUPPRESSED',
          errorCode: reasonCode,
        },
        update: { status: 'SUPPRESSED', errorCode: reasonCode },
      });
      return true;
    });
  }
}

export class PrismaNotificationTemplateRepository implements INotificationTemplateRepository {
  public constructor(private readonly prisma: PrismaClient) {}
  private get db(): any {
    return this.prisma as any;
  }
  public async save(
    template: NotificationTemplate,
    options?: { createOnly?: boolean },
  ): Promise<void> {
    if (options?.createOnly) {
      await this.db.notificationTemplateRecord.create({
        data: {
          id: template.id.toString(),
          channels: json(template.channels.map((channel) => channel.toString())),
          ...(template.contents ? { contents: json(template.contents) } : {}),
          requiredVariables: json(template.requiredVariables),
          localizations: json(template.localizations.map((locale) => locale.toString())),
        },
      });
      return;
    }
    const saved = await this.db.notificationTemplateRecord.upsert({
      where: { id: template.id.toString() },
      create: {
        id: template.id.toString(),
        ...(template.contents ? { contents: json(template.contents) } : {}),
        channels: json(template.channels.map(String)),
        requiredVariables: json(template.requiredVariables),
        localizations: json(template.localizations.map(String)),
      },
      update: {},
    });
    const canonical = (values: readonly string[]) => JSON.stringify([...values].sort());
    if (
      canonical(saved.channels) !== canonical(template.channels.map(String)) ||
      canonical(saved.requiredVariables) !== canonical(template.requiredVariables) ||
      canonical(saved.localizations) !== canonical(template.localizations.map(String)) ||
      JSON.stringify(
        Object.keys(saved.contents ?? {})
          .sort()
          .map((locale) => [locale, saved.contents[locale].subject, saved.contents[locale].body]),
      ) !==
        JSON.stringify(
          Object.keys(template.contents ?? {})
            .sort()
            .map((locale) => [
              locale,
              template.contents![locale].subject,
              template.contents![locale].body,
            ]),
        )
    )
      throw new Error('NOTIFICATION_TEMPLATE_IMMUTABLE_CONFLICT');
  }

  public async deactivate(id: string, expectedVersion: number): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      await tx.$queryRawUnsafe(
        'SELECT "id" FROM "NotificationTemplateRecord" WHERE "id" = $1 FOR UPDATE',
        id,
      );
      const pending = await tx.notificationIntentRecord.count({
        where: {
          templateId: id,
          state: 'CREATED',
          deliveryState: { in: ['PENDING', 'PROCESSING', 'FAILED', 'DEAD_LETTER', 'ACCEPTED'] },
        },
      });
      if (pending) throw new Error('NOTIFICATION_TEMPLATE_IN_USE');
      const result = await tx.notificationTemplateRecord.updateMany({
        where: { id, version: expectedVersion, active: true },
        data: { active: false, version: { increment: 1 } },
      });
      if (result.count !== 1) throw new Error('NOTIFICATION_TEMPLATE_VERSION_CONFLICT');
    });
  }

  public async findById(id: TemplateId): Promise<NotificationTemplate | null> {
    const row = await this.db.notificationTemplateRecord.findUnique({
      where: { id: id.toString() },
    });
    if (!row || row.active === false) return null;
    return NotificationTemplate.create(
      TemplateId.create(row.id),
      (row.channels as string[]).map(NotificationChannel.create),
      row.requiredVariables as string[],
      (row.localizations as string[]).map(NotificationLocaleReference.create),
      row.contents ?? undefined,
    );
  }
  public async list(limit = 100): Promise<NotificationTemplateSummary[]> {
    return (
      await this.db.notificationTemplateRecord.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { intents: true } } },
        take: limit,
      })
    ).map((row: any) => ({
      id: row.id,
      channels: row.channels as string[],
      requiredVariables: row.requiredVariables as string[],
      localizations: row.localizations as string[],
      active: row.active,
      version: row.version,
      usageCount: row._count?.intents ?? 0,
      updatedAt: row.updatedAt,
    }));
  }
}

export class PrismaStudentNotificationPreferenceGateway implements INotificationPreferenceGateway {
  public constructor(private readonly prisma: PrismaClient) {}
  public async hasOptedOut(
    recipient: NotificationRecipientReference,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const row = await (this.prisma as any).studentWorkspace.findUnique({
      where: { studentReferenceId: recipient.toString() },
      select: { notificationMatrix: true, status: true },
    });
    if (!row || row.status !== 'ACTIVE') return true;
    const prefs = (row.notificationMatrix ?? {}) as Record<string, unknown>;
    const key = ({ EMAIL: 'email', PUSH: 'push', IN_APP: 'inApp' } as Record<string, string>)[
      channel.toString()
    ];
    if (!key) return true;
    return prefs[key] !== true;
  }
}

function inAppContent(candidate: NotificationDeliveryCandidate): {
  category: string;
  title: string;
  message: string;
  actionUrl: string | null;
} {
  const variables = candidate.variables;
  const content =
    candidate.contents?.[candidate.locale ?? 'ar'] ??
    candidate.contents?.en ??
    candidate.contents?.ar;
  const render = (text: string) =>
    text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_match, name: string) => {
      if (!variables[name]?.trim()) throw new Error('NOTIFICATION_REQUIRED_VARIABLE_MISSING');
      return variables[name];
    });
  const eventType = variables.eventType;
  const titles: Record<string, string> = {
    CourseEnrolled: 'تم تسجيلك في الدورة',
    CourseProgressUpdated: 'تحديث تقدم الدورة',
    CourseCompleted: 'أكملت الدورة',
  };
  const isCourse = ['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted'].includes(
    eventType,
  );
  const isService = candidate.templateId.startsWith('system.Service');
  const isReminder = candidate.templateId === 'student-application-deadline-v1';
  const english = candidate.locale === 'en';
  const title =
    (content ? render(content.subject) : undefined) ||
    (english
      ? variables.title?.trim() ||
        (isCourse
          ? 'Course update'
          : isService
            ? 'Service request update'
            : isReminder
              ? 'Scholarship deadline reminder'
              : 'Notification from ABSHEER')
      : undefined) ||
    variables.title?.trim() ||
    titles[eventType] ||
    (isService ? 'تحديث طلب الخدمة' : isReminder ? 'تذكير بموعد المنحة' : 'إشعار من أبشر');
  const message =
    (content ? render(content.body) : undefined) ||
    (english
      ? variables.message?.trim() ||
        (isReminder
          ? `Scholarship deadline approaching: ${variables.deadlineAt || ''}`
          : 'There is an update in your account. Open your account to view the details.')
      : undefined) ||
    variables.message?.trim() ||
    (isCourse
      ? eventType === 'CourseCompleted'
        ? 'أكملت الدورة. يمكنك مراجعة التعلم والشهادات من حسابك.'
        : 'يوجد تحديث على دورتك. راجع التفاصيل في حسابك.'
      : isService
        ? 'يوجد تحديث على طلب الخدمة. راجع طلباتك لمعرفة التفاصيل.'
        : isReminder
          ? `اقترب موعد تقديم المنحة: ${variables.deadlineAt || ''}`
          : 'لديك إشعار جديد في حسابك.');
  const requestedUrl = variables.actionUrl;
  const actionUrl =
    requestedUrl &&
    requestedUrl.startsWith('/') &&
    !requestedUrl.startsWith('//') &&
    !/[\\\u0000-\u001f]/.test(requestedUrl)
      ? requestedUrl
      : null;
  return {
    category: isCourse
      ? 'LEARNING'
      : isService
        ? 'SERVICES'
        : isReminder
          ? 'SCHOLARSHIPS'
          : 'GENERAL',
    title,
    message,
    actionUrl,
  };
}
