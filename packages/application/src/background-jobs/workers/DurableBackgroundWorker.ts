import { BackgroundJobHandlerRegistry } from './BackgroundJobHandlerRegistry';
import { DurableBackgroundJobClaim, IDurableBackgroundJobQueue } from './DurableBackgroundJobContracts';
import { nextCronOccurrence } from '../services/CronScheduleCalculator';

export interface BackgroundWorkerRuntimeSnapshot {
  state: 'IDLE' | 'RUNNING' | 'DRAINING' | 'STOPPED';
  lastPollAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string;
  inFlight: number;
  claimedTotal: number;
  completedTotal: number;
  failedTotal: number;
  leaseLostTotal: number;
}

export class BackgroundWorkerRuntimeState {
  private state: BackgroundWorkerRuntimeSnapshot['state'] = 'IDLE';
  private lastPollAt?: Date;
  private lastSuccessAt?: Date;
  private lastErrorAt?: Date;
  private lastErrorCode?: string;
  private inFlight = 0;
  private claimedTotal = 0;
  private completedTotal = 0;
  private failedTotal = 0;
  private leaseLostTotal = 0;

  markRunning(claimed: number): void { this.state = claimed > 0 ? 'RUNNING' : 'IDLE'; this.lastPollAt = new Date(); this.inFlight += claimed; this.claimedTotal += claimed; }
  markCompleted(): void { this.inFlight = Math.max(0, this.inFlight - 1); this.completedTotal++; this.lastSuccessAt = new Date(); if (this.inFlight === 0 && this.state !== 'DRAINING') this.state = 'IDLE'; }
  markFailed(code: string): void { this.inFlight = Math.max(0, this.inFlight - 1); this.failedTotal++; this.lastErrorAt = new Date(); this.lastErrorCode = code; if (this.inFlight === 0 && this.state !== 'DRAINING') this.state = 'IDLE'; }
  markLeaseLost(): void { this.inFlight = Math.max(0, this.inFlight - 1); this.leaseLostTotal++; this.lastErrorAt = new Date(); this.lastErrorCode = 'BACKGROUND_JOB_LEASE_LOST'; if (this.inFlight === 0 && this.state !== 'DRAINING') this.state = 'IDLE'; }
  beginDrain(): void { this.state = 'DRAINING'; }
  stop(): void { this.state = 'STOPPED'; this.inFlight = 0; }
  snapshot(): BackgroundWorkerRuntimeSnapshot {
    return Object.freeze({
      state: this.state,
      ...(this.lastPollAt ? { lastPollAt: this.lastPollAt.toISOString() } : {}),
      ...(this.lastSuccessAt ? { lastSuccessAt: this.lastSuccessAt.toISOString() } : {}),
      ...(this.lastErrorAt ? { lastErrorAt: this.lastErrorAt.toISOString() } : {}),
      ...(this.lastErrorCode ? { lastErrorCode: this.lastErrorCode } : {}),
      inFlight: this.inFlight,
      claimedTotal: this.claimedTotal,
      completedTotal: this.completedTotal,
      failedTotal: this.failedTotal,
      leaseLostTotal: this.leaseLostTotal,
    });
  }
}

export interface DurableBackgroundWorkerOptions {
  workerId: string;
  batchSize: number;
  leaseDurationMs: number;
  heartbeatIntervalMs: number;
}

export class DurableBackgroundWorker {
  private draining = false;
  private readonly active = new Set<Promise<void>>();

  public constructor(
    private readonly queue: IDurableBackgroundJobQueue,
    private readonly handlers: BackgroundJobHandlerRegistry,
    private readonly runtimeState: BackgroundWorkerRuntimeState,
  ) {}

  public async runOnce(options: DurableBackgroundWorkerOptions): Promise<void> {
    if (this.draining) return;
    this.validateOptions(options);
    const claims = await this.queue.claimDue({
      workerId: options.workerId,
      batchSize: options.batchSize,
      leaseDurationMs: options.leaseDurationMs,
      now: new Date(),
    });
    this.runtimeState.markRunning(claims.length);
    if (claims.length === 0) return;
    const tasks = claims.map(claim => this.track(this.executeClaim(claim, options)));
    await Promise.all(tasks);
  }

  public beginDrain(): void {
    this.draining = true;
    this.runtimeState.beginDrain();
  }

  public async drain(): Promise<void> {
    this.beginDrain();
    await Promise.allSettled([...this.active]);
    this.runtimeState.stop();
  }

  private track(task: Promise<void>): Promise<void> {
    this.active.add(task);
    void task.finally(() => this.active.delete(task));
    return task;
  }

  private async executeClaim(claim: DurableBackgroundJobClaim, options: DurableBackgroundWorkerOptions): Promise<void> {
    const handler = this.handlers.resolve(claim.jobType);
    if (!handler) {
      await this.failClaim(claim, new Error(`BACKGROUND_JOB_HANDLER_NOT_REGISTERED:${claim.jobType}`));
      return;
    }

    const controller = new AbortController();
    let leaseLost = false;
    let heartbeatTask: Promise<void> | null = null;
    const heartbeatTimer = setInterval(() => {
      if (heartbeatTask || leaseLost) return;
      heartbeatTask = this.queue.heartbeat({
        jobReference: claim.jobReference,
        workerId: claim.workerId,
        leaseToken: claim.leaseToken,
        now: new Date(),
        leaseDurationMs: options.leaseDurationMs,
      }).then(owned => {
        if (!owned) { leaseLost = true; controller.abort(new Error('BACKGROUND_JOB_LEASE_LOST')); }
      }).finally(() => { heartbeatTask = null; });
    }, options.heartbeatIntervalMs);
    heartbeatTimer.unref?.();

    const timeout = setTimeout(() => controller.abort(new Error('BACKGROUND_JOB_TIMEOUT')), claim.timeoutMs);
    timeout.unref?.();

    try {
      await Promise.race([
        handler.handle(claim.payload, {
          jobReference: claim.jobReference,
          attempt: claim.attempt,
          idempotencyKey: claim.jobReference,
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason ?? new Error('BACKGROUND_JOB_ABORTED')), { once: true })),
      ]);
      if (heartbeatTask) await heartbeatTask;
      if (leaseLost) { this.runtimeState.markLeaseLost(); return; }
      const completed = await this.queue.complete({
        jobReference: claim.jobReference,
        workerId: claim.workerId,
        leaseToken: claim.leaseToken,
        now: new Date(),
        ...(claim.cronExpression ? { nextRecurringRunAt: nextCronOccurrence(claim.cronExpression, new Date()) } : {}),
      });
      completed ? this.runtimeState.markCompleted() : this.runtimeState.markLeaseLost();
    } catch (error) {
      await Promise.resolve(heartbeatTask).catch(() => undefined);
      if (leaseLost) { this.runtimeState.markLeaseLost(); return; }
      await this.failClaim(claim, error);
    } finally {
      clearInterval(heartbeatTimer);
      clearTimeout(timeout);
    }
  }

  private async failClaim(claim: DurableBackgroundJobClaim, error: unknown): Promise<void> {
    const message = this.sanitizeError(error);
    const failure = await this.queue.fail({
      jobReference: claim.jobReference,
      workerId: claim.workerId,
      leaseToken: claim.leaseToken,
      now: new Date(),
      errorCode: message.code,
      errorMessage: message.message,
      nextAvailableAt: new Date(Date.now() + this.backoffMs(claim.attempt, claim.backoffType)),
    });
    if (!failure.applied) this.runtimeState.markLeaseLost();
    else this.runtimeState.markFailed(failure.exhausted ? 'BACKGROUND_JOB_DLQ' : message.code);
  }

  private backoffMs(attempt: number, type: string): number {
    const normalized = String(type || 'exponential').trim().toLowerCase();
    if (normalized === 'none') return 0;
    if (normalized === 'fixed') return 5_000;
    if (normalized === 'linear') return Math.min(300_000, 5_000 * Math.max(1, attempt));
    return Math.min(300_000, 5_000 * 2 ** Math.max(0, attempt - 1));
  }

  private sanitizeError(error: unknown): { code: string; message: string } {
    const raw = error instanceof Error ? error.message : String(error || 'BACKGROUND_JOB_HANDLER_FAILED');
    const redacted = raw.replace(/(password|token|secret|authorization)\s*[=:]\s*\S+/gi, '$1=[REDACTED]').slice(0, 1000);
    const timeout = /BACKGROUND_JOB_TIMEOUT/.test(redacted);
    return { code: timeout ? 'BACKGROUND_JOB_TIMEOUT' : 'BACKGROUND_JOB_HANDLER_FAILED', message: redacted };
  }

  private validateOptions(options: DurableBackgroundWorkerOptions): void {
    if (!options.workerId.trim()) throw new Error('BACKGROUND_JOB_WORKER_ID_REQUIRED');
    if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 100) throw new Error('BACKGROUND_JOB_BATCH_SIZE_INVALID');
    if (!Number.isInteger(options.leaseDurationMs) || options.leaseDurationMs < 5_000) throw new Error('BACKGROUND_JOB_LEASE_DURATION_INVALID');
    if (!Number.isInteger(options.heartbeatIntervalMs) || options.heartbeatIntervalMs < 1_000 || options.heartbeatIntervalMs >= options.leaseDurationMs) throw new Error('BACKGROUND_JOB_HEARTBEAT_INTERVAL_INVALID');
  }
}
