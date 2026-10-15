import { registerRecurringJobs } from './infrastructure/workers/RegisterRecurringJobs.js';
import { createApiApp } from './app.js';
import { container } from './infrastructure/di/container.js';
import { ConfigurationRegistry, EnvironmentLoader, EnvironmentConfigurationProvider, ZodEnvironmentValidator } from '@manaratak/config';
import { startPollingWorkers, stopPollingWorkers } from './infrastructure/workers/PollingWorkerRuntime.js';

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
  await registerRecurringJobs(container, config);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bootstrap] Server successfully started on port ${PORT}`);
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;

  await startPollingWorkers(container, config);

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

      const pollingDrain = stopPollingWorkers();
      backgroundWorker?.beginDrain?.();

      // Stop accepting new requests immediately while allowing active requests to drain.
      server.closeIdleConnections?.();
      const httpDrain = new Promise<'closed' | 'error'>((resolve) => {
        server.close((error?: Error) => resolve(error ? 'error' : 'closed'));
      });
      const workerDrain = Promise.all([pollingDrain, backgroundWorker?.drain?.() ?? Promise.resolve()])
        .then(() => 'worker-drained' as const)
        .catch(() => 'worker-error' as const);

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
    void stopPollingWorkers();
  });
}

bootstrap().catch(() => {
  console.error('[Bootstrap] Fatal error during API startup. Review restricted service logs.');
  process.exit(1);
});
