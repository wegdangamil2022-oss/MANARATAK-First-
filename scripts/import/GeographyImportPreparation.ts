import { createHash } from 'node:crypto';
import { normalizeReferenceIdentityToken } from '@manaratak/domain';
import { mapCountrySourceRecord } from '../../packages/application/src/reference-data/services/CountryImportPreviewService';

export interface GeographySourceRow {
  path: string; sha256: string; rowNumber: number; raw: Record<string, unknown>;
}
export interface GeographyTargetRecord extends Record<string, unknown> { id: string }
export interface GeographyTargetSnapshot {
  version: 1; capturedAt: string; databaseWrites: 0;
  target: { scope: string; databaseOid: string };
  countries: GeographyTargetRecord[]; regions: GeographyTargetRecord[]; cities: GeographyTargetRecord[];
  currencies: GeographyTargetRecord[]; languages: GeographyTargetRecord[]; aliases: GeographyTargetRecord[];
}
export interface GeographyPreparationRecord {
  entity: 'COUNTRY' | 'REGION' | 'CITY'; sourceKey: string; sourceSha256: string; sourceRowHash: string;
  countryIso2: string; identityKey: string; action: 'PRESERVE' | 'REVIEW_CREATE' | 'REVIEW_UPDATE' | 'HOLD';
  targetId: string | null; expectedVersion: number | null; reasons: string[];
  dependencies: string[]; reviewNotes: string[]; differences: string[];
  proposedFields: Record<string, unknown>; metadataPatch?: Record<string, unknown>; raw: Record<string, unknown>; readyToApply: false;
}
const text = (value: unknown) => String(value ?? '').trim();
const active = (row: GeographyTargetRecord) => row.isActive === true && row.lifecycleState === 'ACTIVE';
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value ?? null;
export const geographyPreparationHash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const group = <T>(rows: T[], key: (row: T) => string) => {
  const result = new Map<string, T[]>(); for (const row of rows) { const id = key(row); result.set(id, [...(result.get(id) ?? []), row]); } return result;
};
const regionKey = (country: unknown, code: unknown) => `${text(country).toUpperCase()}|${text(code).toUpperCase()}`;
const sourceKey = (row: GeographySourceRow) => `${row.path}#${row.rowNumber}`;

/** A bounded, deterministic planning projection. It has no database client or apply operation. */
export function prepareGeographyImport(input: {
  countries: GeographySourceRow[]; regions: GeographySourceRow[]; cities: GeographySourceRow[];
  snapshot: GeographyTargetSnapshot; batchSize?: number;
}) {
  const { snapshot } = input; const batchSize = input.batchSize ?? 100;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) throw Error('GEOGRAPHY_BATCH_SIZE_INVALID');
  if (snapshot.version !== 1 || snapshot.databaseWrites !== 0 || !snapshot.target?.scope || !snapshot.target.databaseOid || !Number.isFinite(Date.parse(snapshot.capturedAt))) throw Error('GEOGRAPHY_READ_ONLY_SNAPSHOT_REQUIRED');
  const allSources = [...input.countries, ...input.regions, ...input.cities];
  if (new Set(allSources.map(sourceKey)).size !== allSources.length || allSources.some(row => !/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.rowNumber) || row.rowNumber < 2)) throw Error('GEOGRAPHY_SOURCE_PROVENANCE_INVALID');
  const liveCountries = group(snapshot.countries, row => text(row.iso2Code).toUpperCase());
  const liveRegions = group(snapshot.regions, row => regionKey(row.countryIso2Code, row.regionCode));
  const regions = group(input.regions, row => regionKey(row.raw.countryIso2, row.raw.regionCode));
  const countryDuplicates = group(input.countries, row => text(row.raw.iso_alpha2).toUpperCase());
  const cityIds = group(input.cities, row => text(row.raw.cityId));
  const cityScopes = group(input.cities, row => `${regionKey(row.raw.countryIso2, row.raw.regionCode)}|${normalizeReferenceIdentityToken(text(row.raw.cityNameEn))}`);
  const currencyCodes = new Set(snapshot.currencies.filter(active).map(row => text(row.isoCode).toUpperCase()));
  const languageCodes = new Set(snapshot.languages.filter(active).map(row => text(row.isoCode).toLowerCase()));
  const plan: GeographyPreparationRecord[] = [];
  const begin = (entity: GeographyPreparationRecord['entity'], row: GeographySourceRow, country: string, identityKey: string): GeographyPreparationRecord => ({
    entity, sourceKey: sourceKey(row), sourceSha256: row.sha256, sourceRowHash: geographyPreparationHash(row.raw), countryIso2: country,
    identityKey, action: 'REVIEW_CREATE', targetId: null, expectedVersion: null, reasons: [], dependencies: [], differences: [], reviewNotes: [], proposedFields: {}, raw: row.raw, readyToApply: false,
  });
  const bindCountry = (item: GeographyPreparationRecord) => {
    const matches = liveCountries.get(item.countryIso2) ?? [];
    if (!/^[A-Z]{2}$/.test(item.countryIso2) || matches.length !== 1) { item.reasons.push('COUNTRY_NOT_UNIQUELY_RESOLVED'); return undefined; }
    const country = matches[0]; if (!active(country)) item.reasons.push('COUNTRY_INACTIVE'); return country;
  };
  const existing = (item: GeographyPreparationRecord, target: GeographyTargetRecord | undefined, fields: Record<string, unknown>) => {
    item.proposedFields = fields;
    if (!target) return;
    item.targetId = target.id; item.expectedVersion = Number(target.versionNumber);
    if (!Number.isSafeInteger(item.expectedVersion) || item.expectedVersion < 1) item.reasons.push('TARGET_VERSION_REQUIRED');
    if (!active(target)) item.reasons.push('TARGET_INACTIVE');
    item.differences = Object.keys(fields).filter(key => geographyPreparationHash(fields[key]) !== geographyPreparationHash(target[key]));
    item.action = item.differences.length ? 'REVIEW_UPDATE' : 'PRESERVE';
    if (item.differences.length) item.reviewNotes.push('EXISTING_VALUES_REQUIRE_EXPLICIT_REVIEW_NO_OVERWRITE');
  };
  const finish = (item: GeographyPreparationRecord) => { if (item.reasons.length) item.action = 'HOLD'; plan.push(item); };
  for (const row of input.countries) {
    const iso2 = text(row.raw.iso_alpha2).toUpperCase(), item = begin('COUNTRY', row, iso2, iso2), target = bindCountry(item), mapped = mapCountrySourceRecord(row.raw);
    if ((countryDuplicates.get(iso2)?.length ?? 0) !== 1) item.reasons.push('DUPLICATE_SOURCE_COUNTRY');
    if (mapped.defaultCurrencyCode && !currencyCodes.has(mapped.defaultCurrencyCode)) item.reasons.push('DEFAULT_CURRENCY_UNRESOLVED');
    if (mapped.defaultLanguageCode && !languageCodes.has(mapped.defaultLanguageCode)) item.reasons.push('DEFAULT_LANGUAGE_UNRESOLVED');
    if (text(row.raw.reference_review_status) !== 'REVIEWED') item.reviewNotes.push('SOURCE_COUNTRY_REVIEW_REQUIRED');
    const { metadata, ...fields } = mapped; existing(item, target, fields);
    const currentMetadata = object(target?.metadata);
    const metadataDifferences = Object.entries(metadata ?? {}).filter(([, value]) => value !== undefined).filter(([key, value]) => geographyPreparationHash(currentMetadata[key]) !== geographyPreparationHash(value)).map(([key]) => `metadata.${key}`);
    item.differences.push(...metadataDifferences);
    if (item.differences.length && item.action === 'PRESERVE') item.action = 'REVIEW_UPDATE';
    item.proposedFields = fields;
    item.metadataPatch = Object.fromEntries(Object.entries(metadata ?? {}).filter(([, value]) => value !== undefined));
    item.reviewNotes.push('SOURCE_FIELDS_ONLY_NO_STUDY_DESTINATION_PROFILE_OR_FLAG_ASSET_CREATION'); finish(item);
  }
  const regionPlan = new Map<string, GeographyPreparationRecord>();
  for (const row of input.regions) {
    const country = text(row.raw.countryIso2).toUpperCase(), key = regionKey(country, row.raw.regionCode), item = begin('REGION', row, country, key), targetCountry = bindCountry(item), matches = liveRegions.get(key) ?? [];
    if (!text(row.raw.regionId) || !text(row.raw.nameEn) || !/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(text(row.raw.regionCode)) || !text(row.raw.regionCode).startsWith(country + '-')) item.reasons.push('REGION_IDENTITY_INVALID');
    if ((regions.get(key)?.length ?? 0) !== 1 || matches.length > 1) item.reasons.push('REGION_IDENTITY_COLLISION');
    if (text(row.raw.parentRegionCode) && !regions.has(regionKey(country, row.raw.parentRegionCode)) && !liveRegions.has(regionKey(country, row.raw.parentRegionCode))) item.reasons.push('PARENT_REGION_NOT_FOUND');
    if (matches[0] && matches[0].countryReferenceId !== targetCountry?.id) item.reasons.push('EXISTING_REGION_COUNTRY_LINK_MISMATCH');
    existing(item, matches[0], { countryIso2Code: country, name: text(row.raw.nameEn), regionCode: text(row.raw.regionCode), ...(text(row.raw.nameAr) ? { nameAr: text(row.raw.nameAr) } : {}) });
    item.proposedFields.countryReferenceId = targetCountry?.id ?? null;
    item.reviewNotes.push('SOURCE_REGION_AUTHORITY_REVIEW_REQUIRED', 'HISTORICAL_IMPORTED_FLAG_IS_NOT_TARGET_PROOF', 'RAW_FIELDS_RETAINED_WITHOUT_AUTO_LIFECYCLE_OR_CAPABILITY_CHANGES');
    if (!text(row.raw.nameAr)) item.reviewNotes.push('ARABIC_NAME_MISSING');
    finish(item); regionPlan.set(key, item);
  }
  for (const row of input.cities) {
    const raw = row.raw, country = text(raw.countryIso2).toUpperCase(), key = regionKey(country, raw.regionCode), name = normalizeReferenceIdentityToken(text(raw.cityNameEn)), item = begin('CITY', row, country, `${key}|${name}`), targetCountry = bindCountry(item), sourceRegion = regionPlan.get(key), liveRegion = (liveRegions.get(key) ?? [])[0];
    if (!text(raw.cityId) || !name) item.reasons.push('CITY_IDENTITY_INVALID');
    if ((cityIds.get(text(raw.cityId))?.length ?? 0) !== 1 || (cityScopes.get(item.identityKey)?.length ?? 0) !== 1) item.reasons.push('CITY_SOURCE_IDENTITY_COLLISION');
    if (!text(raw.regionCode) || !sourceRegion || sourceRegion.action === 'HOLD') item.reasons.push('CITY_REGION_DEPENDENCY_UNRESOLVED');
    if (!['MATCHED', 'MATCHED_BY_CODE', 'MATCHED_BY_NORMALIZED_NAME'].includes(text(raw.regionMatchStatus))) item.reasons.push('CITY_REGION_MATCH_REVIEW_REQUIRED');
    if (liveRegion && (liveRegion.countryReferenceId !== targetCountry?.id || !active(liveRegion))) item.reasons.push('REGION_COUNTRY_OR_LIFECYCLE_MISMATCH');
    const matchingCities = snapshot.cities.filter(city => city.countryIso2Code === country && (normalizeReferenceIdentityToken(text(city.name)) === name || snapshot.aliases.some(alias => alias.entityType === 'CITY' && alias.referenceId === city.id && alias.isActive === true && normalizeReferenceIdentityToken(text(alias.alias)) === name)));
    const scoped = matchingCities.filter(city => liveRegion && city.administrativeRegionId === liveRegion.id);
    if (matchingCities.length && scoped.length !== 1) item.reasons.push('EXISTING_CITY_SCOPE_REVIEW_REQUIRED');
    if (scoped.length > 1) item.reasons.push('EXISTING_CITY_COLLISION');
    const target = scoped.length === 1 ? scoped[0] : undefined;
    if (target && target.countryReferenceId !== targetCountry?.id) item.reasons.push('EXISTING_CITY_COUNTRY_LINK_MISMATCH');
    existing(item, target, { countryIso2Code: country, name: text(raw.cityNameEn), ...(text(raw.cityNameAr) ? { nameAr: text(raw.cityNameAr) } : {}) });
    item.proposedFields.countryReferenceId = targetCountry?.id ?? null;
    if (liveRegion) item.proposedFields.administrativeRegionId = liveRegion.id;
    if (sourceRegion) item.dependencies.push(sourceRegion.sourceKey);
    item.reviewNotes.push('CITY_SOURCE_AUTHORITY_REVIEW_REQUIRED', 'REGION_TARGET_ID_MUST_BE_REVALIDATED_AFTER_REGION_APPLY', 'RAW_FIELDS_PRESERVED_NOT_AUTOMATICALLY_APPROVED');
    if (!text(raw.cityNameAr)) item.reviewNotes.push('ARABIC_NAME_MISSING');
    if (!text(raw.timezone)) item.reviewNotes.push('TIMEZONE_MISSING');
    else { try { new Intl.DateTimeFormat('en', { timeZone: text(raw.timezone) }).format(); } catch { item.reviewNotes.push('TIMEZONE_INVALID'); } }
    const latitude = text(raw.latitude), longitude = text(raw.longitude);
    if (Boolean(latitude) !== Boolean(longitude) || (latitude && (!Number.isFinite(Number(latitude)) || Math.abs(Number(latitude)) > 90)) || (longitude && (!Number.isFinite(Number(longitude)) || Math.abs(Number(longitude)) > 180))) item.reviewNotes.push('COORDINATES_INVALID_OR_INCOMPLETE');
    item.reviewNotes.push('COORDINATES_POPULATION_CAPITAL_STUDY_AND_TEST_FLAGS_REQUIRE_FIELD_REVIEW'); finish(item);
  }
  const batches: Array<{ id: string; entity: GeographyPreparationRecord['entity']; countryIso2: string; sourceKeys: string[]; dependencyStage: string; applyAllowed: false }> = [];
  for (const entity of ['COUNTRY', 'REGION', 'CITY'] as const) {
    const candidates = group(plan.filter(row => row.entity === entity && ['REVIEW_CREATE', 'REVIEW_UPDATE'].includes(row.action)), row => row.countryIso2);
    for (const [country, rows] of [...candidates].sort(([a], [b]) => a.localeCompare(b))) for (let offset = 0; offset < rows.length; offset += batchSize) {
      const keys = rows.slice(offset, offset + batchSize).map(row => row.sourceKey);
      batches.push({ id: `${entity}-${country}-${geographyPreparationHash(keys).slice(0, 16)}`, entity, countryIso2: country, sourceKeys: keys, dependencyStage: entity === 'CITY' ? 'REGIONS_MUST_BE_APPLIED_AND_REAL_IDS_RESOLVED' : 'COUNTRY_REFERENCES_MUST_MATCH_SNAPSHOT', applyAllowed: false });
    }
  }
  const counts = Object.fromEntries((['COUNTRY', 'REGION', 'CITY'] as const).map(entity => [entity, Object.fromEntries(['PRESERVE', 'REVIEW_CREATE', 'REVIEW_UPDATE', 'HOLD'].map(action => [action, plan.filter(row => row.entity === entity && row.action === action).length]))]));
  return { mode: 'PREPARATION_ONLY' as const, databaseWrites: 0 as const, applyAllowed: false as const, counts, records: plan, batches, batchSize, fieldPolicy: 'ALL_RAW_SOURCE_FIELDS_RETAINED; MERGE_METADATA_PATCH_WITH_LIVE_OWNER_METADATA; NO_BLANK_OVERWRITE; REAL_COUNTRY_AND_REGION_IDS_ONLY; NO_APPROVAL_INFERRED_FROM_STATUS' };
}
