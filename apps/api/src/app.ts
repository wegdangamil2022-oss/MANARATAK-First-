import * as awilix from 'awilix';
import { createVercelHttpHandler } from './infrastructure/runtime/VercelHttpHandler.js';
import { createPreviewAvailabilityApp, isProvisioningPreview } from './infrastructure/runtime/PreviewAvailabilityApp.js';
import express, { Router, Express, Request, Response } from 'express';
import * as path from 'path';
import { container, registerDependencies } from './infrastructure/di/container.js';
import { assertAssetSecurityProvidersForRuntime, assertImportRawSnapshotStoreForRuntime, createRateLimiterForRuntime, isDatabaseRequiredForRuntime } from './infrastructure/di/RuntimeDependencyPolicy.js';
import { 
  AsyncLogContext,
  PinoLoggerProvider,
  LoggerService,
  RequestLogger,
  ErrorLogger,
  DefaultErrorSerializer,
  MonitoringService,
  OtlpHttpMonitoringProvider,
  SecurityService,
  DatabaseHealthChecker,
  RedisHealthChecker
} from '@manaratak/infrastructure';
import { ConfigurationRegistry, EnvironmentLoader, EnvironmentConfigurationProvider, ProductionReadinessValidator, ZodEnvironmentValidator, loadAppConfig } from '@manaratak/config';
import { IConfigurationService, ILogger, ISecurityService, IMonitoringService, IRateLimiter, ITokenProvider, ISessionManager, HealthStatus } from '@manaratak/core';

class AppSecurityService extends SecurityService implements ISecurityService {}

class AppMonitoringService extends MonitoringService implements IMonitoringService {}
import { LoggingMiddleware } from './presentation/middleware/LoggingMiddleware.js';
import { GlobalExceptionHandler } from './presentation/middleware/GlobalExceptionHandler.js';
import { canonicalProblemDetailsMiddleware } from './presentation/middleware/CanonicalProblemDetailsMiddleware.js';
import { createCanonicalIdempotencyMiddleware } from './presentation/middleware/CanonicalIdempotencyMiddleware.js';
import { OptionalAuthMiddleware } from './presentation/middleware/OptionalAuthMiddleware.js';
import { ApiRouter } from './presentation/api/router/ApiRouter.js';
import { ResponseFormatter } from './presentation/api/response/ResponseFormatter.js';
import { MonitoringRouter } from './presentation/api/router/MonitoringRouter.js';
import { MonitoringMiddleware } from './presentation/monitoring/MonitoringMiddleware.js';
import { SecurityMiddlewareFactory } from './presentation/security/SecurityMiddlewareFactory.js';
import { SecurityValidator } from './presentation/security/SecurityValidator.js';
import { MutationAuditMiddleware } from './presentation/audit/MutationAuditMiddleware.js';
import { RuntimeResourceRegistry } from './infrastructure/runtime/RuntimeResourceRegistry.js';
import { buildCanonicalCorsOrigins } from './presentation/security/CanonicalApiCorsPolicy.js';

export interface CreateApiAppOptions {
  securityService?: ISecurityService;
  rateLimiter?: IRateLimiter;
  monitoringService?: IMonitoringService;
  env?: Record<string, string | undefined>;
  resetCache?: boolean;
  connectExternalServices?: boolean;
  databaseClient?: any;
}

let appInstance: Express | null = null;
let isBootstrapping = false;
let bootstrapPromise: Promise<Express> | null = null;

export async function createApiApp(options?: CreateApiAppOptions): Promise<Express> {
  const profile = options?.env ?? process.env;
  if (profile.MANARATAK_RUNTIME_PROFILE === 'google-ai-studio' || profile.MANARATAK_GOOGLE_AI_STUDIO === 'true') {
    throw new Error('AI_STUDIO_WEB_ONLY_BACKEND_DISABLED');
  }
  if (options?.resetCache || options?.env) {
    appInstance = null;
    bootstrapPromise = null;
    ConfigurationRegistry._reset();
  }

  if (appInstance) {
    return appInstance;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    let failedResources: RuntimeResourceRegistry | undefined;
    let failedMonitoring: OtlpHttpMonitoringProvider | undefined;
    try {
      const currentEnv: Record<string, string | undefined> = { ...(options?.env ?? process.env) };

      let url = currentEnv.DATABASE_URL;
      if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
        const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = currentEnv;
        if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
          const encodedPassword = encodeURIComponent(SQL_PASSWORD);
          url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
          currentEnv.DATABASE_URL = url;
        }
      }

      // Bootstrap Configuration First
      let config: IConfigurationService;
      try {
        config = ConfigurationRegistry.getInstance();
      } catch {
        const envProvider = new EnvironmentConfigurationProvider(currentEnv);
        const loader = new EnvironmentLoader([envProvider]);
        config = await ConfigurationRegistry.bootstrap(loader, new ZodEnvironmentValidator());
      }
      // Readiness consumes the same normalized AppConfig contract as runtime bootstrap.
      // This prevents boolean/number coercion or hidden raw-process.env requirements from drifting.
      const normalizedRuntimeConfig = loadAppConfig(currentEnv);
      const productionReadinessReport = ProductionReadinessValidator.validate(normalizedRuntimeConfig);

      const nodeEnv = config.getOptional<string>('NODE_ENV') || currentEnv.NODE_ENV;
      const isProductionOrStaging = nodeEnv === 'production' || nodeEnv === 'staging';
      const databaseRequired = isDatabaseRequiredForRuntime(currentEnv);

      if (databaseRequired && !currentEnv.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for this runtime mode');
      }

      if (isProductionOrStaging && (!productionReadinessReport.ready || productionReadinessReport.blockerCount > 0)) {
        const blockerDetails = productionReadinessReport.findings
          .filter(f => f.severity === 'BLOCKER')
          .map(f => `[${f.id}] ${f.area}: ${f.message}`)
          .join('; ');

        throw new Error(
          `Production readiness validation failed for environment '${nodeEnv}'. ` +
          `Found ${productionReadinessReport.blockerCount} blocker(s): ${blockerDetails}`
        );
      }

      // Bootstrap Logging
      const logContext = new AsyncLogContext();
      const pinoProvider = new PinoLoggerProvider({
        level: config.getOptional<string>('LOG_LEVEL') || currentEnv.LOG_LEVEL || 'info',
      });
      const logger = new LoggerService(pinoProvider, logContext, config);
      const runtimeResources = new RuntimeResourceRegistry(
        currentEnv,
        config,
        logger,
        options?.connectExternalServices !== false,
        options?.databaseClient,
      );
      failedResources = runtimeResources;

      const requestLogger = new RequestLogger(logger, logContext);
      const errorLogger = new ErrorLogger(logger, logContext);

      // Bootstrap Error Handling
      const errorSerializer = new DefaultErrorSerializer();
      const exceptionHandler = new GlobalExceptionHandler(logger, logContext, errorSerializer);

      // Presentation validation is enforced route-locally with strict Zod schemas.
      // The previously orphaned DtoValidationMiddleware bootstrap was retired.

      // Bootstrap Monitoring. Production/staging readiness already fails closed if the OTLP endpoint is absent.
      const monitoringProvider = currentEnv.OTEL_EXPORTER_OTLP_ENDPOINT
        ? new OtlpHttpMonitoringProvider({
            endpoint: currentEnv.OTEL_EXPORTER_OTLP_ENDPOINT,
            serviceName: currentEnv.OTEL_SERVICE_NAME || 'manaratak-api',
            environment: currentEnv.NODE_ENV || 'development',
            exportIntervalMs: Number(currentEnv.OTEL_EXPORT_INTERVAL_MS || 10_000),
            periodicExport: currentEnv.VERCEL !== '1',
            traceSampleRatio: Number(currentEnv.OTEL_TRACES_SAMPLER_RATIO ?? 1),
          })
        : undefined;
      failedMonitoring = monitoringProvider;
      const monitoringService = options?.monitoringService || new AppMonitoringService(monitoringProvider);

      // Bootstrap Security. Production rate limiting reuses the process-owned Redis client.
      const connectExternalServices = options?.connectExternalServices !== false;
      const sharedRedisClient = connectExternalServices ? runtimeResources.getRedisClient() : undefined;
      const rateLimiter = options?.rateLimiter || createRateLimiterForRuntime(currentEnv, logger, undefined, sharedRedisClient);
      const securityService = options?.securityService || new AppSecurityService(rateLimiter, {
        signingSecret: config.getOptional<string>('CSRF_SECRET') || currentEnv.CSRF_SECRET,
      });

      // Assert Production Security Guardrails
      SecurityValidator.assertProductionSecurity(currentEnv, securityService, rateLimiter);

    // Bootstrap API
    const apiRouter = new ApiRouter();
    const app = express();
    const trustProxyHops = Number(config.getOptional<string>('TRUST_PROXY_HOPS') || currentEnv.TRUST_PROXY_HOPS || 0);
    if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

    // Security Configuration
    const cspEnabled = config.getOptional<boolean>('SECURITY_CSP_ENABLED') === true;
    const corsOrigins = buildCanonicalCorsOrigins({
      corsOrigin: config.getOptional<string>('CORS_ORIGIN') || currentEnv.CORS_ORIGIN,
      publicWebUrl: config.getOptional<string>('PUBLIC_WEB_URL') || currentEnv.PUBLIC_WEB_URL,
      adminWebUrl: config.getOptional<string>('ADMIN_WEB_URL') || currentEnv.ADMIN_WEB_URL,
      additionalOrigins: config.getOptional<string>('SECURITY_CORS_ORIGINS') || currentEnv.SECURITY_CORS_ORIGINS,
    });
    if (corsOrigins.length === 0) corsOrigins.push('http://localhost:3000');
    const rateLimitMax = parseInt(config.getOptional<string>('SECURITY_RATE_LIMIT_MAX') || '100', 10);
    const rateLimitWindow = parseInt(config.getOptional<string>('SECURITY_RATE_LIMIT_WINDOW_MS') || '60000', 10);
    const adminAuthMode = SecurityMiddlewareFactory.resolveAdminAuthMode({
      NODE_ENV: config.getOptional<string>('NODE_ENV') || currentEnv.NODE_ENV,
      ADMIN_AUTH_MODE: config.getOptional<string>('ADMIN_AUTH_MODE') || currentEnv.ADMIN_AUTH_MODE,
    });
    // Security Middleware
    app.use(SecurityMiddlewareFactory.createSecurityHeaders({ enabled: cspEnabled }));
    app.use(SecurityMiddlewareFactory.createCors({ allowedOrigins: corsOrigins }));

    // Logging Middleware (Establishes AsyncLogContext early for all request phases)
    const loggingMiddleware = new LoggingMiddleware(logContext, requestLogger);
    app.use(loggingMiddleware.generate());

    app.use(SecurityMiddlewareFactory.createRateLimiter(securityService, { limit: rateLimitMax, windowMs: rateLimitWindow }));
    app.use(express.json({ limit: '256kb', strict: true }));
    app.use(SecurityMiddlewareFactory.createCsrfGuard(securityService));

    // Monitoring Middleware
    const monitoringMiddleware = new MonitoringMiddleware(monitoringService);
    app.use(monitoringMiddleware.generate());

    // Register DI Dependencies against the same process-owned resource registry.
    registerDependencies(currentEnv, config, runtimeResources);
    app.locals.runtimeResourceRegistry = runtimeResources;
    app.locals.monitoringProvider = monitoringProvider;
    container.register({ 
      monitoringService: awilix.asValue(monitoringService),
      securityService: awilix.asValue(securityService)
    });

    monitoringService.registerIndicator({
      name: 'runtime-lifecycle',
      isOptional: false,
      checkHealth: async () => ({
        status: runtimeResources.isShuttingDown() ? HealthStatus.DOWN : HealthStatus.UP,
        timestamp: new Date().toISOString(),
        ...(runtimeResources.isShuttingDown() ? { error: 'RUNTIME_SHUTTING_DOWN' } : {}),
        details: { capabilityStatus: runtimeResources.isShuttingDown() ? 'DRAINING' : 'AVAILABLE' },
      }),
    });

    monitoringService.registerIndicator({
      name: 'telemetry-exporter',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => monitoringProvider
        ? monitoringProvider.getReadiness()
        : ({ status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED, timestamp: new Date().toISOString(), error: 'OTEL_EXPORTER_NOT_CONFIGURED', details: { capabilityStatus: 'NOT_CONFIGURED' } }),
    });

    const describeRuntimeCapability = (provider: any): string => {
      if (!provider) return 'UNAVAILABLE';
      if (typeof provider.capabilityStatus === 'string') return provider.capabilityStatus;
      if (provider.isProductionReady === true) return 'PRODUCTION_CAPABLE';
      if (typeof provider.persistenceClassification === 'string') return provider.persistenceClassification;
      const name = String(provider.constructor?.name || '');
      if (/^Local|InMemory|Noop/i.test(name)) return 'LOCAL_ONLY';
      return 'CONFIGURED';
    };

    const assetRuntimeProviders = {
      storage: container.resolve<any>('assetStorageGateway'),
      malwareScanner: container.resolve<any>('assetMalwareScannerGateway'),
      sanitizer: container.resolve<any>('assetSanitizationGateway'),
    };

    // Production-like runtimes must never start with the deliberately unavailable
    // local/no-op asset security composition. This check happens before any DB connect.
    assertAssetSecurityProvidersForRuntime(currentEnv, assetRuntimeProviders);
    assertImportRawSnapshotStoreForRuntime(currentEnv, container.resolve<any>('importRawSnapshotStore'));

    // Establish Database Connection if available
    const databaseUrl = config.getOptional<string>('DATABASE_URL') || currentEnv.DATABASE_URL;
    if (databaseUrl || options?.databaseClient) {
      try {
        const prisma = options?.databaseClient ?? container.resolve<any>('prisma');
        if (connectExternalServices && typeof prisma?.$connect === 'function') await prisma.$connect();
        const dbHealthChecker = new DatabaseHealthChecker(prisma);
        monitoringService.registerIndicator({
          name: 'database',
          isOptional: false,
          checkHealth: async () => {
            return await dbHealthChecker.checkHealth();
          }
        });
      } catch (error: any) {
        logger.error("[Database] Could not connect to Prisma instance", error);
        if (databaseRequired) throw error;
        monitoringService.registerIndicator({
          name: 'database',
          isOptional: false,
          checkHealth: async () => ({
            status: HealthStatus.DOWN,
            timestamp: new Date().toISOString(),
            error: error?.message || 'Database connection failed'
          })
        });
      }
    } else {
      if (databaseRequired) throw new Error('DATABASE_URL is required for this runtime mode');
      monitoringService.registerIndicator({
        name: 'database',
        isOptional: false,
        checkHealth: async () => ({
          status: HealthStatus.DOWN,
          timestamp: new Date().toISOString(),
          error: 'DATABASE_URL is not configured'
        })
      });
    }

    monitoringService.registerIndicator({
      name: 'database-schema',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        try {
          const prisma = container.resolve<any>('prisma');
          const rows = await prisma.$queryRawUnsafe(
            'SELECT COUNT(*)::int AS "failedCount" FROM "_prisma_migrations" WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL',
          );
          const failedCount = Number(Array.isArray(rows) ? rows[0]?.failedCount ?? 0 : 0);
          const healthy = failedCount === 0;
          return {
            status: healthy ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
            timestamp: new Date().toISOString(),
            ...(!healthy ? { error: 'DATABASE_MIGRATION_HISTORY_HAS_INCOMPLETE_ENTRIES' } : {}),
            details: {
              capabilityStatus: healthy ? 'APPLIED_HISTORY_HEALTHY' : 'INCOMPLETE_MIGRATION_HISTORY',
              failedOrIncompleteMigrations: failedCount,
              scope: 'APPLIED_MIGRATION_HISTORY_ONLY',
            },
          };
        } catch (error: any) {
          return {
            status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED,
            timestamp: new Date().toISOString(),
            error: error?.message || 'DATABASE_MIGRATION_HISTORY_UNAVAILABLE',
            details: {
              capabilityStatus: 'MIGRATION_HISTORY_UNAVAILABLE',
              scope: 'APPLIED_MIGRATION_HISTORY_ONLY',
            },
          };
        }
      },
    });

    monitoringService.registerIndicator({
      name: 'asset-platform',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const capabilities = {
          storage: describeRuntimeCapability(assetRuntimeProviders.storage),
          malwareScanner: describeRuntimeCapability(assetRuntimeProviders.malwareScanner),
          sanitizer: describeRuntimeCapability(assetRuntimeProviders.sanitizer),
        };
        const unavailable = Object.values(capabilities).some((value) =>
          ['UNAVAILABLE', 'NOT_CONFIGURED', 'LOCAL_ONLY'].includes(value),
        );
        return {
          status: unavailable
            ? (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED)
            : HealthStatus.UP,
          timestamp: new Date().toISOString(),
          ...(unavailable ? { error: 'ASSET_RUNTIME_CAPABILITY_GAP' } : {}),
          details: {
            capabilityStatus: unavailable ? (isProductionOrStaging ? 'UNAVAILABLE' : 'DEVELOPMENT_ONLY') : 'AVAILABLE',
            ...capabilities,
          },
        };
      },
    });

    // Register Redis Health Indicator if available
    const redisUrl = config.getOptional<string>('REDIS_URL') || currentEnv.REDIS_URL;
    if (redisUrl) {
      try {
        const redisClient = container.resolve<any>('redisClient');
        if (!redisClient) throw new Error('REDIS_URL is required to create the canonical Redis runtime client.');
        const redisHealthChecker = new RedisHealthChecker(redisClient);
        
        monitoringService.registerIndicator({
          name: 'redis',
          isOptional: !isProductionOrStaging,
          checkHealth: async () => {
            return await redisHealthChecker.checkHealth();
          }
        });
      } catch (error: any) {
        if (currentEnv.NODE_ENV === 'production' || currentEnv.NODE_ENV === 'staging') {
          logger.fatal("[Redis] Production environment requires Redis for runtime state, but initialization failed.", error);
          throw new Error('Redis initialization failed in production environment: ' + (error?.message || 'Unknown error'));
        }
        
        logger.error("[Redis] Failed to initialize Redis client", error);
        monitoringService.registerIndicator({
          name: 'redis',
          isOptional: true,
          checkHealth: async () => ({
            status: HealthStatus.DEGRADED,
            timestamp: new Date().toISOString(),
            error: error?.message || 'Redis client initialization failed'
          })
        });
      }
    } else {
      monitoringService.registerIndicator({
        name: 'redis',
        isOptional: !isProductionOrStaging,
        checkHealth: async () => ({
          status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED,
          timestamp: new Date().toISOString(),
          error: 'REDIS_NOT_CONFIGURED',
          details: { capabilityStatus: 'NOT_CONFIGURED' }
        })
      });
    }

    const studentToolRateLimiter = container.resolve<any>('studentToolRateLimiter');
    monitoringService.registerIndicator({
      name: 'student-tools-quota',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const productionCapable = studentToolRateLimiter?.isProductionReady === true
          && studentToolRateLimiter?.capabilityStatus === 'PRODUCTION_CAPABLE';
        return {
          status: productionCapable ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
          timestamp: new Date().toISOString(),
          ...((isProductionOrStaging && !productionCapable) ? { error: 'STUDENT_TOOL_QUOTA_STORE_NOT_DISTRIBUTED' } : {}),
          details: { capabilityStatus: productionCapable ? 'PRODUCTION_CAPABLE' : 'DEVELOPMENT_ONLY' },
        };
      },
    });

    // Operational capability probes used by the Health & Readiness control plane.
    // These probes expose configuration/capability state only; they never return secrets.
    const importQueueGateway = container.resolve<any>('importQueueGateway');
    const importRawSnapshotStore = container.resolve<any>('importRawSnapshotStore');
    const sourceRegistryGateway = container.resolve<any>('sourceRegistryGateway');
    monitoringService.registerIndicator({
      name: 'import-foundation',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const queuePersistence = String(importQueueGateway?.persistenceClassification || describeRuntimeCapability(importQueueGateway));
        const snapshotCapability = describeRuntimeCapability(importRawSnapshotStore);
        const sourceRegistryCapability = describeRuntimeCapability(sourceRegistryGateway);
        const durableQueue = queuePersistence === 'DURABLE';
        const durableSnapshot = !['UNAVAILABLE', 'NOT_CONFIGURED', 'LOCAL_ONLY'].includes(snapshotCapability);
        const productionReady = durableQueue && durableSnapshot;
        const developmentOnly = !durableQueue || snapshotCapability === 'LOCAL_ONLY' || sourceRegistryCapability === 'LOCAL_ONLY';

        return {
          status: isProductionOrStaging
            ? (productionReady ? HealthStatus.UP : HealthStatus.DOWN)
            : (developmentOnly ? HealthStatus.DEGRADED : HealthStatus.UP),
          timestamp: new Date().toISOString(),
          ...((isProductionOrStaging && !productionReady) ? { error: 'IMPORT_RUNTIME_NOT_PRODUCTION_READY' } : {}),
          details: {
            capabilityStatus: productionReady ? 'AVAILABLE' : (developmentOnly ? 'DEVELOPMENT_ONLY' : 'NOT_CONFIGURED'),
            queuePersistence,
            snapshotCapability,
            sourceRegistryCapability,
          },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'admin-auth',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const strict = adminAuthMode === 'strict';
        return {
          status: strict ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
          timestamp: new Date().toISOString(),
          ...(!strict ? { error: 'ADMIN_AUTH_NOT_STRICT' } : {}),
          details: {
            capabilityStatus: strict ? 'AVAILABLE' : 'DEVELOPMENT_ONLY',
            mode: adminAuthMode,
            sessionPersistence: 'PRISMA',
          },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'ai-providers',
      isOptional: true,
      checkHealth: async () => {
        const registry = container.resolve<any>('aiProviderRegistry');
        const providers = typeof registry?.list === 'function' ? registry.list() : [];
        const statuses = providers.map((provider: any) =>
          typeof provider?.status === 'function' ? String(provider.status()) : 'NOT_CONFIGURED',
        );
        const ready = statuses.filter((status: string) => status === 'READY').length;
        const runtimePending = statuses.filter((status: string) => status === 'RUNTIME_PENDING').length;
        const degraded = statuses.filter((status: string) => status === 'DEGRADED').length;
        const unavailable = statuses.filter((status: string) => status === 'UNAVAILABLE').length;
        const notConfigured = statuses.filter((status: string) => status === 'NOT_CONFIGURED').length;
        const capabilityStatus = ready > 0 ? 'AVAILABLE' : runtimePending > 0 ? 'RUNTIME_PENDING' : 'NOT_CONFIGURED';
        return {
          status: ready > 0 ? HealthStatus.UP : HealthStatus.DEGRADED,
          timestamp: new Date().toISOString(),
          ...(ready === 0 ? { error: runtimePending > 0 ? 'AI_PROVIDER_RUNTIME_PENDING' : 'AI_PROVIDER_NOT_CONFIGURED' } : {}),
          details: {
            capabilityStatus,
            providerCount: providers.length,
            ready,
            runtimePending,
            degraded,
            unavailable,
            notConfigured,
          },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'payment-gateway',
      isOptional: true,
      checkHealth: async () => {
        const providerKey = String(currentEnv.FINANCE_PAYMENT_PROVIDER_KEY || 'PRIMARY_PAYMENT').trim();
        const registry = container.resolve<any>('financePaymentGatewayRegistry');
        const provider = typeof registry?.get === 'function' ? registry.get(providerKey) : null;
        const configured = Boolean(provider && typeof provider.isConfigured === 'function' && provider.isConfigured());
        const capabilityStatus = provider && typeof provider.runtimeStatus === 'function'
          ? String(provider.runtimeStatus())
          : (configured ? 'RUNTIME_PENDING' : 'NOT_CONFIGURED');
        const ready = configured && capabilityStatus === 'READY';
        return {
          status: ready ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
          timestamp: new Date().toISOString(),
          ...(!ready ? { error: configured ? 'PAYMENT_PROVIDER_RUNTIME_NOT_READY' : 'PAYMENT_PROVIDER_NOT_CONFIGURED' } : {}),
          details: { capabilityStatus, providerConfigured: configured, providerKey },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'notifications',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const intentRepo = container.resolve<any>('notificationIntentRepo');
        const templateRepo = container.resolve<any>('notificationTemplateRepo');
        const preferenceGateway = container.resolve<any>('notificationPrefGateway');
        const deliveryGateway = container.resolve<any>('notificationDeliveryGateway');
        const persistence = describeRuntimeCapability(intentRepo);
        const templates = describeRuntimeCapability(templateRepo);
        const preferences = describeRuntimeCapability(preferenceGateway);
        const provider = describeRuntimeCapability(deliveryGateway);
        const backgroundWorkerEnabled = config.getOptional<boolean>('BACKGROUND_WORKER_ENABLED') === true;
        const deliveryCadenceConfigured = Boolean(config.getOptional<string>('BACKGROUND_NOTIFICATION_CRON'));
        const durable = !['UNAVAILABLE', 'NOT_CONFIGURED', 'LOCAL_ONLY'].includes(persistence)
          && !['UNAVAILABLE', 'NOT_CONFIGURED', 'LOCAL_ONLY'].includes(templates);
        const providerReady = provider === 'PRODUCTION_CAPABLE';
        const available = durable && providerReady && backgroundWorkerEnabled && deliveryCadenceConfigured;
        return {
          status: available ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
          timestamp: new Date().toISOString(),
          ...(!available ? { error: 'NOTIFICATION_RUNTIME_NOT_READY' } : {}),
          details: {
            capabilityStatus: available ? 'PRODUCTION_CAPABLE' : (durable ? 'RUNTIME_PENDING' : 'NOT_CONFIGURED'),
            persistence,
            templates,
            preferences,
            provider,
            backgroundWorkerEnabled,
            deliveryCadenceConfigured,
          },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'polling-workers',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const registry = container.resolve<any>('pollingWorkerRuntimeRegistry');
        const now = Date.now();
        const configured = {
          certificateCompletion: config.getOptional<boolean>('CERTIFICATE_COMPLETION_WORKER_ENABLED') === true,
          studentWorkspace: config.getOptional<boolean>('STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED') === true,
          ownerDomainOutbox: config.getOptional<boolean>('OWNER_DOMAIN_OUTBOX_WORKER_ENABLED') === true,
        };
        const decorate = (name: string) => {
          const snapshot = registry?.snapshot?.(name) ?? { state: 'STOPPED' };
          const lastSuccessAt = snapshot.lastSuccessAt ? Date.parse(snapshot.lastSuccessAt) : NaN;
          return {
            ...snapshot,
            lastSuccessLagMs: Number.isFinite(lastSuccessAt) ? Math.max(0, now - lastSuccessAt) : null,
          };
        };
        const workers = {
          certificateCompletion: decorate('certificate-completion'),
          studentWorkspace: decorate('student-workspace-outbox'),
          ownerDomainOutbox: decorate('owner-domain-outbox'),
        };
        const expectedNames = Object.entries(configured).filter(([, enabled]) => enabled).map(([name]) => name);
        const unavailable = expectedNames.filter((name) => workers[name as keyof typeof workers].state === 'STOPPED');
        const degraded = expectedNames.filter((name) => workers[name as keyof typeof workers].state === 'DEGRADED');
        const allConfigured = Object.values(configured).every(Boolean);
        const healthy = allConfigured && unavailable.length === 0 && degraded.length === 0;
        return {
          status: healthy ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
          timestamp: new Date().toISOString(),
          ...(!healthy ? { error: unavailable.length ? 'POLLING_WORKER_STOPPED' : 'POLLING_WORKER_DEGRADED' } : {}),
          details: {
            capabilityStatus: healthy ? 'PRODUCTION_CAPABLE' : 'RUNTIME_PENDING',
            configured,
            workers,
          },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'background-jobs',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const repository = container.resolve<any>('bgJobRepo');
        const execution = container.resolve<any>('bgJobGateway');
        const runtimeState = container.resolve<any>('backgroundWorkerRuntimeState');
        const repositoryStatus = describeRuntimeCapability(repository);
        const executionStatus = describeRuntimeCapability(execution);
        const workerEnabled = config.getOptional<boolean>('BACKGROUND_WORKER_ENABLED') === true;
        const durable = repository?.persistenceClassification === 'DURABLE'
          && execution?.persistenceClassification === 'DURABLE'
          && execution?.capabilityStatus === 'PRODUCTION_CAPABLE';
        let queueSnapshot: any = null;
        let queueError: string | undefined;
        try {
          queueSnapshot = typeof execution?.getOperationalSnapshot === 'function'
            ? await execution.getOperationalSnapshot()
            : null;
        } catch (error: any) {
          queueError = error?.message || 'BACKGROUND_JOB_QUEUE_HEALTH_FAILED';
        }
        const runtimeSnapshot = runtimeState?.snapshot?.() ?? { state: 'STOPPED' };
        const available = durable && workerEnabled && !queueError && runtimeSnapshot.state !== 'STOPPED';
        return {
          status: available ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
          timestamp: new Date().toISOString(),
          ...(!available ? { error: queueError || (!workerEnabled ? 'BACKGROUND_WORKER_DISABLED' : 'BACKGROUND_JOB_RUNTIME_NOT_READY') } : {}),
          details: {
            capabilityStatus: available ? 'PRODUCTION_CAPABLE' : (durable ? 'RUNTIME_PENDING' : 'NOT_CONFIGURED'),
            repository: repositoryStatus,
            execution: executionStatus,
            persistence: execution?.persistenceClassification,
            workerEnabled,
            worker: runtimeSnapshot,
            queue: queueSnapshot,
          },
        };
      },
    });

    monitoringService.registerIndicator({
      name: 'public-web',
      isOptional: !isProductionOrStaging,
      checkHealth: async () => {
        const target = String(currentEnv.PUBLIC_WEB_URL || currentEnv.CORS_ORIGIN || '').trim();
        if (!target) {
          return {
            status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED,
            timestamp: new Date().toISOString(),
            error: 'PUBLIC_WEB_URL_NOT_CONFIGURED',
            details: { capabilityStatus: 'NOT_CONFIGURED' },
          };
        }

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return {
            status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED,
            timestamp: new Date().toISOString(),
            error: 'PUBLIC_WEB_URL_INVALID',
            details: { capabilityStatus: 'INVALID_CONFIGURATION' },
          };
        }
        if (!['http:', 'https:'].includes(parsed.protocol) || (isProductionOrStaging && parsed.protocol !== 'https:')) {
          return {
            status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED,
            timestamp: new Date().toISOString(),
            error: 'PUBLIC_WEB_URL_PROTOCOL_NOT_ALLOWED',
            details: { capabilityStatus: 'INVALID_CONFIGURATION', protocol: parsed.protocol },
          };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const startedAt = Date.now();
        try {
          const response = await fetch(parsed.toString(), { method: 'HEAD', redirect: 'manual', signal: controller.signal });
          const latencyMs = Date.now() - startedAt;
          const reachable = response.status >= 200 && response.status < 500;
          return {
            status: reachable ? HealthStatus.UP : (isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED),
            timestamp: new Date().toISOString(),
            ...(!reachable ? { error: `PUBLIC_WEB_HTTP_${response.status}` } : {}),
            details: {
              capabilityStatus: reachable ? 'REACHABLE' : 'UNREACHABLE',
              latencyMs,
              httpStatus: response.status,
            },
          };
        } catch (error: any) {
          return {
            status: isProductionOrStaging ? HealthStatus.DOWN : HealthStatus.DEGRADED,
            timestamp: new Date().toISOString(),
            error: error?.name === 'AbortError' ? 'PUBLIC_WEB_PROBE_TIMEOUT' : (error?.message || 'PUBLIC_WEB_PROBE_FAILED'),
            details: { capabilityStatus: 'UNREACHABLE', latencyMs: Date.now() - startedAt },
          };
        } finally {
          clearTimeout(timeout);
        }
      },
    });

    // Define API v1 Router
    const v1Router = Router();
    v1Router.use(canonicalProblemDetailsMiddleware);

    // Register versioned routes

    const lazyRouter = (name: string) => {
      let cachedRouter: Router | null = null;
      return (req: Request, res: Response, next: (err?: any) => void) => {
        if (!cachedRouter) {
          try {
            cachedRouter = container.resolve<Router>(name);
          } catch (err) {
            return next(err);
          }
        }
        return cachedRouter(req, res, next);
      };
    };

    // 1. Core Required Routers (Eager) - Phase 3 Core Infrastructure & Audit
    const auditRecordRepository = container.resolve<any>('auditRecordRepo');
    v1Router.use('/auth', new MutationAuditMiddleware(auditRecordRepository, 'AUTH').generate(), container.resolve<Router>('authRouter'));

    // Admin Security Middleware
    const adminTokenProvider = container.resolve<ITokenProvider>('tokenProvider');
    const adminSessionManager = container.resolve<ISessionManager>('sessionManager');
    const principalAccessValidator = container.resolve<any>('principalAccessValidator');
    v1Router.use('/admin', SecurityMiddlewareFactory.createAdminGuard({
      mode: adminAuthMode,
      tokenProvider: adminTokenProvider,
      sessionManager: adminSessionManager,
      principalAccessValidator,
    }));
    const apiIdempotencyStore = container.resolve<any>('apiIdempotencyStore');
    v1Router.use('/admin', createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true }));
    v1Router.use('/admin', new MutationAuditMiddleware(auditRecordRepository, 'ADMIN').generate());
    const requireAdminPermission = SecurityMiddlewareFactory.createAdminPermissionGuard;

    // Core Admin Domain Routers (Identity & Audit)
    v1Router.use('/admin/identities', requireAdminPermission('admin:identities:manage'), container.resolve<Router>('identityRouter'));
    v1Router.use('/identities', SecurityMiddlewareFactory.createAdminGuard({ mode: adminAuthMode, tokenProvider: adminTokenProvider, sessionManager: adminSessionManager, principalAccessValidator }), createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true }), new MutationAuditMiddleware(auditRecordRepository, 'IDENTITY').generate(), requireAdminPermission('admin:identities:manage'), container.resolve<Router>('identityRouter'));

    v1Router.use('/admin/audit', requireAdminPermission('admin:audit:manage'), container.resolve<Router>('auditRouter'));
    v1Router.use('/audit', SecurityMiddlewareFactory.createAdminGuard({ mode: adminAuthMode, tokenProvider: adminTokenProvider, sessionManager: adminSessionManager, principalAccessValidator }), requireAdminPermission('admin:audit:manage'), container.resolve<Router>('auditRouter'));

    // 2. Active Phase 2-10 Domain Routers (Eager) - Phase 6-10 Roadmap Scope
    // Phase 6: Import Foundation & Assets
    // Static course-import operations MUST be mounted before the generic /admin/imports router.
    v1Router.use('/admin/imports/courses', requireAdminPermission('admin:imports:manage'), container.resolve<Router>('courseImportOperationsRouter'));
    v1Router.use('/admin/imports', requireAdminPermission('admin:imports:manage'), container.resolve<Router>('importAdminRouter'));
    v1Router.use('/admin/assets', requireAdminPermission('admin:assets:manage'), container.resolve<Router>('assetPlatformRouter'));

    // Phase 7: Reference Data & Academic Taxonomy
    v1Router.use('/admin/reference-data', requireAdminPermission('admin:reference-data:manage'), container.resolve<Router>('referenceDataAdminRouter'));
    v1Router.use('/reference-data', container.resolve<Router>('referenceDataPublicRouter'));
    // Study Destinations are an editorial/domain profile layered on canonical country references.
    // Authorization reuses the existing reference-data management capability without moving profile ownership into P7.
    v1Router.use('/admin/study-destinations', requireAdminPermission('admin:reference-data:manage'), container.resolve<Router>('studyDestinationAdminRouter'));
    v1Router.use('/study-destinations', container.resolve<Router>('studyDestinationPublicRouter'));
    v1Router.use('/admin/academic-taxonomy', requireAdminPermission('admin:academic-taxonomy:manage'), container.resolve<Router>('academicTaxonomyAdminRouter'));
    v1Router.use('/academic-taxonomy', container.resolve<Router>('academicTaxonomyPublicRouter'));

    // Phase 8: International Tests
    v1Router.use('/admin/international-tests', requireAdminPermission('admin:international-tests:manage'), container.resolve<Router>('internationalTestAdminRouter'));
    v1Router.use('/public/international-tests', container.resolve<Router>('internationalTestPublicRouter'));

    // Phase 9: University Platform (Preserved structure, no data import)
    v1Router.use('/admin/universities', requireAdminPermission('admin:universities:manage'), container.resolve<Router>('universityAdminRouter'));
    v1Router.use('/public/universities', container.resolve<Router>('universityPublicRouter'));

    // Phase 10: Major Platform
    v1Router.use('/admin/majors', requireAdminPermission('admin:majors:manage'), container.resolve<Router>('majorAdminRouter'));
    v1Router.use('/public/majors', container.resolve<Router>('majorPublicRouter'));

    // 3. Phase 5 enterprise control-plane services.
    // Legacy route locations are preserved for compatibility, but every mutation-capable
    // control-plane router is now inside the same strict auth + audit + RBAC boundary as /admin.
    const protectControlPlane = (permission: string, routerName: string) => [
      SecurityMiddlewareFactory.createAdminGuard({ mode: adminAuthMode, tokenProvider: adminTokenProvider, sessionManager: adminSessionManager, principalAccessValidator }),
      createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true }),
      new MutationAuditMiddleware(auditRecordRepository, 'CONTROL_PLANE').generate(),
      requireAdminPermission(permission),
      lazyRouter(routerName),
    ];

    v1Router.use('/admin/authorization', requireAdminPermission('admin:authorization:manage'), lazyRouter('authorizationAdminRouter'));
    v1Router.use('/authorization', ...protectControlPlane('admin:authorization:manage', 'authorizationRuntimeRouter'));
    v1Router.use('/admin/settings', requireAdminPermission('admin:settings:manage'), lazyRouter('settingsAdminRouter'));
    v1Router.use('/settings', ...protectControlPlane('admin:settings:manage', 'settingsRuntimeRouter'));
    v1Router.use('/files', ...protectControlPlane('admin:assets:manage', 'fileManagementRouter'));
    v1Router.use('/notifications', ...protectControlPlane('admin:platform:manage', 'notificationRouter'));
    v1Router.use('/search', lazyRouter('searchRouter'));
    v1Router.use('/cache', ...protectControlPlane('admin:platform:manage', 'cacheRouter'));
    v1Router.use('/background-jobs', ...protectControlPlane('admin:platform:manage', 'backgroundJobRouter'));
    v1Router.use('/workflows', ...protectControlPlane('admin:platform:manage', 'workflowRouter'));
    v1Router.use('/api-services', ...protectControlPlane('admin:platform:manage', 'apiFoundationRouter'));
    v1Router.use('/shared-components', ...protectControlPlane('admin:platform:manage', 'sharedComponentRouter'));
    v1Router.use('/enterprise-events', ...protectControlPlane('admin:platform:manage', 'enterpriseEventRouter'));

    // 4. Future Phase 11+ Routers (Lazy) - Post-Phase-10 Extensions
    v1Router.use('/admin/scholarships', requireAdminPermission('admin:scholarships:manage'), lazyRouter('scholarshipAdminRouter'));
    v1Router.use('/public/scholarships', lazyRouter('scholarshipPublicRouter'));
    // Static /imported must be registered before /admin/courses/:id can match "imported".
    v1Router.use('/admin/courses/imported', requireAdminPermission('admin:courses:manage'), lazyRouter('importedCourseAdminRouter'));
    v1Router.use('/admin/courses', requireAdminPermission('admin:courses:manage'), lazyRouter('courseAdminRouter'));
    v1Router.use('/public/courses', lazyRouter('coursePublicRouter'));
    v1Router.use('/public/graph', lazyRouter('crossDomainReadModelRouter'));
    v1Router.use('/student/courses', lazyRouter('courseLearnerRouter'));
    // Phase 14 W10: authenticated admin boundary is inherited from /admin;
    // CertificateAdminRouter applies fine-grained view/author/checker/lifecycle/issuer permissions per route.
    v1Router.use('/admin/certificates', lazyRouter('certificateAdminRouter'));
    v1Router.use('/public/certificates', lazyRouter('certificatePublicRouter'));
    v1Router.use('/student', lazyRouter('studentWorkspaceRouter'));
    v1Router.use('/admin/students', requireAdminPermission('admin:students:support'), lazyRouter('studentSupportAdminRouter'));
    v1Router.use('/admin/student-tools', requireAdminPermission('admin:student-tools:manage'), lazyRouter('studentToolsAdminRouter'));
    v1Router.use(
      '/public/student-tools',
      new OptionalAuthMiddleware(adminTokenProvider, adminSessionManager, principalAccessValidator).generate(),
      lazyRouter('studentToolsPublicRouter'),
    );
    v1Router.use('/admin/cms', requireAdminPermission('admin:cms:manage'), lazyRouter('cmsAdminRouter'));
    v1Router.use('/public/cms', lazyRouter('cmsPublicRouter'));
    v1Router.use('/admin/services', requireAdminPermission('admin:services:manage'), lazyRouter('serviceAdminRouter'));
    v1Router.use('/public/services', lazyRouter('servicePublicRouter'));
    v1Router.use('/admin/finance', requireAdminPermission('admin:finance:manage'), lazyRouter('financeAdminRouter'));
    v1Router.use('/admin/careers', requireAdminPermission('admin:careers:manage'), lazyRouter('careerAdminRouter'));
    v1Router.use('/public/careers', lazyRouter('careerPublicRouter'));
    // Phase 17 privileged operator gateway. Canonical Admin path inherits the
    // strict /admin auth + mutation-audit boundary; the legacy /ai alias keeps
    // compatibility but composes the same explicit control-plane boundary.
    v1Router.use('/admin/ai/operator', requireAdminPermission('admin:ai:manage'), lazyRouter('aiGatewayRouter'));
    v1Router.use('/ai', ...protectControlPlane('admin:ai:manage', 'aiGatewayRouter'));
    v1Router.use('/admin/ai', requireAdminPermission('admin:ai:manage'), lazyRouter('aiAdminRouter'));

    // Public monitoring exposes only liveness/readiness health contracts. The richer
    // diagnostic and production-readiness payload is control-plane data and stays
    // behind the authenticated admin + RBAC boundary.
    v1Router.use('/admin/monitoring', requireAdminPermission('admin:platform:manage'), MonitoringRouter.create({
      monitoringService,
      productionReadinessReport,
      runtimeMode: currentEnv.NODE_ENV || 'development',
      diagnosticsEnabled: true,
    }));
    v1Router.use('/monitoring', MonitoringRouter.create({
      monitoringService,
      runtimeMode: currentEnv.NODE_ENV || 'development',
    }));

    apiRouter.registerVersion('v1', v1Router);
    
    // Mount API Router on /api
    app.use('/api', apiRouter.getRouter());

    // Global Error Handler Middleware
    app.use(exceptionHandler.generate());

    appInstance = app;
    return app;
    } catch (err) {
      // A failed cold start can be retried on a warm Function instance.
      // Release partially initialized pools/timers before allowing that retry.
      try { await failedMonitoring?.shutdown(); } catch { /* preserve bootstrap error */ }
      try { await failedResources?.closeAll(); } catch { /* preserve bootstrap error */ }
      bootstrapPromise = null;
      throw err;
    }
  })();

  return bootstrapPromise;
}

// Vercel discovers src/app.ts. Traditional server.ts continues to use the factory.
export default createVercelHttpHandler(async () => isProvisioningPreview(process.env)
  ? createPreviewAvailabilityApp()
  : createApiApp());
