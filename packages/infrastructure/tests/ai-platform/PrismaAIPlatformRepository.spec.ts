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
    const tx = {
      aIRegistryRecord: { upsert: vi.fn().mockResolvedValue(saved) },
      auditRecord: { create: vi.fn().mockResolvedValue({}) },
      transactionalOutboxRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    const repository = new PrismaAIPlatformRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) });
    await expect(repository.upsert('providers', { key: 'provider', displayName: 'Provider', status: 'DRAFT', secretReference: 'PROVIDER_API_KEY' }, 'actor')).resolves.toMatchObject({ key: 'provider', secretReference: 'PROVIDER_API_KEY' });
    expect(tx.aIRegistryRecord.upsert).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
  });
});
