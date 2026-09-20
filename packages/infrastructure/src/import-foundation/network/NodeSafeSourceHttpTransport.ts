import https from 'node:https';
import type { ImportSourceDefinition } from '@manaratak/domain';
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
}

export interface PinnedSourceResponse {
  statusCode: number;
  location?: string;
  contentType?: string;
  rawBytes: Uint8Array;
  etag?: string;
  lastModified?: string;
}

export interface IPinnedSourceRequestExecutor {
  execute(request: PinnedSourceRequest): Promise<PinnedSourceResponse>;
}

export class NodePinnedSourceRequestExecutor implements IPinnedSourceRequestExecutor {
  constructor(private readonly requestFactory: typeof https.request = https.request) {}

  execute({ url, pinnedAddress, timeoutMs, maxBytes }: PinnedSourceRequest): Promise<PinnedSourceResponse> {
    return new Promise((resolve, reject) => {
      const req = this.requestFactory(
        url,
        {
          servername: url.hostname,
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
  constructor(
    private readonly policy = new SourceNetworkSecurityPolicy(),
    private readonly executor: IPinnedSourceRequestExecutor = new NodePinnedSourceRequestExecutor(),
  ) {}

  async get(
    source: ImportSourceDefinition,
    request: SourceAcquisitionRequest,
  ): Promise<SafeSourceHttpResponse> {
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
      const response = await this.executor.execute({
        url: target.url,
        pinnedAddress: target.addresses[0],
        timeoutMs,
        maxBytes,
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
      };
    }

    throw new Error('SOURCE_REDIRECT_LIMIT');
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
}
