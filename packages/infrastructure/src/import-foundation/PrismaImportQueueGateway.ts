import type { PrismaClient } from '@prisma/client';
import { ImportCheckpoint, ImportJobStatus } from '@manaratak/domain';
import type {
  CancelImportJobCommand,
  DeadLetterImportRecordDto,
  EnqueueImportJobCommand,
  IImportQueueGateway,
  ImportJobStatusDto,
  PauseImportJobCommand,
  ReplayImportJobCommand,
  ClaimImportJobCommand,
  ImportJobLease,
  FailImportJobCommand,
  ResumeImportJobCommand,
} from '@manaratak/application';

export class PrismaImportQueueGateway implements IImportQueueGateway {
  public readonly persistenceClassification = 'DURABLE' as const;

  public constructor(private readonly prisma: PrismaClient) {
    if (!prisma) throw new Error('IMPORT_QUEUE_DURABLE_PERSISTENCE_REQUIRED');
  }

  async enqueueImportJob(command: EnqueueImportJobCommand): Promise<string> {
    const batch = await this.prisma.importBatch.findUnique({
      where: { id: command.batchId },
      select: { batchStatus: true },
    });
    if (!batch) throw new Error(`IMPORT_BATCH_NOT_FOUND:${command.batchId}`);
    if (batch.batchStatus === ImportJobStatus.CREATED) {
      await this.prisma.importBatch.updateMany({
        where: { id: command.batchId, batchStatus: ImportJobStatus.CREATED },
        data: {
          batchStatus: ImportJobStatus.QUEUED,
          availableAt: new Date(),
          claimedBy: null,
          claimUntil: null,
          lastError: null,
        },
      });
    }
    return command.batchId;
  }

  async getJobStatus(batchId: string): Promise<ImportJobStatusDto | null> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) return null;

    const checkpoint = await this.prisma.importRecord.findFirst({
      where: { batchId, status: 'CHECKPOINT' },
      orderBy: { createdAt: 'desc' },
    });
    const completed = batch.processedRecords + batch.failedRecords;

    return {
      batchId,
      status: batch.batchStatus as ImportJobStatus,
      progress:
        batch.totalRecords > 0
          ? Math.min(100, Math.round((completed / batch.totalRecords) * 100))
          : 0,
      processedRecords: batch.processedRecords,
      failedRecords: batch.failedRecords,
      totalRecords: batch.totalRecords,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      checkpoint: checkpoint ? this.recordPayload(checkpoint.rawPayload) : undefined,
      lastError: batch.lastError ?? undefined,
      attemptCount: batch.attemptCount,
      availableAt: batch.availableAt,
      claimedBy: batch.claimedBy ?? undefined,
      claimUntil: batch.claimUntil ?? undefined,
    };
  }

  pauseJob(command: PauseImportJobCommand): Promise<boolean> {
    return this.transition(
      command.batchId,
      [ImportJobStatus.QUEUED, ImportJobStatus.RUNNING],
      ImportJobStatus.PAUSED,
      {
        claimedBy: null,
        claimUntil: null,
        ...(command.reason ? { lastError: this.sanitize(command.reason) } : {}),
      },
    );
  }

  resumeJob(command: ResumeImportJobCommand): Promise<boolean> {
    return this.transition(
      command.batchId,
      [ImportJobStatus.PAUSED, ImportJobStatus.RESUMING],
      ImportJobStatus.QUEUED,
      { availableAt: new Date(), claimedBy: null, claimUntil: null, lastError: null },
    );
  }

  cancelJob(command: CancelImportJobCommand): Promise<boolean> {
    return this.transition(
      command.batchId,
      [
        ImportJobStatus.QUEUED,
        ImportJobStatus.RUNNING,
        ImportJobStatus.PAUSED,
        ImportJobStatus.RESUMING,
        ImportJobStatus.CANCELLING,
      ],
      ImportJobStatus.CANCELLED,
      {
        claimedBy: null,
        claimUntil: null,
        ...(command.reason ? { lastError: this.sanitize(command.reason) } : {}),
      },
    );
  }

  markJobRunning(batchId: string): Promise<boolean> {
    return this.transition(
      batchId,
      [ImportJobStatus.QUEUED, ImportJobStatus.RESUMING],
      ImportJobStatus.RUNNING,
    );
  }

  markJobCompleted(batchId: string): Promise<boolean> {
    return this.transition(batchId, [ImportJobStatus.RUNNING], ImportJobStatus.COMPLETED, {
      claimedBy: null,
      claimUntil: null,
      lastError: null,
    });
  }

  markJobFailed(batchId: string, reason: string): Promise<boolean> {
    return this.transition(
      batchId,
      [ImportJobStatus.RUNNING, ImportJobStatus.FAILED_RETRYABLE],
      ImportJobStatus.FAILED_PERMANENT,
      { claimedBy: null, claimUntil: null, lastError: this.sanitize(reason) },
    );
  }

  async claimNextJob(command: ClaimImportJobCommand): Promise<ImportJobLease | null> {
    if (!command.workerId.trim() || !Number.isFinite(command.leaseDurationMs) || command.leaseDurationMs < 1) {
      throw new Error('INVALID_IMPORT_WORKER_CLAIM');
    }

    const now = command.now ?? new Date();
    const claimUntil = new Date(now.getTime() + command.leaseDurationMs);
    const reclaimableWhere = this.reclaimableWhere(now, command.batchId);

    return this.prisma.$transaction(async (client) => {
      const candidate = await client.importBatch.findFirst({
        where: reclaimableWhere,
        orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      if (!candidate) return null;

      // Repeat the eligibility predicate in the write to make the claim race-safe.
      const claimed = await client.importBatch.updateMany({
        where: this.reclaimableWhere(now, candidate.id),
        data: {
          batchStatus: ImportJobStatus.RUNNING,
          claimedBy: command.workerId,
          claimUntil,
          attemptCount: { increment: 1 },
          lastError: null,
        },
      });
      if (claimed.count !== 1) return null;

      const job = await client.importBatch.findUniqueOrThrow({
        where: { id: candidate.id },
        select: { attemptCount: true },
      });
      return {
        batchId: candidate.id,
        workerId: command.workerId,
        attempt: job.attemptCount,
        claimUntil,
      };
    });
  }

  async heartbeat(
    lease: ImportJobLease,
    leaseDurationMs: number,
    now = new Date(),
  ): Promise<ImportJobLease | null> {
    if (!Number.isFinite(leaseDurationMs) || leaseDurationMs < 1) return null;
    const claimUntil = new Date(now.getTime() + leaseDurationMs);
    const updated = await this.prisma.importBatch.updateMany({
      where: {
        id: lease.batchId,
        batchStatus: ImportJobStatus.RUNNING,
        claimedBy: lease.workerId,
        claimUntil: { gte: now },
      },
      data: { claimUntil },
    });
    return updated.count === 1 ? { ...lease, claimUntil } : null;
  }

  async completeClaimedJob(lease: ImportJobLease, now = new Date()): Promise<boolean> {
    const updated = await this.prisma.importBatch.updateMany({
      where: {
        id: lease.batchId,
        batchStatus: ImportJobStatus.RUNNING,
        claimedBy: lease.workerId,
        claimUntil: { gte: now },
      },
      data: {
        batchStatus: ImportJobStatus.COMPLETED,
        claimedBy: null,
        claimUntil: null,
        lastError: null,
      },
    });
    return updated.count === 1;
  }

  async failClaimedJob(
    command: FailImportJobCommand,
  ): Promise<'RETRY_SCHEDULED' | 'DLQ' | 'LEASE_LOST'> {
    const now = command.now ?? new Date();
    const policy = command.retryPolicy;
    const retryable = !command.errorCode || policy.retryableErrorCodes.includes(command.errorCode);
    const exhausted =
      command.lease.attempt >= Math.min(policy.maxAttempts, policy.dlqAfterAttempts);
    const nextStatus =
      retryable && !exhausted ? ImportJobStatus.FAILED_RETRYABLE : ImportJobStatus.DLQ;
    const exponent =
      policy.backoffStrategy === 'exponential' ? Math.max(0, command.lease.attempt - 1) : 0;
    const delay = Math.min(policy.maxDelayMs, policy.initialDelayMs * Math.pow(2, exponent));

    const updated = await this.prisma.importBatch.updateMany({
      where: {
        id: command.lease.batchId,
        batchStatus: ImportJobStatus.RUNNING,
        claimedBy: command.lease.workerId,
        claimUntil: { gte: now },
      },
      data: {
        batchStatus: nextStatus,
        availableAt: new Date(
          now.getTime() + (nextStatus === ImportJobStatus.FAILED_RETRYABLE ? delay : 0),
        ),
        claimedBy: null,
        claimUntil: null,
        lastError: this.sanitize(command.reason),
      },
    });
    if (updated.count !== 1) return 'LEASE_LOST';
    return nextStatus === ImportJobStatus.FAILED_RETRYABLE ? 'RETRY_SCHEDULED' : 'DLQ';
  }

  async replayJob(command: ReplayImportJobCommand): Promise<boolean> {
    const now = new Date();
    const terminalStatuses = [
      ImportJobStatus.COMPLETED,
      ImportJobStatus.PARTIALLY_COMPLETED,
      ImportJobStatus.FAILED_PERMANENT,
      ImportJobStatus.DLQ,
      ImportJobStatus.CANCELLED,
    ];

    return this.prisma.$transaction(async (client) => {
      const updated = await client.importBatch.updateMany({
        where: { id: command.batchId, batchStatus: { in: terminalStatuses } },
        data: {
          batchStatus: ImportJobStatus.QUEUED,
          availableAt: now,
          claimedBy: null,
          claimUntil: null,
          lastError: null,
          ...(command.fromCheckpoint
            ? {}
            : { processedRecords: 0, failedRecords: 0, attemptCount: 0 }),
        },
      });
      if (updated.count !== 1) return false;

      if (!command.fromCheckpoint) {
        await client.importRecord.deleteMany({
          where: { batchId: command.batchId, status: 'CHECKPOINT' },
        });
      }
      return true;
    });
  }

  async recordCheckpoint(batchId: string, checkpoint: ImportCheckpoint): Promise<void> {
    const value = checkpoint.toJSON();
    await this.prisma.$transaction([
      this.prisma.importRecord.create({
        data: {
          batchId,
          status: 'CHECKPOINT',
          rawPayload: value as any,
          processingNotes: 'Durable import checkpoint',
        },
      }),
      this.prisma.importBatch.update({
        where: { id: batchId },
        data: {
          processedRecords: checkpoint.processedRecords,
          failedRecords: checkpoint.failedRecords,
        },
      }),
    ]);
  }

  async moveToDeadLetter(dto: DeadLetterImportRecordDto): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.importRecord.create({
        data: {
          id: dto.recordId,
          batchId: dto.batchId,
          status: 'DLQ',
          rawPayload: {
            payload: dto.payload ?? null,
            failedAt: dto.failedAt.toISOString(),
            errorCode: dto.errorCode ?? 'IMPORT_FAILED',
          },
          processingNotes: this.sanitize(dto.reason),
        },
      }),
      this.prisma.importBatch.update({
        where: { id: dto.batchId },
        data: {
          batchStatus: ImportJobStatus.DLQ,
          failedRecords: { increment: 1 },
          claimedBy: null,
          claimUntil: null,
          lastError: this.sanitize(dto.reason),
        },
      }),
    ]);
  }

  private reclaimableWhere(now: Date, batchId?: string): Record<string, unknown> {
    return {
      ...(batchId ? { id: batchId } : {}),
      OR: [
        {
          batchStatus: { in: [ImportJobStatus.QUEUED, ImportJobStatus.FAILED_RETRYABLE] },
          availableAt: { lte: now },
          OR: [{ claimUntil: null }, { claimUntil: { lt: now } }],
        },
        {
          // Worker-crash recovery: a RUNNING job becomes claimable when its lease expires.
          batchStatus: ImportJobStatus.RUNNING,
          claimUntil: { lt: now },
        },
      ],
    };
  }

  private async transition(
    batchId: string,
    from: ImportJobStatus[],
    to: ImportJobStatus,
    extra: Record<string, unknown> = {},
  ): Promise<boolean> {
    const data = Object.fromEntries(
      Object.entries({ batchStatus: to, ...extra }).filter(([, value]) => value !== undefined),
    );
    const updated = await this.prisma.importBatch.updateMany({
      where: { id: batchId, batchStatus: { in: from } },
      data,
    });
    return updated.count === 1;
  }

  private recordPayload(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private sanitize(value: string): string {
    return value
      .replace(/(password|token|secret|authorization)\s*[=:]\s*\S+/gi, '$1=[REDACTED]')
      .slice(0, 1000);
  }
}
