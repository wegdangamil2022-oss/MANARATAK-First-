import type { CourseProviderRegistryFilters, ExternalCourseProviderDto, UpdateCourseProviderMappings } from '@manaratak/domain';
import { adminApiClient } from './client';

export type ProviderRegistryRecord = Omit<ExternalCourseProviderDto, 'updatedAt' | 'createdAt' | 'lastVerifiedAt'> & { updatedAt: string; createdAt: string; lastVerifiedAt?: string };
const base = '/admin/courses/providers';
export const courseProviderRegistryApi = {
  list(filters: CourseProviderRegistryFilters) {
    const query = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
    if (filters.q) query.set('q', filters.q);
    if (filters.status) query.set('status', filters.status);
    return adminApiClient.request<{ data: ProviderRegistryRecord[]; total: number; page: number; pageSize: number; totalPages: number }>(base + '?' + query);
  },
  get(id: string) { return adminApiClient.request<ProviderRegistryRecord>(base + '/' + encodeURIComponent(id)); },
  update(id: string, body: UpdateCourseProviderMappings) {
    return adminApiClient.request<ProviderRegistryRecord>(base + '/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(body) });
  },
  resolveLabel(label: string) {
    return adminApiClient.request<{ rawLabel: string; state: 'VERIFIED_MAPPING' | 'REVIEW_REQUIRED'; providerId: string | null; publicId?: string }>(base + '/resolve-label', { method: 'POST', body: JSON.stringify({ label }) });
  },
};
