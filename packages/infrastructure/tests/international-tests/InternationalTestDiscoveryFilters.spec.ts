import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaInternationalTestRepository } from '../../src/international-tests/PrismaInternationalTestRepository';

describe('imported test discovery relationships', () => {
  it('combines provider, country, language, degree, field and search without dropping another filter', async () => {
    const count = vi.fn(async () => 0);
    const client = { $queryRaw:vi.fn().mockResolvedValue([{id:'field-1'},{id:'child-field'}]), internationalTest: { count }, referenceCountry: { findUnique: vi.fn(async () => ({ id: 'country-1' })) } };
    const repository = new PrismaInternationalTestRepository(client as unknown as PrismaClient);
    await repository.list({ countOnly: true, providerName: 'Official provider', countryIso2Code: 'CN', languageReferenceId: 'lang-1', degreeLevelId: 'degree-1', taxonomyNodeId: 'field-1', searchQuery: 'medical', staleOnly: true });
    const where = count.mock.calls[0][0].where;
    expect(where.languageRelationships).toEqual({ some: { canonicalReferenceId: 'lang-1' } });
    expect(where.degreeRelationships).toEqual({ some: { degreeLevelId: 'degree-1' } });
    expect(where.academicTaxonomyRelationships).toEqual({ some: { taxonomyNodeId: {in:['field-1','child-field']} } });
    expect(where.AND).toHaveLength(4);
    expect(where.AND[0].OR).toContainEqual({ provider: { is: { displayName: 'Official provider' } } });
    expect(where.AND[1].OR).toContainEqual({ countryRelationships: { some: { canonicalReferenceId: 'country-1' } } });
    expect(where.AND[3].OR).toContainEqual({ canonicalName: { contains: 'medical', mode: 'insensitive' } });
    expect(where.OR).toBeUndefined();
  });
});
