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
          // All input rows may already be imported elsewhere and deduplicated,
          // leaving a valid completed batch with zero persisted work items.
          : batch.batchStatus === ImportJobStatus.COMPLETED ? 100 : 0,
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

  async pauseJob(command: PauseImportJobCommand): Promise<boolean> {
    const note = command.reason ? { lastError: this.sanitize(command.reason) } : {};
    // A queued job has no executing worker and can stop immediately.
    if (await this.transition(command.batchId, [ImportJobStatus.QUEUED],
      ImportJobStatus.PAUSED, { claimedBy: null, claimUntil: null, ...note })) return true;
    // A running owner call cannot be interrupted safely. Retain its lease and
    // show PAUSING until that exact worker acknowledges after the call returns.
    return this.transition(command.batchId, [ImportJobStatus.RUNNING],
      ImportJobStatus.PAUSING, note);
  }

  resumeJob(command: ResumeImportJobCommand): Promise<boolean> {
    return this.transition(
      command.batchId,
      [ImportJobStatus.PAUSED, ImportJobStatus.RESUMING],
      ImportJobStatus.QUEUED,
      { availableAt: new Date(), claimedBy: null, claimUntil: null, lastError: null },
    );
  }

  async cancelJob(command: CancelImportJobCommand): Promise<boolean> {
    const note = command.reason ? { lastError: this.sanitize(command.reason) } : {};
    if (await this.transition(command.batchId, [
      ImportJobStatus.QUEUED, ImportJobStatus.PAUSED, ImportJobStatus.RESUMING,
    ], ImportJobStatus.CANCELLED, {
      claimedBy: null, claimUntil: null, ...note,
    })) return true;
    return this.transition(command.batchId, [
      ImportJobStatus.RUNNING, ImportJobStatus.PAUSING,
    ], ImportJobStatus.CANCELLING, note);
  }

  async acknowledgeStoppedJob(lease: ImportJobLease): Promise<'PAUSED' | 'CANCELLED' | null> {
    // A worker may acknowledge after its lease expires; no other worker can
    // reclaim PAUSING/CANCELLING. Exact attempt + generation still fence old workers.
    for (const [pending, final] of [
      [ImportJobStatus.CANCELLING, ImportJobStatus.CANCELLED],
      [ImportJobStatus.PAUSING, ImportJobStatus.PAUSED],
    ] as const) {
      const result = await this.prisma.importBatch.updateMany({
        where: {
          id: lease.batchId, batchStatus: pending,
          claimedBy: lease.workerId, attemptCount: lease.attempt,
          claimUntil: { equals: lease.claimUntil },
        },
        data: { batchStatus: final, claimedBy: null, claimUntil: null },
      });
      if (result.count === 1)
        return final === ImportJobStatus.PAUSED ? 'PAUSED' : 'CANCELLED';
    }
    return null;
  }

  markJobRunning(batchId: string): Promise<boolean> {
    return this.transition(
      batchId,
      [ImportJobStatus.QUEUED, ImportJobStatus.RESUMING],
      ImportJobStatus.RUNNING,
    );
  }

  async markJobCompleted(batchId: string): Promise<boolean> {
    // Compatibility/unclaimed job path only. A legacy caller must never steal
    // a live claimed lease or override worker-confirmed completion.
    for (const [failedRecords, status] of [
      [{ gt: 0 }, ImportJobStatus.PARTIALLY_COMPLETED],
      [0, ImportJobStatus.COMPLETED],
    ] as const) {
      const updated = await this.prisma.importBatch.updateMany({
        where: {
          id: batchId, batchStatus: ImportJobStatus.RUNNING,
          claimedBy: null, claimUntil: null, failedRecords,
        },
        data: { batchStatus: status, lastError: null },
      });
      if (updated.count === 1) return true;
    }
    return false;
  }

  async markJobFailed(batchId: string, reason: string): Promise<boolean> {
    const updated = await this.prisma.importBatch.updateMany({
      where: {
        id: batchId,
        batchStatus: { in: [ImportJobStatus.RUNNING, ImportJobStatus.FAILED_RETRYABLE] },
        claimedBy: null,
        claimUntil: null,
      },
      data: {
        batchStatus: ImportJobStatus.FAILED_PERMANENT,
        lastError: this.sanitize(reason),
      },
    });
    return updated.count === 1;
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
        attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil, gte: now },
      },
      data: { claimUntil },
    });
    return updated.count === 1 ? { ...lease, claimUntil } : null;
  }

  async completeClaimedJob(lease: ImportJobLease, now = new Date()): Promise<boolean> {
    // Select terminal status from persisted counters in the same conditional
    // write as the claimed worker's lease fence. A separate read would race
    // with a concurrent checkpoint and risk a false full completion.
    for (const [failurePredicate, status] of [
      [{ gt: 0 }, ImportJobStatus.PARTIALLY_COMPLETED],
      [0, ImportJobStatus.COMPLETED],
    ] as const) {
      const updated = await this.prisma.importBatch.updateMany({
        where: {
        id: lease.batchId,
        batchStatus: ImportJobStatus.RUNNING,
        claimedBy: lease.workerId,
        attemptCount: lease.attempt,
        claimUntil: { equals: lease.claimUntil, gte: now },
          failedRecords: failurePredicate,
        },
        data: {
          batchStatus: status,
          claimedBy: null,
          claimUntil: null,
          lastError: null,
        },
      });
      if (updated.count === 1) return true;
    }
    return false;
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

    return this.prisma.$transaction(async tx => {
      const updated = await tx.importBatch.updateMany({
        where: {
          id: command.lease.batchId,
          batchStatus: ImportJobStatus.RUNNING,
          claimedBy: command.lease.workerId,
          attemptCount: command.lease.attempt,
          claimUntil: { equals: command.lease.claimUntil, gte: now },
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
      // Failure evidence must commit with the fenced terminal/retry transition.
      // A crash cannot leave a DLQ batch without its cause, or a stale worker
      // manufacture failure records after losing ownership. No imported payload
      // or provider response is copied into operational evidence.
      await tx.importRecord.create({
        data: {
          batchId: command.lease.batchId,
          status: 'WORKER_FAILURE',
          rawPayload: {
            stage: 'BATCH_WORKER',
            errorCode: command.errorCode && /^[A-Z][A-Z0-9_]{0,127}$/.test(command.errorCode)
              ? command.errorCode : null,
            attempt: command.lease.attempt,
            retryable: retryable && !exhausted,
            failedAt: now.toISOString(),
            outcome: nextStatus,
          },
          processingNotes: this.sanitize(command.reason),
        },
      });
      return nextStatus === ImportJobStatus.FAILED_RETRYABLE ? 'RETRY_SCHEDULED' : 'DLQ';
    });
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

  async recordCheckpoint(batchId: string, checkpoint: ImportCheckpoint, lease?: ImportJobLease): Promise<void> {
    const value = checkpoint.toJSON();
    if (value.batchId !== batchId) throw new Error('IMPORT_CHECKPOINT_BATCH_MISMATCH');
    if (lease) {
      if (lease.batchId !== batchId) throw new Error('IMPORT_WORKER_LEASE_LOST');
      const now = new Date();
      // The lease predicate and checkpoint insert share one transaction.
      // Paused, cancelled, expired or re-claimed workers cannot commit stale progress.
      await this.prisma.$transaction(async tx => {
        const updated = await tx.importBatch.updateMany({
          where: {
            id: batchId, batchStatus: ImportJobStatus.RUNNING,
            claimedBy: lease.workerId, attemptCount: lease.attempt,
            claimUntil: { equals: lease.claimUntil, gte: now },
          },
          data: {
            processedRecords: checkpoint.processedRecords,
            failedRecords: checkpoint.failedRecords,
          },
        });
        if (updated.count !== 1) throw new Error('IMPORT_WORKER_LEASE_LOST');
        await tx.importRecord.create({
          data: {
            batchId, status: 'CHECKPOINT', rawPayload: value as any,
            processingNotes: 'Durable import checkpoint',
          },
        });
      });
      return;
    }
    // A legacy checkpoint without a lease must never override a claimed
    // worker's counters. Check the unclaimed batch *in the same transaction*
    // as the checkpoint insert, so a failed fence cannot leave evidence.
    await this.prisma.$transaction(async tx => {
      const updated = await tx.importBatch.updateMany({
        where: {
          id: batchId,
          claimedBy: null,
          claimUntil: null,
          batchStatus: { in: [
            ImportJobStatus.CREATED,
            ImportJobStatus.QUEUED,
            ImportJobStatus.RESUMING,
            ImportJobStatus.RUNNING,
            ImportJobStatus.PAUSED,
            ImportJobStatus.FAILED_RETRYABLE,
          ] },
        },
        data: {
          processedRecords: checkpoint.processedRecords,
          failedRecords: checkpoint.failedRecords,
        },
      });
      if (updated.count !== 1) throw new Error('IMPORT_CHECKPOINT_LEGACY_STATE_CONFLICT');
      await tx.importRecord.create({
        data: {
          batchId,
          status: 'CHECKPOINT',
          rawPayload: value as any,
          processingNotes: 'Durable import checkpoint',
        },
      });
    });
  }

  async moveToDeadLetter(dto: DeadLetterImportRecordDto): Promise<void> {
    // This is the legacy/manual DLQ path, NOT the worker's fenced
    // failClaimedJob. Never permit a late compatibility call to erase an
    // active worker claim, a pending stop, or a finished batch's result.
    await this.prisma.$transaction(async tx => {
      const updated = await tx.importBatch.updateMany({
        where: {
          id: dto.batchId,
          batchStatus: { in: [ImportJobStatus.QUEUED, ImportJobStatus.FAILED_PERMANENT] },
          claimedBy: null,
          claimUntil: null,
        },
        data: {
          batchStatus: ImportJobStatus.DLQ,
          failedRecords: { increment: 1 },
          lastError: this.sanitize(dto.reason),
        },
      });
      if (updated.count !== 1) throw new Error('IMPORT_DLQ_LEGACY_STATE_CONFLICT');
      await tx.importRecord.create({
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
      });
    });
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
