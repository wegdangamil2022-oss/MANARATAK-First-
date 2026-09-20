import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  BackgroundJobCompletionMutation,
  BackgroundJobFailureMutation,
  BackgroundJobLeaseMutation,
  BackgroundJobQueueSnapshot,
  ClaimBackgroundJobsRequest,
  DurableBackgroundJobClaim,
  IBackgroundJobExecutionGateway,
  IDurableBackgroundJobQueue,
} from '@manaratak/application';

export class PrismaBackgroundJobExecutionGateway implements IBackgroundJobExecutionGateway, IDurableBackgroundJobQueue {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;
  public readonly persistenceClassification = 'DURABLE' as const;

  public constructor(private readonly prisma: PrismaClient) {}

  public async schedule(jobReference: string, runAt: Date): Promise<void> {
    this.assertValidDate(runAt, 'BACKGROUND_JOB_RUN_AT_INVALID');
    const result = await this.delegate().updateMany({
      where: { reference: jobReference, status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
      data: { status: 'SCHEDULED', runAt, availableAt: runAt, leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null },
    });
    if (result.count !== 1) throw new Error('BACKGROUND_JOB_NOT_SCHEDULABLE');
  }

  public async scheduleRecurring(jobReference: string, cronExpression: string, firstRunAt: Date): Promise<void> {
    this.assertValidDate(firstRunAt, 'BACKGROUND_JOB_RUN_AT_INVALID');
    if (!cronExpression.trim()) throw new Error('BACKGROUND_JOB_CRON_REQUIRED');
    const result = await this.delegate().updateMany({
      where: { reference: jobReference, status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
      data: { status: 'SCHEDULED', cronExpression: cronExpression.trim(), runAt: null, availableAt: firstRunAt, leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null },
    });
    if (result.count !== 1) throw new Error('BACKGROUND_JOB_NOT_SCHEDULABLE');
  }

  public async enqueue(jobReference: string, _payload: unknown, priority: number): Promise<void> {
    const result = await this.delegate().updateMany({
      where: { reference: jobReference, status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
      data: { status: 'SCHEDULED', priority, availableAt: new Date(), leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null },
    });
    if (result.count !== 1) throw new Error('BACKGROUND_JOB_NOT_ENQUEUEABLE');
  }

  public async cancel(jobReference: string): Promise<void> {
    await this.delegate().updateMany({
      where: { reference: jobReference, status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null },
    });
  }

  public async claimDue(request: ClaimBackgroundJobsRequest): Promise<DurableBackgroundJobClaim[]> {
    this.validateClaim(request);
    const leaseUntil = new Date(request.now.getTime() + request.leaseDurationMs);
    return this.prisma.$transaction(async tx => {
      const candidates = await (tx as any).$queryRaw(Prisma.sql`
        SELECT "reference"
        FROM "BackgroundJobRecord"
        WHERE "status" IN ('SCHEDULED', 'STARTED')
          AND "availableAt" <= ${request.now}
          AND ("leaseUntil" IS NULL OR "leaseUntil" < ${request.now})
        ORDER BY "priority" DESC, "availableAt" ASC, "createdAt" ASC
        LIMIT ${request.batchSize}
        FOR UPDATE SKIP LOCKED
      `) as Array<{ reference: string }>;
      const claims: DurableBackgroundJobClaim[] = [];
      for (const candidate of candidates) {
        const leaseToken = randomUUID();
        await (tx as any).backgroundJobExecutionRecord.updateMany({
          where: { jobReference: candidate.reference, outcome: 'RUNNING' },
          data: { outcome: 'LEASE_EXPIRED', finishedAt: request.now, errorCode: 'LEASE_EXPIRED', errorText: 'Lease expired before a terminal worker transition.' },
        });
        const updated = await (tx as any).backgroundJobRecord.updateMany({
          where: {
            reference: candidate.reference,
            status: { in: ['SCHEDULED', 'STARTED'] },
            OR: [{ leaseUntil: null }, { leaseUntil: { lt: request.now } }],
          },
          data: {
            status: 'STARTED',
            leasedBy: request.workerId,
            leaseToken,
            leaseUntil,
            heartbeatAt: request.now,
            startedAt: request.now,
            attempt: { increment: 1 },
          },
        });
        if (updated.count !== 1) continue;
        const row = await (tx as any).backgroundJobRecord.findUnique({ where: { reference: candidate.reference } });
        if (!row) continue;
        await (tx as any).backgroundJobExecutionRecord.create({
          data: {
            jobReference: row.reference,
            attempt: row.attempt,
            workerId: request.workerId,
            leaseToken,
            startedAt: request.now,
            heartbeatAt: request.now,
            outcome: 'RUNNING',
          },
        });
        claims.push(this.toClaim(row, request.workerId, leaseToken, leaseUntil));
      }
      return claims;
    });
  }

  public async heartbeat(mutation: BackgroundJobLeaseMutation & { leaseDurationMs: number }): Promise<boolean> {
    if (mutation.leaseDurationMs < 5_000) throw new Error('BACKGROUND_JOB_LEASE_DURATION_INVALID');
    const leaseUntil = new Date(mutation.now.getTime() + mutation.leaseDurationMs);
    return this.prisma.$transaction(async tx => {
      const updated = await (tx as any).backgroundJobRecord.updateMany({
        where: {
          reference: mutation.jobReference,
          status: 'STARTED',
          leasedBy: mutation.workerId,
          leaseToken: mutation.leaseToken,
          leaseUntil: { gt: mutation.now },
        },
        data: { leaseUntil, heartbeatAt: mutation.now },
      });
      if (updated.count !== 1) return false;
      await (tx as any).backgroundJobExecutionRecord.updateMany({
        where: { leaseToken: mutation.leaseToken, workerId: mutation.workerId, outcome: 'RUNNING' },
        data: { heartbeatAt: mutation.now },
      });
      return true;
    });
  }

  public async complete(mutation: BackgroundJobCompletionMutation): Promise<boolean> {
    return this.prisma.$transaction(async tx => {
      const row = await this.lockOwnedRow(tx, mutation);
      if (!row) return false;
      const recurring = Boolean(row.cronExpression && mutation.nextRecurringRunAt);
      const nextRunAt = recurring ? mutation.nextRecurringRunAt! : null;
      const updated = await (tx as any).backgroundJobRecord.updateMany({
        where: this.ownerWhere(mutation),
        data: recurring ? {
          status: 'SCHEDULED', availableAt: nextRunAt, lastCompletedAt: mutation.now,
          attempt: 0,
          leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null,
          lastErrorCode: null, lastErrorText: null,
        } : {
          status: 'COMPLETED', lastCompletedAt: mutation.now,
          leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null,
          lastErrorCode: null, lastErrorText: null,
        },
      });
      if (updated.count !== 1) return false;
      await (tx as any).backgroundJobExecutionRecord.updateMany({
        where: { leaseToken: mutation.leaseToken, workerId: mutation.workerId, outcome: 'RUNNING' },
        data: { outcome: 'SUCCEEDED', finishedAt: mutation.now, heartbeatAt: mutation.now },
      });
      return true;
    });
  }

  public async fail(mutation: BackgroundJobFailureMutation): Promise<{ applied: boolean; exhausted: boolean }> {
    return this.prisma.$transaction(async tx => {
      const row = await this.lockOwnedRow(tx, mutation);
      if (!row) return { applied: false, exhausted: false };
      const exhausted = Number(row.attempt) >= Math.max(1, Number(row.maxAttempts));
      const errorText = mutation.errorMessage.slice(0, 1000);
      const updated = await (tx as any).backgroundJobRecord.updateMany({
        where: this.ownerWhere(mutation),
        data: exhausted ? {
          status: 'FAILED', failedAt: mutation.now, lastErrorCode: mutation.errorCode, lastErrorText: errorText,
          leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null,
        } : {
          status: 'SCHEDULED', availableAt: mutation.nextAvailableAt, lastErrorCode: mutation.errorCode, lastErrorText: errorText,
          leasedBy: null, leaseToken: null, leaseUntil: null, heartbeatAt: null,
        },
      });
      if (updated.count !== 1) return { applied: false, exhausted: false };
      await (tx as any).backgroundJobExecutionRecord.updateMany({
        where: { leaseToken: mutation.leaseToken, workerId: mutation.workerId, outcome: 'RUNNING' },
        data: { outcome: exhausted ? 'DLQ' : 'FAILED', finishedAt: mutation.now, heartbeatAt: mutation.now, errorCode: mutation.errorCode, errorText },
      });
      if (exhausted) {
        await (tx as any).backgroundJobDeadLetterRecord.upsert({
          where: { jobReference: row.reference },
          create: {
            jobReference: row.reference, jobType: row.jobType, payload: row.parameters,
            attempt: row.attempt, errorCode: mutation.errorCode, errorText, failedAt: mutation.now,
          },
          update: {
            jobType: row.jobType, payload: row.parameters, attempt: row.attempt,
            errorCode: mutation.errorCode, errorText, failedAt: mutation.now, replayedAt: null,
          },
        });
      }
      return { applied: true, exhausted };
    });
  }

  public async getOperationalSnapshot(now = new Date()): Promise<BackgroundJobQueueSnapshot> {
    const delegate = this.delegate();
    const [queued, running, failed, dlq, oldest] = await Promise.all([
      delegate.count({ where: { status: 'SCHEDULED' } }),
      delegate.count({ where: { status: 'STARTED' } }),
      delegate.count({ where: { status: 'FAILED' } }),
      (this.prisma as any).backgroundJobDeadLetterRecord.count(),
      delegate.findFirst({ where: { status: 'SCHEDULED', availableAt: { lte: now } }, orderBy: { availableAt: 'asc' }, select: { availableAt: true } }),
    ]);
    return {
      capabilityStatus: 'PRODUCTION_CAPABLE', queued, running, failed, dlq,
      ...(oldest?.availableAt ? { oldestDueAt: new Date(oldest.availableAt).toISOString() } : {}),
    };
  }

  private async lockOwnedRow(tx: any, mutation: BackgroundJobLeaseMutation): Promise<any | null> {
    const rows = await tx.$queryRaw(Prisma.sql`
      SELECT * FROM "BackgroundJobRecord"
      WHERE "reference" = ${mutation.jobReference}
        AND "status" = 'STARTED'
        AND "leasedBy" = ${mutation.workerId}
        AND "leaseToken" = ${mutation.leaseToken}
        AND "leaseUntil" > ${mutation.now}
      FOR UPDATE
    `) as any[];
    return rows[0] ?? null;
  }

  private ownerWhere(mutation: BackgroundJobLeaseMutation): Record<string, unknown> {
    return {
      reference: mutation.jobReference,
      status: 'STARTED',
      leasedBy: mutation.workerId,
      leaseToken: mutation.leaseToken,
      leaseUntil: { gt: mutation.now },
    };
  }

  private toClaim(row: any, workerId: string, leaseToken: string, leaseUntil: Date): DurableBackgroundJobClaim {
    return {
      jobReference: row.reference,
      jobType: row.jobType,
      payload: Object.freeze({ ...(row.parameters ?? {}) }),
      priority: Number(row.priority ?? 0),
      attempt: Number(row.attempt ?? 1),
      maxAttempts: Math.max(1, Number(row.maxAttempts ?? 1)),
      backoffType: String(row.backoffType ?? 'exponential'),
      timeoutMs: Math.max(1_000, Number(row.timeoutSeconds ?? 300) * 1_000),
      ...(row.cronExpression ? { cronExpression: String(row.cronExpression) } : {}),
      workerId,
      leaseToken,
      leaseUntil,
    };
  }

  private validateClaim(request: ClaimBackgroundJobsRequest): void {
    if (!request.workerId.trim()) throw new Error('BACKGROUND_JOB_WORKER_ID_REQUIRED');
    if (!Number.isInteger(request.batchSize) || request.batchSize < 1 || request.batchSize > 100) throw new Error('BACKGROUND_JOB_BATCH_SIZE_INVALID');
    if (!Number.isInteger(request.leaseDurationMs) || request.leaseDurationMs < 5_000) throw new Error('BACKGROUND_JOB_LEASE_DURATION_INVALID');
    this.assertValidDate(request.now, 'BACKGROUND_JOB_CLAIM_TIME_INVALID');
  }

  private assertValidDate(value: Date, code: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error(code);
  }

  private delegate(): any {
    const delegate = (this.prisma as any).backgroundJobRecord;
    if (!delegate) throw new Error('BACKGROUND_JOB_PERSISTENCE_NOT_MIGRATED');
    return delegate;
  }
}
