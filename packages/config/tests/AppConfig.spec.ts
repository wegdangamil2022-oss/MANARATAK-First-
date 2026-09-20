import { describe, it, expect } from 'vitest';
import { loadAppConfig, AppConfigSchema } from '../src/AppConfig';

const asymmetricJwtEnv = {
  JWT_ACTIVE_KEY_ID: 'test-key-1',
  JWT_PRIVATE_KEY_PEM: '-----BEGIN ' + 'PRIVATE KEY-----\ntest-private-material\n-----END PRIVATE KEY-----',
  JWT_PUBLIC_KEY_PEM: '-----BEGIN PUBLIC KEY-----\ntest-public-material\n-----END PUBLIC KEY-----',
  ACCESS_TOKEN_TTL_SECONDS: '900',
};

const productionBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@prod-db:5432/manaratak',
  REDIS_URL: 'redis://prod-redis:6379',
  ...asymmetricJwtEnv,
  CSRF_SECRET: 'a-very-secure-production-csrf-secret-key-32chars',
  CORS_ORIGIN: 'https://app.manaratak.com',
  API_BASE_URL: 'https://api.manaratak.com',
  PUBLIC_WEB_URL: 'https://app.manaratak.com',
  ADMIN_WEB_URL: 'https://admin.manaratak.com',
  JWT_ISSUER: 'manaratak-production-api',
  JWT_AUDIENCE: 'manaratak-production-browser',
  SECURE_COOKIE: 'true',
  TRUST_PROXY_HOPS: '1',
  SECURITY_CSP_ENABLED: 'true',
  SECURITY_RATE_LIMIT_MAX: '100',
  SECURITY_RATE_LIMIT_WINDOW_MS: '60000',
  CERTIFICATE_COMPLETION_WORKER_ENABLED: 'true',
  CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS: '5000',
  BACKGROUND_WORKER_ENABLED: 'true',
  BACKGROUND_WORKER_INTERVAL_MS: '2000',
  BACKGROUND_WORKER_BATCH_SIZE: '10',
  BACKGROUND_WORKER_LEASE_MS: '60000',
  BACKGROUND_WORKER_HEARTBEAT_MS: '15000',
  BACKGROUND_RETENTION_CRON: '15 2 * * *',
  MANARATAK_ASSET_PROVIDER_BASE_URL: 'https://asset-provider.manaratak.internal/api/',
  MANARATAK_ASSET_PROVIDER_API_KEY: 'asset-provider-key',
  MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
  MANARATAK_IMPORT_RAW_RETENTION_DAYS: '365',
  ADMIN_AUTH_MODE: 'strict',
};

describe('AppConfig', () => {
  it('parses valid development config and pins short access-token defaults', () => {
    const config = loadAppConfig({ NODE_ENV: 'development', PORT: '4000' });
    expect(config.PORT).toBe(4000);
    expect(config.JWT_ACTIVE_KEY_ID).toBe('dev-ephemeral');
    expect(config.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(config.ADMIN_AUTH_MODE).toBe('strict');
  });

  it('development/test config loads with safe local service defaults', () => {
    const config = loadAppConfig({ NODE_ENV: 'development' });
    expect(config.DATABASE_URL).toBe('postgresql://postgres:postgres@localhost:5432/manaratak_dev');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('fails in production when critical variables are missing', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'production', PORT: '4000' })).toThrowError(/DATABASE_URL is required/);
    expect(() => loadAppConfig({ NODE_ENV: 'production', PORT: '4000' })).toThrowError(/JWT_PRIVATE_KEY_PEM is required/);
    expect(() => loadAppConfig({ NODE_ENV: 'production', PORT: '4000' })).toThrowError(/JWT_PUBLIC_KEY_PEM is required/);
  });

  it('fails in production with local SQLite database URL', () => {
    expect(() => loadAppConfig({ ...productionBase, DATABASE_URL: 'file:./dev.db' })).toThrowError(/Local SQLite DATABASE_URL is strictly forbidden/);
  });

  it('fails in production with wildcard CORS origin', () => {
    expect(() => loadAppConfig({ ...productionBase, CORS_ORIGIN: '*' })).toThrowError(/CORS_ORIGIN cannot be wildcard/);
  });

  it('fails in production with weak CSRF signing secret', () => {
    expect(() => loadAppConfig({
      ...productionBase,
      CSRF_SECRET: 'manaratak-default-csrf-secret-must-be-changed-in-prod-long',
    })).toThrowError(/insecure default/);
  });

  it('requires REDIS_URL in production for distributed rate limiting', () => {
    const { REDIS_URL, ...withoutRedis } = productionBase;
    expect(() => loadAppConfig(withoutRedis)).toThrowError(/REDIS_URL is required/);
  });

  it('rejects access-token TTLs over 15 minutes in every environment', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'test', ACCESS_TOKEN_TTL_SECONDS: '901' })).toThrowError(/(?:less than or equal to|<=)900/);
  });

  it('parses explicit false/0 booleans without JavaScript truthiness inversion', () => {
    const falseConfig = loadAppConfig({ NODE_ENV: 'development', SECURE_COOKIE: 'false', SECURITY_CSP_ENABLED: '0' });
    expect(falseConfig.SECURE_COOKIE).toBe(false);
    expect(falseConfig.SECURITY_CSP_ENABLED).toBe(false);

    const trueConfig = loadAppConfig({ NODE_ENV: 'development', SECURE_COOKIE: 'true', SECURITY_CSP_ENABLED: '1' });
    expect(trueConfig.SECURE_COOKIE).toBe(true);
    expect(trueConfig.SECURITY_CSP_ENABLED).toBe(true);
  });

  it('parses PORT as number', () => {
    const result = AppConfigSchema.safeParse({ NODE_ENV: 'test', PORT: '8080' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PORT).toBe(8080);
  });

  it('validates NODE_ENV', () => {
    expect(AppConfigSchema.safeParse({ NODE_ENV: 'invalid_env' }).success).toBe(false);
  });

  it('requires strict admin auth mode in production', () => {
    expect(() => loadAppConfig({ ...productionBase, ADMIN_AUTH_MODE: 'demo' })).toThrowError(/expected "strict"/);
  });
});
