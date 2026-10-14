import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AIExecutionOrchestrator,
  AIKnowledgeUseCases,
} from '../../src/ai-platform/use-cases/AIPlatformUseCases';
const source = () => ({
  sourceType: 'CMS',
  sourceReferenceId: 'page',
  sourceVersion: 'v1',
  locale: 'ar',
  content: 'Current owner publication',
  publishedAt: '2026-10-14T00:00:00Z',
  dataClassification: 'PUBLIC',
  readerScope: 'PUBLIC',
  transferAllowed: true,
});
function knowledgeFixture() {
  const current = source();
  const expiresAt = '2099-12-31T23:59:59Z';
  const decoded = {
    text: 'Protected published chunk',
    indexKey: 'index',
    sourceType: 'CMS',
    sourceReferenceId: 'page',
    sourceVersion: 'v1',
    readerScope: 'PUBLIC',
    expiresAt,
  };
  const row = {
    metadata: {
      expiresAt,
      sourceChecksum: createHash('sha256').update(current.content).digest('hex'),
      protectedChunk: { ciphertext: 'encrypted', iv: 'iv', authTag: 'tag', keyVersion: 'v1' },
    },
  };
  const repository = {
    find: vi.fn().mockResolvedValue({ key: 'index', status: 'ACTIVE', sourceDomains: ['CMS'] }),
    listKnowledgeChunks: vi.fn().mockResolvedValue([row]),
    removeKnowledgeSource: vi.fn(),
  };
  const owners = { resolve: vi.fn().mockResolvedValue(current) };
  const payloads = {
    status: () => 'READY',
    unprotect: vi.fn().mockReturnValue(decoded),
    protect: vi.fn(),
  };
  const providers = { get: vi.fn(), list: vi.fn() };
  return {
    current,
    decoded,
    row,
    repository,
    owners,
    payloads,
    providers,
    knowledge: new AIKnowledgeUseCases(
      repository as any,
      providers as any,
      owners as any,
      payloads as any,
    ),
  };
}
afterEach(() => vi.useRealTimers());
describe('Section 18 current owner and index read authority', () => {
  it('decrypts only the current authorized source and does not issue an embedding/provider call', async () => {
    const f = knowledgeFixture();
    expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader', 'ar')).toEqual([
      { text: 'Protected published chunk' },
    ]);
    expect(f.repository.listKnowledgeChunks).toHaveBeenCalledWith('index', 'CMS', 'page', 'v1');
    expect(f.providers.get).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { status: 'DISABLED', sourceDomains: ['CMS'] },
    { status: 'ACTIVE', sourceDomains: ['COURSE'] },
  ])('does not resolve or decrypt a disabled or no-longer-authorized index', async (index) => {
    const f = knowledgeFixture();
    f.repository.find.mockResolvedValue(index);
    expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader')).toEqual([]);
    expect(f.owners.resolve).not.toHaveBeenCalled();
    expect(f.payloads.unprotect).not.toHaveBeenCalled();
    expect(f.repository.removeKnowledgeSource).not.toHaveBeenCalled();
  });
  it.each([
    { sourceType: 'UNIVERSITY' },
    { sourceReferenceId: 'other' },
    { locale: 'en' },
    { readerScope: 'another-reader' },
    { dataClassification: 'CONFIDENTIAL' },
  ])(
    'denies mismatched owner provenance without deindexing an unrelated projection',
    async (patch) => {
      const f = knowledgeFixture();
      f.owners.resolve.mockResolvedValue({ ...f.current, ...patch });
      expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader', 'ar')).toEqual([]);
      expect(f.repository.listKnowledgeChunks).not.toHaveBeenCalled();
      expect(f.payloads.unprotect).not.toHaveBeenCalled();
      expect(f.repository.removeKnowledgeSource).not.toHaveBeenCalled();
    },
  );
  it('rejects content drift even if an owner reuses the source version', async () => {
    const f = knowledgeFixture();
    f.owners.resolve.mockResolvedValue({ ...f.current, content: 'Different owner content' });
    await expect(f.knowledge.readSource('index', 'CMS', 'page', 'reader')).rejects.toThrow(
      'AI_KNOWLEDGE_OWNER_REVISION_CHANGED',
    );
    expect(f.payloads.unprotect).not.toHaveBeenCalled();
  });
  it('does not decrypt expired protected chunks', async () => {
    const f = knowledgeFixture();
    f.row.metadata.expiresAt = '2000-01-01T00:00:00Z';
    expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader')).toEqual([]);
    expect(f.payloads.unprotect).not.toHaveBeenCalled();
  });
  it('does not return a chunk whose retention expired during decryption', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T00:00:00Z'));
    const f = knowledgeFixture();
    const deadline = '2026-10-14T00:00:01Z';
    f.row.metadata.expiresAt = deadline;
    f.decoded.expiresAt = deadline;
    f.payloads.unprotect.mockImplementation(() => {
      vi.setSystemTime(new Date('2026-10-14T00:00:02Z'));
      return f.decoded;
    });
    expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader')).toEqual([]);
  });
  it('does not deindex another locale when the owner returns a mismatched withdrawn locale', async () => {
    const f = knowledgeFixture();
    f.owners.resolve.mockResolvedValue({ ...f.current, locale: 'en', transferAllowed: false });
    expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader', 'ar')).toEqual([]);
    expect(f.repository.removeKnowledgeSource).not.toHaveBeenCalled();
  });
  it('still retires a canonical public CMS projection after owner withdrawal', async () => {
    const f = knowledgeFixture();
    f.owners.resolve.mockResolvedValue({ ...f.current, transferAllowed: false });
    expect(await f.knowledge.readSource('index', 'CMS', 'page', 'reader')).toEqual([]);
    expect(f.repository.removeKnowledgeSource).toHaveBeenCalledWith(
      'index',
      'CMS',
      'page',
      'reader',
    );
  });
  it('blocks an incorrectly public-scoped private source before indexing or provider dispatch', async () => {
    const f = knowledgeFixture();
    f.owners.resolve.mockResolvedValue({ ...f.current, dataClassification: 'STUDENT_PRIVATE' });
    await expect(
      f.knowledge.index({
        indexKey: 'index',
        sourceType: 'CMS',
        sourceReferenceId: 'page',
        actorReferenceId: 'reader',
      }),
    ).rejects.toThrow('AI_KNOWLEDGE_OWNER_SOURCE_NOT_AUTHORIZED');
    expect(f.providers.get).not.toHaveBeenCalled();
  });
});
function resultFixture(status: string) {
  const artifact = {
    ciphertext: 'encrypted',
    iv: 'iv',
    authTag: 'tag',
    keyVersion: 'v1',
    jobPublicId: 'aij_job',
    requesterReferenceId: 'owner',
    expiresAt: '2099-12-31T23:59:59Z',
  };
  const repository = {
    findAsyncJob: vi.fn().mockResolvedValue({
      publicId: 'aij_job',
      status: 'COMPLETED',
      requesterReferenceId: 'owner',
      executionPublicId: 'ai_exec',
    }),
    findExecution: vi.fn().mockResolvedValue({
      publicId: 'ai_exec',
      status,
      requesterReferenceId: 'owner',
      metadata: { asyncResult: artifact },
    }),
  };
  const payloads = {
    status: () => 'READY',
    protect: vi.fn(),
    unprotect: vi.fn().mockReturnValue({
      result: 'Requester-owned result',
      jobPublicId: 'aij_job',
      requesterReferenceId: 'owner',
      expiresAt: artifact.expiresAt,
    }),
  };
  return {
    repository,
    payloads,
    execution: new AIExecutionOrchestrator(repository as any, {} as any, payloads as any),
  };
}
describe('Section 18 async result eligibility', () => {
  it.each(['BLOCKED', 'FAILED', 'RUNNING', 'CANCELLED', 'REVIEW_REQUIRED'])(
    'does not decrypt retained output when the execution is %s',
    async (status) => {
      const f = resultFixture(status);
      await expect(f.execution.findAsyncResultForRequester('aij_job', 'owner')).rejects.toThrow(
        'AI_ASYNC_RESULT_NOT_AVAILABLE',
      );
      expect(f.payloads.unprotect).not.toHaveBeenCalled();
    },
  );
  it('still returns a completed requester-owned protected result', async () => {
    const f = resultFixture('COMPLETED');
    expect(await f.execution.findAsyncResultForRequester('aij_job', 'owner')).toMatchObject({
      result: 'Requester-owned result',
    });
  });
  it('denies foreign requesters before even reading the execution', async () => {
    const f = resultFixture('COMPLETED');
    expect(await f.execution.findAsyncResultForRequester('aij_job', 'intruder')).toBeNull();
    expect(f.repository.findExecution).not.toHaveBeenCalled();
    expect(f.payloads.unprotect).not.toHaveBeenCalled();
  });
});
