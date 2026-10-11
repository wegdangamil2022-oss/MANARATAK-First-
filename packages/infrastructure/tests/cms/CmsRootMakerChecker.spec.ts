import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

describe('CMS effective-root-editor maker-checker', () => {
  it('prevents the latest root editor from approving another authors requested review', async () => {
    const tx = {
      cmsContentNode: { findUnique: vi.fn().mockResolvedValue({
        id: 'root-1', authorId: 'original-author', lastModifiedBy: 'reviewer',
      }) },
      cmsLocalizedContent: { findUnique: vi.fn().mockResolvedValue({
        id: 'localized-1', contentId: 'root-1', locale: 'ar',
        version: 3, state: 'IN_REVIEW', lastModifiedBy: 'locale-editor',
      }) },
      cmsWorkflowReview: { findFirst: vi.fn().mockResolvedValue({
        id: 'review-1', requestedBy: 'requester', reviewSnapshotHash: 'digest',
      }) },
    };
    const db = { $transaction: vi.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
    const repo = new PrismaCmsRepository(db as unknown as PrismaClient);
    await expect(repo.approveReview({
      contentId: 'root-1', locale: 'ar', actorId: 'reviewer', expectedVersion: 3,
    })).rejects.toThrow('CMS_MAKER_CHECKER_VIOLATION');
    expect(tx.cmsWorkflowReview.findFirst).toHaveBeenCalledTimes(1);
  });

  it('records authenticated root actor on changes through conditional version writes', async () => {
    const tx = {
      cmsContentNode: {
        findUnique: vi.fn().mockResolvedValueOnce({
          id: 'root-1', version: 2, authorId: 'original-author', slug: 'guide',
        }).mockResolvedValueOnce({
          id: 'root-1', version: 3, authorId: 'original-author',
          lastModifiedBy: 'root-editor', slug: 'guide',
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      cmsPublishedContent: { findFirst: vi.fn().mockResolvedValue(null) },
      cmsLocalizedContent: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const db = { $transaction: vi.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)) };
    const repo = new PrismaCmsRepository(db as unknown as PrismaClient);
    (repo as any).appendMutation = vi.fn().mockResolvedValue(undefined);
    await repo.updateContent('root-1', { title: 'Updated', expectedVersion: 2 }, 'root-editor');
    expect(tx.cmsContentNode.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'root-1', version: 2 },
      data: expect.objectContaining({ lastModifiedBy: 'root-editor', version: { increment: 1 } }),
    }));
  });
});
