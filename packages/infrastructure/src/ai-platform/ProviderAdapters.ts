import {
  AICapabilityKind, AIEmbeddingInvocation, AIEmbeddingInvocationResult, AIProviderAdapter, AIProviderInvocation, AIProviderInvocationResult,
  AIProviderOperationalStatus, IAIProviderRegistry
} from '@manaratak/domain';

export interface AIHttpTransport {
  request(input: { url: string; method: 'GET' | 'POST'; headers: Record<string, string>; body?: unknown; timeoutMs: number }): Promise<{ status: number; body: any; headers?: Record<string, string> }>;
}

export class FetchAIHttpTransport implements AIHttpTransport {
  async request(input: { url: string; method: 'GET' | 'POST'; headers: Record<string, string>; body?: unknown; timeoutMs: number }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      return { status: response.status, body, headers: Object.fromEntries(response.headers.entries()) };
    } finally {
      clearTimeout(timeout);
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
  private runtimeVerified = false;

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
    return this.secret() ? (this.runtimeVerified ? 'READY' : 'RUNTIME_PENDING') : 'NOT_CONFIGURED';
  }

  protected secret(): string | undefined {
    return this.readSecret(this.secretReference)?.trim() || undefined;
  }

  protected requireSecret(): string {
    const value = this.secret();
    if (!value) throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${this.key}`);
    return value;
  }

  protected markRuntimeVerified(): void {
    this.runtimeVerified = true;
  }

  abstract invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult>;
}

export class OpenAICompatibleAdapter extends SecretReferencedProviderAdapter {
  readonly capabilities: AICapabilityKind[] = ['TEXT_GENERATION', 'CHAT', 'STRUCTURED_OUTPUT', 'EMBEDDINGS'];
  constructor(options: AdapterOptions) { super(options); }

  async embed(request: AIEmbeddingInvocation): Promise<AIEmbeddingInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({ url: `${this.baseUrl}/embeddings`, method: 'POST', timeoutMs: this.timeoutMs, headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: { model: request.model, input: request.inputs, dimensions: request.dimensions ?? undefined } });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    this.markRuntimeVerified();
    return { embeddings: (response.body?.data ?? []).map((item: any) => item.embedding), inputTokens: response.body?.usage?.prompt_tokens ?? response.body?.usage?.total_tokens ?? 0, providerRequestId: response.body?.id ?? null };
  }

  async invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/chat/completions`, method: 'POST', timeoutMs: Math.min(this.timeoutMs, request.timeoutMs ?? this.timeoutMs),
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: {
        model: request.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.input }
        ],
        max_tokens: request.maxOutputTokens ?? undefined,
        temperature: request.temperature ?? 0,
        response_format: request.structuredOutputSchema ? { type: 'json_schema', json_schema: { name: 'response', schema: request.structuredOutputSchema } } : undefined
      }
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    this.markRuntimeVerified();
    return {
      output: response.body?.choices?.[0]?.message?.content ?? '',
      providerRequestId: response.body?.id ?? null,
      inputTokens: response.body?.usage?.prompt_tokens ?? 0,
      outputTokens: response.body?.usage?.completion_tokens ?? 0,
      finishReason: response.body?.choices?.[0]?.finish_reason ?? null
    };
  }
}

export class AnthropicProviderAdapter extends SecretReferencedProviderAdapter {
  readonly capabilities: AICapabilityKind[] = ['TEXT_GENERATION', 'CHAT', 'STRUCTURED_OUTPUT'];
  constructor(options: AdapterOptions) { super(options); }

  async invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/messages`, method: 'POST', timeoutMs: Math.min(this.timeoutMs, request.timeoutMs ?? this.timeoutMs),
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: { model: request.model, system: request.systemPrompt ?? undefined, messages: [{ role: 'user', content: request.input }], max_tokens: request.maxOutputTokens ?? 1024, temperature: request.temperature ?? 0 }
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    this.markRuntimeVerified();
    return {
      output: (response.body?.content ?? []).map((part: any) => part?.text ?? '').join(''),
      providerRequestId: response.body?.id ?? null,
      inputTokens: response.body?.usage?.input_tokens ?? 0,
      outputTokens: response.body?.usage?.output_tokens ?? 0,
      finishReason: response.body?.stop_reason ?? null
    };
  }
}

export class GoogleGenerativeAIProviderAdapter extends SecretReferencedProviderAdapter {
  readonly capabilities: AICapabilityKind[] = ['TEXT_GENERATION', 'CHAT', 'STRUCTURED_OUTPUT', 'EMBEDDINGS'];
  constructor(options: AdapterOptions) { super(options); }

  async embed(request: AIEmbeddingInvocation): Promise<AIEmbeddingInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({ url: `${this.baseUrl}/models/${encodeURIComponent(request.model)}:batchEmbedContents`, method: 'POST', timeoutMs: this.timeoutMs, headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body: { requests: request.inputs.map((text) => ({ model: `models/${request.model}`, content: { parts: [{ text }] }, outputDimensionality: request.dimensions ?? undefined })) } });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    this.markRuntimeVerified();
    return { embeddings: (response.body?.embeddings ?? []).map((item: any) => item.values ?? []), inputTokens: 0, providerRequestId: response.headers?.['x-request-id'] ?? null };
  }

  async invoke(request: AIProviderInvocation): Promise<AIProviderInvocationResult> {
    const key = this.requireSecret();
    const response = await this.transport.request({
      url: `${this.baseUrl}/models/${encodeURIComponent(request.model)}:generateContent`,
      method: 'POST', timeoutMs: Math.min(this.timeoutMs, request.timeoutMs ?? this.timeoutMs), headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: {
        systemInstruction: request.systemPrompt ? { parts: [{ text: request.systemPrompt }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: request.input }] }],
        generationConfig: { maxOutputTokens: request.maxOutputTokens ?? undefined, temperature: request.temperature ?? 0, responseMimeType: request.structuredOutputSchema ? 'application/json' : undefined, responseSchema: request.structuredOutputSchema ?? undefined }
      }
    });
    if (response.status >= 400) throw providerError(this.key, response.status, response.body);
    this.markRuntimeVerified();
    return {
      output: (response.body?.candidates?.[0]?.content?.parts ?? []).map((part: any) => part?.text ?? '').join(''),
      providerRequestId: response.headers?.['x-request-id'] ?? null,
      inputTokens: response.body?.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.body?.usageMetadata?.candidatesTokenCount ?? 0,
      finishReason: response.body?.candidates?.[0]?.finishReason ?? null
    };
  }
}

export class AIProviderRegistry implements IAIProviderRegistry {
  private readonly adapters: Map<string, AIProviderAdapter>;
  constructor(adapters: AIProviderAdapter[]) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.key, adapter]));
    if (this.adapters.size !== adapters.length) throw new Error('Duplicate AI provider adapter key.');
  }
  get(providerKey: string) { return this.adapters.get(providerKey) ?? null; }
  list() { return [...this.adapters.values()]; }
}

export function createDefaultAIProviderRegistry(options: { transport?: AIHttpTransport; readSecret?: (reference: string) => string | undefined } = {}) {
  return new AIProviderRegistry([
    new OpenAICompatibleAdapter({ key: 'openai', secretReference: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', ...options }),
    new AnthropicProviderAdapter({ key: 'anthropic', secretReference: 'ANTHROPIC_API_KEY', baseUrl: 'https://api.anthropic.com/v1', ...options }),
    new GoogleGenerativeAIProviderAdapter({ key: 'google', secretReference: 'GOOGLE_GENERATIVE_AI_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', ...options })
  ]);
}

function providerError(provider: string, status: number, body: any) {
  const error = new Error(`AI_PROVIDER_ERROR:${provider}:${status}`) as Error & { status?: number; retryable?: boolean };
  error.status = status;
  error.retryable = status === 408 || status === 429 || status >= 500;
  Object.defineProperty(error, 'providerBody', { value: body, enumerable: false });
  return error;
}
