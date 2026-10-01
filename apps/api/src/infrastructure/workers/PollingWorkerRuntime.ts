import type { AwilixContainer } from 'awilix';
import type { IConfigurationService } from '@manaratak/core';

export interface PollingWorkerHandle {
  stop: () => Promise<void>;
}

let activeWorkerHandle: PollingWorkerHandle | null = null;

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
      const result = await action();
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

  // 1. Certificate Completion Worker
  if (config.getOptional<boolean>('CERTIFICATE_COMPLETION_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS') ?? 5_000;
    const worker = container.resolve<any>('certificateCompletionOutboxWorker');
    const workerId = `certificate-completion-${process.pid}`;
    let certificateWorkerTask: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (certificateWorkerTask) return certificateWorkerTask;
      certificateWorkerTask = (async () => {
        pollingWorkerRuntimeRegistry.started('certificate-completion');
        try {
          await observeWorkerIteration('certificate-completion', () => worker.runOnce(workerId));
          pollingWorkerRuntimeRegistry.success('certificate-completion');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('certificate-completion', error);
          console.error('[Certificates] Completion worker iteration failed.');
        } finally {
          certificateWorkerTask = null;
        }
      })();
      inFlightTasks.add(certificateWorkerTask);
      const task = certificateWorkerTask;
      void task.finally(() => inFlightTasks.delete(task));
      return certificateWorkerTask;
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    timers.push(timer);
  }

  // 2. Student Workspace Outbox Worker
  if (config.getOptional<boolean>('STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS') ?? 2_000;
    const worker = container.resolve<any>('studentWorkspaceOutboxWorker');
    const workerId = `student-workspace-${process.pid}`;
    let studentWorkspaceOutboxTask: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (studentWorkspaceOutboxTask) return studentWorkspaceOutboxTask;
      studentWorkspaceOutboxTask = (async () => {
        pollingWorkerRuntimeRegistry.started('student-workspace-outbox');
        try {
          await observeWorkerIteration('student-workspace-outbox', async () => {
            await worker.runIdentityOnce(`${workerId}-identity`);
            await worker.runRoleOnce(`${workerId}-role`);
            await worker.runLearningOnce(`${workerId}-learning`);
          });
          pollingWorkerRuntimeRegistry.success('student-workspace-outbox');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('student-workspace-outbox', error);
          console.error('[StudentWorkspace] Outbox projection worker iteration failed.');
        } finally {
          studentWorkspaceOutboxTask = null;
        }
      })();
      inFlightTasks.add(studentWorkspaceOutboxTask);
      const task = studentWorkspaceOutboxTask;
      void task.finally(() => inFlightTasks.delete(task));
      return studentWorkspaceOutboxTask;
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    timers.push(timer);
  }

  // 3. Owner Domain Outbox Worker
  if (config.getOptional<boolean>('OWNER_DOMAIN_OUTBOX_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS') ?? 2_000;
    const worker = container.resolve<any>('ownerDomainOutboxWorker');
    const workerId = `owner-domain-${process.pid}`;
    let ownerDomainOutboxTask: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (ownerDomainOutboxTask) return ownerDomainOutboxTask;
      ownerDomainOutboxTask = (async () => {
        pollingWorkerRuntimeRegistry.started('owner-domain-outbox');
        try {
          await observeWorkerIteration('owner-domain-outbox', async () => {
            await worker.runSettingsOnce(`${workerId}-settings`);
            await worker.runCareerOnce(`${workerId}-career`);
            await worker.runServicesOnce(`${workerId}-services`);
          });
          pollingWorkerRuntimeRegistry.success('owner-domain-outbox');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('owner-domain-outbox', error);
          console.error('[OwnerDomainEvents] Outbox delivery iteration failed.');
        } finally {
          ownerDomainOutboxTask = null;
        }
      })();
      inFlightTasks.add(ownerDomainOutboxTask);
      const task = ownerDomainOutboxTask;
      void task.finally(() => inFlightTasks.delete(task));
      return ownerDomainOutboxTask;
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    timers.push(timer);
  }

  // 4. Background Worker (durable background jobs)
  const backgroundWorkerEnabled = config.getOptional<boolean>('BACKGROUND_WORKER_ENABLED') === true;
  const backgroundWorker = backgroundWorkerEnabled ? container.resolve<any>('durableBackgroundWorker') : null;
  if (backgroundWorkerEnabled && backgroundWorker) {
    const intervalMs = config.getOptional<number>('BACKGROUND_WORKER_INTERVAL_MS') ?? 2_000;
    const batchSize = config.getOptional<number>('BACKGROUND_WORKER_BATCH_SIZE') ?? 10;
    const leaseDurationMs = config.getOptional<number>('BACKGROUND_WORKER_LEASE_MS') ?? 60_000;
    const heartbeatIntervalMs = config.getOptional<number>('BACKGROUND_WORKER_HEARTBEAT_MS') ?? 15_000;
    const workerId = `background-${process.pid}`;
    let backgroundWorkerTask: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (backgroundWorkerTask) return backgroundWorkerTask;
      backgroundWorkerTask = (async () => {
        try {
          await observeWorkerIteration('durable-background-jobs', () => backgroundWorker.runOnce({ workerId, batchSize, leaseDurationMs, heartbeatIntervalMs }));
        } catch {
          console.error('[BackgroundJobs] Worker iteration failed.');
        } finally {
          backgroundWorkerTask = null;
        }
      })();
      inFlightTasks.add(backgroundWorkerTask);
      const task = backgroundWorkerTask;
      void task.finally(() => inFlightTasks.delete(task));
      return backgroundWorkerTask;
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    timers.push(timer);
  }

  const handle: PollingWorkerHandle = {
    stop: async () => {
      for (const timer of timers) {
        clearInterval(timer);
      }
      timers.length = 0;
      await Promise.allSettled(Array.from(inFlightTasks));
      inFlightTasks.clear();
      activeWorkerHandle = null;
    },
  };

  activeWorkerHandle = handle;
  return handle;
}

export async function stopPollingWorkers(): Promise<void> {
  if (activeWorkerHandle) {
    await activeWorkerHandle.stop();
  }
}
