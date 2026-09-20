import { createHash, createHmac, randomUUID } from 'node:crypto';

export interface SignedProviderHttpClientOptions {
  baseUrl: string;
  apiKey: string;
  signingSecret: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  allowInsecureHttp?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface SignedProviderRequestOptions {
  idempotencyKey?: string;
  expectedStatuses?: number[];
}

export class SignedProviderHttpClient {
  public readonly capabilityStatus = 'PRODUCTION_CAPABLE' as const;
  public readonly isProductionReady = true as const;

  private readonly baseUrl: URL;
  private readonly basePath: string;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly options: SignedProviderHttpClientOptions) {
    if (!options.apiKey?.trim()) throw new Error('PROVIDER_API_KEY_REQUIRED');
    if (!options.signingSecret || options.signingSecret.length < 32) throw new Error('PROVIDER_SIGNING_SECRET_TOO_SHORT');
    this.baseUrl = new URL(options.baseUrl);
    if (this.baseUrl.username || this.baseUrl.password) throw new Error('PROVIDER_BASE_URL_CREDENTIALS_FORBIDDEN');
    if (this.baseUrl.protocol !== 'https:' && !(options.allowInsecureHttp === true && this.baseUrl.protocol === 'http:')) {
      throw new Error('PROVIDER_HTTPS_REQUIRED');
    }
    if (this.baseUrl.search || this.baseUrl.hash) throw new Error('PROVIDER_BASE_URL_QUERY_OR_FRAGMENT_FORBIDDEN');
    this.basePath = this.baseUrl.pathname.endsWith('/') ? this.baseUrl.pathname : `${this.baseUrl.pathname}/`;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 100 || this.timeoutMs > 120_000) throw new Error('PROVIDER_TIMEOUT_INVALID');
    this.maxResponseBytes = options.maxResponseBytes ?? 4 * 1024 * 1024;
    if (!Number.isSafeInteger(this.maxResponseBytes) || this.maxResponseBytes <= 0 || this.maxResponseBytes > 128 * 1024 * 1024) {
      throw new Error('PROVIDER_MAX_RESPONSE_BYTES_INVALID');
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  async json<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpointPath: string,
    body?: unknown,
    requestOptions: SignedProviderRequestOptions = {},
  ): Promise<T> {
    const encoded = body === undefined ? new Uint8Array() : new TextEncoder().encode(JSON.stringify(body));
    const response = await this.request(method, endpointPath, encoded, body === undefined ? undefined : 'application/json', requestOptions);
    if (response.byteLength === 0) return undefined as T;
    try {
      return JSON.parse(new TextDecoder().decode(response)) as T;
    } catch {
      throw new Error('PROVIDER_RESPONSE_JSON_INVALID');
    }
  }

  async bytes(
    method: 'GET' | 'POST' | 'PUT',
    endpointPath: string,
    body?: unknown,
    requestOptions: SignedProviderRequestOptions = {},
  ): Promise<Uint8Array> {
    const encoded = body === undefined ? new Uint8Array() : new TextEncoder().encode(JSON.stringify(body));
    return this.request(method, endpointPath, encoded, body === undefined ? undefined : 'application/json', requestOptions);
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpointPath: string,
    bodyBytes: Uint8Array,
    contentType: string | undefined,
    requestOptions: SignedProviderRequestOptions,
  ): Promise<Uint8Array> {
    const url = this.resolveEndpoint(endpointPath);
    const timestamp = this.now().toISOString();
    const nonce = randomUUID();
    const bodyHash = createHash('sha256').update(bodyBytes).digest('hex');
    const canonical = `${method}\n${url.pathname}${url.search}\n${timestamp}\n${nonce}\n${bodyHash}`;
    const signature = createHmac('sha256', this.options.signingSecret).update(canonical).digest('hex');
    const headers: Record<string, string> = {
      accept: 'application/json, application/octet-stream',
      'x-manaratak-provider-key': this.options.apiKey.trim(),
      'x-manaratak-timestamp': timestamp,
      'x-manaratak-nonce': nonce,
      'x-manaratak-content-sha256': bodyHash,
      'x-manaratak-signature': signature,
    };
    if (contentType) headers['content-type'] = contentType;
    if (requestOptions.idempotencyKey) headers['idempotency-key'] = requestOptions.idempotencyKey;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body: bodyBytes.byteLength > 0 ? bodyBytes : undefined,
        signal: controller.signal,
        redirect: 'error',
      });
      const expected = requestOptions.expectedStatuses ?? [];
      if (!response.ok && !expected.includes(response.status)) {
        throw new Error(`PROVIDER_HTTP_ERROR:${response.status}`);
      }
      const declaredLengthHeader = response.headers.get('content-length');
      if (declaredLengthHeader) {
        const declaredLength = Number(declaredLengthHeader);
        if (!Number.isFinite(declaredLength) || declaredLength < 0) throw new Error('PROVIDER_RESPONSE_CONTENT_LENGTH_INVALID');
        if (declaredLength > this.maxResponseBytes) throw new Error(`PROVIDER_RESPONSE_TOO_LARGE:${declaredLength}`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > this.maxResponseBytes) throw new Error(`PROVIDER_RESPONSE_TOO_LARGE:${bytes.byteLength}`);
      return bytes;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('PROVIDER_REQUEST_TIMEOUT');
      if (error instanceof Error && error.message.startsWith('PROVIDER_')) throw error;
      throw new Error('PROVIDER_REQUEST_FAILED');
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveEndpoint(endpointPath: string): URL {
    if (!endpointPath.startsWith('/') || endpointPath.startsWith('//') || endpointPath.includes('\\')) {
      throw new Error('PROVIDER_ENDPOINT_PATH_INVALID');
    }
    const segments = endpointPath.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.')) throw new Error('PROVIDER_ENDPOINT_PATH_INVALID');
    const relative = endpointPath.replace(/^\/+/, '');
    const base = new URL(this.baseUrl.toString());
    base.pathname = this.basePath;
    const target = new URL(relative, base);
    if (target.origin !== this.baseUrl.origin || !target.pathname.startsWith(this.basePath)) {
      throw new Error('PROVIDER_ENDPOINT_ORIGIN_MISMATCH');
    }
    return target;
  }
}
