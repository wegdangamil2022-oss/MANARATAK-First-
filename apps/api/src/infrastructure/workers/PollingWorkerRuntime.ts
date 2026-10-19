import { randomUUID } from 'node:crypto';
import type { AwilixContainer } from '@manaratak-vendor/awilix-core';
import type { IConfigurationService } from '@manaratak/core';

export interface PollingWorkerHandle {
  stop: () => Promise<void>;
}

let activeWorkerHandle: PollingWorkerHandle | null = null;

async function requireSuccessfulDelivery<T>(result: Promise<T>): Promise<T> {
  const value = await result;
  if (value && typeof value === 'object') {
    if ('exhausted' in value && typeof value.exhausted === 'number' && value.exhausted > 0) throw new Error('OUTBOX_DELIVERY_EXHAUSTED');
    if ('failed' in value && typeof value.failed === 'number' && value.failed > 0) throw new Error('OUTBOX_DELIVERY_FAILED');
    if ('leaseLost' in value && typeof value.leaseLost === 'number' && value.leaseLost > 0) throw new Error('OUTBOX_LEASE_LOST');
  }
  return value;
}

export async function startPollingWorkers(container: AwilixContainer, config: IConfigurationService): Promise<PollingWorkerHandle> {
  if (activeWorkerHandle) {
    return activeWorkerHandle;
  }

  const pollingWorkerRuntimeRegistry = container.resolve<any>('pollingWorkerRuntimeRegistry');
  const operationalMonitoring = container.resolve<any>('monitoringService');
  const operationalMetrics = operationalMonitoring.getMetrics();

  const observeWorkerIteration = async <T>(worker: string, action: () => Promise<T>): Promise<T> => {
    const started = performance.now();
    const span = operationalMonitoring.startSpan?.('worker.iteration', { worker });
    operationalMetrics.incrementCounter('worker.iterations', 1, { worker });
    try {
      const result = await requireSuccessfulDelivery(action());
      operationalMetrics.incrementCounter('worker.iterations.completed', 1, { worker });
      span?.end('OK');
      return result;
    } catch (error) {
      operationalMetrics.incrementCounter('worker.iterations.failed', 1, { worker });
      span?.recordException(error);
      span?.end('ERROR');
      throw error;
    } finally {
      operationalMetrics.recordHistogram('worker.iteration.duration_ms', performance.now() - started, { worker });
    }
  };

  const timers: NodeJS.Timeout[] = [];
  const inFlightTasks = new Set<Promise<void>>();
  const names: string[] = [];
  const runtimeId = `${process.pid}-${randomUUID()}`;
  let stopping = false;
  let stopTask: Promise<void> | null = null;
  // Resolve and validate all routes before creating any timer or invoking a worker.
  const routes: Array<{ name: string; intervalMs: number; action: () => Promise<unknown> }> = [];
  const register = (name: string, intervalMs: number, action: () => Promise<unknown>): void => {
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 1) throw new Error(`POLLING_INTERVAL_INVALID:${name}`);
    routes.push({ name, intervalMs, action });
  };

  if (config.getOptional<boolean>('CERTIFICATE_COMPLETION_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS') ?? 5_000;
    const worker = container.resolve<any>('certificateCompletionOutboxWorker');
    const workerId = `certificate-completion-${runtimeId}`;
    register('certificate-completion', intervalMs, () => worker.runOnce(workerId));
  }
  if (config.getOptional<boolean>('STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS') ?? 2_000;
    const worker = container.resolve<any>('studentWorkspaceOutboxWorker');
    const workerId = `student-workspace-${runtimeId}`;
    register('student-workspace-outbox', intervalMs, async () => {
      await requireSuccessfulDelivery(worker.runIdentityOnce(`${workerId}-identity`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runRoleOnce(`${workerId}-role`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runCatchupOnce(`${workerId}-catchup`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runLearningOnce(`${workerId}-learning`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runCertificatesOnce(`${workerId}-certificates`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runReplayOnce(`${workerId}-replay`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runRemindersOnce(`${workerId}-reminders`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runTrackerOwnersOnce(`${workerId}-tracker-owners`));
    });
  }
  if (config.getOptional<boolean>('OWNER_DOMAIN_OUTBOX_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS') ?? 2_000;
    const worker = container.resolve<any>('ownerDomainOutboxWorker');
    const workerId = `owner-domain-${runtimeId}`;
    register('owner-domain-outbox', intervalMs, async () => {
      await requireSuccessfulDelivery(worker.runSettingsOnce(`${workerId}-settings`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runCareerOnce(`${workerId}-career`));
      if (stopping) return;
      await requireSuccessfulDelivery(worker.runServicesOnce(`${workerId}-services`));
    });
  }
  if (config.getOptional<boolean>('BACKGROUND_WORKER_ENABLED') === true) {
    const backgroundWorker = container.resolve<any>('durableBackgroundWorker');
    const intervalMs = config.getOptional<number>('BACKGROUND_WORKER_INTERVAL_MS') ?? 2_000;
    const batchSize = config.getOptional<number>('BACKGROUND_WORKER_BATCH_SIZE') ?? 10;
    const leaseDurationMs = config.getOptional<number>('BACKGROUND_WORKER_LEASE_MS') ?? 60_000;
    const heartbeatIntervalMs = config.getOptional<number>('BACKGROUND_WORKER_HEARTBEAT_MS') ?? 15_000;
    const workerId = `background-${runtimeId}`;
    register('durable-background-jobs', intervalMs, () => backgroundWorker.runOnce({ workerId, batchSize, leaseDurationMs, heartbeatIntervalMs }));
  }
  const handle: PollingWorkerHandle = {
    stop: () => {
      if (stopTask) return stopTask;
      stopping = true;
      for (const timer of timers) clearInterval(timer);
      timers.length = 0;
      stopTask = (async () => {
        await Promise.allSettled([...inFlightTasks]);
        for (const name of names) pollingWorkerRuntimeRegistry.stopped?.(name);
        if (activeWorkerHandle === handle) activeWorkerHandle = null;
      })();
      return stopTask;
    },
  };
  activeWorkerHandle = handle;
  for (const { name, intervalMs, action } of routes) {
    names.push(name);
    let task: Promise<void> | null = null;
    const tick = (): void => {
      if (stopping || task) return;
      // Defer execution until task ownership is recorded, including synchronous failures.
      task = Promise.resolve().then(async () => {
        if (stopping) return;
        try {
          pollingWorkerRuntimeRegistry.started(name);
          await observeWorkerIteration(name, action);
          pollingWorkerRuntimeRegistry.success(name);
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure(name, error);
          console.error(`[Workers] ${name} iteration failed.`);
        }
      });
      const current = task;
      inFlightTasks.add(current);
      void current.then(() => {
        inFlightTasks.delete(current);
        task = null;
      }, () => {
        inFlightTasks.delete(current);
        task = null;
      });
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    timer.unref?.();
    timers.push(timer);
  }
  return handle;
}

export async function stopPollingWorkers(): Promise<void> {
  if (activeWorkerHandle) await activeWorkerHandle.stop();
}
