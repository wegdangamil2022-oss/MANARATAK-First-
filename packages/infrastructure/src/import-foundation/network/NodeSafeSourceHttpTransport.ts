import https from 'node:https';
import { ImportSourceDefinition as SourceDefinition } from '@manaratak/domain';
import type { ISourceAccessAuthority, ISourceAcquisitionLimiter } from '@manaratak/application';
import { assertRobotsAllowed } from './SignedSourceAccessAuthority';
import { SourceAccessExecutionPolicy, type ImportSourceDefinition } from '@manaratak/domain';
import type {
  ISafeSourceHttpTransport,
  SafeSourceHttpResponse,
  SourceAcquisitionRequest,
} from '@manaratak/application';
import { SourceNetworkSecurityPolicy } from './SourceNetworkSecurityPolicy';

export const SOURCE_HTTP_LIMITS = Object.freeze({
  defaultMaxRedirects: 5,
  hardMaxRedirects: 5,
  defaultMaxResponseBytes: 5 * 1024 * 1024,
  hardMaxResponseBytes: 10 * 1024 * 1024,
  defaultTimeoutMs: 15_000,
  hardMaxTimeoutMs: 30_000,
});

export interface PinnedSourceRequest {
  url: URL;
  pinnedAddress: string;
  timeoutMs: number;
  maxBytes: number;
  headers?: Record<string, string>;
}

export interface PinnedSourceResponse {
  statusCode: number;
  location?: string;
  contentType?: string;
  rawBytes: Uint8Array;
  etag?: string;
  lastModified?: string;
  retryAfter?: string;
}

export interface IPinnedSourceRequestExecutor {
  execute(request: PinnedSourceRequest): Promise<PinnedSourceResponse>;
}

export class NodePinnedSourceRequestExecutor implements IPinnedSourceRequestExecutor {
  constructor(private readonly requestFactory: typeof https.request = https.request) {}

  execute({ url, pinnedAddress, timeoutMs, maxBytes, headers }: PinnedSourceRequest): Promise<PinnedSourceResponse> {
    return new Promise((resolve, reject) => {
      const req = this.requestFactory(
        url,
        {
          servername: url.hostname,
          headers,
          lookup: (_host, _options, callback) =>
            callback(null, pinnedAddress, pinnedAddress.includes(':') ? 6 : 4),
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          let settled = false;

          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxBytes && !settled) {
              settled = true;
              req.destroy();
              reject(new Error('SOURCE_RESPONSE_TOO_LARGE'));
            } else if (!settled) {
              chunks.push(chunk);
            }
          });

          const failResponse = (error: Error) => {
            if (settled) return;
            settled = true;
            req.destroy();
            reject(error);
          };
          res.on('aborted', () => failResponse(new Error('SOURCE_RESPONSE_ABORTED')));
          res.on('error', failResponse);
          res.on('end', () => {
            if (!settled) {
              settled = true;
              resolve({
                statusCode: res.statusCode ?? 0,
                location: res.headers.location,
                contentType: res.headers['content-type'],
                rawBytes: Buffer.concat(chunks),
                etag: res.headers.etag,
                lastModified: res.headers['last-modified'],
                retryAfter: res.headers['retry-after'],
              });
            }
          });
        },
      );

      req.setTimeout(timeoutMs, () => req.destroy(new Error('SOURCE_REQUEST_TIMEOUT')));
      req.on('error', reject);
      req.end();
    });
  }
}

export class NodeSafeSourceHttpTransport implements ISafeSourceHttpTransport {
  get managesRequestBudget() { return Boolean(this.limiter); }
  constructor(
    private readonly policy = new SourceNetworkSecurityPolicy(),
    private readonly executor: IPinnedSourceRequestExecutor = new NodePinnedSourceRequestExecutor(),
    private readonly authority?: ISourceAccessAuthority,
    private readonly limiter?: ISourceAcquisitionLimiter,
  ) {}

  async get(
    source: ImportSourceDefinition,
    request: SourceAcquisitionRequest,
  ): Promise<SafeSourceHttpResponse> {
    // Even callers bypassing connector selection cannot acquire restricted sources.
    if (this.authority) this.authority.assertAllowed(source, source.category);
    else SourceAccessExecutionPolicy.assertNetworkAllowed(source);
    const requestedUrl = request.targetUrl ?? source.baseUrl;
    let current = requestedUrl;

    const maxRedirects = this.boundedInteger(
      request.maxRedirects,
      SOURCE_HTTP_LIMITS.defaultMaxRedirects,
      0,
      SOURCE_HTTP_LIMITS.hardMaxRedirects,
      'SOURCE_MAX_REDIRECTS_INVALID',
    );
    const maxBytes = this.boundedInteger(
      request.maxResponseBytes,
      SOURCE_HTTP_LIMITS.defaultMaxResponseBytes,
      1,
      SOURCE_HTTP_LIMITS.hardMaxResponseBytes,
      'SOURCE_MAX_RESPONSE_BYTES_INVALID',
    );
    const timeoutMs = this.boundedInteger(
      request.timeoutMs,
      SOURCE_HTTP_LIMITS.defaultTimeoutMs,
      1,
      SOURCE_HTTP_LIMITS.hardMaxTimeoutMs,
      'SOURCE_TIMEOUT_INVALID',
    );

    for (let redirects = 0; redirects <= maxRedirects; redirects++) {
      const target = await this.policy.validate(source, current);
      if (source.robotsPolicyUrl) {
        const robotsUrl = new URL(source.robotsPolicyUrl);
        if (robotsUrl.origin !== target.url.origin || robotsUrl.pathname !== '/robots.txt' || robotsUrl.search || robotsUrl.hash)
          throw new Error('SOURCE_ROBOTS_POLICY_URL_INVALID');
        const robotsSource = new SourceDefinition({ ...source, metadata: { ...source.metadata,
          allowedUrlScope: { allowedOrigins: [robotsUrl.origin], allowedPathPrefixes: ['/robots.txt'] } } });
        const robots = await this.policy.validate(robotsSource, robotsUrl.toString());
        await this.limiter?.wait(source);
        const policy = await this.executor.execute({ url: robots.url, pinnedAddress: robots.addresses[0], timeoutMs,
          maxBytes: 100_000, headers: { 'User-Agent': 'ManaratakImport' } });
        if (policy.statusCode !== 200) throw new Error('SOURCE_ROBOTS_POLICY_UNAVAILABLE');
        let text: string; try { text = new TextDecoder('utf-8', { fatal: true }).decode(policy.rawBytes); }
        catch { throw new Error('SOURCE_ROBOTS_POLICY_INVALID'); }
        assertRobotsAllowed(text, target.url);
      }
      await this.limiter?.wait(source);
      const accessHeaders = this.authority?.headersFor(source, target.url) ?? {};
      const response = await this.executor.execute({
        url: target.url,
        pinnedAddress: target.addresses[0],
        timeoutMs,
        maxBytes,
        headers: { 'User-Agent': 'ManaratakImport', ...accessHeaders,
        ...(request.conditional && new URL(requestedUrl).origin === target.url.origin ? {
          ...(request.conditional.etag ? { 'If-None-Match': this.safeValidator(request.conditional.etag) } : {}),
          ...(request.conditional.lastModified ? { 'If-Modified-Since': this.safeValidator(request.conditional.lastModified) } : {}),
        } : {}), },
      });

      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        if (!response.location) throw new Error('SOURCE_REDIRECT_LOCATION_MISSING');
        if (redirects === maxRedirects) throw new Error('SOURCE_REDIRECT_LIMIT');
        current = new URL(response.location, target.url).toString();
        continue;
      }

      return {
        requestedUrl,
        finalUrl: current,
        statusCode: response.statusCode,
        contentType: response.contentType,
        rawBytes: response.rawBytes,
        fetchedAt: new Date(),
        etag: response.etag,
        lastModified: response.lastModified,
        retryAfterMs: this.retryAfterMs(response.retryAfter),
      };
    }

    throw new Error('SOURCE_REDIRECT_LIMIT');
  }

  private safeValidator(value: string) {
    if (value.length > 1000 || /[\r\n\x00-\x1f]/.test(value)) throw new Error('SOURCE_VALIDATOR_INVALID');
    return value;
  }

  private boundedInteger(
    value: number | undefined,
    fallback: number,
    min: number,
    hardMax: number,
    errorCode: string,
  ): number {
    if (value === undefined) return fallback;
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < min) {
      throw new Error(errorCode);
    }
    return Math.min(value, hardMax);
  }

  private retryAfterMs(value: string | undefined): number | undefined {
    if (!value || value.length > 128) return undefined;
    const text = value.trim();
    const milliseconds = /^\d+$/.test(text)
      ? Number(text) * 1000
      : Date.parse(text) - Date.now();
    return Number.isFinite(milliseconds) && milliseconds >= 0 ? milliseconds : undefined;
  }
}
