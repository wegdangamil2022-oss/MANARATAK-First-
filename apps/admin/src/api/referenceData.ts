import type {
  ReferenceDataCollection, ReferenceDataFilters, ReferenceDataPage,
  UpsertReferenceCountryDto, UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto, UpsertReferenceCityDto,
  AdministrativeRegionDto, UpsertAdministrativeRegionDto, ReferenceLifecycleState, ReferenceVersionDto,
  ReferenceGovernanceDetails, ReferenceRelationshipDto, ReferenceCityQualityCounters, GovernedReferenceEntityType, ReferenceDependencyImpact,
} from '@manaratak/domain';
import { adminApiClient, type AdminRequestOptions } from './client';

const base = '/admin/reference-data';

export function getReferenceDataPage<T>(collection: ReferenceDataCollection, filters: ReferenceDataFilters = {}): Promise<ReferenceDataPage<T>> {
  const params = new URLSearchParams({ page: String(filters.page ?? 1), pageSize: String(filters.pageSize ?? 50) });
  for (const key of ['activeOnly', 'nonActiveOnly', 'region', 'countryIso2Code', 'q', 'administrativeRegionId'] as const) {
    const value = filters[key];
    if (value !== undefined) params.set(key, String(value));
  }
  return adminApiClient.request<ReferenceDataPage<T>>(`${base}/${collection}?${params}`);
}

/** Picker compatibility: load every bounded owner-API page, never silently truncate. */
export async function listAllReferenceData<T>(collection: ReferenceDataCollection, filters: Omit<ReferenceDataFilters, 'page' | 'pageSize'> = {}): Promise<T[]> {
  const records: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const result = await getReferenceDataPage<T>(collection, { ...filters, page, pageSize: 100 });
    if (result.page !== page || result.pageSize !== 100 || !Number.isInteger(result.totalPages) || result.totalPages < 0 || result.totalPages > 1000) {
      throw new Error('REFERENCE_DATA_PAGINATION_RESPONSE_INVALID');
    }
    records.push(...result.data);
    if (page >= result.totalPages) return records;
    if (!result.data.length) throw new Error('REFERENCE_DATA_PAGINATION_RESPONSE_INVALID');
  }
  throw new Error('REFERENCE_DATA_PICKER_PAGE_LIMIT');
}

function mutate<T>(path: string, method: 'POST' | 'PUT', body: unknown, options: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'> = {}): Promise<T> {
  return adminApiClient.request<T>(`${base}${path}`, { ...options, method, body: JSON.stringify(body) });
}

export const referenceDataAdminApi = {
  qualitySnapshot() {
    return adminApiClient.request<{ data: Array<{ collection: ReferenceDataCollection; total: number; active: number; nonActive: number; aliasCoverage: 'unknown'; authoritativeCoverage: 'unknown'; brokenRelationships: 'unknown' }>; asOf: string }>(base + '/quality');
  },
  reassignProviderMapping(input: {
    entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY';
    fromReferenceId: string;
    toReferenceId: string;
    fromExpectedVersion: number;
    toExpectedVersion: number;
    providerSystem: string;
    providerId: string;
    reason: string;
    reconciliationId: string;
  }) {
    return mutate<{ outcome: 'APPLIED' | 'ALREADY_APPLIED'; reconciliationId: string }>(
      '/governance/provider-mappings/reassign', 'POST', input);
  },
  governanceImpact(entityType: GovernedReferenceEntityType, referenceId: string) {
    return adminApiClient.request<{ data: ReferenceDependencyImpact }>(
      base + '/governance/' + encodeURIComponent(entityType) + '/' + encodeURIComponent(referenceId) + '/impact'
    );
  },
  governanceDetails(entityType: GovernedReferenceEntityType, referenceId: string) {
    return adminApiClient.request<{ data: ReferenceGovernanceDetails }>(
      base + '/governance/' + encodeURIComponent(entityType) + '/' + encodeURIComponent(referenceId) + '/details'
    );
  },
  governanceHistory(entityType: GovernedReferenceEntityType, referenceId: string) {
    return adminApiClient.request<{ data: ReferenceVersionDto[] }>(
      base + '/governance/' + encodeURIComponent(entityType) + '/' + encodeURIComponent(referenceId) + '/history'
    );
  },
  governanceRelationships(entityType: GovernedReferenceEntityType, referenceId: string) {
    return adminApiClient.request<{ data: ReferenceRelationshipDto[] }>(
      base + '/governance/' + encodeURIComponent(entityType) + '/' + encodeURIComponent(referenceId) + '/relationships'
    );
  },
  cityQuality(countryIso2Code: string) {
    return adminApiClient.request<{ data: ReferenceCityQualityCounters; asOf: string }>(
      base + '/quality/cities/' + encodeURIComponent(countryIso2Code)
    );
  },
  transitionReference(entityType: GovernedReferenceEntityType, referenceId: string,
    body: { expectedVersion: number; toState: ReferenceLifecycleState; targetReferenceId?: string; reason: string }) {
    return mutate<void>('/governance/' + encodeURIComponent(entityType) + '/' +
      encodeURIComponent(referenceId) + '/lifecycle', 'POST', body);
  },
  getRegion(id: string) {
    return adminApiClient.request<AdministrativeRegionDto>(base + '/regions/' + encodeURIComponent(id));
  },
  saveRegion({ id, expectedVersion, ...body }: UpsertAdministrativeRegionDto, options?: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'>) {
    return id
      ? mutate<AdministrativeRegionDto>('/regions/' + encodeURIComponent(id), 'PUT', { ...body, expectedVersion }, options)
      : mutate<AdministrativeRegionDto>('/regions', 'POST', body, options);
  },
  regionHistory(id: string) {
    return adminApiClient.request<{ data: ReferenceVersionDto[] }>(base + '/governance/REGION/' + encodeURIComponent(id) + '/history');
  },
  transitionRegion(id: string, body: { expectedVersion: number; toState: ReferenceLifecycleState; targetReferenceId?: string; reason: string }, options?: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'>) {
    return mutate<void>('/governance/REGION/' + encodeURIComponent(id) + '/lifecycle', 'POST', body, options);
  },
  saveCountry({ iso2Code, ...body }: UpsertReferenceCountryDto, options?: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'>) {
    return mutate(`/countries/${encodeURIComponent(iso2Code)}`, 'PUT', body, options);
  },
  saveCurrency({ isoCode, ...body }: UpsertReferenceCurrencyDto, options?: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'>) {
    return mutate(`/currencies/${encodeURIComponent(isoCode)}`, 'PUT', body, options);
  },
  saveLanguage({ isoCode, ...body }: UpsertReferenceLanguageDto, options?: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'>) {
    return mutate(`/languages/${encodeURIComponent(isoCode)}`, 'PUT', body, options);
  },
  saveCity(body: UpsertReferenceCityDto, options?: Pick<AdminRequestOptions, 'idempotencyKey' | 'signal'>) {
    return mutate('/cities', 'PUT', body, options);
  },
  previewCountries<T>(body: { sourceName: string; sourceVersion: string; sha256?: string; records: Record<string, unknown>[] }) {
    return mutate<T>('/countries/import-preview', 'POST', body);
  },
  previewDerivedReferences<T>(records: Record<string, unknown>[]) {
    return mutate<T>('/countries/derived-reference-preview', 'POST', { records });
  },
};
