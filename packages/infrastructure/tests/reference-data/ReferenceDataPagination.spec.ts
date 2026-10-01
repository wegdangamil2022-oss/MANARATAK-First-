import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { ReferenceDataCollection } from '@manaratak/domain';
import { PrismaReferenceDataRepository } from '../../src/reference-data/PrismaReferenceDataRepository';

describe('ReferenceData Prisma pagination queries (no database)', () => {
  it.each([
    ['countries', 'referenceCountry', 'listCountries'], ['currencies', 'referenceCurrency', 'listCurrencies'],
    ['languages', 'referenceLanguage', 'listLanguages'], ['cities', 'referenceCity', 'listCities'], ['regions', 'administrativeRegion', 'listRegions'],
  ] as const)('uses identical list/count filters and deterministic page order for %s', async (collection, delegate, method) => {
    const findMany = vi.fn().mockResolvedValue([]); const count = vi.fn().mockResolvedValue(151);
    const repository = new PrismaReferenceDataRepository({ [delegate]: { findMany, count } } as unknown as PrismaClient);
    const filters = { page: 2, pageSize: 50, activeOnly: true, countryIso2Code: 'YE', q: 'City' };
    await repository[method](filters); expect(await repository.countRecords(collection as ReferenceDataCollection, filters)).toBe(151);
    const listQuery = findMany.mock.calls[0][0]; const countQuery = count.mock.calls[0][0];
    expect(listQuery).toMatchObject({ skip: 50, take: 50 }); expect(listQuery.where).toEqual(countQuery.where);
    expect(listQuery.orderBy).toContainEqual({ id: 'asc' }); expect(countQuery).not.toHaveProperty('skip'); expect(countQuery).not.toHaveProperty('take');
  });
});
