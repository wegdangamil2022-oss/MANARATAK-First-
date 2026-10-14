import { describe, expect, it, vi } from 'vitest';
import { PrismaServicePlatformRepository } from '../../src/services-platform/PrismaServicePlatformRepository';
describe('Section 21 catalog page snapshot', () => {
  it('applies country AND language to rows and total inside the same read transaction', async () => {
    const model = { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(37) };
    const db = { $transaction: vi.fn(async (fn: any) => fn({ serviceCatalogRecord: model })) };
    const result = await new PrismaServicePlatformRepository(db as never).list({
      supportedCountryReferenceId: 'country',
      supportedLanguageReferenceId: 'language',
      fulfillmentType: 'CONSULTATION' as never,
      page: 2,
      pageSize: 20,
    });
    const args = model.findMany.mock.calls[0] as any;
    expect(args[0]).toMatchObject({
      where: {
        supportedCountries: { some: { countryReferenceId: 'country' } },
        supportedLanguages: { some: { languageReferenceId: 'language' } },
        fulfillmentType: 'CONSULTATION',
      },
      skip: 20,
      take: 20,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    expect(model.count).toHaveBeenCalledWith({ where: args[0].where });
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
    expect(result).toMatchObject({ total: 37, page: 2, totalPages: 2 });
  });
});
