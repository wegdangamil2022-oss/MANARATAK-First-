import type {
  ScholarshipAllowedUrlScope,
  ScholarshipSourceConfiguration,
} from './ScholarshipSourceRegistryContracts';

export class ScholarshipSourceScopePolicy {
  static assertConfiguration(config: ScholarshipSourceConfiguration): void {
    this.requireText(config.sourceId, 'sourceId');
    this.requireText(config.sourceName, 'sourceName');

    if (config.acquisitionMode === 'MANUAL_FILE') {
      if (config.sourceType !== 'MANUAL_FILE') {
        throw new Error('SCHOLARSHIP_SOURCE_MANUAL_MODE_REQUIRES_MANUAL_SOURCE');
      }
      return;
    }

    if (config.sourceType === 'MANUAL_FILE') {
      throw new Error('SCHOLARSHIP_SOURCE_MANUAL_SOURCE_REQUIRES_MANUAL_MODE');
    }

    if (!config.baseUrl) {
      throw new Error('SCHOLARSHIP_SOURCE_BASE_URL_REQUIRED');
    }
    this.assertHttpUrl(config.baseUrl, 'baseUrl');

    if (!config.allowedUrlScope || config.allowedUrlScope.allowedOrigins.length === 0) {
      throw new Error('SCHOLARSHIP_SOURCE_ALLOWED_SCOPE_REQUIRED');
    }

    for (const origin of config.allowedUrlScope.allowedOrigins) {
      const parsed = this.assertHttpUrl(origin, 'allowedOrigin');
      if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new Error('SCHOLARSHIP_SOURCE_ALLOWED_ORIGIN_MUST_BE_ORIGIN_ONLY');
      }
    }

    this.assertAllowed(config.baseUrl, config.allowedUrlScope);
    this.assertRateLimit(config);
  }

  static assertAllowed(candidateUrl: string, scope: ScholarshipAllowedUrlScope): URL {
    const candidate = this.assertHttpUrl(candidateUrl, 'candidateUrl');
    if (candidate.username || candidate.password) {
      throw new Error('SCHOLARSHIP_SOURCE_URL_CREDENTIALS_FORBIDDEN');
    }

    const allowed = scope.allowedOrigins.some((originText) => {
      const allowedOrigin = this.assertHttpUrl(originText, 'allowedOrigin');
      if (candidate.protocol !== allowedOrigin.protocol) return false;
      if (candidate.port !== allowedOrigin.port) return false;
      if (candidate.hostname === allowedOrigin.hostname) return true;
      return Boolean(
        scope.allowSubdomains &&
        candidate.hostname.endsWith(`.${allowedOrigin.hostname}`),
      );
    });
    if (!allowed) {
      throw new Error('SCHOLARSHIP_SOURCE_URL_OUTSIDE_ALLOWED_ORIGIN');
    }

    const prefixes = scope.allowedPathPrefixes?.length
      ? scope.allowedPathPrefixes
      : ['/'];
    if (!prefixes.some((prefix) => this.pathMatches(candidate.pathname, prefix))) {
      throw new Error('SCHOLARSHIP_SOURCE_URL_OUTSIDE_ALLOWED_PATH');
    }
    return candidate;
  }

  private static assertRateLimit(config: ScholarshipSourceConfiguration): void {
    const policy = config.rateLimitPolicy;
    if (!policy) return;
    if (!Number.isInteger(policy.requestsPerMinute) || policy.requestsPerMinute < 1) {
      throw new Error('SCHOLARSHIP_SOURCE_RATE_LIMIT_INVALID');
    }
    if (policy.burstLimit !== undefined && (!Number.isInteger(policy.burstLimit) || policy.burstLimit < 1)) {
      throw new Error('SCHOLARSHIP_SOURCE_BURST_LIMIT_INVALID');
    }
    if (policy.minimumDelayMs !== undefined && (!Number.isInteger(policy.minimumDelayMs) || policy.minimumDelayMs < 0)) {
      throw new Error('SCHOLARSHIP_SOURCE_MINIMUM_DELAY_INVALID');
    }
  }

  private static assertHttpUrl(value: string, field: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`SCHOLARSHIP_SOURCE_URL_INVALID:${field}`);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`SCHOLARSHIP_SOURCE_URL_PROTOCOL_FORBIDDEN:${field}`);
    }
    return parsed;
  }

  private static pathMatches(pathname: string, prefix: string): boolean {
    const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
    if (normalized === '/') return true;
    return pathname === normalized || pathname.startsWith(`${normalized.replace(/\/$/, '')}/`);
  }

  private static requireText(value: string, field: string): void {
    if (!value || value.trim() !== value || value.length === 0) {
      throw new Error(`SCHOLARSHIP_SOURCE_FIELD_INVALID:${field}`);
    }
  }
}
