import { loadAppConfig } from './AppConfig';

export type ProductionReadinessSeverity = 'BLOCKER' | 'WARNING' | 'INFO';

export interface ProductionReadinessFinding {
  readonly id: string;
  readonly severity: ProductionReadinessSeverity;
  readonly area: string;
  readonly message: string;
  readonly recommendation: string;
}

export interface ProductionReadinessReport {
  readonly ready: boolean;
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly checkedAt: string;
  readonly findings: readonly ProductionReadinessFinding[];
}

type RuntimeConfig = Record<string, unknown>;

/**
 * Production readiness consumes the same normalized AppConfig contract used by
 * runtime bootstrap. Callers may supply an already-normalized object; the
 * default path normalizes process.env first so boolean/number semantics cannot
 * diverge from AppConfig.
 */
export class ProductionReadinessValidator {
  public static validate(config: RuntimeConfig = loadAppConfig(process.env) as RuntimeConfig): ProductionReadinessReport {
    const findings: ProductionReadinessFinding[] = [];
    const nodeEnv = this.asString(config.NODE_ENV);
    const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

    if (!isProduction) {
      findings.push({
        id: 'runtime.non_production_mode', severity: 'INFO', area: 'Runtime',
        message: 'Runtime is not configured as production or staging.',
        recommendation: 'Set NODE_ENV=production or staging only in deployment environments.'
      });
    }

    this.validateAdminAccess(config, findings, isProduction);
    this.validateSecrets(config, findings, isProduction);
    this.validateUrls(config, findings, isProduction);
    this.validateSecurityControls(config, findings, isProduction);
    this.validateProviderDependencies(config, findings, isProduction);
    this.validateObservability(config, findings, isProduction);

    const blockerCount = findings.filter(finding => finding.severity === 'BLOCKER').length;
    const warningCount = findings.filter(finding => finding.severity === 'WARNING').length;
    return Object.freeze({
      ready: blockerCount === 0,
      blockerCount,
      warningCount,
      checkedAt: new Date().toISOString(),
      findings: Object.freeze(findings)
    });
  }

  private static validateAdminAccess(config: RuntimeConfig, findings: ProductionReadinessFinding[], isProduction: boolean): void {
    if (isProduction && this.asString(config.ADMIN_AUTH_MODE) !== 'strict') {
      findings.push({
        id: 'admin.strict_mode_required', severity: 'BLOCKER', area: 'Admin Security',
        message: 'Production admin access is not using strict mode.',
        recommendation: 'Set ADMIN_AUTH_MODE=strict and use authenticated identities with persisted RBAC assignments.'
      });
    }
  }

  private static validateSecrets(config: RuntimeConfig, findings: ProductionReadinessFinding[], isProduction: boolean): void {
    const keyId = this.asString(config.JWT_ACTIVE_KEY_ID);
    const privateKey = this.asString(config.JWT_PRIVATE_KEY_PEM);
    const publicKey = this.asString(config.JWT_PUBLIC_KEY_PEM);
    if (isProduction && (!keyId || !/^[A-Za-z0-9._-]{1,128}$/.test(keyId))) {
      findings.push({ id: 'auth.jwt_key_id_required', severity: 'BLOCKER', area: 'Authentication', message: 'JWT_ACTIVE_KEY_ID must identify the active asymmetric signing key.', recommendation: 'Configure a stable JWT_ACTIVE_KEY_ID and rotate keys by publishing overlapping public verification keys.' });
    }
    if (isProduction && (!privateKey || !privateKey.includes('PRIVATE KEY'))) {
      findings.push({ id: 'auth.jwt_private_key_required', severity: 'BLOCKER', area: 'Authentication', message: 'The RS256 private signing key is missing.', recommendation: 'Inject JWT_PRIVATE_KEY_PEM from deployment-managed secret custody; do not distribute it to verifiers.' });
    }
    if (isProduction && (!publicKey || !publicKey.includes('PUBLIC KEY'))) {
      findings.push({ id: 'auth.jwt_public_key_required', severity: 'BLOCKER', area: 'Authentication', message: 'The active RS256 public verification key is missing.', recommendation: 'Configure JWT_PUBLIC_KEY_PEM and publish the verifier key through the canonical JWKS endpoint.' });
    }
    const accessTokenTtl = this.asNumber(config.ACCESS_TOKEN_TTL_SECONDS);
    if (isProduction && (!Number.isInteger(accessTokenTtl) || accessTokenTtl! < 60 || accessTokenTtl! > 900)) {
      findings.push({ id: 'auth.access_token_ttl_invalid', severity: 'BLOCKER', area: 'Authentication', message: 'ACCESS_TOKEN_TTL_SECONDS must be between 60 and 900 seconds.', recommendation: 'Use short-lived access tokens with a maximum lifetime of 15 minutes.' });
    }
    if (isProduction && !this.isStrongSecret(config.CSRF_SECRET)) {
      findings.push({ id: 'auth.csrf_secret_weak', severity: 'BLOCKER', area: 'Authentication', message: 'CSRF_SECRET is missing, weak, or looks like a placeholder.', recommendation: 'Use a deployment-managed CSRF_SECRET with at least 32 high-entropy characters; rotation intentionally invalidates outstanding CSRF tokens.' });
    }
    if (isProduction && this.asBoolean(config.SECURE_COOKIE) !== true) {
      findings.push({ id: 'auth.insecure_cookie', severity: 'BLOCKER', area: 'Authentication', message: 'SECURE_COOKIE must be enabled in production.', recommendation: 'Set SECURE_COOKIE=true to ensure sessions are only transmitted over HTTPS.' });
    }
    if (isProduction && (!this.isStableIdentifier(config.JWT_ISSUER) || !this.isStableIdentifier(config.JWT_AUDIENCE))) {
      findings.push({ id: 'auth.jwt_claims_unconfigured', severity: 'BLOCKER', area: 'Authentication', message: 'JWT issuer and audience must be explicitly configured in production.', recommendation: 'Set stable deployment values for JWT_ISSUER and JWT_AUDIENCE.' });
    }
  }

  private static validateUrls(config: RuntimeConfig, findings: ProductionReadinessFinding[], isProduction: boolean): void {
    if (!isProduction) return;
    this.requireNonLocalUrl(config.DATABASE_URL, 'database.production_url', 'Database', 'DATABASE_URL', findings);
    if (!this.asString(config.REDIS_URL)) {
      findings.push({ id: 'redis.production_url_required', severity: 'BLOCKER', area: 'Redis', message: 'REDIS_URL is required for distributed production rate limiting and runtime state.', recommendation: 'Configure a managed Redis endpoint using redis:// or rediss:// before production startup.' });
    } else {
      this.requireNonLocalUrl(config.REDIS_URL, 'redis.production_url', 'Redis', 'REDIS_URL', findings);
    }
    if (!this.isHttpsUrl(config.API_BASE_URL)) {
      findings.push({ id: 'api.https_base_url_required', severity: 'BLOCKER', area: 'API', message: 'API_BASE_URL must be an HTTPS URL in production.', recommendation: 'Configure API_BASE_URL with the final public HTTPS API origin.' });
    }
    if (!this.isHttpsUrl(config.PUBLIC_WEB_URL)) {
      findings.push({ id: 'web.https_public_url_required', severity: 'BLOCKER', area: 'Web', message: 'PUBLIC_WEB_URL must be an HTTPS URL in production.', recommendation: 'Configure PUBLIC_WEB_URL with the final public web origin.' });
    }
    if (!this.isHttpsUrl(config.ADMIN_WEB_URL)) {
      findings.push({ id: 'admin.https_public_url_required', severity: 'BLOCKER', area: 'Admin', message: 'ADMIN_WEB_URL must be an HTTPS URL in production.', recommendation: 'Configure ADMIN_WEB_URL with the final admin web origin.' });
    }
    const corsOrigin = this.asString(config.CORS_ORIGIN);
    if (!this.isHttpsUrl(corsOrigin) || corsOrigin === '*') {
      findings.push({ id: 'cors.production_origin_required', severity: 'BLOCKER', area: 'CORS', message: 'CORS_ORIGIN must be a specific HTTPS origin in production.', recommendation: 'Configure CORS_ORIGIN with the exact production web origin and never use wildcard access.' });
    }
  }

  private static validateSecurityControls(config: RuntimeConfig, findings: ProductionReadinessFinding[], isProduction: boolean): void {
    if (!isProduction) return;
    if (this.asBoolean(config.SECURITY_CSP_ENABLED) !== true) {
      findings.push({ id: 'security.csp_disabled', severity: 'BLOCKER', area: 'HTTP Security', message: 'Content Security Policy is not explicitly enabled.', recommendation: 'Set SECURITY_CSP_ENABLED=true before public production launch.' });
    }
    const trustProxyHops = this.asNumber(config.TRUST_PROXY_HOPS);
    if (!Number.isInteger(trustProxyHops) || trustProxyHops! < 1 || trustProxyHops! > 3) {
      findings.push({ id: 'security.trust_proxy_unconfigured', severity: 'BLOCKER', area: 'HTTP Security', message: 'Trusted reverse-proxy hops are not explicitly bounded.', recommendation: 'Set TRUST_PROXY_HOPS to the exact number of managed proxy hops (1-3).' });
    }
    const rateLimitMax = this.asNumber(config.SECURITY_RATE_LIMIT_MAX);
    if (!Number.isFinite(rateLimitMax) || rateLimitMax! <= 0 || rateLimitMax! > 1000) {
      findings.push({ id: 'security.rate_limit_not_baselined', severity: 'WARNING', area: 'HTTP Security', message: 'Rate limit maximum is missing or too permissive.', recommendation: 'Set SECURITY_RATE_LIMIT_MAX to a bounded production value based on traffic expectations.' });
    }
    if (this.asBoolean(config.CERTIFICATE_COMPLETION_WORKER_ENABLED) !== true) {
      findings.push({ id: 'worker.certificate_completion_disabled', severity: 'BLOCKER', area: 'Workers', message: 'Certificate completion worker is disabled in production.', recommendation: 'Set CERTIFICATE_COMPLETION_WORKER_ENABLED=true and configure the canonical interval.' });
    }
    const workerInterval = this.asNumber(config.CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS);
    if (!Number.isInteger(workerInterval) || workerInterval! < 1_000 || workerInterval! > 300_000) {
      findings.push({ id: 'worker.certificate_completion_interval_invalid', severity: 'BLOCKER', area: 'Workers', message: 'Certificate completion worker interval is missing or outside the supported bounds.', recommendation: 'Set CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS between 1000 and 300000.' });
    }
    if (this.asBoolean(config.BACKGROUND_WORKER_ENABLED) !== true) {
      findings.push({ id: 'worker.background_disabled', severity: 'BLOCKER', area: 'Workers', message: 'The durable background worker is disabled in production.', recommendation: 'Set BACKGROUND_WORKER_ENABLED=true and deploy the PostgreSQL-backed worker lifecycle.' });
    }
    const backgroundInterval = this.asNumber(config.BACKGROUND_WORKER_INTERVAL_MS);
    const backgroundBatch = this.asNumber(config.BACKGROUND_WORKER_BATCH_SIZE);
    const backgroundLease = this.asNumber(config.BACKGROUND_WORKER_LEASE_MS);
    const backgroundHeartbeat = this.asNumber(config.BACKGROUND_WORKER_HEARTBEAT_MS);
    if (!Number.isInteger(backgroundInterval) || backgroundInterval! < 1_000 || backgroundInterval! > 300_000) {
      findings.push({ id: 'worker.background_interval_invalid', severity: 'BLOCKER', area: 'Workers', message: 'Background worker polling interval is invalid.', recommendation: 'Set BACKGROUND_WORKER_INTERVAL_MS between 1000 and 300000.' });
    }
    if (!Number.isInteger(backgroundBatch) || backgroundBatch! < 1 || backgroundBatch! > 100) {
      findings.push({ id: 'worker.background_batch_invalid', severity: 'BLOCKER', area: 'Workers', message: 'Background worker batch size is invalid.', recommendation: 'Set BACKGROUND_WORKER_BATCH_SIZE between 1 and 100.' });
    }
    if (!Number.isInteger(backgroundLease) || !Number.isInteger(backgroundHeartbeat) || backgroundLease! < 5_000 || backgroundHeartbeat! < 1_000 || backgroundHeartbeat! >= backgroundLease!) {
      findings.push({ id: 'worker.background_lease_invalid', severity: 'BLOCKER', area: 'Workers', message: 'Background worker lease/heartbeat fencing is invalid.', recommendation: 'Set a heartbeat interval below BACKGROUND_WORKER_LEASE_MS.' });
    }
    if (!this.asString(config.BACKGROUND_RETENTION_CRON)) {
      findings.push({ id: 'worker.retention_schedule_missing', severity: 'BLOCKER', area: 'Workers', message: 'The canonical retention sweep schedule is not configured.', recommendation: 'Configure BACKGROUND_RETENTION_CRON with a five-field UTC cron expression.' });
    }
  }

  private static validateProviderDependencies(config: RuntimeConfig, findings: ProductionReadinessFinding[], isProduction: boolean): void {
    if (!isProduction) return;
    if (!this.isHttpsUrl(config.MANARATAK_ASSET_PROVIDER_BASE_URL)) {
      findings.push({ id: 'provider.asset_https_required', severity: 'BLOCKER', area: 'Providers', message: 'The mandatory asset/import provider base URL is missing or is not HTTPS.', recommendation: 'Configure MANARATAK_ASSET_PROVIDER_BASE_URL with the authorized HTTPS provider endpoint.' });
    }
    if (!this.asString(config.MANARATAK_ASSET_PROVIDER_API_KEY)) {
      findings.push({ id: 'provider.asset_api_key_required', severity: 'BLOCKER', area: 'Providers', message: 'The mandatory asset/import provider API key is missing.', recommendation: 'Inject MANARATAK_ASSET_PROVIDER_API_KEY from deployment-managed secret custody.' });
    }
    if (!this.isStrongSecret(config.MANARATAK_ASSET_PROVIDER_SIGNING_SECRET)) {
      findings.push({ id: 'provider.asset_signing_secret_required', severity: 'BLOCKER', area: 'Providers', message: 'The provider signing secret is missing or weak.', recommendation: 'Inject a high-entropy MANARATAK_ASSET_PROVIDER_SIGNING_SECRET of at least 32 characters.' });
    }
    const retentionDays = this.asNumber(config.MANARATAK_IMPORT_RAW_RETENTION_DAYS);
    if (!Number.isInteger(retentionDays) || retentionDays! < 1 || retentionDays! > 3650) {
      findings.push({ id: 'provider.import_raw_retention_invalid', severity: 'BLOCKER', area: 'Providers', message: 'Import raw snapshot retention is not explicitly configured.', recommendation: 'Set MANARATAK_IMPORT_RAW_RETENTION_DAYS to the approved policy value (1-3650).' });
    }
  }

  private static validateObservability(config: RuntimeConfig, findings: ProductionReadinessFinding[], isProduction: boolean): void {
    if (!isProduction) return;
    if (!this.asString(config.OTEL_SERVICE_NAME)) {
      findings.push({ id: 'observability.service_name_missing', severity: 'BLOCKER', area: 'Observability', message: 'OTEL_SERVICE_NAME is not configured.', recommendation: 'Set OTEL_SERVICE_NAME to a stable service name for traces and metrics.' });
    }
    if (!this.isHttpsUrl(config.OTEL_EXPORTER_OTLP_ENDPOINT)) {
      findings.push({ id: 'observability.otlp_exporter_required', severity: 'BLOCKER', area: 'Observability', message: 'A production OTLP exporter endpoint is not configured over HTTPS.', recommendation: 'Set OTEL_EXPORTER_OTLP_ENDPOINT to the approved OpenTelemetry collector or managed telemetry gateway.' });
    }
    const logLevel = this.asString(config.LOG_LEVEL);
    if (logLevel === 'trace' || logLevel === 'debug') {
      findings.push({ id: 'observability.verbose_logging', severity: 'WARNING', area: 'Observability', message: 'Verbose logging is enabled in production.', recommendation: 'Use LOG_LEVEL=info, warn, or error for production deployments.' });
    }
  }

  private static requireNonLocalUrl(value: unknown, id: string, area: string, variableName: string, findings: ProductionReadinessFinding[]): void {
    const stringValue = this.asString(value);
    if (!stringValue || this.isLocalOrPlaceholderUrl(stringValue)) {
      findings.push({ id, severity: 'BLOCKER', area, message: `${variableName} is missing or points to a local/placeholder endpoint.`, recommendation: `Configure ${variableName} from the production secret manager or managed service connection settings.` });
    }
  }

  private static isStrongSecret(value: unknown): boolean {
    const stringValue = this.asString(value);
    if (!stringValue || stringValue.length < 32) return false;
    const lowerValue = stringValue.toLowerCase();
    return !['change-me', 'placeholder', 'password', 'local-env', 'demo-token'].some(token => lowerValue.includes(token));
  }

  private static isHttpsUrl(value: unknown): boolean {
    const stringValue = this.asString(value);
    if (!stringValue) return false;
    try { return new URL(stringValue).protocol === 'https:'; } catch { return false; }
  }

  private static isStableIdentifier(value: unknown): boolean {
    const stringValue = this.asString(value);
    return Boolean(stringValue && stringValue.length >= 3 && !/(?:change-me|placeholder|example)/i.test(stringValue));
  }

  private static isLocalOrPlaceholderUrl(value: string): boolean {
    const lowerValue = value.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', 'user:password', 'example.com'].some(token => lowerValue.includes(token))) return true;
    try {
      const parsedUrl = new URL(value);
      return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname);
    } catch { return true; }
  }

  private static asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private static asNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private static asBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : undefined;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
    }
    return undefined;
  }
}
