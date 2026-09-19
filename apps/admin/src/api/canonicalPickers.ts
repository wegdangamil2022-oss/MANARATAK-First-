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
    lifecycle: selectableLifecycle(item.status, item.isActive as boolean | undefined),
    status: typeof item.status === 'string' ? item.status : undefined,
    publicId: typeof item.publicId === 'string' ? item.publicId : undefined,
    code: String(item.iso2Code ?? item.isoCode ?? item.canonicalCode ?? item.regionCode ?? '') || undefined,
    ...extras,
  };
}

export function canonicalOptionIsSelectable(value: CanonicalPickerOption | undefined): boolean {
  if (!value) return true;
  return !/(?:DEPRECATED|ARCHIVED|SUPERSEDED|MERGED|REJECTED|INACTIVE)/u.test(value.lifecycle.toUpperCase());
}

type DataEnvelope<T> = { data: T[] };
type PageEnvelope<T> = { data: T[] };

export const canonicalPickerApi = {
  async countries(query = ''): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ activeOnly: 'false' });
    if (query.trim()) params.set('q', query.trim());
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/reference-data/countries?${params}`);
    return response.data.map((item) => option(item));
  },
  async regions(countryIso2Code?: string): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ activeOnly: 'false' });
    if (countryIso2Code) params.set('countryIso2Code', countryIso2Code);
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/reference-data/regions?${params}`);
    return response.data.map((item) => option(item, { metadata: { countryIso2Code: String(item.countryIso2Code ?? '') } }));
  },
  async cities(countryIso2Code?: string): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ activeOnly: 'false' });
    if (countryIso2Code) params.set('countryIso2Code', countryIso2Code);
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/reference-data/cities?${params}`);
    return response.data.map((item) => option(item, { metadata: { countryIso2Code: String(item.countryIso2Code ?? '') } }));
  },
  async languages(query = ''): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ activeOnly: 'false' });
    if (query.trim()) params.set('q', query.trim());
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/reference-data/languages?${params}`);
    return response.data.map((item) => option(item));
  },
  async currencies(query = ''): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ activeOnly: 'false' });
    if (query.trim()) params.set('q', query.trim());
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/reference-data/currencies?${params}`);
    return response.data.map((item) => option(item));
  },
  async degreeLevels(): Promise<CanonicalPickerOption[]> {
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>('/admin/academic-taxonomy/degree-levels');
    return response.data.map((item) => option(item));
  },
  async taxonomyNodes(nodeType?: 'ACADEMIC_FIELD' | 'DISCIPLINE', query = ''): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (nodeType) params.set('nodeType', nodeType);
    if (query.trim()) params.set('q', query.trim());
    const response = await adminApiClient.request<DataEnvelope<Record<string, unknown>>>(`/admin/academic-taxonomy/nodes?${params}`);
    return response.data.map((item) => option({ ...item, id: item.nodeId ?? item.id }));
  },
  async majors(query = ''): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (query.trim()) params.set('search', query.trim());
    const response = await adminApiClient.request<PageEnvelope<Record<string, unknown>>>(`/admin/majors?${params}`);
    return response.data.map((item) => option(item));
  },
  async tests(): Promise<CanonicalPickerOption[]> {
    const response = await adminApiClient.request<PageEnvelope<Record<string, unknown>>>('/admin/international-tests?page=1&pageSize=100');
    return response.data.map((item) => option(item));
  },
  async universities(query = ''): Promise<CanonicalPickerOption[]> {
    const params = new URLSearchParams({ page: '1', pageSize: '100' });
    if (query.trim()) params.set('search', query.trim());
    const response = await adminApiClient.request<PageEnvelope<Record<string, unknown>>>(`/admin/universities?${params}`);
    return response.data.map((item) => option(item));
  },
  async programs(universityId: string): Promise<CanonicalPickerOption[]> {
    if (!universityId) return [];
    const university = await adminApiClient.request<Record<string, unknown>>(`/admin/universities/${encodeURIComponent(universityId)}`);
    const programs = Array.isArray(university.academicPrograms) ? university.academicPrograms as Record<string, unknown>[] : [];
    return programs.map((item) => option(item, { ownerId: universityId }));
  },
};
