import type { SupportedLocale } from '@manaratak/shared';
import {
  apiFetch,
  type MajorFilters,
  type PaginatedResult,
  type PublicMajorDto,
  type PublicUniversityDto,
  type UniversityFilters,
} from './client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

type PublicQueryValue = string | number | boolean | null | undefined;

export function buildLocalizedPublicUrl(
  path: string,
  locale: SupportedLocale,
  query: object = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, PublicQueryValue>)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  params.set('locale', locale);
  return `${API_BASE_URL}${path}?${params.toString()}`;
}

async function parsePublicResponse<T>(
  response: Response,
  notFoundMessage: string,
  failureMessage: string,
): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  if (response.status === 404) throw new Error(notFoundMessage);

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const message =
    typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.error?.message === 'string'
        ? payload.error.message
        : typeof payload?.message === 'string'
          ? payload.message
          : null;
  throw new Error(message || failureMessage);
}

export async function getLocalizedUniversities(
  filters: UniversityFilters,
  locale: SupportedLocale,
): Promise<PaginatedResult<PublicUniversityDto>> {
  const url = buildLocalizedPublicUrl('/public/universities', locale, filters);
  return parsePublicResponse(
    await apiFetch(url),
    'University not found',
    'Failed to fetch universities',
  );
}

export async function getLocalizedUniversityBySlug(
  slug: string,
  locale: SupportedLocale,
): Promise<PublicUniversityDto> {
  const url = buildLocalizedPublicUrl(
    `/public/universities/${encodeURIComponent(slug)}`,
    locale,
  );
  return parsePublicResponse(
    await apiFetch(url),
    'University not found',
    'Failed to fetch university',
  );
}

export async function getLocalizedMajors(
  filters: MajorFilters,
  locale: SupportedLocale,
): Promise<PaginatedResult<PublicMajorDto>> {
  const url = buildLocalizedPublicUrl('/public/majors', locale, filters);
  return parsePublicResponse(await apiFetch(url), 'Major not found', 'Failed to fetch majors');
}

export async function getLocalizedMajorBySlug(
  slug: string,
  locale: SupportedLocale,
): Promise<PublicMajorDto> {
  const url = buildLocalizedPublicUrl(`/public/majors/${encodeURIComponent(slug)}`, locale);
  return parsePublicResponse(await apiFetch(url), 'Major not found', 'Failed to fetch major');
}
