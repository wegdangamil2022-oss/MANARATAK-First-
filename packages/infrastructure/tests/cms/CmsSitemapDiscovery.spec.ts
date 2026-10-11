import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

describe('authoritative CMS sitemap discovery', () => {
  function fake(rows: any[]) {
    const findMany = vi.fn().mockResolvedValue(rows);
    const repo = new PrismaCmsRepository({ cmsPublishedContent: { findMany } } as unknown as PrismaClient);
    return { repo, findMany };
  }

  it('lists only the indexed public snapshot and ignores noindex language variants', async () => {
    const { repo, findMany } = fake([
      {
        contentId: 'cms-1', locale: 'ar', slug: 'arabic-guide',
        contentType: 'STUDY_GUIDE', canonicalUrl: '/ar/study-guides/arabic-guide',
        seoMetadata: { noIndex: false },
      },
      {
        contentId: 'cms-1', locale: 'en', slug: 'english-guide',
        contentType: 'STUDY_GUIDE', canonicalUrl: '/en/study-guides/english-guide',
        seoMetadata: { noIndex: true },
      },
    ]);
    expect(await repo.listIndexableSitemapEntries('manaratak')).toEqual([
      { contentId: 'cms-1', locale: 'ar', canonicalPath: '/ar/study-guides/arabic-guide' },
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { siteIdentifier: 'manaratak', status: 'PUBLISHED' },
      select: expect.objectContaining({ seoMetadata: true, canonicalUrl: true }),
      take: 50_001,
    }));
  });

  it('rejects a stored canonical mismatch instead of generating search poison', async () => {
    const { repo } = fake([{
      contentId: 'cms-1', locale: 'ar', slug: 'correct-slug',
      contentType: 'NEWS', canonicalUrl: '/ar/news/different',
      seoMetadata: { noIndex: false },
    }]);
    await expect(repo.listIndexableSitemapEntries('manaratak'))
      .rejects.toThrow('CMS_SITEMAP_CANONICAL_MISMATCH');
  });

  it('refuses cross-site enumeration and truncated oversized site discovery', async () => {
    const { repo, findMany } = fake([]);
    await expect(repo.listIndexableSitemapEntries('another-site'))
      .rejects.toThrow('CMS_SITE_SCOPE_UNSUPPORTED');
    expect(findMany).not.toHaveBeenCalled();
    const huge = fake(Array(50_001).fill({}));
    await expect(huge.repo.listIndexableSitemapEntries('manaratak'))
      .rejects.toThrow('CMS_SITEMAP_SPLIT_REQUIRED');
  });
});
