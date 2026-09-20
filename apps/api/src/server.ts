import { createApiApp } from './app.js';
import { container } from './infrastructure/di/container.js';
import { ConfigurationRegistry, EnvironmentLoader, EnvironmentConfigurationProvider, ZodEnvironmentValidator } from '@manaratak/config';
import { RETENTION_SWEEP_JOB_TYPE, CMS_SCHEDULED_PUBLISH_JOB_TYPE, IMPORT_QUEUE_SWEEP_JOB_TYPE, AI_ASYNC_SWEEP_JOB_TYPE, FINANCE_RECONCILIATION_JOB_TYPE, NOTIFICATION_DELIVERY_JOB_TYPE } from '@manaratak/application';

const SHUTDOWN_TIMEOUT_MS = 15_000;

async function bootstrap() {
  const envProvider = new EnvironmentConfigurationProvider();
  const loader = new EnvironmentLoader([envProvider]);
  const config = await ConfigurationRegistry.bootstrap(loader, new ZodEnvironmentValidator());

  const app = await createApiApp();
  const rawPort = config.getOptional<string | number>('PORT');
  const PORT = rawPort ? Number(rawPort) : 3000;

  const backgroundWorkerEnabled = config.getOptional<boolean>('BACKGROUND_WORKER_ENABLED') === true;
  const backgroundWorker = backgroundWorkerEnabled ? container.resolve<any>('durableBackgroundWorker') : null;
  if (backgroundWorkerEnabled) {
    const manager = container.resolve<any>('manageBackgroundJobsUseCase');
    await manager.ensureRecurringJob({
      stableReference: 'system.retention.sweep',
      jobType: RETENTION_SWEEP_JOB_TYPE,
      parameters: { limitPerOwner: 100 },
      cronExpression: config.getOptional<string>('BACKGROUND_RETENTION_CRON') || '15 2 * * *',
      priority: 100,
      timeoutSeconds: 600,
      maxAttempts: 5,
      backoffType: 'exponential',
      ownerReference: 'platform:retention',
    });
    await manager.ensureRecurringJob({ stableReference: 'system.cms.scheduled-publishing', jobType: CMS_SCHEDULED_PUBLISH_JOB_TYPE, parameters: { limit: 50 }, cronExpression: config.getOptional<string>('BACKGROUND_CMS_CRON') || '* * * * *', priority: 90, timeoutSeconds: 120, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'cms:scheduled-publishing' });
    await manager.ensureRecurringJob({ stableReference: 'system.import.queue-sweep', jobType: IMPORT_QUEUE_SWEEP_JOB_TYPE, parameters: { maxJobs: 10 }, cronExpression: config.getOptional<string>('BACKGROUND_IMPORT_CRON') || '* * * * *', priority: 80, timeoutSeconds: 300, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'imports:durable-queue' });
    await manager.ensureRecurringJob({ stableReference: 'system.ai.async-sweep', jobType: AI_ASYNC_SWEEP_JOB_TYPE, parameters: { limit: 10 }, cronExpression: config.getOptional<string>('BACKGROUND_AI_CRON') || '* * * * *', priority: 80, timeoutSeconds: 600, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'ai:async-queue' });
    await manager.ensureRecurringJob({ stableReference: 'system.finance.reconciliation', jobType: FINANCE_RECONCILIATION_JOB_TYPE, parameters: { limit: 50 }, cronExpression: config.getOptional<string>('BACKGROUND_FINANCE_RECONCILIATION_CRON') || '*/5 * * * *', priority: 95, timeoutSeconds: 600, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'finance:reconciliation' });
    await manager.ensureRecurringJob({ stableReference: 'system.notification.delivery', jobType: NOTIFICATION_DELIVERY_JOB_TYPE, parameters: { limit: 20, leaseMs: 600_000, maxDeliveriesPerRecipientPerHour: config.getOptional<number>('NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR') ?? 30 }, cronExpression: config.getOptional<string>('BACKGROUND_NOTIFICATION_CRON') || '* * * * *', priority: 85, timeoutSeconds: 300, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'notifications:delivery' });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bootstrap] Server successfully started on port ${PORT}`);
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

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

  let certificateWorkerTimer: NodeJS.Timeout | null = null;
  let certificateWorkerTask: Promise<void> | null = null;
  let studentWorkspaceOutboxTimer: NodeJS.Timeout | null = null;
  let studentWorkspaceOutboxTask: Promise<void> | null = null;
  let ownerDomainOutboxTimer: NodeJS.Timeout | null = null;
  let ownerDomainOutboxTask: Promise<void> | null = null;
  let backgroundWorkerTimer: NodeJS.Timeout | null = null;
  let backgroundWorkerTask: Promise<void> | null = null;

  // P13 -> P14 delivery is controlled by canonical typed configuration.
  if (config.getOptional<boolean>('CERTIFICATE_COMPLETION_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS') ?? 5_000;
    const worker = container.resolve<any>('certificateCompletionOutboxWorker');
    const workerId = `certificate-completion-${process.pid}`;
    const tick = (): Promise<void> => {
      if (certificateWorkerTask) return certificateWorkerTask;
      certificateWorkerTask = (async () => {
        pollingWorkerRuntimeRegistry.started('certificate-completion');
        try {
          await observeWorkerIteration('certificate-completion', () => worker.runOnce(workerId));
          pollingWorkerRuntimeRegistry.success('certificate-completion');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('certificate-completion', error);
          console.error('[Certificates] Completion worker iteration failed. Review restricted service logs.');
        } finally {
          certificateWorkerTask = null;
        }
      })();
      return certificateWorkerTask;
    };
    void tick();
    certificateWorkerTimer = setInterval(() => { void tick(); }, intervalMs);
    certificateWorkerTimer.unref?.();
  }

  if (config.getOptional<boolean>('STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS') ?? 2_000;
    const worker = container.resolve<any>('studentWorkspaceOutboxWorker');
    const workerId = `student-workspace-${process.pid}`;
    const tick = (): Promise<void> => {
      if (studentWorkspaceOutboxTask) return studentWorkspaceOutboxTask;
      studentWorkspaceOutboxTask = (async () => {
        pollingWorkerRuntimeRegistry.started('student-workspace-outbox');
        try {
          await observeWorkerIteration('student-workspace-outbox', async () => {
            await worker.runIdentityOnce(`${workerId}-identity`);
            await worker.runLearningOnce(`${workerId}-learning`);
          });
          pollingWorkerRuntimeRegistry.success('student-workspace-outbox');
        } catch (error) {
          pollingWorkerRuntimeRegistry.failure('student-workspace-outbox', error);
          console.error('[StudentWorkspace] Outbox projection worker iteration failed. Review restricted service logs.');
        } finally {
          studentWorkspaceOutboxTask = null;
        }
      })();
      return studentWorkspaceOutboxTask;
    };
    void tick();
    studentWorkspaceOutboxTimer = setInterval(() => { void tick(); }, intervalMs);
    studentWorkspaceOutboxTimer.unref?.();
  }

  if (config.getOptional<boolean>('OWNER_DOMAIN_OUTBOX_WORKER_ENABLED') === true) {
    const intervalMs = config.getOptional<number>('OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS') ?? 2_000;
    const worker = container.resolve<any>('ownerDomainOutboxWorker');
    const workerId = `owner-domain-${process.pid}`;
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
          console.error('[OwnerDomainEvents] Outbox delivery iteration failed. Review restricted service logs.');
        } finally {
          ownerDomainOutboxTask = null;
        }
      })();
      return ownerDomainOutboxTask;
    };
    void tick();
    ownerDomainOutboxTimer = setInterval(() => { void tick(); }, intervalMs);
    ownerDomainOutboxTimer.unref?.();
  }

  if (backgroundWorkerEnabled && backgroundWorker) {
    const intervalMs = config.getOptional<number>('BACKGROUND_WORKER_INTERVAL_MS') ?? 2_000;
    const batchSize = config.getOptional<number>('BACKGROUND_WORKER_BATCH_SIZE') ?? 10;
    const leaseDurationMs = config.getOptional<number>('BACKGROUND_WORKER_LEASE_MS') ?? 60_000;
    const heartbeatIntervalMs = config.getOptional<number>('BACKGROUND_WORKER_HEARTBEAT_MS') ?? 15_000;
    const workerId = `background-${process.pid}`;
    const tick = (): Promise<void> => {
      if (backgroundWorkerTask) return backgroundWorkerTask;
      backgroundWorkerTask = (async () => {
        try {
          await observeWorkerIteration('durable-background-jobs', () => backgroundWorker.runOnce({ workerId, batchSize, leaseDurationMs, heartbeatIntervalMs }));
        } catch {
          console.error('[BackgroundJobs] Worker iteration failed. Review restricted service logs.');
        } finally {
          backgroundWorkerTask = null;
        }
      })();
      return backgroundWorkerTask;
    };
    void tick();
    backgroundWorkerTimer = setInterval(() => { void tick(); }, intervalMs);
    backgroundWorkerTimer.unref?.();
  }

  const monitoringProviderRuntime = app.locals.monitoringProvider as { forceFlush?(): Promise<void>; shutdown?(): Promise<void> } | undefined;

  const runtimeResources = app.locals.runtimeResourceRegistry as {
    beginShutdown(): void;
    closeAll(): Promise<void>;
  } | undefined;

  let shutdownPromise: Promise<void> | null = null;
  const gracefulShutdown = (signal: 'SIGTERM' | 'SIGINT'): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      console.log(`[Bootstrap] ${signal} received; readiness is DOWN and graceful drain has started.`);
      runtimeResources?.beginShutdown();

      if (certificateWorkerTimer) {
        clearInterval(certificateWorkerTimer);
        certificateWorkerTimer = null;
      }
      if (studentWorkspaceOutboxTimer) {
        clearInterval(studentWorkspaceOutboxTimer);
        studentWorkspaceOutboxTimer = null;
      }
      if (ownerDomainOutboxTimer) {
        clearInterval(ownerDomainOutboxTimer);
        ownerDomainOutboxTimer = null;
      }
      if (backgroundWorkerTimer) {
        clearInterval(backgroundWorkerTimer);
        backgroundWorkerTimer = null;
      }
      backgroundWorker?.beginDrain?.();

      // Stop accepting new requests immediately while allowing active requests to drain.
      server.closeIdleConnections?.();
      const httpDrain = new Promise<'closed' | 'error'>((resolve) => {
        server.close((error?: Error) => resolve(error ? 'error' : 'closed'));
      });
      const workerDrain = Promise.all([
        certificateWorkerTask ?? Promise.resolve(),
        studentWorkspaceOutboxTask ?? Promise.resolve(),
        ownerDomainOutboxTask ?? Promise.resolve(),
        backgroundWorker?.drain?.() ?? backgroundWorkerTask ?? Promise.resolve(),
      ]).then(() => 'worker-drained' as const).catch(() => 'worker-error' as const);

      let timeoutHandle: NodeJS.Timeout | null = null;
      const hardTimeout = new Promise<'timeout'>((resolve) => {
        timeoutHandle = setTimeout(() => resolve('timeout'), SHUTDOWN_TIMEOUT_MS);
        timeoutHandle.unref?.();
      });

      try {
        const drainResult = await Promise.race([
          Promise.all([httpDrain, workerDrain]).then(([httpResult, workerResult]) => ({
            kind: 'drained' as const,
            httpResult,
            workerResult,
          })),
          hardTimeout.then(() => ({ kind: 'timeout' as const })),
        ]);

        if (drainResult.kind === 'timeout') {
          process.exitCode = 1;
          console.error('[Bootstrap] Graceful shutdown timeout reached; force-closing remaining HTTP connections and runtime resources.');
          server.closeAllConnections?.();
        } else if (drainResult.httpResult === 'error' || drainResult.workerResult === 'worker-error') {
          process.exitCode = 1;
          console.error('[Bootstrap] One or more shutdown drains reported an error.');
        }

        pollingWorkerRuntimeRegistry.stopped('certificate-completion');
        pollingWorkerRuntimeRegistry.stopped('student-workspace-outbox');
        pollingWorkerRuntimeRegistry.stopped('owner-domain-outbox');
        await monitoringProviderRuntime?.forceFlush?.();
        await monitoringProviderRuntime?.shutdown?.();
        await runtimeResources?.closeAll();
        console.log('[Bootstrap] Graceful shutdown completed.');
      } catch {
        process.exitCode = 1;
        console.error('[Bootstrap] Graceful shutdown failed. Review restricted service logs.');
        try { await runtimeResources?.closeAll(); } catch { /* best-effort terminal cleanup */ }
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    })();
    return shutdownPromise;
  };

  process.once('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
  process.once('SIGINT', () => { void gracefulShutdown('SIGINT'); });
  server.on('close', () => {
    if (certificateWorkerTimer) clearInterval(certificateWorkerTimer);
    if (studentWorkspaceOutboxTimer) clearInterval(studentWorkspaceOutboxTimer);
    if (ownerDomainOutboxTimer) clearInterval(ownerDomainOutboxTimer);
    if (backgroundWorkerTimer) clearInterval(backgroundWorkerTimer);
  });
}

bootstrap().catch(() => {
  console.error('[Bootstrap] Fatal error during API startup. Review restricted service logs.');
  process.exit(1);
});
