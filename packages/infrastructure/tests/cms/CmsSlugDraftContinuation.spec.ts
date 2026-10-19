import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
function fixture() {
  const localized = {
    id: 'localized-1',
    contentId: 'content-1',
    locale: 'ar',
    state: 'DRAFT',
    localizedSlug: 'new-slug',
    version: 3,
    lastModifiedBy: 'editor',
  };
  const tx = {
    cmsContentNode: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          id: 'content-1',
          siteIdentifier: 'absheer',
          primaryLocale: 'ar',
          contentType: 'ARTICLE',
        }),
    },
    cmsLocalizedContent: {
      findUnique: vi.fn().mockResolvedValue(localized),
      upsert: vi.fn().mockResolvedValue({ ...localized, version: 4 }),
    },
    cmsPublishedContent: {
      findUnique: vi.fn().mockResolvedValue({ slug: 'old-slug', contentId: 'content-1' }),
    },
    cmsScheduledJob: { updateMany: vi.fn() },
    cmsRedirect: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
  };
  const db = { $transaction: vi.fn((task: (client: typeof tx) => Promise<unknown>) => task(tx)) };
  const repo = new PrismaCmsRepository(db as unknown as PrismaClient);
  const internals = repo as unknown as {
    captureRevision: ReturnType<typeof vi.fn>;
    syncRootLifecycle: ReturnType<typeof vi.fn>;
    appendMutation: ReturnType<typeof vi.fn>;
  };
  internals.captureRevision = vi.fn();
  internals.syncRootLifecycle = vi.fn();
  internals.appendMutation = vi.fn();
  return { repo, tx, db };
}
function internalsFor(repo: PrismaCmsRepository) {
  return repo as unknown as { syncRootLifecycle: ReturnType<typeof vi.fn> };
}

describe('CMS draft continuation after governed slug change', () => {
  it('allows saving the already-governed draft slug while the old publication stays live', async () => {
    const { repo, tx } = fixture();
    await repo.upsertLocalizedContent({
      contentId: 'content-1',
      locale: 'ar',
      localizedSlug: 'new-slug',
      title: 'Updated',
      body: 'Approved later',
      expectedVersion: 3,
      actorId: 'editor',
    });
    expect(tx.cmsLocalizedContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ localizedSlug: 'new-slug', state: 'DRAFT' }),
      }),
    );
    expect(tx.cmsPublishedContent.findUnique).toHaveBeenCalledTimes(1);
    expect(internalsFor(repo).syncRootLifecycle).toHaveBeenCalledWith(
      tx,
      'content-1',
      expect.objectContaining({ lastModifiedBy: 'editor' }),
    );
    // No published-content write is exposed in this authoring transaction.
  });
  it('refuses an arbitrary slug override through ordinary localized editing', async () => {
    const { repo, tx } = fixture();
    await expect(
      repo.upsertLocalizedContent({
        contentId: 'content-1',
        locale: 'ar',
        localizedSlug: 'bypassed-slug',
        title: 'Updated',
        body: 'Text',
        expectedVersion: 3,
        actorId: 'editor',
      }),
    ).rejects.toThrow('CMS_CANONICAL_IDENTITY_IMMUTABLE');
    expect(tx.cmsLocalizedContent.upsert).not.toHaveBeenCalled();
    expect(tx.cmsScheduledJob.updateMany).not.toHaveBeenCalled();
  });
  it('rejects another publication slug and a redirect owned by someone else before any change', async () => {
    for (const ownerConflict of [false, true]) {
      const { repo, tx } = fixture();
      tx.cmsPublishedContent.findUnique.mockResolvedValue(
        ownerConflict ? null : { contentId: 'other-content', slug: 'candidate' },
      );
      tx.cmsRedirect.findUnique.mockResolvedValue(
        ownerConflict ? { contentId: 'other-content' } : null,
      );
      await expect(
        repo.changeLocalizedSlug({
          contentId: 'content-1',
          locale: 'ar',
          newSlug: 'candidate',
          reason: 'Correct title',
          expectedVersion: 3,
          actorId: 'editor',
        }),
      ).rejects.toThrow(ownerConflict ? 'CMS_REDIRECT_OWNER_CONFLICT' : 'CMS_SLUG_CONFLICT');
      expect(tx.cmsRedirect.upsert).not.toHaveBeenCalled();
      expect(tx.cmsScheduledJob.updateMany).not.toHaveBeenCalled();
    }
  });
  it('maps a database serialization conflict to an explicit editorial conflict', async () => {
    const { repo, db } = fixture();
    db.$transaction.mockRejectedValue({ code: 'P2034' });
    await expect(
      repo.upsertLocalizedContent({
        contentId: 'content-1',
        locale: 'ar',
        localizedSlug: 'new-slug',
        title: 'Updated',
        body: 'Text',
        expectedVersion: 3,
        actorId: 'editor',
      }),
    ).rejects.toThrow('CMS_VERSION_CONFLICT');
  });
});
