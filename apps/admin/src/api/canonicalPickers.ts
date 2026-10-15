import { getReferenceDataPage } from './referenceData';
import { adminApiClient } from './client';

export type CanonicalPickerLifecycle =
  | 'ACTIVE' | 'PUBLISHED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH'
  | 'DEPRECATED' | 'ARCHIVED' | 'SUPERSEDED' | 'MERGED' | 'REJECTED' | 'INACTIVE'
  | string;

export interface CanonicalPickerOption {
  id: string;
  label: string;
  lifecycle: CanonicalPickerLifecycle;
  status?: string;
  publicId?: string;
  code?: string;
  ownerId?: string;
  metadata?: Record<string, string | null | undefined>;
}

export interface CanonicalPickerPage { options: CanonicalPickerOption[]; nextCursor: string | null; }

function selectableLifecycle(value: unknown, isActive?: boolean): string {
  if (isActive === false) return 'INACTIVE';
  const raw = typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'ACTIVE';
  return raw;
}

function pickLabel(item: Record<string, unknown>): string {
  return String(item.displayName ?? item.canonicalName ?? item.nameAr ?? item.name ?? item.nameEn ?? item.sourceProgramName ?? item.canonicalCode ?? item.id ?? '');
}

function option(item: Record<string, unknown>, extras: Partial<CanonicalPickerOption> = {}): CanonicalPickerOption {
  return {
    id: String(item.id),
    label: pickLabel(item),
    lifecycle: selectableLifecycle(item.lifecycleState ?? item.status, item.isActive as boolean | undefined),
    status: typeof item.status === 'string' ? item.status : undefined,
    publicId: typeof item.publicId === 'string' ? item.publicId : undefined,
    code: String(item.iso2Code ?? item.isoCode ?? item.canonicalCode ?? item.regionCode ?? '') || undefined,
    ...extras,
  };
}

export function canonicalOptionIsSelectable(value: CanonicalPickerOption | undefined): boolean {
  if (!value) return true;
  return !/(?:DEPRECATED|ARCHIVED|SUPERSEDED|MERGED|REJECTED|INACTIVE|SUSPENDED)/u.test(value.lifecycle.toUpperCase());
}

type DataEnvelope<T> = { data: T[] };
type PageEnvelope<T> = { data: T[] };

export const canonicalPickerApi = {
  async countries(query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const { data: records } = await getReferenceDataPage<Record<string, unknown>>('countries', { activeOnly: false, q: query.trim() || undefined, page, pageSize: 50 });
    return records.map((item) => option(item));
  },
  async regions(countryIso2Code?: string, query = '', page = 1): Promise<CanonicalPickerOption[]> {
    if (!countryIso2Code) return [];
    const { data: records } = await getReferenceDataPage<Record<string, unknown>>('regions', { activeOnly: false, countryIso2Code, q: query.trim() || undefined, page, pageSize: 50 });
    return records.map((item) => option(item, { metadata: { countryIso2Code: String(item.countryIso2Code ?? '') } }));
  },
  async cities(countryIso2Code?: string, administrativeRegionId?: string | null, query = '', page = 1): Promise<CanonicalPickerOption[]> {
    if (!countryIso2Code) return [];
    const { data: records } = await getReferenceDataPage<Record<string, unknown>>('cities', {
      activeOnly: false, countryIso2Code, administrativeRegionId: administrativeRegionId || undefined,
      q: query.trim() || undefined, page, pageSize: 50,
    });
    return records.map((item) => option(item, { metadata: {
      countryIso2Code: String(item.countryIso2Code ?? ''),
      administrativeRegionId: typeof item.administrativeRegionId === 'string' ? item.administrativeRegionId : null,
      rawRegionLabel: typeof item.region === 'string' ? item.region : null,
      name: typeof item.name === 'string' ? item.name : null,
      nameAr: typeof item.nameAr === 'string' ? item.nameAr : null,
    } }));
  },
  async languages(query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const { data: records } = await getReferenceDataPage<Record<string, unknown>>('languages', { activeOnly: false, q: query.trim() || undefined, page, pageSize: 50 });
    return records.map((item) => option(item));
  },
  async currencies(query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const { data: records } = await getReferenceDataPage<Record<string, unknown>>('currencies', { activeOnly: false, q: query.trim() || undefined, page, pageSize: 50 });
    return records.map((item) => option(item));
  },
  async degreeLevels(query = ""): Promise<CanonicalPickerOption[]> {
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>('/admin/academic-taxonomy/degree-levels');
    return response.data.filter(item => !query.trim() || [item.nameAr, item.nameEn, item.canonicalCode].some(value => String(value ?? '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))).map((item) => option(item));
  },
  async taxonomyNodes(nodeType?: 'ACADEMIC_FIELD' | 'DISCIPLINE', query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (nodeType) params.set('nodeType', nodeType);
    if (query.trim()) params.set('q', query.trim());
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/academic-taxonomy/nodes?${params}`);
    return response.data.map((item) => option({ ...item, id: item.nodeId ?? item.id }));
  },
  async majors(query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: String(page), pageSize: '50', catalog: 'false' });
    if (query.trim()) params.set('search', query.trim().slice(0,200));
    const response = await adminApiClient.request<PageEnvelope<Record<string, unknown>>>(`/admin/majors?${params}`);
    return response.data.map((item) => option(item));
  },
  async tests(query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (query.trim()) params.set('search', query.trim().slice(0, 200));
    const response = await adminApiClient.request<PageEnvelope<Record<string, unknown>>>(`/admin/international-tests?${params}`);
    return response.data.map((item) => option(item));
  },
  async universities(query = '', page = 1): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (query.trim()) params.set('search', query.trim());
    const response = await adminApiClient.request<PageEnvelope<Record<string, unknown>>>(`/admin/universities?${params}`);
    return response.data.map((item) => option(item));
  },
  async programs(universityId: string, query = '', _page = 1, cursor?: string): Promise<CanonicalPickerPage> {
    if (!universityId) return { options: [], nextCursor: null };
    const params = new URLSearchParams({ universityId, limit: '50' });
    if (query.trim()) params.set('search', query.trim().slice(0, 200));
    if (cursor) params.set('cursor', cursor);
    // The public owner read enforces the published university/degree/major proof.
    const result = await adminApiClient.request<{ items: Record<string, unknown>[]; nextCursor: string | null }>(`/public/university-programs?${params}`, { cache: 'no-store' });
    return { options: result.items.map(item => option(item, { ownerId: universityId })), nextCursor: result.nextCursor };
  },
};
