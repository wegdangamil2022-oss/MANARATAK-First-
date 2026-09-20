import type { Express, Request, Response } from 'express';
import { bootstrapDiagnostics } from './BootstrapDiagnostics.js';

/** Request-scoped adapter. Never imports server.ts or owns listeners/workers. */
export function createVercelHttpHandler(bootstrap: () => Promise<Express>) {
  let pending: Promise<Express> | undefined;
  return async function handler(req: Request, res: Response): Promise<void> {
    // Process liveness must not depend on database/configuration readiness.
    if (req.method === 'GET' && req.url?.split('?')[0] === '/api/v1/monitoring/health/liveness') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'UP', timestamp: new Date().toISOString() }));
      return;
    }
    let app: Express;
    try {
      pending ??= bootstrap().catch((error: unknown) => { pending = undefined; throw error; });
      app = await pending;
    } catch (error: unknown) {
      // Never log raw provider errors: they can include credentials and URLs.
      const diagnostics = bootstrapDiagnostics(error);
      const { category } = diagnostics;
      console.error('[Bootstrap]', JSON.stringify(diagnostics));
      if (category === 'PRODUCTION_READINESS_BLOCKED' && error instanceof Error) {
        // Only canonical finding IDs, never free-form provider/config messages.
        const ids = error.message.match(/\[[A-Z][A-Z0-9_-]{2,80}\]/g) ?? [];
        console.error('[Bootstrap] Blocker IDs: ' + [...new Set(ids)].join(', '));
      }
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'DOWN', error: category }));
      return;
    }
    await new Promise<void>((resolve, reject) => {
      res.once('finish', resolve);
      res.once('close', resolve);
      res.once('error', reject);
      app(req, res);
    });
    // No unbounded export timer on Functions; flush within the invocation.
    const telemetry = app.locals.monitoringProvider as { forceFlush?(): Promise<void> } | undefined;
    try { await telemetry?.forceFlush?.(); }
    catch { console.error('[Telemetry] REQUEST_EXPORT_FAILED'); }
  };
}
