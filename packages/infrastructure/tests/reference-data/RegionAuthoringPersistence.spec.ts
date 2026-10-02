import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { ReferenceLifecycleState } from '@manaratak/domain';
import { PrismaReferenceDataRepository } from '../../src/reference-data/PrismaReferenceDataRepository';

const region = () => ({ id: 'region-1', countryReferenceId: 'country-1', countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden', nameAr: null, localName: null, regionType: null,
  lifecycleState: 'ACTIVE', versionNumber: 1, isActive: true, effectiveFrom: new Date(), effectiveTo: null });
function fixture() {
  let rows = new Map<string, ReturnType<typeof region>>();
  let aliases: any[] = []; let versions: unknown[][] = []; let relationships: any[] = [];
  const counts = { cities: 0, universities: 0, universityCampuses: 0 };
  const client = {
    referenceCountry: { findUnique: vi.fn().mockResolvedValue({ id: 'country-1', iso2Code: 'YE', lifecycleState: 'ACTIVE' }) },
    administrativeRegion: {
      findUnique: vi.fn(async ({ where, select }: any) => select ? { _count: counts } : rows.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: any) => [...rows.values()].filter(row => !where.lifecycleState || row.lifecycleState === where.lifecycleState)),
      create: vi.fn(async ({ data }: any) => {
        if ([...rows.values()].some(row => row.countryIso2Code === data.countryIso2Code && row.regionCode === data.regionCode)) throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5.22.0' });
        const row = { ...region(), ...data }; rows.set(row.id, row); return row;
      }),
      update: vi.fn(async ({ where, data }: any) => { const current = rows.get(where.id)!; const row = { ...current, ...data, versionNumber: current.versionNumber + 1 }; rows.set(row.id, row); return row; }),
    },
    referenceAliasRecord: { findMany: vi.fn(async ({ where }: any) => aliases.filter(row => row.referenceId === where.referenceId).map(({ alias, locale, aliasType }) => ({ alias, locale, aliasType }))) },
    referenceRelationshipRecord: { create: vi.fn(async ({ data }: any) => { relationships.push(data); }) },
    $queryRaw: vi.fn(async () => []),
    $executeRaw: vi.fn(async (sql: Prisma.Sql) => {
      if (sql.sql.includes('INSERT INTO "ReferenceVersionRecord"')) versions.push([...sql.values]);
      if (sql.sql.includes('UPDATE "ReferenceAliasRecord"')) aliases = aliases.filter(row => row.referenceId !== sql.values[1]);
      if (sql.sql.includes('INSERT INTO "ReferenceAliasRecord"')) aliases.push({ referenceId: sql.values[2], alias: sql.values[3], locale: sql.values[5], aliasType: sql.values[6] });
      return 1;
    }),
    $transaction: vi.fn(async (work: any) => {
      const snapshot = { rows: new Map(rows), aliases: [...aliases], versions: [...versions], relationships: [...relationships] };
      try { return await work(client); } catch (err) { rows = snapshot.rows; aliases = snapshot.aliases; versions = snapshot.versions; relationships = snapshot.relationships; throw err; }
    }),
  };
  const repository = new PrismaReferenceDataRepository(client as unknown as PrismaClient);
  return { repository, client, counts, rows: () => rows, versions: () => versions, relationships: () => relationships, seed: (value = region()) => rows.set(value.id, value) };
}
const create = { countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden', aliases: [{ alias: 'عدن', aliasType: 'HISTORIC' as const, locale: 'ar' }] };
const lifecycle = (expectedVersion: number, toState: ReferenceLifecycleState, extra = {}) => ({
  entityType: 'REGION' as const, referenceId: 'region-1', expectedVersion, toState, reason: 'source verified', actorId: 'verified-admin', ...extra,
});
describe('M10-07 typed region persistence with Prisma mocks (no database)', () => {
  it('resolves a saved regional alias by stable ID and deduplicates rows for the same reference', async () => {
    const f = fixture(); f.seed();
    f.client.$queryRaw.mockImplementation(async (sql: Prisma.Sql) => {
      expect(sql.sql).toContain('SELECT DISTINCT "referenceId"');
      expect(sql.sql).toContain('LIMIT 2');
      expect(sql.values).toEqual(['REGION', 'aden']);
      return [{ referenceId: 'region-1' }];
    });
    expect(await f.repository.resolveRegionCandidate({ alias: 'Aden' })).toMatchObject({ record: { id: 'region-1', lifecycleState: 'ACTIVE' }, method: 'NORMALIZED_ALIAS' });
  });
  it('keeps an alias shared by two canonical region IDs ambiguous instead of choosing one', async () => {
    const f = fixture();
    f.client.$queryRaw.mockResolvedValue([{ referenceId: 'region-1' }, { referenceId: 'region-2' }] as never);
    expect(await f.repository.resolveRegionCandidate({ alias: 'Aden' })).toBeNull();
    expect(f.client.administrativeRegion.findUnique).not.toHaveBeenCalled();
  });
  it('persists country ID, alias locale/type, initial version and actor; edits preserve canonical ID', async () => {
    const f = fixture(); const created = await f.repository.upsertRegion({ ...create, id: 'region-1' }, 'verified-admin');
    expect(created.aliases).toEqual(create.aliases); expect(created.countryReferenceId).toBe('country-1');
    const edited = await f.repository.upsertRegion({ ...create, id: created.id, expectedVersion: 1, name: 'Aden Governorate' }, 'verified-admin');
    expect(edited.id).toBe(created.id); expect(edited.versionNumber).toBe(2);
    expect(f.versions().map(values => values[3])).toEqual([1, 2]);
    expect(f.versions().every(values => values[9] === 'verified-admin')).toBe(true);
    expect((await f.repository.listRegions({ activeOnly: true }))[0].name).toBe('Aden Governorate');
    expect(f.client.$queryRaw.mock.calls.some(([sql]) => (sql as Prisma.Sql).sql.includes('FOR UPDATE'))).toBe(true);
  });
  it('returns aliases on detail and does not erase aliases when an update omits them', async () => {
    const f = fixture(); await f.repository.upsertRegion({ ...create, id: 'region-1' }, 'verified-admin');
    await f.repository.upsertRegion({ ...create, aliases: undefined, id: 'region-1', expectedVersion: 1 }, 'verified-admin');
    expect((await f.repository.getRegionById('region-1'))?.aliases).toEqual(create.aliases);
  });
  it.each([
    ['REGION_VERSION_CONFLICT', { expectedVersion: 9 }], ['REGION_IDENTITY_IMMUTABLE', { countryIso2Code: 'SA' }],
    ['REGION_IDENTITY_IMMUTABLE', { regionCode: 'YE-HD' }],
  ])('rejects stale version / identity mutation: %s', async (code, extra) => {
    const f = fixture(); f.seed();
    await expect(f.repository.upsertRegion({ ...create, id: 'region-1', expectedVersion: 1, ...extra }, 'admin')).rejects.toThrow(code);
    expect(f.client.administrativeRegion.update).not.toHaveBeenCalled(); expect(f.versions()).toHaveLength(0);
  });
  it('rejects duplicate codes and missing/inactive countries; failed commands create no version', async () => {
    const f = fixture(); f.seed();
    await expect(f.repository.upsertRegion(create, 'admin')).rejects.toThrow('REGION_CODE_CONFLICT');
    f.client.referenceCountry.findUnique.mockResolvedValue(null as any);
    await expect(f.repository.upsertRegion(create, 'admin')).rejects.toThrow('REGION_COUNTRY_INACTIVE');
    f.client.referenceCountry.findUnique.mockResolvedValue({ id: 'country-1', iso2Code: 'YE', lifecycleState: 'DEPRECATED' });
    await expect(f.repository.upsertRegion(create, 'admin')).rejects.toThrow('REGION_COUNTRY_INACTIVE');
    expect(f.versions()).toHaveLength(0);
  });
  it('deprecates, removes from active chooser reads and preserves historical relations', async () => {
    const f = fixture(); f.seed(); f.counts.cities = 1;
    await f.repository.transitionReferenceLifecycle(lifecycle(1, ReferenceLifecycleState.DEPRECATED));
    expect(await f.repository.listRegions({ activeOnly: true })).toEqual([]);
    expect(f.rows().get('region-1')?.lifecycleState).toBe('DEPRECATED'); expect(f.counts.cities).toBe(1);
    await expect(f.repository.upsertRegion({ ...create, id: 'region-1', expectedVersion: 2 }, 'admin')).rejects.toThrow('REGION_NOT_ACTIVE');
  });
  it.each(['cities', 'universities', 'universityCampuses'] as const)('blocks terminal state with %s dependencies and keeps version/state intact', async dependency => {
    const f = fixture(); f.seed({ ...region(), lifecycleState: 'DEPRECATED', isActive: false }); f.counts[dependency] = 1;
    await expect(f.repository.transitionReferenceLifecycle(lifecycle(1, ReferenceLifecycleState.ARCHIVED))).rejects.toThrow('REGION_HAS_DEPENDENCIES');
    expect(f.rows().get('region-1')?.versionNumber).toBe(1); expect(f.versions()).toHaveLength(0);
  });
  it('archives only after deprecation and with no dependent records', async () => {
    const f = fixture(); f.seed();
    await expect(f.repository.transitionReferenceLifecycle(lifecycle(1, ReferenceLifecycleState.ARCHIVED))).rejects.toThrow('REGION_TRANSITION_INVALID');
    await f.repository.transitionReferenceLifecycle(lifecycle(1, ReferenceLifecycleState.DEPRECATED));
    await f.repository.transitionReferenceLifecycle(lifecycle(2, ReferenceLifecycleState.ARCHIVED));
    expect(f.rows().get('region-1')?.lifecycleState).toBe('ARCHIVED');
    await expect(f.repository.transitionReferenceLifecycle(lifecycle(3, ReferenceLifecycleState.DEPRECATED))).rejects.toThrow('REGION_TRANSITION_INVALID');
  });
  it.each([
    { id: 'region-2', countryIso2Code: 'SA', lifecycleState: 'ACTIVE' },
    { id: 'region-2', countryIso2Code: 'YE', lifecycleState: 'ARCHIVED' },
    { id: 'region-1', countryIso2Code: 'YE', lifecycleState: 'DEPRECATED' },
  ])('rejects cross-country, inactive or self replacement targets: %j', async target => {
    const f = fixture(); f.seed({ ...region(), lifecycleState: 'DEPRECATED', isActive: false });
    if (target.id !== 'region-1') f.seed({ ...region(), ...target, regionCode: 'YE-HD' });
    await expect(f.repository.transitionReferenceLifecycle(lifecycle(1, ReferenceLifecycleState.MERGED, { targetReferenceId: target.id }))).rejects.toThrow('REGION_TARGET_INVALID');
    expect(f.relationships()).toHaveLength(0);
  });
  it('preserves source ID and records the governed replacement relation', async () => {
    const f = fixture(); f.seed({ ...region(), lifecycleState: 'DEPRECATED', isActive: false });
    f.seed({ ...region(), id: 'region-2', regionCode: 'YE-HD' });
    await f.repository.transitionReferenceLifecycle(lifecycle(1, ReferenceLifecycleState.SUPERSEDED, { targetReferenceId: 'region-2' }));
    expect(f.rows().get('region-1')?.id).toBe('region-1');
    expect(f.relationships()[0]).toMatchObject({ relationshipType: 'SUPERSEDED_BY', targetReferenceId: 'region-2', actorId: 'verified-admin' });
  });
  it('rejects city assignment to foreign or deprecated regions inside the transaction', async () => {
    const f = fixture(); f.seed({ ...region(), lifecycleState: 'DEPRECATED', isActive: false });
    await expect(f.repository.upsertCity({ countryIso2Code: 'YE', name: 'Aden', administrativeRegionId: 'region-1' })).rejects.toThrow('REGION_NOT_ACTIVE');
    f.seed();
    await expect(f.repository.upsertCity({ countryIso2Code: 'SA', name: 'Aden', administrativeRegionId: 'region-1' })).rejects.toThrow('REGION_NOT_ACTIVE');
  });
});
