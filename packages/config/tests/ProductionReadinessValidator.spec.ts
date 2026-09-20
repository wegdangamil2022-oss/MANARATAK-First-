import { describe, expect, it } from 'vitest';
import { ProductionReadinessValidator } from '../src/ProductionReadinessValidator';

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://manaratak:strong-db-secret@db.manaratak.internal:5432/manaratak?schema=public',
  REDIS_URL: 'redis://:strong-redis-secret@redis.manaratak.internal:6379',
  JWT_ACTIVE_KEY_ID: 'prod-key-2026-01',
  JWT_PRIVATE_KEY_PEM: '-----BEGIN ' + 'PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----',
  JWT_PUBLIC_KEY_PEM: '-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  JWT_ISSUER: 'manaratak-production-api',
  JWT_AUDIENCE: 'manaratak-production-browser',
  CSRF_SECRET: 'production-csrf-secret-with-safe-entropy-123456789',
  OTEL_SERVICE_NAME: 'manaratak-api',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.manaratak.internal/v1/traces',
  CORS_ORIGIN: 'https://www.manaratak.com',
  API_BASE_URL: 'https://api.manaratak.com',
  PUBLIC_WEB_URL: 'https://www.manaratak.com',
  ADMIN_WEB_URL: 'https://admin.manaratak.com',
  CERTIFICATE_COMPLETION_WORKER_ENABLED: true,
  CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS: 5000,
  BACKGROUND_WORKER_ENABLED: true,
  BACKGROUND_WORKER_INTERVAL_MS: 2000,
  BACKGROUND_WORKER_BATCH_SIZE: 10,
  BACKGROUND_WORKER_LEASE_MS: 60000,
  BACKGROUND_WORKER_HEARTBEAT_MS: 15000,
  BACKGROUND_RETENTION_CRON: '15 2 * * *',
  MANARATAK_ASSET_PROVIDER_BASE_URL: 'https://asset-provider.manaratak.internal/api/',
  MANARATAK_ASSET_PROVIDER_API_KEY: 'asset-provider-key',
  MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
  MANARATAK_IMPORT_RAW_RETENTION_DAYS: '365',
  ADMIN_AUTH_MODE: 'strict',
  SECURE_COOKIE: 'true',
  SECURITY_CSP_ENABLED: 'true',
  SECURITY_RATE_LIMIT_MAX: '100',
  TRUST_PROXY_HOPS: '1',
  LOG_LEVEL: 'info',
};

describe('ProductionReadinessValidator', () => {
  it('marks a hardened production environment as ready', () => {
    const report = ProductionReadinessValidator.validate(productionEnv);
    expect(report.ready).toBe(true);
    expect(report.blockerCount).toBe(0);
  });

  it('blocks production when admin access remains in demo mode', () => {
    const report = ProductionReadinessValidator.validate({ ...productionEnv, ADMIN_AUTH_MODE: 'demo' });
    expect(report.findings).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'admin.strict_mode_required', severity: 'BLOCKER' })]));
  });

  it('blocks production when local service URLs are used', () => {
    const report = ProductionReadinessValidator.validate({
      ...productionEnv,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/manaratak_dev?schema=public',
      REDIS_URL: 'redis://localhost:6379',
      API_BASE_URL: 'http://localhost:3000',
      CORS_ORIGIN: 'http://localhost:5173',
    });
    expect(report.findings.map(f => f.id)).toEqual(expect.arrayContaining(['database.production_url', 'redis.production_url', 'api.https_base_url_required', 'cors.production_origin_required']));
  });

  it('blocks production when asymmetric JWT key custody is incomplete', () => {
    const report = ProductionReadinessValidator.validate({ ...productionEnv, JWT_PRIVATE_KEY_PEM: undefined });
    expect(report.findings.map(f => f.id)).toContain('auth.jwt_private_key_required');
  });

  it('blocks production when access-token TTL exceeds 15 minutes', () => {
    const report = ProductionReadinessValidator.validate({ ...productionEnv, ACCESS_TOKEN_TTL_SECONDS: '901' });
    expect(report.findings.map(f => f.id)).toContain('auth.access_token_ttl_invalid');
  });

  it('blocks production when CSP is disabled and reports warnings', () => {
    const report = ProductionReadinessValidator.validate({ ...productionEnv, SECURITY_CSP_ENABLED: 'false', SECURITY_RATE_LIMIT_MAX: '5000', LOG_LEVEL: 'debug' });
    expect(report.ready).toBe(false);
    expect(report.warningCount).toBe(2);
  });

  it('blocks production when JWT claims or trusted proxy bounds are missing', () => {
    const report = ProductionReadinessValidator.validate({ ...productionEnv, JWT_ISSUER: undefined, TRUST_PROXY_HOPS: undefined });
    expect(report.findings.map(f => f.id)).toEqual(expect.arrayContaining(['auth.jwt_claims_unconfigured', 'security.trust_proxy_unconfigured']));
  });

  it('does not block local development mode', () => {
    const report = ProductionReadinessValidator.validate({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://localhost/dev', REDIS_URL: 'redis://localhost:6379' });
    expect(report.ready).toBe(true);
  });
});
