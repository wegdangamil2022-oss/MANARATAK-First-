import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
import { CmsContentStatus } from '@manaratak/domain';

describe('CMS editorial listing scope', () => {
  it('counts and pages the same locale-specific lifecycle, including multilingual roots', async () => {
    const db = {
      cmsContentNode: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(41),
      },
    };
    const repo = new PrismaCmsRepository(db as any);
    const result = await repo.listContent({
      siteIdentifier: 'manaratak',
      locale: 'ar',
      status: CmsContentStatus.SCHEDULED,
      page: 2,
      pageSize: 20,
      q: 'admission',
    });
    const args = db.cmsContentNode.findMany.mock.calls[0][0];
    expect(args.where.localizedPayloads).toEqual({ some: { locale: 'ar', state: 'SCHEDULED' } });
    expect(args.where.status).toBeUndefined();
    expect(args.skip).toBe(20);
    expect(args.take).toBe(20);
    expect(db.cmsContentNode.count).toHaveBeenCalledWith({ where: args.where });
    expect(result).toMatchObject({ total: 41, page: 2, totalPages: 3 });
  });
  it('retains aggregate root status filtering when no locale is selected', async () => {
    const db = {
      cmsContentNode: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    await new PrismaCmsRepository(db as any).listContent({ status: CmsContentStatus.PUBLISHED });
    expect(db.cmsContentNode.count).toHaveBeenCalledWith({ where: { status: 'PUBLISHED' } });
  });
});
