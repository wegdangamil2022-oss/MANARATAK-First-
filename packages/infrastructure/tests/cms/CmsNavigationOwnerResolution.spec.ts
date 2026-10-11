import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

const ownerId = '683a90d4-abab-4f77-9f32-5a44d8288928';
const baseMenu = () => ({
  id: 'menu-1', siteIdentifier: 'manaratak', locale: 'ar',
  locationKey: 'HEADER', status: 'DRAFT', version: 2, updatedBy: 'author',
  nodes: [{
    id: 'node-1', parentNodeId: null, displayText: 'الجامعات',
    targetType: 'DOMAIN_REFERENCE', targetValue: `UNIVERSITY:${ownerId}`,
    sortOrder: 0, openInNewWindow: false, metadata: null,
  }],
});

function fixture(publicTarget = true) {
  const menu = baseMenu();
  const tx = {
    cmsNavigationMenu: {
      findUnique: vi.fn().mockResolvedValue(menu),
      update: vi.fn().mockResolvedValue({ ...menu, status: 'PUBLISHED', version: 3 }),
    },
    cmsSitePublishedSnapshot: { upsert: vi.fn().mockResolvedValue({}) },
    university: {
      findFirst: vi.fn().mockResolvedValue(publicTarget ? { id: ownerId } : null),
      findUnique: vi.fn().mockResolvedValue({ slug: 'published-university' }),
    },
  };
  const db = { $transaction: vi.fn((task: (tx: typeof tx) => Promise<unknown>) => task(tx)) };
  const repository = new PrismaCmsRepository(db as unknown as PrismaClient);
  (repository as any).appendStandaloneMutation = vi.fn().mockResolvedValue(undefined);
  return { repository, tx };
}

describe('CMS published navigation owner targets', () => {
  it('snapshots resolved public hrefs without mutating the authoring token', async () => {
    const { repository, tx } = fixture();
    await repository.publishNavigation('menu-1', 2, 'reviewer');
    expect(tx.cmsSitePublishedSnapshot.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        payload: expect.objectContaining({
          nodes: [expect.objectContaining({ targetValue: '/ar/universities/published-university' })],
        }),
      }),
    }));
    expect(tx.cmsNavigationMenu.update).toHaveBeenCalledTimes(1);
    expect(tx.cmsNavigationMenu.findUnique.mock.results[0]).toBeDefined();
  });

  it('refuses archived or missing owner targets without publishing nav or snapshots', async () => {
    const { repository, tx } = fixture(false);
    await expect(repository.publishNavigation('menu-1', 2, 'reviewer'))
      .rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    expect(tx.cmsNavigationMenu.update).not.toHaveBeenCalled();
    expect(tx.cmsSitePublishedSnapshot.upsert).not.toHaveBeenCalled();
  });
});
