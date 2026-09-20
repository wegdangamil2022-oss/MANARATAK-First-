import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { StudentToolsPublicRouter } from '../../../../src/presentation/api/router/StudentToolsPublicRouter';

describe('StudentToolsPublicRouter', () => {
  const createUseCases = () => ({
    listPublicTools: vi.fn(),
    findPublicTool: vi.fn(),
  });

  const createExecutionUseCases = () => ({
    execute: vi.fn(),
    findExecutionForRequester: vi.fn(),
    saveExecutionForStudent: vi.fn(),
  });

  const createSessionService = () => ({
    resolve: vi.fn().mockImplementation((token?: string) => ({
      sessionReference: token ? 'verified-session' : 'issued-session',
      token: token ?? 'v1.issued.signed',
      expiresAt: new Date(Date.now() + 60_000),
      newlyIssued: !token,
    })),
  });

  const createIdempotencyStore = () => ({
    begin: vi.fn().mockResolvedValue({ kind: 'ACQUIRED', scopeHash: 'scope-1', leaseToken: 'lease-1' }),
    complete: vi.fn().mockResolvedValue(undefined),
  });

  const createApp = (
    useCases: ReturnType<typeof createUseCases>,
    executionUseCases = createExecutionUseCases(),
    sessionService = createSessionService(),
  ) => {
    const app = express();
    app.use(express.json());
    app.use('/tools', StudentToolsPublicRouter.create({
      studentToolRegistryUseCases: useCases as any,
      studentToolExecutionUseCases: executionUseCases as any,
      studentToolAnonymousSessionService: sessionService as any,
      apiIdempotencyStore: createIdempotencyStore() as any,
    }));
    return { app, sessionService };
  };

  it('returns public student tools', async () => {
    const useCases = createUseCases();
    useCases.listPublicTools.mockResolvedValue([{ toolKey: 'document-checklist', displayName: 'Document Checklist' }]);
    const { app } = createApp(useCases);

    const res = await request(app).get('/tools?category=Documents');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(useCases.listPublicTools).toHaveBeenCalledWith({ category: 'Documents' });
  });

  it('executes with a server-issued anonymous session and a trusted network reference', async () => {
    const useCases = createUseCases();
    const executionUseCases = createExecutionUseCases();
    executionUseCases.execute.mockResolvedValue({ toolKey: 'major-fit-helper', executionPublicId: 'ai-1', status: 'COMPLETED', output: 'Suggested majors' });
    const { app } = createApp(useCases, executionUseCases);

    const res = await request(app).post('/tools/major-fit-helper/execute').set('Idempotency-Key', 'execute-major-fit-1').send({ input: 'I like science.' });

    expect(res.status).toBe(200);
    expect(res.headers['x-student-tools-session']).toBe('v1.issued.signed');
    expect(executionUseCases.execute).toHaveBeenCalledWith('major-fit-helper', expect.objectContaining({
      input: 'I like science.',
      consumerType: 'ANONYMOUS',
      anonymousSessionReference: 'issued-session',
      trustedNetworkReference: expect.any(String),
    }));
  });

  it('never trusts the caller session header as the limiter/ownership principal', async () => {
    const useCases = createUseCases();
    const executionUseCases = createExecutionUseCases();
    executionUseCases.findExecutionForRequester.mockResolvedValue(null);
    const { app, sessionService } = createApp(useCases, executionUseCases);
    const res = await request(app).get('/tools/executions/stx_private').set('x-student-tools-session', 'caller-controlled-token');
    expect(res.status).toBe(404);
    expect(sessionService.resolve).toHaveBeenCalledWith('caller-controlled-token', expect.any(String));
    expect(executionUseCases.findExecutionForRequester).toHaveBeenCalledWith('stx_private', {
      consumerType: 'ANONYMOUS',
      authenticatedStudentReference: undefined,
      anonymousSessionReference: 'verified-session',
    });
  });

  it('requires authentication before saving an execution reference', async () => {
    const useCases = createUseCases();
    const executionUseCases = createExecutionUseCases();
    const { app } = createApp(useCases, executionUseCases);
    const res = await request(app).post('/tools/executions/stx_1/save').set('Idempotency-Key', 'save-execution-1');
    expect(res.status).toBe(401);
    expect(executionUseCases.saveExecutionForStudent).not.toHaveBeenCalled();
  });
});
