import { describe, expect, it } from 'vitest';
import { loadAppConfig, AppConfigSchema } from '../src/AppConfig';

describe('M5 runtime transport policy', () => {
  it('uses an explicit DIRECT_URL and keeps a local-only fallback in development', () => {
    const local = loadAppConfig({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://dev:secret@localhost:5432/dev' });
    expect(local.DIRECT_URL).toBe(local.DATABASE_URL);
    const direct = loadAppConfig({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://pooler/dev', DIRECT_URL: 'postgresql://direct/dev' });
    expect(direct.DIRECT_URL).toBe('postgresql://direct/dev');
    expect(() => loadAppConfig({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://pooler/dev' })).toThrow(/DIRECT_URL is required for a remote development database/);
  });

  it('rejects missing or insecure production connection URLs without exposing credentials', () => {
    const input = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://app:private@db.invalid:5432/app', REDIS_URL: 'redis://:private@redis.invalid:6379' };
    const parsed = AppConfigSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const issues = parsed.error.issues.map(issue => issue.message);
    expect(issues).toContain('DIRECT_URL is required in production/staging');
    expect(issues).toContain('DATABASE_URL must require PostgreSQL TLS in production/staging');
    expect(issues).toContain('REDIS_URL must use rediss:// in production/staging');
    expect(issues.join(' ')).not.toContain('private');
  });

  it('rejects incomplete SMTP or cleartext remote SMTP configuration', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'development', EMAIL_DELIVERY_PROVIDER: 'smtp', SMTP_HOST: 'smtp.remote.invalid', SMTP_PORT: '465', SMTP_FROM: 'no-reply@example.test', SMTP_SECURE: 'false' })).toThrow(/Remote test SMTP requires TLS/);
    expect(() => loadAppConfig({ NODE_ENV: 'development', EMAIL_DELIVERY_PROVIDER: 'smtp' })).toThrow(/Test SMTP configuration is incomplete/);
    expect(() => loadAppConfig({ NODE_ENV: 'development', EMAIL_DELIVERY_PROVIDER: 'smtp', SMTP_HOST: 'smtp.remote.invalid', SMTP_PORT: '465', SMTP_FROM: 'no-reply@example.test', SMTP_SECURE: 'true' })).not.toThrow();
  });
  it('accepts secure managed connection transports independently of other production gates', () => {
    const input = { NODE_ENV: 'staging', DATABASE_URL: 'postgresql://app:private@db.invalid/app?sslmode=require', DIRECT_URL: 'postgresql://migrator:private@direct.invalid/app?sslmode=verify-full', REDIS_URL: 'rediss://:private@redis.invalid:6380' };
    const parsed = AppConfigSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const fields = parsed.error.issues.map(issue => issue.path.join('.'));
    expect(fields).not.toContain('DATABASE_URL');
    expect(fields).not.toContain('DIRECT_URL');
    expect(fields).not.toContain('REDIS_URL');
  });
});
