import { describe, expect, it, vi } from 'vitest';
import {
  AIProviderRegistry, AnthropicProviderAdapter, GoogleGenerativeAIProviderAdapter, FetchAIHttpTransport,
  OpenAICompatibleAdapter, type AIHttpTransport
} from '../../src/ai-platform/ProviderAdapters';

describe('Phase 17 provider-neutral adapters', () => {
  it('reports NOT_CONFIGURED and makes zero transport calls when the secret reference is absent', async () => {
    const transport: AIHttpTransport = { request: vi.fn() };
    const adapter = new OpenAICompatibleAdapter({ key: 'openai', secretReference: 'OPENAI_API_KEY', baseUrl: 'https://provider.invalid/v1', transport, readSecret: () => undefined });
    expect(adapter.status()).toBe('NOT_CONFIGURED');
    await expect(adapter.invoke({ model: 'model', input: 'hello' })).rejects.toThrow('AI_PROVIDER_NOT_CONFIGURED:openai');
    expect(transport.request).not.toHaveBeenCalled();
  });

  it('maps an OpenAI-compatible response through a mocked transport without leaking the secret', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, body: { id: 'req-1', choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2 } } });
    const adapter = new OpenAICompatibleAdapter({ key: 'openai', secretReference: 'TEST_OPENAI_KEY', baseUrl: 'https://provider.invalid/v1', transport: { request }, readSecret: () => 'test-secret' });
    await expect(adapter.invoke({ model: 'model-1', input: 'hello' })).resolves.toMatchObject({ output: 'answer', inputTokens: 3, outputTokens: 2, providerRequestId: 'req-1' });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://provider.invalid/v1/chat/completions' }));
  });

  it('maps Anthropic and Google contracts using mocks only', async () => {
    const anthropic = new AnthropicProviderAdapter({ key: 'anthropic', secretReference: 'TEST_KEY', baseUrl: 'https://provider.invalid/v1', readSecret: () => 'test', transport: { request: vi.fn().mockResolvedValue({ status: 200, body: { id: 'a1', content: [{ text: 'anthropic' }], usage: { input_tokens: 4, output_tokens: 5 } } }) } });
    const google = new GoogleGenerativeAIProviderAdapter({ key: 'google', secretReference: 'TEST_KEY', baseUrl: 'https://provider.invalid/v1beta', readSecret: () => 'test', transport: { request: vi.fn().mockResolvedValue({ status: 200, body: { candidates: [{ content: { parts: [{ text: 'google' }] } }], usageMetadata: { promptTokenCount: 6, candidatesTokenCount: 7 } } }) } });
    await expect(anthropic.invoke({ model: 'a', input: 'hello' })).resolves.toMatchObject({ output: 'anthropic', inputTokens: 4, outputTokens: 5 });
    await expect(google.invoke({ model: 'g', input: 'hello' })).resolves.toMatchObject({ output: 'google', inputTokens: 6, outputTokens: 7 });
  });

  it('keeps the Google API key out of request URLs', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, body: { candidates: [] } });
    const google = new GoogleGenerativeAIProviderAdapter({ key: 'google', secretReference: 'TEST_KEY', baseUrl: 'https://provider.invalid/v1beta', readSecret: () => 'private-key', transport: { request } });
    await google.invoke({ model: 'g', input: 'hello' });
    const invocation = request.mock.calls[0][0];
    expect(invocation.url).not.toContain('private-key');
    expect(invocation.url).not.toContain('?key=');
    expect(invocation.headers['x-goog-api-key']).toBe('private-key');
  });

  it('maps embedding contracts without a live provider', async () => {
    const request = vi.fn().mockResolvedValue({ status: 200, body: { data: [{ embedding: [0.1, 0.2] }], usage: { prompt_tokens: 2 } } });
    const adapter = new OpenAICompatibleAdapter({ key: 'openai', secretReference: 'TEST_KEY', baseUrl: 'https://provider.invalid/v1', readSecret: () => 'test', transport: { request } });
    await expect(adapter.embed({ model: 'embedding-model', inputs: ['chunk'] })).resolves.toEqual({ embeddings: [[0.1, 0.2]], inputTokens: 2, providerRequestId: null });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://provider.invalid/v1/embeddings' }));
  });

  it('rejects duplicate registry keys', () => {
    const options = { key: 'same', secretReference: 'TEST_KEY', baseUrl: 'https://provider.invalid', readSecret: () => undefined };
    expect(() => new AIProviderRegistry([new OpenAICompatibleAdapter(options), new AnthropicProviderAdapter(options)])).toThrow('Duplicate AI provider adapter key.');
  });

  it('rejects advertised oversized provider payloads before buffering a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('not read', {
      status: 200, headers: { 'content-length': String(9 * 1024 * 1024) },
    }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const transport = new FetchAIHttpTransport();
      await expect(transport.request({ url: 'https://provider.invalid/v1', method: 'GET', headers: {}, timeoutMs: 1000 }))
        .rejects.toThrow('AI_PROVIDER_RESPONSE_TOO_LARGE');
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });

  it('fails closed for malformed AI provider JSON instead of returning a fake response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"oops":', { status: 200 })));
    try {
      const transport = new FetchAIHttpTransport();
      await expect(transport.request({ url: 'https://provider.invalid/v1', method: 'GET', headers: {}, timeoutMs: 1000 }))
        .rejects.toThrow('AI_PROVIDER_INVALID_JSON');
    } finally { vi.unstubAllGlobals(); }
  });

});
