import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
describe('CMS revision keyset pages', () => {
  it('pages one localization without fetching editorial payloads or skipping older versions', async () => {
    const db = {
      cmsLocalizedContent: { findUnique: vi.fn().mockResolvedValue({ id: 'en-only' }) },
      cmsContentRevision: {
        findMany: vi
          .fn()
          .mockResolvedValue(
            Array.from({ length: 21 }, (_, i) => ({
              id: `revision-${30 - i}`,
              versionNumber: 30 - i,
              reason: 'SAVED',
              capturedAt: new Date(),
              capturedBy: 'editor',
            })),
          ),
      },
    };
    const repo = new PrismaCmsRepository(db as unknown as PrismaClient);
    const page = await repo.listRevisionPage('content-1', 'en');
    expect(page.data).toHaveLength(20);
    expect(page.nextBeforeVersion).toBe(11);
    expect(page.hasMore).toBe(true);
    expect(db.cmsContentRevision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { localizedContentId: 'en-only' },
        take: 21,
        select: { id: true, versionNumber: true, reason: true, capturedAt: true, capturedBy: true },
      }),
    );
    db.cmsContentRevision.findMany.mockResolvedValue([
      {
        id: 'revision-10',
        versionNumber: 10,
        reason: 'SAVED',
        capturedAt: new Date(),
        capturedBy: 'editor',
      },
    ]);
    const older = await repo.listRevisionPage('content-1', 'en', page.nextBeforeVersion!);
    expect(db.cmsContentRevision.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { localizedContentId: 'en-only', versionNumber: { lt: 11 } },
      }),
    );
    expect(older.hasMore).toBe(false);
    expect(older.nextBeforeVersion).toBeNull();
    await expect(repo.listRevisionPage('content-1', 'en', 0)).rejects.toThrow(
      'CMS_REVISION_CURSOR_INVALID',
    );
  });
});
