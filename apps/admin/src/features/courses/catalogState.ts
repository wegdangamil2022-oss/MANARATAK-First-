export type CourseScope = 'all' | 'native' | 'external';
export interface CatalogFacts {
  originType?: string; accessType?: string; isStudyFree?: boolean | null;
  isFreeCertificate?: boolean | null; certificateAvailable?: boolean | null;
}
export interface CatalogRow extends CatalogFacts {
  id: string; publicId: string; displayName: string; originalSourceTitle?: string;
  status: string; completenessStatus: string; providerDisplayName?: string; providerName?: string;
  platformName?: string; instructor?: string; learningLanguage?: string; studyDuration?: string;
  difficultyLevel?: string; certificateType?: string; category?: string; version: number; updatedAt: string;
  relatedMajors?: Array<{ id: string; name: string }>;
}
export interface CatalogResult {
  data: CatalogRow[]; total: number; page: number; pageSize: number; totalPages: number;
  externalOverview?: { incomplete: number; broken: number; needsVerification: number; ready: number; archived: number };
  statistics?: { scope: 'FILTERED'; total: number; published: number; drafts: number; needsReview: number;
    native: number; external: number; legacyPaidOrigin: number };
}

export function certificateFact(course: CatalogFacts): 'FREE' | 'NON_FREE' | 'UNAVAILABLE' | 'UNKNOWN' {
  if (course.certificateAvailable === false) return 'UNAVAILABLE';
  if (course.isFreeCertificate === true) return 'FREE';
  if (course.isFreeCertificate === false && course.certificateAvailable === true) return 'NON_FREE';
  if (course.originType === 'NATIVE_MANARATAK_COURSE' && course.certificateAvailable === true) {
    if (course.isFreeCertificate == null && ['FREE_CERTIFICATE', 'FREE_STUDY_AND_CERTIFICATE'].includes(course.accessType ?? '')) return 'FREE';
  }
  return 'UNKNOWN';
}
export function studyFact(course: CatalogFacts): 'FREE' | 'PAID' | 'UNKNOWN' {
  if (course.isStudyFree === true) return 'FREE';
  if (course.isStudyFree === false) return 'PAID';
  if (course.originType === 'NATIVE_MANARATAK_COURSE') {
    if (['FREE_STUDY', 'FREE_STUDY_AND_CERTIFICATE'].includes(course.accessType ?? '')) return 'FREE';
    if (course.accessType === 'PAID') return 'PAID';
  }
  return 'UNKNOWN';
}

const externalKeys = ['provider', 'platformName', 'linkHealth', 'completenessStatus'];
export function changeCatalogFilters(current: URLSearchParams, updates: Record<string, string>): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) value ? next.set(key, value) : next.delete(key);
  if (updates.scope === 'native') for (const key of externalKeys) next.delete(key);
  next.delete('page');
  return next;
}
export function catalogQuery(params: URLSearchParams, fixedScope?: CourseScope): URLSearchParams {
  const scope = fixedScope ?? params.get('scope') ?? 'all';
  const page = Number(params.get('page'));
  const size = Number(params.get('pageSize'));
  const query = new URLSearchParams({ page: String(Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1), pageSize: String([20, 50, 100].includes(size) ? size : 20) });
  const keys = ['status', 'studyAccess', 'certificateState', 'majorId', 'category', 'learningLanguage', 'difficultyLevel', 'sort'];
  if (scope !== 'native') keys.push('platformName', 'completenessStatus', 'linkHealth');
  for (const key of keys) if (params.get(key)) query.set(key, params.get(key)!);
  if (params.get('q')?.trim()) query.set('search', params.get('q')!.trim().slice(0, 200));
  if (scope === 'native') query.set('originType', 'NATIVE_MANARATAK_COURSE');
  else if (scope === 'external' || params.get('provider') || params.get('platformName') || params.get('completenessStatus') || params.get('linkHealth')) query.set('originType', 'EXTERNAL_LINKED_COURSE');
  else if (params.get('originType') === 'PAID_COURSE') query.set('originType', 'PAID_COURSE');
  if (scope !== 'native' && params.get('provider')) query.set('externalProviderId', params.get('provider')!);
  return query;
}
