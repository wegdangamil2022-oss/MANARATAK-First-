import { describe, expect, it, vi } from 'vitest';
import { PrismaReferenceDataRepository } from '../../src/reference-data/PrismaReferenceDataRepository';

describe('Reference quality report', () => {
  it('counts active cities with exactly the owner list predicate including the legacy isActive flag', async () => {
    const count = vi.fn(async () => 0);
    const db: any = { referenceCity: { count }, $queryRaw: vi.fn(async () => [{ count: 0n }]) };
    await new PrismaReferenceDataRepository(db).getCityQualityCounters('US');
    expect(count.mock.calls[1][0]).toEqual({ where: { countryIso2Code: 'US', lifecycleState: 'ACTIVE', isActive: true } });
  });
  it('returns explicit zero facets and stable IDs without inventing official coverage', async () => {
    const db: any = { $queryRaw: vi.fn(async () => [{ data: [{ referenceId: 'country', entityType: 'COUNTRY', countryIso2Code: 'US', name: 'US', kind: 'INVALID_CURRENCY' }], counts: { INVALID_CURRENCY: 1 }, total: '1', asOf: new Date('2026-10-12T00:00:00Z') }]) };
    const result = await new PrismaReferenceDataRepository(db).getQualityReport({ countryIso2Code: 'US', kind: 'INVALID_CURRENCY', page: 2 });
    expect(result.counts.MISSING_LANGUAGE).toBe(0);
    expect(result.counts.INVALID_CURRENCY).toBe(1);
    expect(result.data[0].referenceId).toBe('country');
    expect(result.authoritativeCoverage).toBe('unknown');
    const statement = db.$queryRaw.mock.calls[0][0];
    expect(statement.values).toContain('US'); expect(statement.values).toContain('INVALID_CURRENCY'); expect(statement.values).toContain(25);
    expect(statement.text).toContain('LIMIT 25');
    expect(statement.text).toContain('IS DISTINCT FROM');
    expect(statement.text).toContain('other."countryIso2Code"=o."countryIso2Code"');
    expect(statement.text).toContain('b."referenceId"<>a."referenceId"');
    expect(statement.text).not.toContain("'US'");
  });
  it('fails closed on a bad country, unknown facet, or unbounded page', async () => {
    const db: any = { $queryRaw: vi.fn() }; const repo = new PrismaReferenceDataRepository(db);
    for (const query of [{ countryIso2Code: "US' OR 1=1" }, { kind: 'OTHER' }, { page: 1001 }, { page: 0 }]) await expect(repo.getQualityReport(query as any)).rejects.toThrow('QUERY_INVALID');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
