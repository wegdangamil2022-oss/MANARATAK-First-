import {
  AICapabilityKind,
  AIEmbeddingInvocation,
  AIEmbeddingInvocationResult,
  AIProviderAdapter,
  AIProviderInvocation,
  AIProviderInvocationResult,
  AIProviderOperationalStatus,
  IAIProviderRegistry,
} from '@manaratak/domain';

export interface AIHttpTransport {
  request(input: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: unknown;
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<{ status: number; body: any; headers?: Record<string, string> }>;
}

// Bound untrusted provider bodies before JSON parsing to avoid unbounded memory allocation.
const MAX_PROVIDER_RESPONSE_BYTES = 8 * 1024 * 1024;
async function readProviderJson(response: Response): Promise<unknown> {
  const advertised = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(advertised) && advertised > MAX_PROVIDER_RESPONSE_BYTES)
    throw new Error('AI_PROVIDER_RESPONSE_TOO_LARGE');
  if (!response.body) return {};
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_PROVIDER_RESPONSE_BYTES) throw new Error('AI_PROVIDER_RESPONSE_TOO_LARGE');
      parts.push(chunk.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const part of parts) {
    bytes.set(part, position);
    position += part.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('AI_PROVIDER_INVALID_JSON');
  }
}

export class FetchAIHttpTransport implements AIHttpTransport {
  async request(input: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    body?: unknown;
    timeoutMs: number;
    signal?: AbortSignal;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    const abort = () => controller.abort(input.signal?.reason);
    input.signal?.addEventListener('abort', abort, { once: true });
    if (input.signal?.aborted) abort();
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: controller.signal,
      });
      const body = await readProviderJson(response);
      return {
        status: response.status,
        body,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener('abort', abort);
    }
  }
}

interface AdapterOptions {
  key: string;
  secretReference: string;
  baseUrl: string;
  timeoutMs?: number;
  transport?: AIHttpTransport;
  readSecret?: (reference: string) => string | undefined;
}

abstract class SecretReferencedProviderAdapter implements AIProviderAdapter {
  abstract readonly capabilities: AICapabilityKind[];
  readonly key: string;
  protected readonly secretReference: string;
  protected readonly baseUrl: string;
  protected readonly timeoutMs: number;
  protected readonly transport: AIHttpTransport;
  private readonly readSecret: (reference: string) => string | undefined;
  private readonly health = new Map<string, number>();

  protected constructor(options: AdapterOptions) {
    this.key = options.key;
    this.secretReference = options.secretReference;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.transport = options.transport ?? new FetchAIHttpTransport();
    this.readSecret = options.readSecret ?? (() => undefined);
  }

  status(): AIProviderOperationalStatus {
    // A configured secret proves only that an invocation can be attempted.
    // READY is reserved for runtime evidence, never inferred from ENV presence.
    return this.secret()
      ? [...this.health.values()].some((at) => Date.now() - at < 300_000)
        ? 'READY'
        : 'RUNTIME_PENDING'
      : 'NOT_CONFIGURED';
  }

  configuration() {
    return { secretReference: this.secretReference, baseUrl: this.baseUrl };
  }

  protected secret(): string | undefined {
    return this.readSecret(this.secretReference)?.trim() || undefined;
  }

  protected requireSecret(): string {
    const value = this.secret();
    if (!value) throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${this.key}`);
    return value;
  }

  healthEvidence(capability: AICapabilityKind, model: string) {
    const at = this.health.get(`${capability}:${model}`);
    return at && Date.now() - at < 300_000
      ? { verifiedAt: new Date(at).toISOString(), expiresAt: new Date(at + 300_000).toISOString() }
      : null;
  }

  protected markRuntimeVerified(capability: AICapabilityKind, model: string): void {
    this.health.set(`${capability}:${model}`, Date.now());
  }

  abstract invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult>;
}

export class OpenAICompatibleAdapter extends SecretReferencedProviderAdapter {
  readonly capabilities: AICapabilityKind[] = [
    'TEXT_GENERATION',
    'CHAT',
    'STRUCTURED_OUTPUT',
    'EMBEDDINGS',
  ];
  constructor(options: AdapterOptions) {
    super(options);
  }

  async embed(request: AIEmbeddingInvocation): Promise<AIEmbeddingInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/embeddings`,
      method: 'POST',
      timeoutMs: this.timeoutMs,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: {
        model: request.model,
        input: request.inputs,
        dimensions: request.dimensions ?? undefined,
      },
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    const result: AIEmbeddingInvocationResult = {
      embeddings: (Array.isArray(response.body?.data) ? response.body.data : []).map(
        (item: any) => item.embedding,
      ),
      inputTokens: response.body?.usage?.prompt_tokens ?? response.body?.usage?.total_tokens ?? 0,
      providerRequestId: response.body?.id ?? null,
    };
    if (validEmbeddings(result, request)) this.markRuntimeVerified('EMBEDDINGS', request.model);
    return result;
  }

  async invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/chat/completions`,
      method: 'POST',
      timeoutMs: Math.min(this.timeoutMs, request.timeoutMs ?? this.timeoutMs),
      signal: request.signal,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: {
        model: request.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.input },
        ],
        max_tokens: request.maxOutputTokens ?? undefined,
        temperature: request.temperature ?? 0,
        response_format: request.structuredOutputSchema
          ? {
              type: 'json_schema',
              json_schema: { name: 'response', schema: request.structuredOutputSchema },
            }
          : undefined,
      },
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    const result: AIProviderInvocationResult = {
      output: response.body?.choices?.[0]?.message?.content ?? '',
      providerRequestId: response.body?.id ?? null,
      inputTokens: response.body?.usage?.prompt_tokens ?? 0,
      outputTokens: response.body?.usage?.completion_tokens ?? 0,
      finishReason: response.body?.choices?.[0]?.finish_reason ?? null,
    };
    const normalized = normalizeInvocation(result, request);
    if (normalized.output.trim()) {
      this.markRuntimeVerified(
        request.structuredOutputSchema ? 'STRUCTURED_OUTPUT' : 'TEXT_GENERATION',
        request.model,
      );
      if (!request.structuredOutputSchema) this.markRuntimeVerified('CHAT', request.model);
    }
    return normalized;
  }
}

export class AnthropicProviderAdapter extends SecretReferencedProviderAdapter {
  readonly capabilities: AICapabilityKind[] = ['TEXT_GENERATION', 'CHAT', 'STRUCTURED_OUTPUT'];
  constructor(options: AdapterOptions) {
    super(options);
  }

  async invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/messages`,
      method: 'POST',
      timeoutMs: Math.min(this.timeoutMs, request.timeoutMs ?? this.timeoutMs),
      signal: request.signal,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: {
        model: request.model,
        system: request.systemPrompt ?? undefined,
        messages: [{ role: 'user', content: request.input }],
        max_tokens: request.maxOutputTokens ?? 1024,
        temperature: request.temperature ?? 0,
      },
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    const result: AIProviderInvocationResult = {
      output: (Array.isArray(response.body?.content) ? response.body.content : [])
        .map((part: any) => part?.text ?? '')
        .join(''),
      providerRequestId: response.body?.id ?? null,
      inputTokens: response.body?.usage?.input_tokens ?? 0,
      outputTokens: response.body?.usage?.output_tokens ?? 0,
      finishReason: response.body?.stop_reason ?? null,
    };
    const normalized = normalizeInvocation(result, request);
    if (normalized.output.trim()) {
      this.markRuntimeVerified(
        request.structuredOutputSchema ? 'STRUCTURED_OUTPUT' : 'TEXT_GENERATION',
        request.model,
      );
      if (!request.structuredOutputSchema) this.markRuntimeVerified('CHAT', request.model);
    }
    return normalized;
  }
}

export class GoogleGenerativeAIProviderAdapter extends SecretReferencedProviderAdapter {
  readonly capabilities: AICapabilityKind[] = [
    'TEXT_GENERATION',
    'CHAT',
    'STRUCTURED_OUTPUT',
    'EMBEDDINGS',
  ];
  constructor(options: AdapterOptions) {
    super(options);
  }

  async embed(request: AIEmbeddingInvocation): Promise<AIEmbeddingInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/models/${encodeURIComponent(request.model.replace(/^models\//, ''))}:batchEmbedContents`,
      method: 'POST',
      timeoutMs: this.timeoutMs,
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: {
        requests: request.inputs.map((text) => ({
          model: `models/${request.model.replace(/^models\//, '')}`,
          content: { parts: [{ text }] },
          outputDimensionality: request.dimensions ?? undefined,
        })),
      },
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    const result: AIEmbeddingInvocationResult = {
      embeddings: (Array.isArray(response.body?.embeddings) ? response.body.embeddings : []).map(
        (item: any) => item.values ?? [],
      ),
      inputTokens: 0,
      providerRequestId: response.headers?.['x-request-id'] ?? null,
    };
    if (validEmbeddings(result, request)) this.markRuntimeVerified('EMBEDDINGS', request.model);
    return result;
  }

  async invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/models/${encodeURIComponent(request.model.replace(/^models\//, ''))}:generateContent`,
      method: 'POST',
      timeoutMs: Math.min(this.timeoutMs, request.timeoutMs ?? this.timeoutMs),
      signal: request.signal,
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: {
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        contents: [{ role: 'user', parts: [{ text: request.input }] }],
        generationConfig: {
          maxOutputTokens: request.maxOutputTokens ?? undefined,
          temperature: request.temperature ?? 0,
          responseMimeType: request.structuredOutputSchema ? 'application/json' : undefined,
          responseSchema: request.structuredOutputSchema ?? undefined,
        },
      },
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    const result: AIProviderInvocationResult = {
      output: (Array.isArray(response.body?.candidates?.[0]?.content?.parts)
        ? response.body.candidates[0].content.parts
        : []
      )
        .map((part: any) => part?.text ?? '')
        .join(''),
      providerRequestId: response.headers?.['x-request-id'] ?? null,
      inputTokens: response.body?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.body?.usageMetadata?.candidatesTokenCount ?? 0,
      finishReason: response.body?.candidates?.[0]?.finishReason ?? null,
    };
    const normalized = normalizeInvocation(result, request);
    if (normalized.output.trim()) {
      this.markRuntimeVerified(
        request.structuredOutputSchema ? 'STRUCTURED_OUTPUT' : 'TEXT_GENERATION',
        request.model,
      );
      if (!request.structuredOutputSchema) this.markRuntimeVerified('CHAT', request.model);
    }
    return normalized;
  }
}

export class AIProviderRegistry implements IAIProviderRegistry {
  private readonly adapters: Map<string, AIProviderAdapter>;
  constructor(adapters: AIProviderAdapter[]) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.key, adapter]));
    if (this.adapters.size !== adapters.length)
      throw new Error('Duplicate AI provider adapter key.');
  }
  get(providerKey: string) {
    return this.adapters.get(providerKey) ?? null;
  }
  list() {
    return [...this.adapters.values()];
  }
}

export function createDefaultAIProviderRegistry(
  options: {
    transport?: AIHttpTransport;
    readSecret?: (reference: string) => string | undefined;
  } = {},
) {
  return new AIProviderRegistry([
    new OpenAICompatibleAdapter({
      key: 'openai',
      secretReference: 'OPENAI_API_KEY',
      baseUrl: 'https://api.openai.com/v1',
      ...options,
    }),
    new AnthropicProviderAdapter({
      key: 'anthropic',
      secretReference: 'ANTHROPIC_API_KEY',
      baseUrl: 'https://api.anthropic.com/v1',
      ...options,
    }),
    new GoogleGenerativeAIProviderAdapter({
      key: 'google',
      secretReference: 'GOOGLE_GENERATIVE_AI_API_KEY',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      ...options,
    }),
  ]);
}

function providerError(provider: string, status: number, body: any) {
  const error = new Error(`AI_PROVIDER_ERROR:${provider}:${status}`) as Error & {
    status?: number;
    retryable?: boolean;
  };
  error.status = status;
  error.retryable = status === 408 || status === 429 || status >= 500;
  Object.defineProperty(error, 'providerBody', { value: body, enumerable: false });
  return error;
}

function normalizeInvocation(
  result: AIProviderInvocationResult,
  request: AIProviderInvocation,
): AIProviderInvocationResult {
  const output = typeof result.output === 'string' ? result.output : '';
  const validInput = Number.isSafeInteger(result.inputTokens) && result.inputTokens > 0;
  const validOutput =
    Number.isSafeInteger(result.outputTokens) &&
    result.outputTokens >= 0 &&
    (result.outputTokens > 0 || !output);
  return {
    ...result,
    output,
    inputTokens: validInput
      ? result.inputTokens
      : Math.max(1, Math.ceil(((request.systemPrompt?.length ?? 0) + request.input.length) / 4)),
    outputTokens: validOutput ? result.outputTokens : Math.max(1, Math.ceil(output.length / 4)),
    metadata: { ...result.metadata, usageEstimated: !validInput || !validOutput },
  };
}
function validEmbeddings(result: AIEmbeddingInvocationResult, request: AIEmbeddingInvocation) {
  return (
    result.embeddings.length === request.inputs.length &&
    result.embeddings.every(
      (vector) =>
        Array.isArray(vector) &&
        vector.length > 0 &&
        (!request.dimensions || vector.length === request.dimensions) &&
        vector.every((value) => typeof value === 'number' && Number.isFinite(value)),
    )
  );
}
