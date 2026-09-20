import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { 
  AsyncLogContext, 
  PinoLoggerProvider, 
  LoggerService, 
  RequestLogger, 
  ErrorLogger,
  AuditSecretSanitizer 
} from '@manaratak/infrastructure';
import { 
  ConfigurationRegistry, 
  EnvironmentConfigurationProvider, 
  EnvironmentLoader, 
  ZodEnvironmentValidator, 
  ConfigurationService, 
  loadAppConfig 
} from '@manaratak/config';
import { LoggingMiddleware } from '../../src/presentation/middleware/LoggingMiddleware';
import { GlobalExceptionHandler } from '../../src/presentation/middleware/GlobalExceptionHandler';
import { DefaultErrorSerializer } from '@manaratak/infrastructure';

describe('WP1-C Foundations — Logging, Correlation & Configuration', () => {
  describe('1. Request Correlation Context (AsyncLogContext)', () => {
    it('retains correlation ID across nested async continuations', async () => {
      const logContext = new AsyncLogContext();
      const testId = 'corr-nested-12345';

      await logContext.runWithContext(testId, async () => {
        expect(logContext.getCorrelationId()).toBe(testId);

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(logContext.getCorrelationId()).toBe(testId);

        await Promise.resolve().then(() => {
          expect(logContext.getCorrelationId()).toBe(testId);
        });
      });

      expect(logContext.getCorrelationId()).toBeUndefined();
    });

    it('isolates correlation IDs across concurrent request contexts', async () => {
      const logContext = new AsyncLogContext();

      const runTask = async (id: string, delayMs: number) => {
        return logContext.runWithContext(id, async () => {
          const initial = logContext.getCorrelationId();
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          const final = logContext.getCorrelationId();
          return { initial, final };
        });
      };

      const [res1, res2] = await Promise.all([
        runTask('req-alpha-111', 25),
        runTask('req-beta-222', 10),
      ]);

      expect(res1.initial).toBe('req-alpha-111');
      expect(res1.final).toBe('req-alpha-111');

      expect(res2.initial).toBe('req-beta-222');
      expect(res2.final).toBe('req-beta-222');
    });

    it('replaces a client-provided correlation identifier with a server UUID', async () => {
      const logContext = new AsyncLogContext();
      const mockRequestLogger = {
        logRequest: vi.fn(),
        logResponse: vi.fn(),
      };
      const loggingMiddleware = new LoggingMiddleware(logContext, mockRequestLogger as any);

      const app = express();
      app.use(loggingMiddleware.generate());
      app.get('/test-correlation', (req: Request, res: Response) => {
        res.json({ currentCorrelationId: logContext.getCorrelationId() });
      });

      const incomingId = 'client-provided-correlation-999';
      const response = await request(app)
        .get('/test-correlation')
        .set('X-Correlation-ID', incomingId);

      expect(response.status).toBe(200);
      expect(response.headers['x-correlation-id']).not.toBe(incomingId);
      expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.currentCorrelationId).toBe(response.headers['x-correlation-id']);
    });

    it('generates secure UUID if no correlation header is supplied', async () => {
      const logContext = new AsyncLogContext();
      const mockRequestLogger = {
        logRequest: vi.fn(),
        logResponse: vi.fn(),
      };
      const loggingMiddleware = new LoggingMiddleware(logContext, mockRequestLogger as any);

      const app = express();
      app.use(loggingMiddleware.generate());
      app.get('/test-generated', (req: Request, res: Response) => {
        res.json({ correlationId: logContext.getCorrelationId() });
      });

      const response = await request(app).get('/test-generated');

      expect(response.status).toBe(200);
      const generatedId = response.headers['x-correlation-id'];
      expect(generatedId).toBeDefined();
      expect(generatedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(response.body.correlationId).toBe(generatedId);
    });
  });

  describe('2. Structured Logging & Secret Redaction', () => {
    it('redacts sensitive credentials, tokens, and secrets from log contexts', () => {
      const rawData = {
        username: 'john_doe',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret',
        jwt_secret: 'super-secret-key-32-chars-long-here',
        authorization: 'Bearer secret_access_token_xyz',
        headers: {
          'authorization': 'Bearer secret_token_abc',
          'cookie': 'session=secret_session_id',
          'content-type': 'application/json',
        },
        safeField: 'normal_data',
      };

      const sanitized = AuditSecretSanitizer.sanitize(rawData);

      expect(sanitized.username).toBe('john_doe');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.jwt_secret).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.headers.authorization).toBe('[REDACTED]');
      expect(sanitized.headers.cookie).toBe('[REDACTED]');
      expect(sanitized.headers['content-type']).toBe('application/json');
      expect(sanitized.safeField).toBe('normal_data');
    });

    it('formats structured log entries via PinoLoggerProvider', () => {
      const logs: any[] = [];
      const mockPinoInstance = {
        info: (payload: any, msg: string) => logs.push({ level: 'info', payload, msg }),
        error: (payload: any, msg: string) => logs.push({ level: 'error', payload, msg }),
        warn: (payload: any, msg: string) => logs.push({ level: 'warn', payload, msg }),
        debug: (payload: any, msg: string) => logs.push({ level: 'debug', payload, msg }),
        trace: (payload: any, msg: string) => logs.push({ level: 'trace', payload, msg }),
      };

      const provider = new PinoLoggerProvider(mockPinoInstance as any);
      const logContext = new AsyncLogContext();
      const logger = new LoggerService(provider, logContext);

      logContext.runWithContext('corr-structured-777', () => {
        logger.info('User logged in', { userId: 'usr_1', password: 'should_be_hidden' });
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].msg).toBe('User logged in');
      expect(logs[0].payload.correlationId).toBe('corr-structured-777');
      expect(logs[0].payload.context.userId).toBe('usr_1');
      expect(logs[0].payload.context.password).toBe('[REDACTED]');
    });

    it('prevents duplicate logging of exceptions', () => {
      const mockLogger = {
        error: vi.fn(),
      };
      const errorLogger = new ErrorLogger(mockLogger as any);
      const testErr = new Error('Test exception');

      errorLogger.logError(testErr, { detail: 'first' });
      errorLogger.logError(testErr, { detail: 'second' });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('propagates correlation ID in GlobalExceptionHandler', async () => {
      const logContext = new AsyncLogContext();
      const mockLogger = {
        error: vi.fn(),
      };
      const exceptionHandler = new GlobalExceptionHandler(
        mockLogger as any,
        logContext,
        new DefaultErrorSerializer()
      );

      const app = express();
      app.use((req, res, next) => {
        logContext.runWithContext('corr-error-handler-555', () => {
          next();
        });
      });
      app.get('/throw', () => {
        throw new Error('CRITICAL_FAILURE');
      });
      app.use(exceptionHandler.generate());

      const res = await request(app).get('/throw');

      expect(res.status).toBe(500);
      expect(res.body.traceId).toBe('corr-error-handler-555');
      expect(res.body.detail).toBe('An unexpected error occurred.');
      expect(JSON.stringify(res.body)).not.toContain('CRITICAL_FAILURE');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL_FAILURE'),
        expect.any(Error),
        expect.objectContaining({ traceId: 'corr-error-handler-555' })
      );
    });
  });

  describe('3. Authoritative Runtime Configuration', () => {
    beforeEach(() => {
      ConfigurationRegistry._reset();
    });

    it('parses types deterministically in ConfigurationService', () => {
      const rawConfig = {
        PORT: '3000',
        ENABLE_FEATURE: 'true',
        DISABLE_FEATURE: '0',
        STRICT_MODE: true,
        RETRY_COUNT: '5',
        SITE_TITLE: 'Manaratak',
      };

      const configService = new ConfigurationService(rawConfig);

      expect(configService.getString('SITE_TITLE')).toBe('Manaratak');
      expect(configService.getNumber('PORT')).toBe(3000);
      expect(configService.getNumber('RETRY_COUNT')).toBe(5);
      expect(configService.getBoolean('ENABLE_FEATURE')).toBe(true);
      expect(configService.getBoolean('DISABLE_FEATURE')).toBe(false);
      expect(configService.getBoolean('STRICT_MODE')).toBe(true);
    });

    it('provides safe dev defaults in development environment', () => {
      const env = { NODE_ENV: 'development' };
      const loaded = loadAppConfig(env);

      expect(loaded.NODE_ENV).toBe('development');
      expect(loaded.PORT).toBe(3000);
      expect(loaded.DATABASE_URL).toBe('postgresql://postgres:postgres@localhost:5432/manaratak_dev');
      expect(loaded.JWT_ACTIVE_KEY_ID).toBe('dev-ephemeral');
      expect(loaded.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    });

    it('fails fast on missing or weak secrets in production environment', () => {
      const invalidProdEnv = {
        NODE_ENV: 'production',
        PORT: '3000',
        // DATABASE_URL missing!
        // asymmetric JWT key material missing!
      };

      expect(() => loadAppConfig(invalidProdEnv)).toThrowError(/Configuration validation failed/);
    });

    it('succeeds in production when all required secrets are provided and strong', () => {
      const validProdEnv = {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: 'postgresql://prod_user:strongpass123@prod-db.cloud/manaratak',
        REDIS_URL: 'rediss://prod-redis.cloud:6379',
        JWT_ACTIVE_KEY_ID: 'prod-key',
        JWT_PRIVATE_KEY_PEM: '-----BEGIN ' + 'PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----',
        JWT_PUBLIC_KEY_PEM: '-----BEGIN PUBLIC KEY-----\npublic\n-----END PUBLIC KEY-----',
        ACCESS_TOKEN_TTL_SECONDS: '900',
        SESSION_SECRET: 'a-very-strong-production-session-secret-key-32-chars-minimum',
        CSRF_SECRET: 'a-very-strong-production-csrf-secret-key-32-chars-minimum',
        CORS_ORIGIN: 'https://app.manaratak.com',
        ADMIN_AUTH_MODE: 'strict',
        ADMIN_BEARER_TOKEN: 'a-very-strong-production-admin-bearer-token-32-chars-minimum',
        JWT_ISSUER: 'manaratak-production-api',
        JWT_AUDIENCE: 'manaratak-production-browser',
        SECURE_COOKIE: 'true',
        TRUST_PROXY_HOPS: '1',
        SECURITY_CSP_ENABLED: 'true',
        API_BASE_URL: 'https://api.manaratak.com',
        PUBLIC_WEB_URL: 'https://app.manaratak.com',
        ADMIN_WEB_URL: 'https://admin.manaratak.com',
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

      const loaded = loadAppConfig(validProdEnv);

      expect(loaded.NODE_ENV).toBe('production');
      expect(loaded.DATABASE_URL).toBe(validProdEnv.DATABASE_URL);
      expect(loaded.JWT_ACTIVE_KEY_ID).toBe(validProdEnv.JWT_ACTIVE_KEY_ID);
      expect(loaded.CORS_ORIGIN).toBe(validProdEnv.CORS_ORIGIN);
    });
  });
});
