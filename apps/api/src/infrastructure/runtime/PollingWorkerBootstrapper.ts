import type { AwilixContainer } from '@manaratak-vendor/awilix-core';
import type { IConfigurationService, IMonitoringService } from '@manaratak/core';
import type { RuntimeResourceRegistry } from './RuntimeResourceRegistry.js';

export function startPollingWorkers(
  config: IConfigurationService,
  container: AwilixContainer,
  runtimeResources: RuntimeResourceRegistry,
  monitoringService?: IMonitoringService,
): () => void {
  const pollingWorkerRuntimeRegistry = container.resolve<any>('pollingWorkerRuntimeRegistry');
  const operationalMonitoring = monitoringService || container.resolve<any>('monitoringService');
  const operationalMetrics = operationalMonitoring?.getMetrics?.();

  const observeWorkerIteration = async <T>(worker: string, action: () => Promise<T>): Promise<T> => {
    const started = performance.now();
    const span = operationalMonitoring?.startSpan?.('worker.iteration', { worker });
    operationalMetrics?.incrementCounter?.('worker.iterations', 1, { worker });
    try {
      const result = await action();
      operationalMetrics?.incrementCounter?.('worker.iterations.completed', 1, { worker });
      span?.end?.('OK');
      return result;
    } catch (error) {
      operationalMetrics?.incrementCounter?.('worker.iterations.failed', 1, { worker });
      span?.recordException?.(error);
      span?.end?.('ERROR');
      throw error;
    } finally {
      operationalMetrics?.recordHistogram?.('worker.iteration.duration_ms', performance.now() - started, { worker });
    }
  };

  const timers: NodeJS.Timeout[] = [];

  // 1. Certificate Completion Worker
  if (config.getOptional<boolean>('CERTIFICATE_COMPLETION_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS') ?? 5_000;
    const worker = container.resolve<any>('certificateCompletionOutboxWorker');
    const workerId = `certificate-completion-${process.pid}`;
    let task: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (task) return task;
      task = (async () => {
        pollingWorkerRuntimeRegistry.started('certificate-completion');
        try {
          await observeWorkerIteration('certificate-completion', () => worker.runOnce(workerId));
          pollingWorkerRuntimeRegistry.success('certificate-completion');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('certificate-completion', error);
          console.error('[Certificates] Completion worker iteration failed.', error);
        } finally {
          task = null;
        }
      })();
      return task;
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
    let task: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (task) return task;
      task = (async () => {
        pollingWorkerRuntimeRegistry.started('student-workspace-outbox');
        try {
          await observeWorkerIteration('student-workspace-outbox', async () => {
            await worker.runIdentityOnce(`${workerId}-identity`);
            await worker.runRoleOnce(`${workerId}-role`);
            await worker.runLearningOnce(`${workerId}-learning`);
            await worker.runCertificatesOnce(`${workerId}-certificates`);
          });
          pollingWorkerRuntimeRegistry.success('student-workspace-outbox');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('student-workspace-outbox', error);
          console.error('[StudentWorkspace] Outbox projection worker iteration failed.', error);
        } finally {
          task = null;
        }
      })();
      return task;
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
    let task: Promise<void> | null = null;
    const tick = (): Promise<void> => {
      if (task) return task;
      task = (async () => {
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
          console.error('[OwnerDomainEvents] Outbox delivery iteration failed.', error);
        } finally {
          task = null;
        }
      })();
      return task;
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    timers.push(timer);
  }

  const cleanup = () => {
    for (const timer of timers) {
      clearInterval(timer);
    }
    timers.length = 0;
  };

  runtimeResources.registerCleanup(cleanup);
  return cleanup;
}
