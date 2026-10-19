import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
describe('CMS block public retirement', () => {
  it('retires the snapshot only after a successful version CAS and audits in the same transaction', async () => {
    const block = {
      id: 'block',
      version: 4,
      status: 'PUBLISHED',
      siteIdentifier: 'absheer',
      locale: 'en',
      payload: { title: 'Title' },
    };
    const tx = {
      cmsContentBlock: {
        findUnique: vi.fn().mockResolvedValue(block),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cmsSitePublishedSnapshot: { deleteMany: vi.fn() },
    };
    const transaction = vi.fn((task: (client: typeof tx) => Promise<unknown>) => task(tx));
    const repo = new PrismaCmsRepository({ $transaction: transaction } as unknown as PrismaClient);
    const audit = vi.fn();
    (repo as unknown as { appendStandaloneMutation: typeof audit }).appendStandaloneMutation =
      audit;
    await repo.archiveBlock('block', 4, 'publisher');
    expect(tx.cmsSitePublishedSnapshot.deleteMany).toHaveBeenCalledWith({
      where: { kind: 'BLOCK', sourceId: 'block' },
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(audit).toHaveBeenCalledWith(
      tx,
      'block',
      'CmsContentBlock',
      'BLOCK_ARCHIVED',
      'publisher',
      expect.objectContaining({ reviewedVersion: 4 }),
    );
    tx.cmsSitePublishedSnapshot.deleteMany.mockClear();
    audit.mockClear();
    tx.cmsContentBlock.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.archiveBlock('block', 4, 'publisher')).rejects.toThrow(
      'CMS_VERSION_CONFLICT',
    );
    expect(tx.cmsSitePublishedSnapshot.deleteMany).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
});
