import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
describe('CMS signed editorial facts', () => {
  it('refuses approval when a root field changed after review request, with no workflow/public mutation', async () => {
    const root = {
      id: 'root',
      version: 1,
      authorId: 'author',
      lastModifiedBy: 'author',
      title: 'Original approved root',
      contentType: 'ARTICLE',
      siteIdentifier: 'absheer',
    };
    const localization = {
      id: 'localized',
      contentId: 'root',
      version: 2,
      state: 'IN_REVIEW',
      locale: 'ar',
      lastModifiedBy: 'editor',
      title: 'Title',
      body: 'Body',
      tags: [],
      attachments: [],
    };
    const tx = {
      cmsContentNode: { findUnique: vi.fn().mockResolvedValue(root) },
      cmsLocalizedContent: { findUnique: vi.fn().mockResolvedValue(localization), update: vi.fn() },
      cmsContentDomainLink: { findMany: vi.fn().mockResolvedValue([]) },
      cmsWorkflowReview: { findFirst: vi.fn(), update: vi.fn() },
    };
    const repo = new PrismaCmsRepository({
      $transaction: (task: (client: typeof tx) => Promise<unknown>) => task(tx),
    } as unknown as PrismaClient);
    const fingerprint = await (
      repo as unknown as {
        editorialFingerprint: (
          tx: typeof tx,
          root: typeof root,
          locale: typeof localization,
        ) => Promise<string>;
      }
    ).editorialFingerprint(tx, root, localization);
    tx.cmsWorkflowReview.findFirst.mockResolvedValue({
      id: 'review',
      requestedBy: 'requester',
      reviewSnapshotHash: fingerprint,
    });
    root.title = 'Unreviewed change';
    await expect(
      repo.approveReview({
        contentId: 'root',
        locale: 'ar',
        expectedVersion: 2,
        actorId: 'checker',
      }),
    ).rejects.toThrow('CMS_APPROVAL_STALE');
    expect(tx.cmsWorkflowReview.update).not.toHaveBeenCalled();
    expect(tx.cmsLocalizedContent.update).not.toHaveBeenCalled();
  });
});
