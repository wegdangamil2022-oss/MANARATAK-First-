import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

describe('CMS related published selection', () => {
  it('does not promote a noindex published locale into canonical/hreflang discovery', async () => {
    const prisma = {
      cmsPublishedContent: {
        findMany: vi.fn().mockResolvedValue([
          { contentId: 'node-1', locale: 'ar', slug: 'arabic-guide', seoMetadata: { noIndex: false } },
          { contentId: 'node-1', locale: 'en', slug: 'english-guide', seoMetadata: { noIndex: true } },
        ]),
      },
    };
    const owner = new PrismaCmsRepository(prisma as unknown as PrismaClient);
    const map = await (owner as any).availableLocales(['node-1']);
    expect(map.get('node-1')).toEqual([{ locale: 'ar', slug: 'arabic-guide' }]);
    expect(prisma.cmsPublishedContent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ seoMetadata: true }),
    }));
  });

  it('filters by published site and requested locale before selecting a bounded unique result', async () => {
    const prisma = {
      university: { findFirst: vi.fn().mockResolvedValue({ id: 'target-1' }) },
      $queryRaw: vi.fn().mockResolvedValue([{ contentId: 'content-1' }]),
      cmsPublishedContent: {
        findMany: vi.fn().mockResolvedValue([{ id: 'pub-1', contentId: 'content-1', locale: 'en', status: 'PUBLISHED' }]),
      },
    };
    const owner = new PrismaCmsRepository(prisma as unknown as PrismaClient);
    // The public mapper and locale index are tested separately; this contract
    // targets the owner selection boundary without a database or live provider.
    (owner as any).availableLocales = vi.fn().mockResolvedValue(new Map([['content-1', [{ locale: 'en', slug: 'guide' }]]]));
    (owner as any).publicContent = vi.fn((row: { contentId: string }) => ({ contentId: row.contentId }));
    const results = await owner.listPublishedByDomainTarget('UNIVERSITY', 'target-1', 'en', 'manaratak', 6);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.cmsPublishedContent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        contentId: { in: ['content-1'] }, siteIdentifier: 'manaratak',
        locale: 'en', status: 'PUBLISHED',
      },
    }));
    expect(results).toEqual([{ contentId: 'content-1' }]);
  });

  it('skips published lookups when the scoped selection has no matching owners', async () => {
    const prisma = {
      course: { findFirst: vi.fn().mockResolvedValue(null) },
      $queryRaw: vi.fn().mockResolvedValue([]),
      cmsPublishedContent: { findMany: vi.fn() },
    };
    const owner = new PrismaCmsRepository(prisma as unknown as PrismaClient);
    expect(await owner.listPublishedByDomainTarget('COURSE', 'missing', 'ar', 'manaratak', 6)).toEqual([]);
    expect(prisma.cmsPublishedContent.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
