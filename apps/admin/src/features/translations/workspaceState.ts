export type TranslationDomain =
  'SCHOLARSHIP' | 'UNIVERSITY' | 'MAJOR' | 'INTERNATIONAL_TEST' | 'COURSE';
export type TranslationCoverage = 'ALL' | 'MISSING_AR' | 'MISSING_EN' | 'COMPLETE';
export type TranslationSort = 'UPDATED_DESC' | 'UPDATED_ASC' | 'NAME_ASC';
export const translationDomains: TranslationDomain[] = [
  'SCHOLARSHIP',
  'UNIVERSITY',
  'MAJOR',
  'INTERNATIONAL_TEST',
  'COURSE',
];
const member = <T extends string>(value: string | null, values: T[], fallback: T): T =>
  values.includes(value as T) ? (value as T) : fallback;
export function translationWorkspaceState(params: URLSearchParams) {
  const rawPage = Number(params.get('page'));
  const rawSize = Number(params.get('pageSize'));
  const rawDate = params.get('updatedFrom') ?? '';
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
    !Number.isNaN(Date.parse(rawDate)) &&
    new Date(rawDate).toISOString().slice(0, 10) === rawDate;
  return {
    domain: member(params.get('domain'), translationDomains, 'SCHOLARSHIP'),
    coverage: member(
      params.get('coverage'),
      ['ALL', 'MISSING_AR', 'MISSING_EN', 'COMPLETE'] as TranslationCoverage[],
      'ALL',
    ),
    locale: member(params.get('locale'), ['ar', 'en'], 'en') as 'ar' | 'en',
    reviewState: member(
      params.get('reviewState'),
      ['ALL', 'NEEDS_REVIEW', 'PUBLISHED', 'REJECTED'],
      'ALL',
    ),
    sort: member(
      params.get('sort'),
      ['UPDATED_DESC', 'UPDATED_ASC', 'NAME_ASC'] as TranslationSort[],
      'UPDATED_DESC',
    ),
    page: Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 10000 ? rawPage : 1,
    pageSize: [20, 40, 100].includes(rawSize) ? rawSize : 20,
    search: (params.get('q') ?? '').slice(0, 120),
    updatedFrom: validDate ? rawDate : '',
    tab: params.get('tab') === 'routes' ? ('routes' as const) : ('records' as const),
  };
}
export function changeTranslationWorkspaceState(
  current: URLSearchParams,
  updates: Record<string, string>,
) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates))
    value ? next.set(key, value) : next.delete(key);
  if (Object.keys(updates).some((key) => !['page', 'tab'].includes(key))) next.delete('page');
  return next;
}
