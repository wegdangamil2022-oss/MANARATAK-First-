import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return value;
}, z.boolean());

export const PRODUCTION_REQUIRED_CONFIG_KEYS = Object.freeze([
  'DATABASE_URL',
  'REDIS_URL',
  'API_BASE_URL',
  'CORS_ORIGIN',
  'PUBLIC_WEB_URL',
  'ADMIN_WEB_URL',
  'JWT_ACTIVE_KEY_ID',
  'JWT_PRIVATE_KEY_PEM',
  'JWT_PUBLIC_KEY_PEM',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'CSRF_SECRET',
  'SECURE_COOKIE',
  'TRUST_PROXY_HOPS',
  'SECURITY_CSP_ENABLED',
  'SECURITY_RATE_LIMIT_MAX',
  'SECURITY_RATE_LIMIT_WINDOW_MS',
  'ADMIN_AUTH_MODE',
  'CERTIFICATE_COMPLETION_WORKER_ENABLED',
  'CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS',
  'STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED',
  'STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS',
  'OWNER_DOMAIN_OUTBOX_WORKER_ENABLED',
  'OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS',
  'BACKGROUND_WORKER_ENABLED',
  'BACKGROUND_WORKER_INTERVAL_MS',
  'BACKGROUND_WORKER_BATCH_SIZE',
  'BACKGROUND_WORKER_LEASE_MS',
  'BACKGROUND_WORKER_HEARTBEAT_MS',
  'BACKGROUND_RETENTION_CRON',
  'BACKGROUND_FINANCE_RECONCILIATION_CRON',
  'BACKGROUND_AI_CRON',
  'BACKGROUND_IMPORT_CRON',
  'BACKGROUND_CMS_CRON',
  'BACKGROUND_NOTIFICATION_CRON',
  'MANARATAK_ASSET_PROVIDER_BASE_URL',
  'MANARATAK_ASSET_PROVIDER_API_KEY',
  'MANARATAK_ASSET_PROVIDER_SIGNING_SECRET',
  'MANARATAK_IMPORT_RAW_RETENTION_DAYS',
  'FINANCE_PROVIDER_BASE_URL',
  'FINANCE_PROVIDER_API_KEY',
  'FINANCE_PROVIDER_SIGNING_SECRET',
  'FINANCE_PAYMENT_PROVIDER_KEY',
  'FINANCE_FX_PROVIDER_KEY',
  'FINANCE_BANK_PROVIDER_KEY',
  'NOTIFICATION_PROVIDER_BASE_URL',
  'NOTIFICATION_PROVIDER_API_KEY',
  'NOTIFICATION_PROVIDER_SIGNING_SECRET',
  'NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
] as const);

const WEAK_SECRET_PATTERNS = [
  'dev-secret',
  'manaratak-local-development',
  'manaratak-session-secret',
  'manaratak-default-csrf-secret',
  'manaratak-admin-bearer-token',
  'change-me',
  'placeholder',
  '12345678',
  'default-secret',
  'short-secret',
];

function isWeakSecret(secret: string): boolean {
  const lower = secret.toLowerCase();
  return WEAK_SECRET_PATTERNS.some(pattern => lower.includes(pattern));
}

export const AppConfigSchema = z.preprocess((input) => {
  const env = (input && typeof input === 'object' ? input : {}) as Record<string, string | undefined>;
  const nodeEnv = env.NODE_ENV || 'development';
  const isProductionOrStaging = nodeEnv === 'production' || nodeEnv === 'staging';

  if (!isProductionOrStaging) {
    // In development and test environments, supply safe local defaults for missing values
    return {
      ...env,
      NODE_ENV: nodeEnv,
      DATABASE_URL: env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/manaratak_dev',
      REDIS_URL: env.REDIS_URL || 'redis://localhost:6379',
      REDIS_NAMESPACE: env.REDIS_NAMESPACE || 'manaratak:',
      JWT_ACTIVE_KEY_ID: env.JWT_ACTIVE_KEY_ID || 'dev-ephemeral',
      ACCESS_TOKEN_TTL_SECONDS: env.ACCESS_TOKEN_TTL_SECONDS || 900,
      SESSION_TTL_SECONDS: env.SESSION_TTL_SECONDS || 604800,
      SECURE_COOKIE: env.SECURE_COOKIE ?? false,
      CSRF_SECRET: env.CSRF_SECRET || 'dev-csrf-secret-at-least-32-chars-long',
      ADMIN_AUTH_MODE: env.ADMIN_AUTH_MODE || 'strict',
      JWT_ISSUER: env.JWT_ISSUER || 'manaratak-local',
      JWT_AUDIENCE: env.JWT_AUDIENCE || 'manaratak-local-clients',
      TRUST_PROXY_HOPS: env.TRUST_PROXY_HOPS || 0,
      SECURITY_CSP_ENABLED: env.SECURITY_CSP_ENABLED ?? true,
      SECURITY_RATE_LIMIT_MAX: env.SECURITY_RATE_LIMIT_MAX || 100,
      SECURITY_RATE_LIMIT_WINDOW_MS: env.SECURITY_RATE_LIMIT_WINDOW_MS || 60_000,
      PUBLIC_WEB_URL: env.PUBLIC_WEB_URL || 'http://localhost:3000',
      ADMIN_WEB_URL: env.ADMIN_WEB_URL || 'http://localhost:3001',
      CERTIFICATE_COMPLETION_WORKER_ENABLED: env.CERTIFICATE_COMPLETION_WORKER_ENABLED ?? false,
      CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS: env.CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS || 5_000,
      STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED: env.STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED ?? true,
      STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS: env.STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS || 2_000,
      OWNER_DOMAIN_OUTBOX_WORKER_ENABLED: env.OWNER_DOMAIN_OUTBOX_WORKER_ENABLED ?? true,
      OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS: env.OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS || 2_000,
      BACKGROUND_WORKER_ENABLED: env.BACKGROUND_WORKER_ENABLED ?? false,
      BACKGROUND_WORKER_INTERVAL_MS: env.BACKGROUND_WORKER_INTERVAL_MS || 2_000,
      BACKGROUND_WORKER_BATCH_SIZE: env.BACKGROUND_WORKER_BATCH_SIZE || 10,
      BACKGROUND_WORKER_LEASE_MS: env.BACKGROUND_WORKER_LEASE_MS || 60_000,
      BACKGROUND_WORKER_HEARTBEAT_MS: env.BACKGROUND_WORKER_HEARTBEAT_MS || 15_000,
      BACKGROUND_RETENTION_CRON: env.BACKGROUND_RETENTION_CRON || '15 2 * * *',
      BACKGROUND_FINANCE_RECONCILIATION_CRON: env.BACKGROUND_FINANCE_RECONCILIATION_CRON || '*/5 * * * *',
      BACKGROUND_AI_CRON: env.BACKGROUND_AI_CRON || '* * * * *',
      BACKGROUND_IMPORT_CRON: env.BACKGROUND_IMPORT_CRON || '* * * * *',
      BACKGROUND_CMS_CRON: env.BACKGROUND_CMS_CRON || '* * * * *',
      BACKGROUND_NOTIFICATION_CRON: env.BACKGROUND_NOTIFICATION_CRON || '* * * * *',
      NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR: env.NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR || 30,
    };
  }

  // In production and staging, DO NOT inject fallback defaults for critical runtime variables
  return {
    ...env,
    NODE_ENV: nodeEnv,
  };
}, z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  OTEL_SERVICE_NAME: z.string().min(1).default('manaratak-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORT_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).default(10_000),
  OTEL_TRACES_SAMPLER_RATIO: z.coerce.number().min(0).max(1).default(1),
  API_BASE_URL: z.string().url().optional(),
  PUBLIC_WEB_URL: z.string().url().optional(),
  ADMIN_WEB_URL: z.string().url().optional(),
  
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_NAMESPACE: z.string().default('manaratak:'),
  JWT_ACTIVE_KEY_ID: z.string().min(1).optional(),
  JWT_PRIVATE_KEY_PEM: z.string().optional(),
  JWT_PUBLIC_KEY_PEM: z.string().optional(),
  JWT_PREVIOUS_PUBLIC_KEYS_JSON: z.string().optional(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(900),
  SESSION_TTL_SECONDS: z.coerce.number().default(86400 * 7),
  SECURE_COOKIE: envBoolean.optional(),
  CSRF_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  JWT_ISSUER: z.string().min(3).optional(),
  JWT_AUDIENCE: z.string().min(3).optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).optional(),
  SECURITY_CSP_ENABLED: envBoolean.optional(),
  SECURITY_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(100_000).optional(),
  SECURITY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(86_400_000).optional(),
  CERTIFICATE_COMPLETION_WORKER_ENABLED: envBoolean.optional(),
  CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).optional(),
  STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED: envBoolean.optional(),
  STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).optional(),
  OWNER_DOMAIN_OUTBOX_WORKER_ENABLED: envBoolean.optional(),
  OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).optional(),
  BACKGROUND_WORKER_ENABLED: envBoolean.optional(),
  BACKGROUND_WORKER_INTERVAL_MS: z.coerce.number().int().min(1_000).max(300_000).optional(),
  BACKGROUND_WORKER_BATCH_SIZE: z.coerce.number().int().min(1).max(100).optional(),
  BACKGROUND_WORKER_LEASE_MS: z.coerce.number().int().min(5_000).max(3_600_000).optional(),
  BACKGROUND_WORKER_HEARTBEAT_MS: z.coerce.number().int().min(1_000).max(600_000).optional(),
  BACKGROUND_RETENTION_CRON: z.string().trim().min(9).max(128).optional(),
  BACKGROUND_FINANCE_RECONCILIATION_CRON: z.string().trim().min(9).max(128).optional(),
  BACKGROUND_AI_CRON: z.string().trim().min(9).max(128).optional(),
  BACKGROUND_IMPORT_CRON: z.string().trim().min(9).max(128).optional(),
  BACKGROUND_CMS_CRON: z.string().trim().min(9).max(128).optional(),
  BACKGROUND_NOTIFICATION_CRON: z.string().trim().min(9).max(128).optional(),
  MANARATAK_ASSET_PROVIDER_BASE_URL: z.string().url().optional(),
  MANARATAK_ASSET_PROVIDER_API_KEY: z.string().trim().min(1).optional(),
  MANARATAK_ASSET_PROVIDER_SIGNING_SECRET: z.string().min(32).optional(),
  MANARATAK_ASSET_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).optional(),
  MANARATAK_ASSET_PROVIDER_MAX_RESPONSE_BYTES: z.coerce.number().int().positive().max(134_217_728).optional(),
  MANARATAK_ASSET_PROVIDER_ALLOW_INSECURE_HTTP: envBoolean.optional(),
  MANARATAK_IMPORT_RAW_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).optional(),
  FINANCE_PAYMENT_PROVIDER_KEY: z.string().trim().min(1).max(128).optional(),
  FINANCE_FX_PROVIDER_KEY: z.string().trim().min(1).max(128).optional(),
  FINANCE_BANK_PROVIDER_KEY: z.string().trim().min(1).max(128).optional(),
  FINANCE_PROVIDER_BASE_URL: z.string().url().optional(),
  FINANCE_PROVIDER_API_KEY: z.string().trim().min(1).optional(),
  FINANCE_PROVIDER_SIGNING_SECRET: z.string().min(32).optional(),
  FINANCE_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).optional(),
  FINANCE_PROVIDER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).optional(),
  FINANCE_PROVIDER_ALLOW_INSECURE_HTTP: envBoolean.optional(),
  NOTIFICATION_PROVIDER_BASE_URL: z.string().url().optional(),
  NOTIFICATION_PROVIDER_API_KEY: z.string().trim().min(1).optional(),
  NOTIFICATION_PROVIDER_SIGNING_SECRET: z.string().min(32).optional(),
  NOTIFICATION_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).optional(),
  NOTIFICATION_PROVIDER_ALLOW_INSECURE_HTTP: envBoolean.optional(),
  NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR: z.coerce.number().int().min(1).max(1_000).optional(),
  STORAGE_BASE_PATH: z.string().trim().min(1).default('./storage'),
  CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL: z.string().url().optional(),
  CERTIFICATE_SIGNING_KEY_REFERENCE: z.string().trim().min(1).optional(),
  CERTIFICATE_SIGNING_SECRET: z.string().optional(),
  ADMIN_AUTH_MODE: z.literal('strict').optional(),
}).passthrough().superRefine((data, ctx) => {
  const isProdOrStaging = data.NODE_ENV === 'production' || data.NODE_ENV === 'staging';

  if (isProdOrStaging) {
    // 1. DATABASE_URL
    if (!data.DATABASE_URL || data.DATABASE_URL.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL is required in production/staging',
        path: ['DATABASE_URL'],
      });
    } else {
      const dbUrl = data.DATABASE_URL.toLowerCase();
      if (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:') || dbUrl.includes('dev.db')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Local SQLite DATABASE_URL is strictly forbidden in production/staging',
          path: ['DATABASE_URL'],
        });
      }
    }

    // W3 provider-backed asset security and immutable import provenance are mandatory in production/staging.
    if (!data.MANARATAK_ASSET_PROVIDER_BASE_URL || !data.MANARATAK_ASSET_PROVIDER_BASE_URL.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MANARATAK_ASSET_PROVIDER_BASE_URL must be HTTPS in production/staging', path: ['MANARATAK_ASSET_PROVIDER_BASE_URL'] });
    }
    if (!data.MANARATAK_ASSET_PROVIDER_API_KEY) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MANARATAK_ASSET_PROVIDER_API_KEY is required in production/staging', path: ['MANARATAK_ASSET_PROVIDER_API_KEY'] });
    }
    if (!data.MANARATAK_ASSET_PROVIDER_SIGNING_SECRET || data.MANARATAK_ASSET_PROVIDER_SIGNING_SECRET.length < 32) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MANARATAK_ASSET_PROVIDER_SIGNING_SECRET must be at least 32 characters in production/staging', path: ['MANARATAK_ASSET_PROVIDER_SIGNING_SECRET'] });
    }
    if (!data.MANARATAK_IMPORT_RAW_RETENTION_DAYS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MANARATAK_IMPORT_RAW_RETENTION_DAYS is required in production/staging', path: ['MANARATAK_IMPORT_RAW_RETENTION_DAYS'] });
    }

    // 2. REDIS_URL — required for distributed production/staging rate limiting.
    if (!data.REDIS_URL || data.REDIS_URL.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'REDIS_URL is required in production/staging for distributed rate limiting',
        path: ['REDIS_URL'],
      });
    } else if (!data.REDIS_URL.startsWith('redis://') && !data.REDIS_URL.startsWith('rediss://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'REDIS_URL must start with redis:// or rediss://',
        path: ['REDIS_URL'],
      });
    }

    // 3. Asymmetric JWT key custody + short-lived access tokens
    if (!data.JWT_ACTIVE_KEY_ID || !/^[A-Za-z0-9._-]{1,128}$/.test(data.JWT_ACTIVE_KEY_ID)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_ACTIVE_KEY_ID must be a stable key identifier in production/staging',
        path: ['JWT_ACTIVE_KEY_ID'],
      });
    }
    if (!data.JWT_PRIVATE_KEY_PEM || !data.JWT_PRIVATE_KEY_PEM.includes('PRIVATE KEY')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_PRIVATE_KEY_PEM is required in production/staging',
        path: ['JWT_PRIVATE_KEY_PEM'],
      });
    }
    if (!data.JWT_PUBLIC_KEY_PEM || !data.JWT_PUBLIC_KEY_PEM.includes('PUBLIC KEY')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_PUBLIC_KEY_PEM is required in production/staging',
        path: ['JWT_PUBLIC_KEY_PEM'],
      });
    }
    if (data.ACCESS_TOKEN_TTL_SECONDS > 900) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ACCESS_TOKEN_TTL_SECONDS must not exceed 900 seconds',
        path: ['ACCESS_TOKEN_TTL_SECONDS'],
      });
    }

    // 4. CSRF_SECRET — active server-owned HMAC key for session-bound CSRF tokens.
    if (!data.CSRF_SECRET || data.CSRF_SECRET.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CSRF_SECRET is required in production/staging',
        path: ['CSRF_SECRET'],
      });
    } else if (data.CSRF_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CSRF_SECRET must be at least 32 characters long in production/staging',
        path: ['CSRF_SECRET'],
      });
    } else if (isWeakSecret(data.CSRF_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CSRF_SECRET uses a known insecure default or weak pattern in production/staging',
        path: ['CSRF_SECRET'],
      });
    }

    // 5. CORS_ORIGIN
    if (!data.CORS_ORIGIN || data.CORS_ORIGIN.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGIN is required in production/staging',
        path: ['CORS_ORIGIN'],
      });
    } else if (data.CORS_ORIGIN.trim() === '*') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGIN cannot be wildcard "*" in production/staging',
        path: ['CORS_ORIGIN'],
      });
    }

    // 7. Stable token claims and cookie/edge security controls
    if (!data.JWT_ISSUER || /(?:change-me|placeholder|example)/i.test(data.JWT_ISSUER)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_ISSUER must be a stable production identifier', path: ['JWT_ISSUER'] });
    }
    if (!data.JWT_AUDIENCE || /(?:change-me|placeholder|example)/i.test(data.JWT_AUDIENCE)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT_AUDIENCE must be a stable production identifier', path: ['JWT_AUDIENCE'] });
    }
    if (data.SECURE_COOKIE !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SECURE_COOKIE must be true in production/staging', path: ['SECURE_COOKIE'] });
    }
    if (data.TRUST_PROXY_HOPS === undefined || !Number.isInteger(data.TRUST_PROXY_HOPS) || data.TRUST_PROXY_HOPS < 1 || data.TRUST_PROXY_HOPS > 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TRUST_PROXY_HOPS must be between 1 and 3 in production/staging', path: ['TRUST_PROXY_HOPS'] });
    }
    if (data.SECURITY_CSP_ENABLED !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SECURITY_CSP_ENABLED must be true in production/staging', path: ['SECURITY_CSP_ENABLED'] });
    }
    if (!data.API_BASE_URL || !data.API_BASE_URL.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'API_BASE_URL must be HTTPS in production/staging', path: ['API_BASE_URL'] });
    }
    if (!data.PUBLIC_WEB_URL || !data.PUBLIC_WEB_URL.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PUBLIC_WEB_URL must be HTTPS in production/staging', path: ['PUBLIC_WEB_URL'] });
    }
    if (!data.ADMIN_WEB_URL || !data.ADMIN_WEB_URL.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ADMIN_WEB_URL must be HTTPS in production/staging', path: ['ADMIN_WEB_URL'] });
    }
    if (!Number.isInteger(data.SECURITY_RATE_LIMIT_MAX) || (data.SECURITY_RATE_LIMIT_MAX ?? 0) <= 0 || (data.SECURITY_RATE_LIMIT_MAX ?? 0) > 1000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SECURITY_RATE_LIMIT_MAX must be explicitly set to a bounded production value (1-1000)', path: ['SECURITY_RATE_LIMIT_MAX'] });
    }
    if (!Number.isInteger(data.SECURITY_RATE_LIMIT_WINDOW_MS) || (data.SECURITY_RATE_LIMIT_WINDOW_MS ?? 0) < 1_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'SECURITY_RATE_LIMIT_WINDOW_MS must be explicitly set in production/staging', path: ['SECURITY_RATE_LIMIT_WINDOW_MS'] });
    }
    if (data.CERTIFICATE_COMPLETION_WORKER_ENABLED !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CERTIFICATE_COMPLETION_WORKER_ENABLED must be true in production/staging', path: ['CERTIFICATE_COMPLETION_WORKER_ENABLED'] });
    }
    if (!Number.isInteger(data.CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS must be explicitly set in production/staging', path: ['CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS'] });
    }
    if (data.STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED must be true in production/staging', path: ['STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED'] });
    }
    if (!Number.isInteger(data.STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS must be explicitly set in production/staging', path: ['STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS'] });
    }
    if (data.OWNER_DOMAIN_OUTBOX_WORKER_ENABLED !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OWNER_DOMAIN_OUTBOX_WORKER_ENABLED must be true in production/staging', path: ['OWNER_DOMAIN_OUTBOX_WORKER_ENABLED'] });
    }
    if (!Number.isInteger(data.OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS must be explicitly set in production/staging', path: ['OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS'] });
    }
    if (data.BACKGROUND_WORKER_ENABLED !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_WORKER_ENABLED must be true in production/staging', path: ['BACKGROUND_WORKER_ENABLED'] });
    }
    if (!Number.isInteger(data.BACKGROUND_WORKER_INTERVAL_MS)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_WORKER_INTERVAL_MS must be explicitly set in production/staging', path: ['BACKGROUND_WORKER_INTERVAL_MS'] });
    }
    if (!Number.isInteger(data.BACKGROUND_WORKER_BATCH_SIZE)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_WORKER_BATCH_SIZE must be explicitly set in production/staging', path: ['BACKGROUND_WORKER_BATCH_SIZE'] });
    }
    if (!Number.isInteger(data.BACKGROUND_WORKER_LEASE_MS) || !Number.isInteger(data.BACKGROUND_WORKER_HEARTBEAT_MS) || Number(data.BACKGROUND_WORKER_HEARTBEAT_MS) >= Number(data.BACKGROUND_WORKER_LEASE_MS)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Background worker heartbeat must be explicitly configured below the lease duration', path: ['BACKGROUND_WORKER_HEARTBEAT_MS'] });
    }
    if (!data.BACKGROUND_RETENTION_CRON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_RETENTION_CRON must be explicitly configured in production/staging', path: ['BACKGROUND_RETENTION_CRON'] });
    }
    if (!data.BACKGROUND_FINANCE_RECONCILIATION_CRON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_FINANCE_RECONCILIATION_CRON must be explicitly configured in production/staging', path: ['BACKGROUND_FINANCE_RECONCILIATION_CRON'] });
    }
    if (!data.BACKGROUND_AI_CRON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_AI_CRON must be explicitly configured in production/staging', path: ['BACKGROUND_AI_CRON'] });
    }
    if (!data.BACKGROUND_IMPORT_CRON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_IMPORT_CRON must be explicitly configured in production/staging', path: ['BACKGROUND_IMPORT_CRON'] });
    }
    if (!data.BACKGROUND_CMS_CRON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_CMS_CRON must be explicitly configured in production/staging', path: ['BACKGROUND_CMS_CRON'] });
    }
    if (!data.BACKGROUND_NOTIFICATION_CRON) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'BACKGROUND_NOTIFICATION_CRON must be explicitly configured in production/staging', path: ['BACKGROUND_NOTIFICATION_CRON'] });
    }
    if (!Number.isInteger(data.NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR must be explicitly configured in production/staging', path: ['NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR'] });
    }

    for (const [key, value] of [
      ['FINANCE_PROVIDER_BASE_URL', data.FINANCE_PROVIDER_BASE_URL],
      ['FINANCE_PROVIDER_API_KEY', data.FINANCE_PROVIDER_API_KEY],
      ['FINANCE_PROVIDER_SIGNING_SECRET', data.FINANCE_PROVIDER_SIGNING_SECRET],
      ['FINANCE_PAYMENT_PROVIDER_KEY', data.FINANCE_PAYMENT_PROVIDER_KEY],
      ['FINANCE_FX_PROVIDER_KEY', data.FINANCE_FX_PROVIDER_KEY],
      ['FINANCE_BANK_PROVIDER_KEY', data.FINANCE_BANK_PROVIDER_KEY],
    ] as const) {
      if (!value || String(value).trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${key} is required in production/staging`, path: [key] });
      }
    }
    if (data.FINANCE_PROVIDER_BASE_URL && !data.FINANCE_PROVIDER_BASE_URL.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FINANCE_PROVIDER_BASE_URL must be HTTPS in production/staging', path: ['FINANCE_PROVIDER_BASE_URL'] });
    }
    if (data.FINANCE_PROVIDER_ALLOW_INSECURE_HTTP === true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'FINANCE_PROVIDER_ALLOW_INSECURE_HTTP is forbidden in production/staging', path: ['FINANCE_PROVIDER_ALLOW_INSECURE_HTTP'] });
    }

    for (const [key, value] of [
      ['NOTIFICATION_PROVIDER_BASE_URL', data.NOTIFICATION_PROVIDER_BASE_URL],
      ['NOTIFICATION_PROVIDER_API_KEY', data.NOTIFICATION_PROVIDER_API_KEY],
      ['NOTIFICATION_PROVIDER_SIGNING_SECRET', data.NOTIFICATION_PROVIDER_SIGNING_SECRET],
    ] as const) {
      if (!value || String(value).trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${key} is required in production/staging`, path: [key] });
      }
    }
    if (data.NOTIFICATION_PROVIDER_BASE_URL && !data.NOTIFICATION_PROVIDER_BASE_URL.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NOTIFICATION_PROVIDER_BASE_URL must be HTTPS in production/staging', path: ['NOTIFICATION_PROVIDER_BASE_URL'] });
    }
    if (data.NOTIFICATION_PROVIDER_ALLOW_INSECURE_HTTP === true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NOTIFICATION_PROVIDER_ALLOW_INSECURE_HTTP is forbidden in production/staging', path: ['NOTIFICATION_PROVIDER_ALLOW_INSECURE_HTTP'] });
    }

    if (!data.OTEL_EXPORTER_OTLP_ENDPOINT || !data.OTEL_EXPORTER_OTLP_ENDPOINT.startsWith('https://')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OTEL_EXPORTER_OTLP_ENDPOINT must be configured with HTTPS in production/staging', path: ['OTEL_EXPORTER_OTLP_ENDPOINT'] });
    }

    // 8. ADMIN_AUTH_MODE
    if (data.ADMIN_AUTH_MODE !== 'strict') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'ADMIN_AUTH_MODE must be strict in production/staging',
        path: ['ADMIN_AUTH_MODE'],
      });
    }

  }
}));

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadAppConfig(env: Record<string, string | undefined> = process.env): Readonly<AppConfig> {
  const result = AppConfigSchema.safeParse(env);
  if (!result.success) {
    const messages = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${messages}`);
  }
  return Object.freeze(result.data);
}
