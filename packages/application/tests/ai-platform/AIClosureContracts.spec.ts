import { describe, expect, it, vi } from 'vitest';
import { AIExecutionStatus, AIRequestPurpose } from '@manaratak/domain';
import {
  AIExecutionOrchestrator,
  AIKnowledgeUseCases,
  CmsAIKnowledgeOwnerGateway,
} from '../../src/ai-platform/use-cases';
import { EnvironmentAIAsyncPayloadProtector } from '../../../infrastructure/src/ai-platform/EnvironmentAIAsyncPayloadProtector';

function fixture() {
  const purpose = AIRequestPurpose.TOOL_ASSISTANCE;
  const model = {
    key: 'model',
    providerKey: 'provider',
    providerModelId: 'model-id',
    status: 'ACTIVE',
    productionApproved: true,
    capabilities: ['TEXT_GENERATION', 'EMBEDDINGS'],
    maxDataClassification: 'CONFIDENTIAL',
    maxOutputTokens: 100,
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    currency: 'USD',
  };
  const consumer = {
    status: 'ACTIVE',
    consumerKey: 'consumer',
    allowAsyncJobs: true,
    allowedCapabilities: ['write', 'knowledge.indexing'],
    requestsPerMinute: 10,
    dailyRequestLimit: 100,
    monthlyTokenLimit: 10000,
    monthlyCostLimit: 5,
    currency: 'USD',
  };
  const capability = {
    key: 'write',
    status: 'ACTIVE',
    kind: 'TEXT_GENERATION',
    riskLevel: 'LOW',
    allowedPurposes: [purpose],
  };
  const prompt = {
    key: 'prompt',
    status: 'ACTIVE',
    activeVersion: 1,
    capabilityKey: 'write',
    purpose,
  };
  const policy = {
    key: 'route',
    status: 'ACTIVE',
    capabilityKey: 'write',
    consumerKey: 'consumer',
    maxAttempts: 2,
    targets: [{ modelKey: 'model', enabled: true, priority: 1, weight: 1 }],
  };
  const definitions: Record<string, unknown> = {
    consumers: consumer,
    capabilities: capability,
    prompts: prompt,
    models: model,
    providers: {
      key: 'provider',
      status: 'ACTIVE',
      productionApproved: true,
      maxDataClassification: 'CONFIDENTIAL',
      timeoutMs: 1000,
      maxRetries: 1,
    },
    knowledgeIndexes: {
      key: 'index',
      status: 'ACTIVE',
      embeddingModelKey: 'model',
      dimensions: 2,
      sourceDomains: ['CMS'],
      chunkingStrategy: {},
    },
  };
  let stored: any = null;
  const repository = {
    find: vi.fn(async (resource: string) => definitions[resource] ?? null),
    list: vi.fn(async (resource: string) =>
      resource === 'routingPolicies'
        ? [policy]
        : ['models', 'providers'].includes(resource)
          ? [definitions[resource]]
          : [],
    ),
    findPromptVersion: vi.fn().mockResolvedValue({
      promptKey: 'prompt',
      version: 1,
      status: 'APPROVED',
      checksum: 'hash',
      template: 'Help the student.',
    }),
    findExecutionByIdempotency: vi.fn(async () => stored),
    findExecution: vi.fn(async () => stored),
    createExecutionWithQuota: vi.fn(async (record: any) => {
      if (stored) return { execution: stored, replayed: true };
      stored = { ...record, id: 'record', createdAt: new Date(), updatedAt: new Date() };
      return { execution: stored, replayed: false };
    }),
    updateExecution: vi.fn(async (_id, patch) => {
      stored = { ...stored, ...patch };
      return stored;
    }),
    appendSpan: vi.fn(),
    recordUsage: vi.fn(),
    finalizeQuotaReservation: vi.fn(),
    providerCircuitCanAttempt: vi.fn().mockResolvedValue(true),
    providerCircuitSuccess: vi.fn(),
    providerCircuitFailure: vi.fn(),
    findAsyncJob: vi.fn().mockResolvedValue(null),
    createAsyncJob: vi.fn(async (value: unknown) => value),
    createIndexingRun: vi.fn(),
    updateIndexingRun: vi.fn(async (_id, value) => value),
    replaceEmbeddings: vi.fn(),
    removeKnowledgeSource: vi.fn(),
    listKnowledgeChunks: vi.fn(),
  };
  const adapter = {
    key: 'provider',
    capabilities: ['TEXT_GENERATION', 'EMBEDDINGS'],
    status: () => 'RUNTIME_PENDING',
    invoke: vi
      .fn()
      .mockResolvedValue({ output: 'Protected answer', inputTokens: 10, outputTokens: 5 }),
    embed: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2]], inputTokens: 10 }),
  };
  const providers = { get: () => adapter, list: () => [adapter] };
  const protector = new EnvironmentAIAsyncPayloadProtector('AI_ASYNC_PAYLOAD_KEY', {
    AI_ASYNC_PAYLOAD_KEY: Buffer.alloc(32, 9).toString('base64'),
  });
  const request = {
    promptKey: 'prompt',
    capabilityKey: 'write',
    consumerKey: 'consumer',
    requesterReferenceId: 'owner',
    purpose,
    input: 'Help with my application',
    dataClassification: 'CONFIDENTIAL' as const,
    idempotencyKey: 'intent',
  };
  return { repository, adapter, providers, protector, request, definitions };
}

describe('P17 source closure execution contracts', () => {
  it('reserves budget at queue admission without calling a provider', async () => {
    const f = fixture();
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    const job = await execution.submitAsync(f.request);
    expect(job.executionPublicId).toBeTruthy();
    expect(f.repository.createExecutionWithQuota).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'QUEUED' }),
      expect.objectContaining({
        reservedTokens: expect.any(Number),
        reservedCost: expect.any(Number),
      }),
    );
    expect(f.adapter.invoke).not.toHaveBeenCalled();
  });
  it('rejects unbudgeted async admission before persisting the queue payload', async () => {
    const f = fixture();
    f.repository.createExecutionWithQuota.mockRejectedValue(
      new Error('AI_MONTHLY_COST_BUDGET_EXCEEDED'),
    );
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    await expect(execution.submitAsync(f.request)).rejects.toThrow(
      'AI_MONTHLY_COST_BUDGET_EXCEEDED',
    );
    expect(f.repository.createAsyncJob).not.toHaveBeenCalled();
    expect(f.adapter.invoke).not.toHaveBeenCalled();
  });
  it('requires a durable client intent for async admission', async () => {
    const f = fixture();
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    await expect(execution.submitAsync({ ...f.request, idempotencyKey: null })).rejects.toThrow(
      'AI_ASYNC_IDEMPOTENCY_REQUIRED',
    );
    expect(f.repository.createExecutionWithQuota).not.toHaveBeenCalled();
  });
  it('recovers the full encrypted result on replay without a second paid call', async () => {
    const f = fixture();
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    const first = await execution.execute(f.request);
    const replay = await execution.execute(f.request);
    expect(first.result).toBe('Protected answer');
    expect(replay.result).toBe(first.result);
    expect(f.adapter.invoke).toHaveBeenCalledOnce();
    expect(f.repository.recordUsage).toHaveBeenCalledOnce();
    expect(JSON.stringify(f.repository.updateExecution.mock.calls)).not.toContain(
      'Protected answer',
    );
  });
  it('rejects result-envelope owner tampering inside authenticated ciphertext', async () => {
    const f = fixture();
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    await execution.execute(f.request);
    const stored = await f.repository.findExecution('');
    stored.metadata.asyncResult.requesterReferenceId = 'intruder';
    stored.requesterReferenceId = 'intruder';
    await expect(
      execution.execute({ ...f.request, requesterReferenceId: 'intruder' }),
    ).rejects.toThrow('AI_ASYNC_RESULT_INTEGRITY_FAILED');
    expect(f.adapter.invoke).toHaveBeenCalledOnce();
  });
  it('recovers an admitted job after the insert acknowledgement is lost', async () => {
    const f = fixture();
    f.repository.createAsyncJob.mockImplementation(async (value: any) => {
      f.repository.findAsyncJob.mockResolvedValue(value);
      throw new Error('LOST_INSERT_ACK');
    });
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    const job = await execution.submitAsync(f.request);
    expect(job.status).toBe('QUEUED');
    expect(f.repository.finalizeQuotaReservation).not.toHaveBeenCalled();
    expect(f.adapter.invoke).not.toHaveBeenCalled();
  });
  it('holds reservation after lost provider acknowledgement and never redispatches on replay', async () => {
    const f = fixture();
    f.adapter.invoke.mockRejectedValue(new Error('CONNECTION_LOST_AFTER_SEND'));
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    const response = await execution.execute(f.request);
    expect(response.errorCode).toBe('AI_PROVIDER_OUTCOME_UNKNOWN');
    expect(f.repository.finalizeQuotaReservation).not.toHaveBeenCalled();
    await execution.execute(f.request);
    expect(f.adapter.invoke).toHaveBeenCalledOnce();
  });
  it('does not release a competing worker reservation when dispatch loses its state CAS', async () => {
    const f = fixture();
    f.repository.updateExecution.mockImplementation(async (_id, patch) => {
      if (patch.status === 'RUNNING') throw new Error('AI_EXECUTION_STATE_CONFLICT');
      return {};
    });
    f.repository.findExecution.mockResolvedValue({ status: 'RUNNING' });
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    await expect(execution.execute(f.request)).rejects.toThrow('AI_EXECUTION_STATE_CONFLICT');
    expect(f.repository.finalizeQuotaReservation).not.toHaveBeenCalled();
    expect(f.adapter.invoke).not.toHaveBeenCalled();
  });
  it('rejects changed frozen workflow bindings before dispatch', async () => {
    const f = fixture();
    f.definitions.consumers = { ...(f.definitions.consumers as object), consumerKey: 'workflow' };
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    const binding = await execution.freezeWorkflowBinding('prompt', 'write');
    f.definitions.models = {
      ...(f.definitions.models as object),
      providerModelId: 'changed-provider-model',
    };
    await expect(
      execution.execute(
        { ...f.request, consumerKey: 'workflow' },
        { promptVersion: binding.promptVersion, bindingFingerprint: binding.fingerprint },
      ),
    ).rejects.toThrow('AI_WORKFLOW_EXECUTION_BINDING_CHANGED');
    expect(f.adapter.invoke).not.toHaveBeenCalled();
  });
  it('enforces the remaining workflow envelope before reserving or calling a model', async () => {
    const f = fixture();
    const execution = new AIExecutionOrchestrator(
      f.repository as any,
      f.providers as any,
      f.protector,
    );
    await expect(
      execution.execute(f.request, { maximumReservedTokens: 1, maximumReservedCost: 0 }),
    ).rejects.toThrow('AI_WORKFLOW_RUN_BUDGET_EXCEEDED');
    expect(f.repository.createExecutionWithQuota).not.toHaveBeenCalled();
    expect(f.adapter.invoke).not.toHaveBeenCalled();
  });
});

describe('P17 canonical knowledge source contracts', () => {
  const source = {
    sourceType: 'CMS',
    sourceReferenceId: 'article',
    sourceVersion: 'v1',
    publishedAt: '2026-10-11T10:00:00Z',
    locale: 'ar',
    content: 'Published owner content',
    dataClassification: 'PUBLIC' as const,
    transferAllowed: true,
    readerScope: 'PUBLIC',
  };
  const input = {
    indexKey: 'index',
    sourceType: 'CMS',
    sourceReferenceId: 'article',
    actorReferenceId: 'owner',
  };
  function knowledgeFixture() {
    const f = fixture();
    f.definitions.capabilities = {
      key: 'knowledge.indexing',
      status: 'ACTIVE',
      kind: 'EMBEDDINGS',
      riskLevel: 'LOW',
    };
    f.definitions.consumers = {
      ...(f.definitions.consumers as object),
      consumerKey: 'knowledge-indexing',
    };
    const owners = { resolve: vi.fn().mockResolvedValue(source) };
    return {
      ...f,
      owners,
      knowledge: new AIKnowledgeUseCases(
        f.repository as any,
        f.providers as any,
        owners,
        f.protector,
      ),
    };
  }
  it('reads canonical content, encrypts chunks and activates the source with its indexing run', async () => {
    const f = knowledgeFixture();
    await f.knowledge.index(input);
    expect(f.owners.resolve).toHaveBeenCalledTimes(2);
    expect(f.adapter.embed).toHaveBeenCalledOnce();
    const batch = f.repository.replaceEmbeddings.mock.calls[0][0];
    expect(batch.source.status).toBe('INDEXED');
    expect(batch.runPublicId).toBeTruthy();
    expect(batch.chunks[0].chunkText).toBe('[PROTECTED]');
    expect(f.protector.unprotect(batch.chunks[0].metadata.protectedChunk)).toMatchObject({
      text: source.content,
      vector: [0.1, 0.2],
    });
    expect(JSON.stringify(batch)).not.toContain(source.content);
  });
  it.each([{sourceType:'UNIVERSITY'},{sourceReferenceId:'other'},{locale:'en'}])('refuses an owner identity change after embedding latency without replacing the prior projection',async(patch)=>{
    const f=knowledgeFixture();f.owners.resolve.mockResolvedValueOnce(source).mockResolvedValueOnce({...source,...patch});
    await expect(f.knowledge.index(input)).rejects.toThrow('AI_KNOWLEDGE_OWNER_REVISION_CHANGED');
    expect(f.adapter.embed).toHaveBeenCalledOnce();
    expect(f.repository.recordUsage).toHaveBeenCalledOnce();
    expect(f.repository.replaceEmbeddings).not.toHaveBeenCalled();
  });
  it('refuses manual content and unknown owners before embedding', async () => {
    const f = knowledgeFixture();
    await expect(f.knowledge.index({ ...input, content: 'Untrusted' })).rejects.toThrow(
      'AI_KNOWLEDGE_OWNER_VERIFICATION_REQUIRED',
    );
    f.owners.resolve.mockResolvedValue(null as any);
    await expect(f.knowledge.index(input)).rejects.toThrow(
      'AI_KNOWLEDGE_OWNER_SOURCE_NOT_AUTHORIZED',
    );
    expect(f.adapter.embed).not.toHaveBeenCalled();
  });
  it('keeps the existing active source when the canonical revision is withdrawn during embedding', async () => {
    const f = knowledgeFixture();
    f.owners.resolve.mockResolvedValueOnce(source).mockResolvedValueOnce(null as any);
    await expect(f.knowledge.index(input)).rejects.toThrow('AI_KNOWLEDGE_OWNER_REVISION_CHANGED');
    expect(f.repository.replaceEmbeddings).not.toHaveBeenCalled();
    expect(f.repository.recordUsage).toHaveBeenCalledOnce();
  });
  it('deindexes withdrawn sources before returning any retained chunk', async () => {
    const f = knowledgeFixture();
    f.owners.resolve.mockResolvedValue(null as any);
    expect(await f.knowledge.readSource('index', 'CMS', 'article', 'owner')).toEqual([]);
    expect(f.repository.removeKnowledgeSource).toHaveBeenCalledWith(
      'index',
      'CMS',
      'article',
      'owner',
    );
    expect(f.repository.listKnowledgeChunks).not.toHaveBeenCalled();
  });
  it('uses only the CMS public owner API and rejects cross-locale projection', async () => {
    const getBySlug = vi.fn().mockResolvedValue({
      slug: 'article',
      locale: 'ar',
      siteIdentifier: 'manaratak',
      publicId: 'content',
      versionNumber: 1,
      publishedAt: new Date(),
      title: 'Title',
      body: 'Body',
    });
    const gateway = new CmsAIKnowledgeOwnerGateway({ getBySlug } as any);
    expect(
      await gateway.resolve({ ...input, locale: 'en', requesterReferenceId: 'owner' }),
    ).toBeNull();
    expect(
      await gateway.resolve({ ...input, sourceType: 'STUDENT', requesterReferenceId: 'owner' }),
    ).toBeNull();
    expect(getBySlug).toHaveBeenCalledOnce();
  });
});
