import { describe, expect, it, vi } from 'vitest';
import { PrismaAIPlatformRepository } from '../../src/ai-platform/PrismaAIPlatformRepository';

describe('PrismaAIPlatformRepository governance boundary', () => {
  it('rejects raw provider secrets before persistence', async () => {
    const transaction = vi.fn();
    const repository = new PrismaAIPlatformRepository({ $transaction: transaction });
    await expect(repository.upsert('providers', { key: 'provider', apiKey: 'forbidden' }, 'actor')).rejects.toThrow('AI_SECRET_MATERIAL_FORBIDDEN');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('writes registry, audit, and outbox evidence in one transaction', async () => {
    const saved = { id: 'registry-1', key: 'provider', resourceType: 'providers', status: 'DRAFT', secretReference: 'PROVIDER_API_KEY', configuration: { displayName: 'Provider' } };
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue(saved) },
      auditRecord: { create: vi.fn().mockResolvedValue({}) },
      transactionalOutboxRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    const repository = new PrismaAIPlatformRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) });
    await expect(repository.upsert('providers', { key: 'provider', displayName: 'Provider', status: 'DRAFT', secretReference: 'PROVIDER_API_KEY' }, 'actor')).resolves.toMatchObject({ key: 'provider', secretReference: 'PROVIDER_API_KEY' });
    expect(tx.aIRegistryRecord.upsert).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
  });

  it('rejects self-approval inside the transaction before any state change', async () => {
    const tx = {
      aIPromptVersionRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'v1', status: 'REVIEW', createdBy: 'author-1' }),
        updateMany: vi.fn(),
      },
    };
    const repository = new PrismaAIPlatformRepository({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) });
    await expect(repository.approvePromptVersion('prompt', 1, 'author-1')).rejects.toThrow('AI_PROMPT_SELF_APPROVAL_FORBIDDEN');
    expect(tx.aIPromptVersionRecord.updateMany).not.toHaveBeenCalled();
  });

  it('refuses prompt deployment by either maker or checker', async () => {
    for (const actor of ['author-1', 'reviewer-1']) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        aIPromptVersionRecord: {
          findUnique: vi.fn().mockResolvedValue({ id: 'v1', status: 'APPROVED', createdBy: 'author-1', approvedBy: 'reviewer-1' }),
        },
        aIPromptDeploymentRecord: { create: vi.fn(), updateMany: vi.fn() },
      };
      const repository = new PrismaAIPlatformRepository({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) });
      await expect(repository.deployPrompt('prompt', 1, actor)).rejects.toThrow('AI_PROMPT_DEPLOYER_NOT_INDEPENDENT');
      expect(tx.aIPromptDeploymentRecord.create).not.toHaveBeenCalled();
    }
  });

  it('queries only due async jobs before pagination, oldest first', async () => {
    const findMany = vi.fn().mockResolvedValue([{ publicId: 'older-due' }]);
    const repository = new PrismaAIPlatformRepository({ aIAsyncJobRecord: { findMany } });
    const now = new Date('2026-10-11T12:00:00Z');
    expect(await repository.listClaimableAsyncJobs(5, now)).toEqual([{ publicId: 'older-due' }]);
    const query = findMany.mock.calls[0][0];
    expect(query.take).toBe(5);
    expect(query.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(query.where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'RUNNING', leaseExpiresAt: { lte: now } }),
      expect.objectContaining({ status: 'RETRYING' }),
    ]));
  });


  it('requires independent evaluation review and rejects a second approval', async () => {
    const baseRun = {
      publicId: 'aiev_1', id: 'record-1', status: 'COMPLETED', targetEvidence: {
        submittedBy: 'author-1', executedBy: 'operator-1',
        definitionChecksum: 'definition-hash', resultChecksum: 'test-result-hash',
      },
      score: 1, results: [], safetyFailures: 0, targetChecksum: 'prompt-hash',
    };
    for (const [reviewer, record, expected] of [
      ['author-1', baseRun, 'AI_EVALUATION_INDEPENDENT_REVIEW_REQUIRED'],
      ['operator-1', baseRun, 'AI_EVALUATION_INDEPENDENT_REVIEW_REQUIRED'],
      ['reviewer-1', { ...baseRun, approvedBy: 'other-reviewer' }, 'AI_EVALUATION_ALREADY_APPROVED'],
      ['reviewer-1', baseRun, 'AI_EVALUATION_RESULT_EVIDENCE_CHANGED'],
    ] as const) {
      const tx = {
        aIEvaluationRunRecord: {
          findUnique: vi.fn().mockResolvedValue(record), updateMany: vi.fn(),
        },
      };
      const repository = new PrismaAIPlatformRepository({
        $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
      });
      await expect(repository.approveEvaluationRun('aiev_1', reviewer)).rejects.toThrow(expected);
      expect(tx.aIEvaluationRunRecord.updateMany).not.toHaveBeenCalled();
    }
  });

});
