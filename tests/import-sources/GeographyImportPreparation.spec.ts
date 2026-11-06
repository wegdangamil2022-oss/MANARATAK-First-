import { describe, expect, it } from 'vitest';
import { prepareGeographyImport, type GeographySourceRow, type GeographyTargetSnapshot } from '../../scripts/import/GeographyImportPreparation';

const source = (raw: Record<string, unknown>, file: string, rowNumber = 2): GeographySourceRow => ({ path: `workspace/${file}.csv`, sha256: 'a'.repeat(64), rowNumber, raw });
const country = source({ iso_alpha2: 'CN', iso_alpha3: 'CHN', name_en: 'China', name_ar: 'الصين', continent: 'Asia', default_currency: 'CNY', default_language: 'zh', reference_review_status: 'REVIEWED' }, 'countries');
const region = source({ regionId: 'source-region', countryIso2: 'CN', regionCode: 'CN-BJ', nameEn: 'Beijing', verificationStatus: 'REFERENCE_DATA_IMPORTED' }, 'regions');
const city = source({ cityId: 'source-city', countryIso2: 'CN', regionCode: 'CN-BJ', cityNameEn: 'Beijing', regionMatchStatus: 'MATCHED_BY_CODE', verificationStatus: 'NEEDS_MANUAL_REVIEW', latitude: '39.9', longitude: '116.4', population: '999', isStudyCityCandidate: 'true' }, 'cities');
const snapshot = (): GeographyTargetSnapshot => ({ version: 1, capturedAt: '2026-11-06T00:00:00Z', databaseWrites: 0, target: { scope: 'DISPOSABLE_TEST', databaseOid: '999' }, countries: [{ id: 'country-live', iso2Code: 'CN', iso3Code: 'CHN', name: 'China', nameAr: 'الصين', region: 'Asia', defaultCurrencyCode: 'CNY', defaultLanguageCode: 'zh', isActive: true, lifecycleState: 'ACTIVE', versionNumber: 1 }], currencies: [{ id: 'currency-live', isoCode: 'CNY', isActive: true, lifecycleState: 'ACTIVE' }], languages: [{ id: 'language-live', isoCode: 'zh', isActive: true, lifecycleState: 'ACTIVE' }], regions: [], cities: [], aliases: [] });
const prepare = (overrides: Partial<Parameters<typeof prepareGeographyImport>[0]> = {}) => prepareGeographyImport({ countries: [country], regions: [region], cities: [city], snapshot: snapshot(), ...overrides });

describe('full geography preparation without database mutation', () => {
  it('preserves raw fields and binds a new city to a source dependency instead of inventing a region UUID', () => {
    const before = JSON.stringify([country, region, city]); const result = prepare();
    const prepared = result.records.find(row => row.entity === 'CITY')!;
    expect(result.databaseWrites).toBe(0); expect(result.applyAllowed).toBe(false);
    expect(prepared.action).toBe('REVIEW_CREATE'); expect(prepared.readyToApply).toBe(false);
    expect(prepared.proposedFields.countryReferenceId).toBe('country-live'); expect(prepared.proposedFields).not.toHaveProperty('administrativeRegionId');
    expect(prepared.dependencies).toEqual(['workspace/regions.csv#2']); expect(prepared.raw.population).toBe('999');
    expect(prepared.proposedFields).not.toHaveProperty('latitude'); expect(prepared.proposedFields).not.toHaveProperty('isStudyCityCandidate');
    expect(prepared.reviewNotes).toContain('CITY_SOURCE_AUTHORITY_REVIEW_REQUIRED');
    expect(result.records.find(row => row.entity === 'REGION')!.reviewNotes).toContain('HISTORICAL_IMPORTED_FLAG_IS_NOT_TARGET_PROOF');
    expect(JSON.stringify([country, region, city])).toBe(before);
  });
  it('preserves exact existing city identity and uses the actual same-country region ID', () => {
    const live = snapshot(); live.regions.push({ id: 'real-region', countryIso2Code: 'CN', countryReferenceId: 'country-live', regionCode: 'CN-BJ', name: 'Beijing', isActive: true, lifecycleState: 'ACTIVE', versionNumber: 3 });
    live.cities.push({ id: 'real-city', name: 'Beijing', countryIso2Code: 'CN', countryReferenceId: 'country-live', administrativeRegionId: 'real-region', isActive: true, lifecycleState: 'ACTIVE', versionNumber: 5 });
    const prepared = prepare({ snapshot: live }).records.find(row => row.entity === 'CITY')!;
    expect(prepared.action).toBe('PRESERVE'); expect(prepared.targetId).toBe('real-city'); expect(prepared.expectedVersion).toBe(5); expect(prepared.proposedFields.administrativeRegionId).toBe('real-region');
  });
  it('holds duplicate source cities rather than silently merging or deleting either row', () => {
    const result = prepare({ cities: [city, { ...city, rowNumber: 3 }] });
    const rows = result.records.filter(row => row.entity === 'CITY'); expect(rows).toHaveLength(2);
    expect(rows.every(row => row.action === 'HOLD' && row.reasons.includes('CITY_SOURCE_IDENTITY_COLLISION'))).toBe(true);
    expect(result.batches.some(batch => batch.entity === 'CITY')).toBe(false);
  });
  it('holds source-region duplicates and all dependent cities', () => {
    const result = prepare({ regions: [region, { ...region, rowNumber: 3 }] });
    expect(result.records.filter(row => row.entity === 'REGION').every(row => row.action === 'HOLD')).toBe(true);
    expect(result.records.find(row => row.entity === 'CITY')!.reasons).toContain('CITY_REGION_DEPENDENCY_UNRESOLVED');
  });
  it('rejects missing/inactive countries and cross-country region links', () => {
    const live = snapshot(); live.regions.push({ id: 'bad-region', countryIso2Code: 'CN', countryReferenceId: 'foreign-country', regionCode: 'CN-BJ', name: 'Beijing', isActive: true, lifecycleState: 'ACTIVE', versionNumber: 1 });
    expect(prepare({ snapshot: live }).records.find(row => row.entity === 'CITY')!.reasons).toContain('REGION_COUNTRY_OR_LIFECYCLE_MISMATCH');
    live.countries[0].isActive = false; expect(prepare({ snapshot: live }).records.every(row => row.action === 'HOLD')).toBe(true);
    live.countries = []; expect(prepare({ snapshot: live }).records.every(row => row.action === 'HOLD')).toBe(true);
  });
  it('does not recreate or guess a city with an existing ambiguous scope', () => {
    const live = snapshot(); live.cities.push({ id: 'old-city', name: 'Beijing', countryIso2Code: 'CN', countryReferenceId: 'country-live', administrativeRegionId: null, isActive: true, lifecycleState: 'ACTIVE', versionNumber: 2 });
    const row = prepare({ snapshot: live }).records.find(row => row.entity === 'CITY')!;
    expect(row.action).toBe('HOLD'); expect(row.reasons).toContain('EXISTING_CITY_SCOPE_REVIEW_REQUIRED');
  });
  it('holds unmatched region semantics and retains enrichment anomalies for field review', () => {
    const raw = { ...city.raw, regionMatchStatus: 'UNMATCHED', latitude: '0', longitude: '181', timezone: 'Not/A_Timezone' };
    const row = prepare({ cities: [{ ...city, raw }] }).records.find(row => row.entity === 'CITY')!;
    expect(row.action).toBe('HOLD'); expect(row.reviewNotes).toContain('COORDINATES_INVALID_OR_INCOMPLETE'); expect(row.reviewNotes).toContain('TIMEZONE_INVALID');
  });
  it('makes existing name differences explicit and never supplies a metadata replacement or lifecycle change', () => {
    const live = snapshot(); live.regions.push({ id: 'real-region', countryIso2Code: 'CN', countryReferenceId: 'country-live', regionCode: 'CN-BJ', name: 'Reviewed name', isActive: true, lifecycleState: 'ACTIVE', versionNumber: 2 });
    const result = prepare({ snapshot: live }); const row = result.records.find(item => item.entity === 'REGION')!;
    expect(row.action).toBe('REVIEW_UPDATE'); expect(row.differences).toContain('name');
    expect(row.proposedFields).not.toHaveProperty('isActive'); expect(row.proposedFields).not.toHaveProperty('lifecycleState');
    expect(result.records.find(item => item.entity === 'COUNTRY')!.proposedFields).not.toHaveProperty('metadata');
    expect(result.fieldPolicy).toContain('MERGE_METADATA_PATCH_WITH_LIVE_OWNER_METADATA');
  });
  it('does not derive new currency/language records from unresolved country defaults', () => {
    const live = snapshot(); live.languages = []; live.currencies = [];
    const row = prepare({ snapshot: live }).records.find(item => item.entity === 'COUNTRY')!;
    expect(row.action).toBe('HOLD'); expect(row.reasons).toEqual(expect.arrayContaining(['DEFAULT_CURRENCY_UNRESOLVED', 'DEFAULT_LANGUAGE_UNRESOLVED']));
  });
  it('keeps batch identity deterministic and bounded with every candidate listed once', () => {
    const cities = Array.from({ length: 7 }, (_, i) => ({ ...city, rowNumber: i + 2, raw: { ...city.raw, cityId: `source-${i}`, cityNameEn: `City ${i}` } }));
    const first = prepare({ cities, batchSize: 2 }), second = prepare({ cities, batchSize: 2 });
    expect(first.batches).toEqual(second.batches); expect(first.batches.every(batch => batch.sourceKeys.length <= 2 && !batch.applyAllowed)).toBe(true);
    expect(new Set(first.batches.filter(batch => batch.entity === 'CITY').flatMap(batch => batch.sourceKeys)).size).toBe(7);
  });
  it('fails closed on duplicate source provenance or invalid snapshot/batch settings', () => {
    expect(() => prepare({ cities: [city, city] })).toThrow('GEOGRAPHY_SOURCE_PROVENANCE_INVALID');
    expect(() => prepare({ batchSize: 0 })).toThrow('GEOGRAPHY_BATCH_SIZE_INVALID');
    expect(() => prepare({ batchSize: 251 })).toThrow('GEOGRAPHY_BATCH_SIZE_INVALID');
    const live = snapshot(); live.capturedAt = 'invalid'; expect(() => prepare({ snapshot: live })).toThrow('GEOGRAPHY_READ_ONLY_SNAPSHOT_REQUIRED');
  });
});
