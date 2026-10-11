import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

describe('CMS indexed public redirect projection', () => {
  it('uses only the tenant/locale/source composite identity and active record', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      siteIdentifier: 'manaratak', locale: 'ar',
      sourcePath: '/ar/articles/old', destinationPath: '/ar/articles/new',
      statusCode: 301, active: true,
    });
    const findMany = vi.fn();
    const owner = new PrismaCmsRepository({
      cmsRedirect: { findUnique, findMany },
    } as unknown as PrismaClient);
    const result = await owner.resolveActiveRedirect('manaratak', 'ar', '/ar/articles/old');
    expect(result?.destinationPath).toBe('/ar/articles/new');
    expect(findUnique).toHaveBeenCalledWith({
      where: { siteIdentifier_locale_sourcePath: {
        siteIdentifier: 'manaratak', locale: 'ar', sourcePath: '/ar/articles/old',
      } },
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('suppresses disabled redirects and does not enumerate all site redirects', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      sourcePath: '/ar/articles/retired', destinationPath: '/ar/articles/new',
      active: false, statusCode: 301,
    });
    const findMany = vi.fn();
    const owner = new PrismaCmsRepository({
      cmsRedirect: { findUnique, findMany },
    } as unknown as PrismaClient);
    expect(await owner.resolveActiveRedirect('manaratak', 'ar', '/ar/articles/retired')).toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });
});
