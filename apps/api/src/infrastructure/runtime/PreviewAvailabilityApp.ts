import express from 'express';
import helmet from 'helmet';
import { isPreviewDatabaseProbeEnabled, probePreviewDatabase, probePreviewDirectDatabase, probePreviewDatabaseSchema } from './PreviewDatabaseProbe.js';

export function isProvisioningPreview(env: Readonly<Record<string, string | undefined>>): boolean {
  return env.VERCEL === '1' && env.VERCEL_ENV === 'preview';
}

/** Provisioning surface only. No business routes, authentication fallback or DI. */
export function createPreviewAvailabilityApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.get('/', (_req, res) => {
    res.json({ service: 'manaratak-api', mode: 'preview-provisioning', ready: false,
      message: 'HTTP runtime available; business API disabled pending secure service provisioning.' });
  });
  app.get('/api/v1/monitoring/health/liveness', (_req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
  });
  const readiness: express.RequestHandler = (_req, res) => {
    res.status(503).json({ status: 'DOWN', mode: 'preview-provisioning',
      timestamp: new Date().toISOString(), error: 'PREVIEW_PROVISIONING_INCOMPLETE',
      details: { businessApiEnabled: false, externalServicesProbed: false,
        pendingCapabilities: ['database', 'authentication', 'redis', 'assets', 'finance', 'notifications', 'workers'] } });
  };
  app.get('/api/v1/monitoring/health/readiness', readiness);
  app.get('/api/v1/monitoring/health', readiness);
  const probes = [
    ['/api/v1/monitoring/health/database', probePreviewDatabase],
    ['/api/v1/monitoring/health/database/direct', probePreviewDirectDatabase],
    ['/api/v1/monitoring/health/database/schema', probePreviewDatabaseSchema],
  ] as const;
  for (const [path, probe] of probes) {
    app.get(path, async (req, res) => {
      // Express also matches HEAD to GET; only explicit GET may contact the database.
      if (req.method !== 'GET' || !isPreviewDatabaseProbeEnabled(process.env)) {
        res.status(503).json({ status: 'DOWN', error: 'PREVIEW_DATABASE_PROBE_DISABLED' });
        return;
      }
      const result = await probe();
      res.status(result.status === 'UP' ? 200 : 503).json(result);
    });
  }
  // Including auth/admin/mutation routes: fail closed, never substitute demo providers.
  app.use((_req, res) => {
    res.status(503).json({ error: 'PREVIEW_CAPABILITY_UNAVAILABLE', mode: 'preview-provisioning' });
  });
  return app;
}
