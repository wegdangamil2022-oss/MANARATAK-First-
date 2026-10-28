import { useMemo, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  emptyScholarshipCanonicalFilters,
  type ScholarshipCanonicalFilterState,
} from '../../components/ScholarshipCanonicalFilters';

const choices: Record<string, readonly string[]> = {
  status: ['IMPORTED', 'READY_TO_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED', 'REJECTED', 'ARCHIVED'],
  completenessStatus: ['INCOMPLETE', 'NEEDS_REVIEW', 'COMPLETE'],
  fundingType: ['FULL', 'PARTIAL'],
  deadlineStatus: ['OPEN', 'CLOSING_SOON', 'CLOSED', 'OPEN_ALL_YEAR'],
  verificationStatus: ['PENDING', 'VERIFIED', 'FAILED'],
  translationState: ['NEEDS_TRANSLATION', 'TRANSLATED'],
  translationLocale: ['en', 'ar'],
  sort: ['CREATED_DESC', 'UPDATED_DESC', 'DEADLINE_ASC', 'COMPLETENESS_ASC'],
};
const filterKeys = [
  ...Object.keys(emptyScholarshipCanonicalFilters),
  'query',
  'status',
  'completenessStatus',
  'fundingType',
  'deadlineStatus',
];

export function readScholarshipListQuery(raw: string) {
  const params = new URLSearchParams(raw);
  const value = (key: string, fallback = '') => {
    const candidate = (params.get(key) ?? fallback)
      .trim()
      .slice(0, key === 'query' || key === 'sponsorName' ? 200 : key === 'sourceType' ? 100 : 240);
    return choices[key] && !choices[key].includes(candidate) ? fallback : candidate;
  };
  const canonical = { ...emptyScholarshipCanonicalFilters };
  for (const key of Object.keys(canonical) as Array<keyof ScholarshipCanonicalFilterState>)
    canonical[key] = value(key, canonical[key]);
  const requestedPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filters = {
    query: value('query'),
    status: value('status'),
    completenessStatus: value('completenessStatus'),
    fundingType: value('fundingType'),
    deadlineStatus: value('deadlineStatus'),
  };
  const apiParams = new URLSearchParams({ page: String(page), pageSize: '24' });
  for (const [key, entry] of Object.entries({ ...canonical, ...filters }))
    if (entry) apiParams.set(key, entry);
  return {
    canonical,
    filters,
    page,
    queryKey: apiParams.toString(),
    hasActiveFilters:
      Object.values(filters).some(Boolean) ||
      Object.entries(canonical).some(
        ([key, entry]) =>
          entry !== emptyScholarshipCanonicalFilters[key as keyof ScholarshipCanonicalFilterState],
      ),
  };
}

export function useScholarshipListQuery() {
  const [params, setParams] = useSearchParams();
  const raw = params.toString();
  const query = useMemo(() => readScholarshipListQuery(raw), [raw]);
  const change = (patch: Record<string, string>, resetPage = true) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };
  const setFilter = (key: keyof typeof query.filters) => (next: SetStateAction<string>) =>
    change({ [key]: typeof next === 'function' ? next(query.filters[key]) : next });
  return {
    ...query,
    searchTerm: query.filters.query,
    statusFilter: query.filters.status,
    completenessFilter: query.filters.completenessStatus,
    fundingFilter: query.filters.fundingType,
    deadlineFilter: query.filters.deadlineStatus,
    setSearchTerm: setFilter('query'),
    setStatusFilter: setFilter('status'),
    setCompletenessFilter: setFilter('completenessStatus'),
    setFundingFilter: setFilter('fundingType'),
    setDeadlineFilter: setFilter('deadlineStatus'),
    setCanonical: (next: ScholarshipCanonicalFilterState) => change({ ...next }),
    setPage: (next: SetStateAction<number>) =>
      change({ page: String(typeof next === 'function' ? next(query.page) : next) }, false),
    handleResetFilters: () => change(Object.fromEntries(filterKeys.map((key) => [key, '']))),
  };
}
