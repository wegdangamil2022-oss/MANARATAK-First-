import { describe, it, expect } from 'vitest';
import { createApiApp } from '../../../src/app';
import { SecurityValidator } from '../../../src/presentation/security/SecurityValidator';
import { SecurityMiddlewareFactory } from '../../../src/presentation/security/SecurityMiddlewareFactory';
import { DefaultRateLimiter, SecurityService } from '@manaratak/infrastructure';
import { ISecurityService, IRateLimiter, IRateLimitResult } from '@manaratak/core';
import { createRateLimiterForRuntime } from '../../../src/infrastructure/di/RuntimeDependencyPolicy';
import { generateKeyPairSync } from 'node:crypto';
import { loadAppConfig } from '@manaratak/config';

const testJwtKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const testJwtEnv = {
  JWT_ACTIVE_KEY_ID: 'test-prod-key',
  JWT_PRIVATE_KEY_PEM: testJwtKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  JWT_PUBLIC_KEY_PEM: testJwtKeyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  ACCESS_TOKEN_TTL_SECONDS: '900',
};

describe('Production Security Guardrails & Boot Validation', () => {
  const csrfSigningSecret = 'test-csrf-signing-secret-with-at-least-32-characters';
  class StubRateLimiter implements IRateLimiter {
    public readonly isProductionReady = false;
    public readonly kind = 'demo' as const;
    async consume(): Promise<IRateLimitResult> {
      return { allowed: true, remaining: 100, resetTime: Date.now() + 60000 };
    }
  }

  class StubSecurityService implements ISecurityService {
    public readonly isProductionReady = false;
    public readonly kind = 'demo' as const;
    getRateLimiter(): IRateLimiter {
      return new StubRateLimiter();
    }
    generateCsrfToken(): string {
      return 'demo-token';
    }
    validateCsrfToken(): boolean {
      return true;
    }
  }

  describe('SecurityValidator', () => {
    it('identifies the process-local default limiter as not production ready', () => {
      const realRateLimiter = new DefaultRateLimiter();
      expect(SecurityValidator.isRealRateLimiter(realRateLimiter)).toBe(false);
      expect(realRateLimiter.isProductionReady).toBe(false);
      expect(realRateLimiter.kind).toBe('process-local');
    });

    it('identifies stub or demo rate limiters as non-production ready', () => {
      const stubRateLimiter = new StubRateLimiter();
      expect(SecurityValidator.isRealRateLimiter(stubRateLimiter)).toBe(false);
      expect(SecurityValidator.isRealRateLimiter(null)).toBe(false);
      expect(SecurityValidator.isRealRateLimiter(undefined)).toBe(false);
    });

    it('identifies real infrastructure security service as production ready', () => {
      const realSecurityService = new SecurityService(undefined, { signingSecret: csrfSigningSecret });
      expect(SecurityValidator.isRealSecurityService(realSecurityService)).toBe(true);
      expect(realSecurityService.isProductionReady).toBe(true);
      expect(realSecurityService.kind).toBe('real');
    });

    it('identifies stub or static demo token security service as non-production ready', () => {
      const stubSecurityService = new StubSecurityService();
      expect(SecurityValidator.isRealSecurityService(stubSecurityService)).toBe(false);
      expect(SecurityValidator.isRealSecurityService(null)).toBe(false);
      expect(SecurityValidator.isRealSecurityService(undefined)).toBe(false);
    });

    it('allows startup in non-production environments with any implementation', () => {
      const devEnv = { NODE_ENV: 'development' };
      expect(() => {
        SecurityValidator.assertProductionSecurity(devEnv, new StubSecurityService(), new StubRateLimiter());
      }).not.toThrow();

      const testEnv = { NODE_ENV: 'test' };
      expect(() => {
        SecurityValidator.assertProductionSecurity(testEnv, null, null);
      }).not.toThrow();
    });

    it('fails startup in production environment when rate limiter is missing or demo', () => {
      const prodEnv = { NODE_ENV: 'production' };
      const realSecurityService = new SecurityService();

      expect(() => {
        SecurityValidator.assertProductionSecurity(prodEnv, realSecurityService, null);
      }).toThrow(/Rate limiting is missing or using a demo\/stub implementation/);

      expect(() => {
        SecurityValidator.assertProductionSecurity(prodEnv, realSecurityService, new StubRateLimiter());
      }).toThrow(/Rate limiting is missing or using a demo\/stub implementation/);
    });

    it('fails startup in production environment when CSRF service is missing or demo', () => {
      const prodEnv = { NODE_ENV: 'production' };
      const realRateLimiter = { consume: async () => ({ allowed: true, remaining: 1, resetTime: Date.now() }), isProductionReady: true, kind: 'real' as const };

      expect(() => {
        SecurityValidator.assertProductionSecurity(prodEnv, null, realRateLimiter);
      }).toThrow(/CSRF protection is missing or using a demo\/stub implementation/);

      expect(() => {
        SecurityValidator.assertProductionSecurity(prodEnv, new StubSecurityService(), realRateLimiter);
      }).toThrow(/CSRF protection is missing or using a demo\/stub implementation/);
    });

    it('passes production startup check when real rate limiter and CSRF service are provided', () => {
      const prodEnv = { NODE_ENV: 'production' };
      const realRateLimiter = { consume: async () => ({ allowed: true, remaining: 1, resetTime: Date.now() }), isProductionReady: true, kind: 'real' as const };
      const realSecurityService = new SecurityService(realRateLimiter, { signingSecret: csrfSigningSecret });

      expect(() => {
        SecurityValidator.assertProductionSecurity(prodEnv, realSecurityService, realRateLimiter);
      }).not.toThrow();
    });
  });

  describe('createApiApp Bootstrap Integration', () => {
    const validProdEnv = {
      NODE_ENV: 'production',
      ...testJwtEnv,
      JWT_ISSUER: 'manaratak-production-api',
      JWT_AUDIENCE: 'manaratak-production-browser',
      SESSION_SECRET: 'production-session-secret-must-be-very-long-32-chars',
      CSRF_SECRET: 'production-csrf-secret-must-be-very-long-32-chars-at-all',
      CORS_ORIGIN: 'https://app.manaratak.org',
      API_BASE_URL: 'https://api.manaratak.org',
      DATABASE_URL: 'postgresql://prod_user:secret@postgres.prod:5432/manaratak',
      REDIS_URL: 'redis://redis.prod:6379',
      ADMIN_AUTH_MODE: 'strict',
      SECURE_COOKIE: 'true',
      SECURITY_CSP_ENABLED: 'true',
      TRUST_PROXY_HOPS: '1',
      PUBLIC_WEB_URL: 'https://app.manaratak.org',
      ADMIN_WEB_URL: 'https://admin.manaratak.org',
      SECURITY_RATE_LIMIT_MAX: '100',
      SECURITY_RATE_LIMIT_WINDOW_MS: '60000',
      CERTIFICATE_COMPLETION_WORKER_ENABLED: 'true',
      CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS: '5000',
      STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED: 'true',
      STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS: '2000',
      OWNER_DOMAIN_OUTBOX_WORKER_ENABLED: 'true',
      OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS: '2000',
      BACKGROUND_WORKER_ENABLED: 'true',
      BACKGROUND_WORKER_INTERVAL_MS: '2000',
      BACKGROUND_WORKER_BATCH_SIZE: '10',
      BACKGROUND_WORKER_LEASE_MS: '60000',
      BACKGROUND_WORKER_HEARTBEAT_MS: '15000',
      BACKGROUND_RETENTION_CRON: '15 2 * * *',
      BACKGROUND_FINANCE_RECONCILIATION_CRON: '*/5 * * * *',
      BACKGROUND_AI_CRON: '* * * * *',
      BACKGROUND_IMPORT_CRON: '* * * * *',
      BACKGROUND_CMS_CRON: '* * * * *',
      BACKGROUND_NOTIFICATION_CRON: '* * * * *',
      NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR: '30',
      MANARATAK_ASSET_PROVIDER_BASE_URL: 'https://asset-provider.manaratak.internal/api/',
      MANARATAK_ASSET_PROVIDER_API_KEY: 'asset-provider-key',
      MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
      MANARATAK_IMPORT_RAW_RETENTION_DAYS: '365',
      FINANCE_PROVIDER_BASE_URL: 'https://finance-provider.manaratak.internal/api/',
      FINANCE_PROVIDER_API_KEY: 'finance-provider-key',
      FINANCE_PROVIDER_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
      FINANCE_PAYMENT_PROVIDER_KEY: 'payment-test',
      FINANCE_FX_PROVIDER_KEY: 'fx-test',
      FINANCE_BANK_PROVIDER_KEY: 'bank-test',
      NOTIFICATION_PROVIDER_BASE_URL: 'https://notification-provider.manaratak.internal/api/',
      NOTIFICATION_PROVIDER_API_KEY: 'notification-provider-key',
      NOTIFICATION_PROVIDER_SIGNING_SECRET: 'abcdef0123456789abcdef0123456789',
      OTEL_SERVICE_NAME: 'manaratak-api',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.manaratak.internal/v1/traces',
    };

    it('normal production composition selects a production-capable distributed limiter', () => {
      const fakeClient = {
        eval: async () => [1, 60_000],
        buildKey: (feature: string, key: string) => `mnr:${feature}:${key}`,
      };
      const limiter = createRateLimiterForRuntime(
        validProdEnv,
        undefined,
        (() => fakeClient as any) as any,
      );
      expect(limiter.isProductionReady).toBe(true);
      expect(limiter.kind).toBe('real');
    });

    it('fails production security validation when demo CSRF service is supplied', () => {
      expect(() => SecurityValidator.assertProductionSecurity(
        validProdEnv,
        new StubSecurityService(),
        { consume: async () => ({ allowed: true, remaining: 1, resetTime: Date.now() }), isProductionReady: true, kind: 'real' as const },
      )).toThrow(/CSRF protection is missing or using a demo\/stub implementation/);
    });

    it('fails production security validation when demo rate limiter is supplied', () => {
      expect(() => SecurityValidator.assertProductionSecurity(
        validProdEnv,
        new SecurityService(undefined, { signingSecret: csrfSigningSecret }),
        new StubRateLimiter(),
      )).toThrow(/Rate limiting is missing or using a demo\/stub implementation/);
    });

    it('fails production app creation when ProductionReadinessValidator reports blockers', async () => {
      await expect(
        createApiApp({
          resetCache: true,
          env: {
            ...validProdEnv,
            API_BASE_URL: 'http://localhost:3000',
          },
        })
      ).rejects.toThrow(/Configuration validation failed:[\s\S]*API_BASE_URL must be HTTPS/);
    });

    it('fails staging app creation when ProductionReadinessValidator reports blockers', async () => {
      await expect(
        createApiApp({
          resetCache: true,
          env: {
            ...validProdEnv,
            NODE_ENV: 'staging',
            API_BASE_URL: 'http://localhost:3000',
          },
        })
      ).rejects.toThrow(/Configuration validation failed:[\s\S]*API_BASE_URL must be HTTPS/);
    });

    it('includes blocker codes and area in startup error without leaking secrets', async () => {
      const secretToHide = 'my-super-secret-jwt-key-that-should-never-be-leaked-32-chars';
      try {
        await createApiApp({
          resetCache: true,
          env: {
            ...validProdEnv,
            SESSION_SECRET: secretToHide,
            API_BASE_URL: 'http://localhost:3000',
          },
        });
        expect.fail('Should have thrown startup error');
      } catch (err: any) {
        expect(err.message).toContain('Configuration validation failed');
        expect(err.message).toContain('API_BASE_URL must be HTTPS');
        expect(err.message).not.toContain(secretToHide);
      }
    });

    it('does not retain the removed SESSION_SECRET readiness requirement', () => {
      const { SESSION_SECRET, ...envWithoutSessionSecret } = validProdEnv;
      expect(() => loadAppConfig(envWithoutSessionSecret)).not.toThrow();
    });

    it('fails production app creation when CSRF_SECRET is missing', async () => {
      const { CSRF_SECRET, ...envWithoutCsrfSecret } = validProdEnv;
      await expect(
        createApiApp({
          resetCache: true,
          env: envWithoutCsrfSecret as any,
        })
      ).rejects.toThrow(/CSRF_SECRET is required in production\/staging/);
    });

    it('fails production app creation when CORS_ORIGIN is wildcard *', async () => {
      await expect(
        createApiApp({
          resetCache: true,
          env: {
            ...validProdEnv,
            CORS_ORIGIN: '*',
          },
        })
      ).rejects.toThrow(/CORS_ORIGIN/);
    });

    it('keeps production-only implementation checks disabled in development', () => {
      expect(() => SecurityValidator.assertProductionSecurity(
        { NODE_ENV: 'development' },
        new StubSecurityService(),
        new StubRateLimiter(),
      )).not.toThrow();
    });
  });

  describe('Admin Production Guard Behavior', () => {
    it('resolves strict mode in every environment and rejects legacy modes', () => {
      expect(SecurityMiddlewareFactory.resolveAdminAuthMode({ NODE_ENV: 'production', ADMIN_AUTH_MODE: 'strict' })).toBe('strict');
      expect(SecurityMiddlewareFactory.resolveAdminAuthMode({ NODE_ENV: 'development' })).toBe('strict');
      expect(SecurityMiddlewareFactory.resolveAdminAuthMode({ NODE_ENV: 'development', ADMIN_AUTH_MODE: 'strict' })).toBe('strict');
      expect(() => SecurityMiddlewareFactory.resolveAdminAuthMode({ NODE_ENV: 'development', ADMIN_AUTH_MODE: 'demo' })).toThrow(/Only persisted-RBAC strict mode is supported/i);
    });
  });
});
