import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
const ownerId = '683a90d4-abab-4f77-9f32-5a44d8288928';
describe('CMS published navigation owner freshness', () => {
  it('re-resolves a renamed owner without reading current draft navigation and omits retired parent/children', async () => {
    const menu = {
      siteIdentifier: 'manaratak',
      locale: 'ar',
      locationKey: 'HEADER',
      nodes: [
        {
          id: 'owner',
          targetType: 'DOMAIN_REFERENCE',
          targetValue: '/ar/universities/old',
          metadata: { cmsTargetReference: `UNIVERSITY:${ownerId}` },
        },
        {
          id: 'retired',
          targetType: 'CMS_CONTENT',
          targetValue: '/ar/articles/old',
          metadata: { cmsTargetReference: 'retired-content' },
        },
        {
          id: 'orphan-child',
          parentNodeId: 'retired',
          targetType: 'EXTERNAL_URL',
          targetValue: 'https://example.com',
        },
      ],
    };
    const db = {
      cmsSitePublishedSnapshot: {
        findMany: vi.fn().mockResolvedValue([{ sourceId: 'menu', payload: menu }]),
      },
      cmsNavigationMenu: { findMany: vi.fn().mockResolvedValue([]) },
      university: {
        findFirst: vi.fn().mockResolvedValue({ id: ownerId }),
        findUnique: vi.fn().mockResolvedValue({ slug: 'new-slug' }),
      },
      cmsPublishedContent: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const repo = new PrismaCmsRepository(db as unknown as PrismaClient);
    const result = await repo.listPublishedNavigation('manaratak', 'ar');
    expect(result[0].nodes).toEqual([
      expect.objectContaining({ id: 'owner', targetValue: '/ar/universities/new-slug' }),
    ]);
    expect(result[0].nodes[0].metadata).not.toHaveProperty('cmsTargetReference');
    expect(db.cmsNavigationMenu.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteIdentifier: 'manaratak', locale: 'ar', status: 'PUBLISHED' },
      }),
    );
    db.university.findFirst.mockRejectedValue(new Error('OWNER_DATABASE_UNAVAILABLE'));
    await expect(repo.listPublishedNavigation('manaratak', 'ar')).rejects.toThrow(
      'OWNER_DATABASE_UNAVAILABLE',
    );
  });
});
