import { ImportCheckpoint, ImportJobStatus } from '@manaratak/domain';
import {
  IImportQueueGateway,
  EnqueueImportJobCommand,
  ImportJobStatusDto,
  PauseImportJobCommand,
  ResumeImportJobCommand,
  CancelImportJobCommand,
  ReplayImportJobCommand,
  DeadLetterImportRecordDto,
  ClaimImportJobCommand,
  ImportJobLease,
  FailImportJobCommand,
} from '@manaratak/application';

export class InMemoryImportQueueGateway implements IImportQueueGateway {
  public readonly persistenceClassification = 'DEVELOPMENT_ONLY' as const;
  private readonly jobs = new Map<string, ImportJobStatusDto>();
  private readonly deadLetters = new Map<string, DeadLetterImportRecordDto[]>();
  private readonly leases = new Map<string, ImportJobLease>();

  async enqueueImportJob(command: EnqueueImportJobCommand): Promise<string> {
    const now = new Date();
    const existing = this.jobs.get(command.batchId);
    if (existing && existing.status !== ImportJobStatus.CREATED) return command.batchId;

    this.jobs.set(command.batchId, {
      batchId: command.batchId,
      status: ImportJobStatus.QUEUED,
      progress: 0,
      processedRecords: 0,
      failedRecords: 0,
      totalRecords: existing?.totalRecords,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      checkpoint: undefined,
      attemptCount: existing?.attemptCount ?? 0,
      availableAt: now,
    });
    return command.batchId;
  }

  async getJobStatus(batchId: string): Promise<ImportJobStatusDto | null> {
    const job = this.jobs.get(batchId);
    if (!job) return null;
    return { ...job, checkpoint: job.checkpoint ? { ...job.checkpoint } : undefined };
  }

  async pauseJob(command: PauseImportJobCommand): Promise<boolean> {
    const job = this.jobs.get(command.batchId);
    if (!job || ![ImportJobStatus.QUEUED, ImportJobStatus.RUNNING].includes(job.status))
      return false;
    const wasRunning = job.status === ImportJobStatus.RUNNING;
    job.status = wasRunning ? ImportJobStatus.PAUSING : ImportJobStatus.PAUSED;
    job.updatedAt = new Date();
    if (!wasRunning) {
      job.claimedBy = undefined;
      job.claimUntil = undefined;
      this.leases.delete(command.batchId);
    }
    if (command.reason) job.lastError = command.reason;
    return true;
  }

  async resumeJob(command: ResumeImportJobCommand): Promise<boolean> {
    const job = this.jobs.get(command.batchId);
    if (!job || ![ImportJobStatus.PAUSED, ImportJobStatus.RESUMING].includes(job.status)) {
      return false;
    }
    job.status = ImportJobStatus.QUEUED;
    job.updatedAt = new Date();
    job.availableAt = new Date();
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    job.lastError = undefined;
    this.leases.delete(command.batchId);
    return true;
  }

  async cancelJob(command: CancelImportJobCommand): Promise<boolean> {
    const job = this.jobs.get(command.batchId);
    if (!job) return false;
    if (![ImportJobStatus.QUEUED, ImportJobStatus.RUNNING, ImportJobStatus.PAUSING,
      ImportJobStatus.PAUSED, ImportJobStatus.RESUMING].includes(job.status)) return false;
    const hasWorker = job.status === ImportJobStatus.RUNNING ||
      job.status === ImportJobStatus.PAUSING;
    job.status = hasWorker ? ImportJobStatus.CANCELLING : ImportJobStatus.CANCELLED;
    job.updatedAt = new Date();
    if (!hasWorker) {
      job.claimedBy = undefined;
      job.claimUntil = undefined;
      this.leases.delete(command.batchId);
    }
    if (command.reason) job.lastError = command.reason;
    return true;
  }

  async acknowledgeStoppedJob(lease: ImportJobLease): Promise<'PAUSED' | 'CANCELLED' | null> {
    const job = this.jobs.get(lease.batchId);
    const current = this.leases.get(lease.batchId);
    if (!job || !current || current.workerId !== lease.workerId ||
        current.attempt !== lease.attempt ||
        current.claimUntil.getTime() !== lease.claimUntil.getTime()) return null;
    const to = job.status === ImportJobStatus.PAUSING
      ? ImportJobStatus.PAUSED
      : job.status === ImportJobStatus.CANCELLING ? ImportJobStatus.CANCELLED : null;
    if (!to) return null;
    job.status = to;
    job.updatedAt = new Date();
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    this.leases.delete(lease.batchId);
    return to === ImportJobStatus.PAUSED ? 'PAUSED' : 'CANCELLED';
  }

  async replayJob(command: ReplayImportJobCommand): Promise<boolean> {
    const job = this.jobs.get(command.batchId);
    if (!job) return false;
    const terminalStatuses = [
      ImportJobStatus.COMPLETED,
      ImportJobStatus.PARTIALLY_COMPLETED,
      ImportJobStatus.FAILED_PERMANENT,
      ImportJobStatus.DLQ,
      ImportJobStatus.CANCELLED,
    ];
    if (!terminalStatuses.includes(job.status)) return false;

    const now = new Date();
    job.status = ImportJobStatus.QUEUED;
    job.updatedAt = now;
    job.availableAt = now;
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    job.lastError = undefined;
    this.leases.delete(command.batchId);

    if (!command.fromCheckpoint) {
      job.checkpoint = undefined;
      job.processedRecords = 0;
      job.failedRecords = 0;
      job.progress = 0;
      job.attemptCount = 0;
      this.deadLetters.delete(command.batchId);
    }
    return true;
  }

  async recordCheckpoint(batchId: string, checkpoint: ImportCheckpoint, lease?: ImportJobLease): Promise<void> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error(`Import job with batchId '${batchId}' not found`);
    if (checkpoint.toJSON().batchId !== batchId) throw new Error('IMPORT_CHECKPOINT_BATCH_MISMATCH');
    if (lease) {
      const current = this.leases.get(batchId);
      if (!current || job.status !== ImportJobStatus.RUNNING ||
          current.workerId !== lease.workerId || current.attempt !== lease.attempt ||
          current.claimUntil.getTime() !== lease.claimUntil.getTime() ||
          current.claimUntil.getTime() < Date.now())
        throw new Error('IMPORT_WORKER_LEASE_LOST');
    }

    job.checkpoint = checkpoint.toJSON();
    job.processedRecords = checkpoint.processedRecords;
    job.failedRecords = checkpoint.failedRecords;
    if (job.totalRecords && job.totalRecords > 0) {
      const processedTotal = job.processedRecords + job.failedRecords;
      job.progress = Math.min(100, Math.round((processedTotal / job.totalRecords) * 100));
    } else {
      job.progress = 0;
    }
    job.updatedAt = new Date();
  }

  async moveToDeadLetter(dto: DeadLetterImportRecordDto): Promise<void> {
    const records = this.deadLetters.get(dto.batchId) ?? [];
    records.push({ ...dto });
    this.deadLetters.set(dto.batchId, records);

    const job = this.jobs.get(dto.batchId);
    const now = new Date();
    if (job) {
      job.status = ImportJobStatus.DLQ;
      job.lastError = dto.reason;
      job.updatedAt = now;
      job.claimedBy = undefined;
      job.claimUntil = undefined;
      this.leases.delete(dto.batchId);
    } else {
      this.jobs.set(dto.batchId, {
        batchId: dto.batchId,
        status: ImportJobStatus.DLQ,
        progress: 0,
        processedRecords: 0,
        failedRecords: 1,
        createdAt: now,
        updatedAt: now,
        lastError: dto.reason,
      });
    }
  }

  async markJobRunning(batchId: string): Promise<boolean> {
    const job = this.jobs.get(batchId);
    if (!job || ![ImportJobStatus.QUEUED, ImportJobStatus.RESUMING].includes(job.status)) {
      return false;
    }
    job.status = ImportJobStatus.RUNNING;
    job.updatedAt = new Date();
    return true;
  }

  async markJobCompleted(batchId: string): Promise<boolean> {
    const job = this.jobs.get(batchId);
    if (!job || job.status !== ImportJobStatus.RUNNING ||
        job.claimedBy || job.claimUntil || this.leases.has(batchId)) return false;
    job.status = job.failedRecords > 0
      ? ImportJobStatus.PARTIALLY_COMPLETED
      : ImportJobStatus.COMPLETED;
    job.progress = 100;
    job.updatedAt = new Date();
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    this.leases.delete(batchId);
    return true;
  }

  async markJobFailed(batchId: string, reason: string): Promise<boolean> {
    const job = this.jobs.get(batchId);
    if (!job || ![ImportJobStatus.RUNNING, ImportJobStatus.FAILED_RETRYABLE].includes(job.status) ||
        job.claimedBy || job.claimUntil || this.leases.has(batchId)) {
      return false;
    }
    job.status = ImportJobStatus.FAILED_PERMANENT;
    job.lastError = reason;
    job.updatedAt = new Date();
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    this.leases.delete(batchId);
    return true;
  }

  async claimNextJob(command: ClaimImportJobCommand): Promise<ImportJobLease | null> {
    if (!command.workerId.trim() || !Number.isFinite(command.leaseDurationMs) || command.leaseDurationMs < 1) {
      throw new Error('INVALID_IMPORT_WORKER_CLAIM');
    }

    const now = command.now ?? new Date();
    const candidate = [...this.jobs.values()].find((job) => {
      if (command.batchId && job.batchId !== command.batchId) return false;
      const queued =
        [ImportJobStatus.QUEUED, ImportJobStatus.FAILED_RETRYABLE].includes(job.status) &&
        (!job.availableAt || job.availableAt <= now) &&
        (!job.claimUntil || job.claimUntil < now);
      const abandonedRunning =
        job.status === ImportJobStatus.RUNNING && Boolean(job.claimUntil && job.claimUntil < now);
      return queued || abandonedRunning;
    });
    if (!candidate) return null;

    // Expired RUNNING leases are abandoned; a new worker becomes authoritative.
    this.leases.delete(candidate.batchId);
    const lease: ImportJobLease = {
      batchId: candidate.batchId,
      workerId: command.workerId,
      attempt: (candidate.attemptCount ?? 0) + 1,
      claimUntil: new Date(now.getTime() + command.leaseDurationMs),
    };
    candidate.status = ImportJobStatus.RUNNING;
    candidate.attemptCount = lease.attempt;
    candidate.claimedBy = lease.workerId;
    candidate.claimUntil = lease.claimUntil;
    candidate.lastError = undefined;
    candidate.updatedAt = now;
    this.leases.set(candidate.batchId, lease);
    return { ...lease };
  }

  async heartbeat(
    lease: ImportJobLease,
    leaseDurationMs: number,
    now = new Date(),
  ): Promise<ImportJobLease | null> {
    const current = this.leases.get(lease.batchId);
    const job = this.jobs.get(lease.batchId);
    if (
      !current ||
      !job ||
      current.workerId !== lease.workerId ||
      current.attempt !== lease.attempt ||
      current.claimUntil.getTime() !== lease.claimUntil.getTime() ||
      current.claimUntil < now ||
      job.status !== ImportJobStatus.RUNNING
    ) {
      return null;
    }
    const renewed = { ...current, claimUntil: new Date(now.getTime() + leaseDurationMs) };
    this.leases.set(lease.batchId, renewed);
    job.claimUntil = renewed.claimUntil;
    job.updatedAt = now;
    return { ...renewed };
  }

  async completeClaimedJob(lease: ImportJobLease, now = new Date()): Promise<boolean> {
    const current = this.leases.get(lease.batchId);
    const job = this.jobs.get(lease.batchId);
    if (
      !current ||
      !job ||
      current.workerId !== lease.workerId ||
      current.attempt !== lease.attempt ||
      current.claimUntil.getTime() !== lease.claimUntil.getTime() ||
      current.claimUntil < now ||
      job.status !== ImportJobStatus.RUNNING
    ) {
      return false;
    }
    job.status = job.failedRecords > 0
      ? ImportJobStatus.PARTIALLY_COMPLETED
      : ImportJobStatus.COMPLETED;
    job.progress = 100;
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    job.lastError = undefined;
    job.updatedAt = now;
    this.leases.delete(lease.batchId);
    return true;
  }

  async failClaimedJob(
    command: FailImportJobCommand,
  ): Promise<'RETRY_SCHEDULED' | 'DLQ' | 'LEASE_LOST'> {
    const current = this.leases.get(command.lease.batchId);
    const job = this.jobs.get(command.lease.batchId);
    const now = command.now ?? new Date();
    if (
      !current ||
      !job ||
      current.workerId !== command.lease.workerId ||
      current.attempt !== command.lease.attempt ||
      current.claimUntil.getTime() !== command.lease.claimUntil.getTime() ||
      current.claimUntil < now ||
      job.status !== ImportJobStatus.RUNNING
    ) {
      return 'LEASE_LOST';
    }

    const policy = command.retryPolicy;
    const retryable = !command.errorCode || policy.retryableErrorCodes.includes(command.errorCode);
    const exhausted =
      command.lease.attempt >= Math.min(policy.maxAttempts, policy.dlqAfterAttempts);
    job.lastError = command.reason;
    job.claimedBy = undefined;
    job.claimUntil = undefined;
    job.updatedAt = now;
    this.leases.delete(command.lease.batchId);

    if (!retryable || exhausted) {
      job.status = ImportJobStatus.DLQ;
      return 'DLQ';
    }

    const exponent =
      policy.backoffStrategy === 'exponential' ? Math.max(0, command.lease.attempt - 1) : 0;
    job.availableAt = new Date(
      now.getTime() + Math.min(policy.maxDelayMs, policy.initialDelayMs * Math.pow(2, exponent)),
    );
    job.status = ImportJobStatus.FAILED_RETRYABLE;
    return 'RETRY_SCHEDULED';
  }

  getDeadLetters(batchId: string): DeadLetterImportRecordDto[] {
    return [...(this.deadLetters.get(batchId) ?? [])];
  }

  setTotalRecords(batchId: string, totalRecords: number): void {
    const job = this.jobs.get(batchId);
    if (job) job.totalRecords = totalRecords;
  }

  setStatusForTesting(batchId: string, status: ImportJobStatus): void {
    const job = this.jobs.get(batchId);
    if (job) job.status = status;
  }

  setLeaseForTesting(batchId: string, lease: ImportJobLease): void {
    const job = this.jobs.get(batchId);
    if (!job) return;
    job.status = ImportJobStatus.RUNNING;
    job.claimedBy = lease.workerId;
    job.claimUntil = lease.claimUntil;
    this.leases.set(batchId, { ...lease });
  }

  clear(): void {
    this.jobs.clear();
    this.deadLetters.clear();
    this.leases.clear();
  }
}
