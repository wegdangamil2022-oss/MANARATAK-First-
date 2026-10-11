import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AIExecutionStatus } from '@manaratak/domain';
import { AIGatewayRouter } from '../../../../src/presentation/api/router/AIGatewayRouter';

describe('AIGatewayRouter capability boundary', () => {
  const createUseCases = () => ({
    executeCapability: vi.fn(),
    submitAsyncCapability: vi.fn(),
    findForRequester: vi.fn(),
    findAsyncForRequester: vi.fn(),
    findAsyncResultForRequester: vi.fn(),
    cancel: vi.fn(),
    cancelAsync: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authUserId = 'admin-1';
      next();
    });
    app.use('/ai', AIGatewayRouter.create({ aiExecutionUseCases: useCases as never }));
    return app;
  };

  it('executes a governed capability without accepting provider, model, prompt, or consumer overrides', async () => {
    const useCases = createUseCases();
    useCases.executeCapability.mockResolvedValue({
      executionPublicId: 'ai-1',
      status: AIExecutionStatus.COMPLETED,
    });
    const response = await request(createApp(useCases))
      .post('/ai/execute')
      .send({
        capabilityKey: 'ai.summarize',
        input: 'Summarize this guide.',
        dataClassification: 'INTERNAL',
        promptKey: 'forbidden.prompt',
        providerKey: 'forbidden-provider',
        consumerKey: 'forbidden-consumer',
      });

    expect(response.status).toBe(200);
    expect(useCases.executeCapability).toHaveBeenCalledWith({
      capabilityKey: 'ai.summarize',
      input: 'Summarize this guide.',
      locale: undefined,
      dataClassification: 'INTERNAL',
      idempotencyKey: undefined,
      structuredOutputSchema: undefined,
      consumerKey: 'admin-ai-playground',
      requesterReferenceId: 'admin-1',
      sourceDomain: 'AdminAIPlayground',
    });
    const delegated = useCases.executeCapability.mock.calls[0][0];
    expect(delegated).not.toHaveProperty('promptKey');
    expect(delegated).not.toHaveProperty('providerKey');
  });

  it('fails truthfully when the asynchronous runtime queue is not configured', async () => {
    const useCases = createUseCases();
    useCases.submitAsyncCapability.mockRejectedValue(new Error('AI_ASYNC_QUEUE_NOT_CONFIGURED'));
    const response = await request(createApp(useCases))
      .post('/ai/executions')
      .send({ capabilityKey: 'ai.summarize', input: 'text' });
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('AI_ASYNC_QUEUE_NOT_CONFIGURED');
  });

  it('returns an accepted durable job without exposing its encrypted payload', async () => {
    const useCases = createUseCases();
    useCases.submitAsyncCapability.mockResolvedValue({ publicId: 'aij_1', status: 'QUEUED', createdAt: '2026-08-24', payloadCiphertext: 'secret-cipher' });
    const response = await request(createApp(useCases)).post('/ai/executions').send({ capabilityKey: 'ai.summarize', input: 'text' });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ publicId: 'aij_1', status: 'QUEUED', createdAt: '2026-08-24' });
    expect(response.body).not.toHaveProperty('payloadCiphertext');
  });

  it('does not disclose an execution owned by another requester', async () => {
    const useCases = createUseCases();
    useCases.findForRequester.mockResolvedValue(null);
    const response = await request(createApp(useCases)).get('/ai/executions/ai-private');
    expect(response.status).toBe(404);
    expect(useCases.findForRequester).toHaveBeenCalledWith('ai-private', 'admin-1');
  });

  it('returns a requester-owned encrypted-at-rest result without permitting caches', async () => {
    const useCases = createUseCases();
    useCases.findAsyncResultForRequester.mockResolvedValue({
      publicId: 'aij_owned', executionPublicId: 'ai_owned',
      result: 'Complete private response', expiresAt: '2026-10-12T12:00:00Z',
    });
    const response = await request(createApp(useCases)).get('/ai/executions/aij_owned/result');
    expect(response.status).toBe(200);
    expect(response.header['cache-control']).toContain('no-store');
    expect(useCases.findAsyncResultForRequester).toHaveBeenCalledWith('aij_owned', 'admin-1');
    expect(response.body.result).toBe('Complete private response');
  });

  it('refuses cross-requester result reads and invalid execution identifiers', async () => {
    const useCases = createUseCases();
    useCases.findAsyncResultForRequester.mockResolvedValue(null);
    const other = await request(createApp(useCases)).get('/ai/executions/aij_other/result');
    expect(other.status).toBe(404);
    expect(other.body).not.toHaveProperty('result');
    const bad = await request(createApp(useCases)).get('/ai/executions/ai_sync/result');
    expect(bad.status).toBe(404);
    expect(useCases.findAsyncResultForRequester).toHaveBeenCalledTimes(1);
  });

});
