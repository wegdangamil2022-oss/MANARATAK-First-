import { useMemo, useRef, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';

const options: Record<string, readonly string[]> = {
  status: ['IMPORTED', 'READY_TO_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED', 'REJECTED', 'ARCHIVED'],
  completenessStatus: ['INCOMPLETE', 'NEEDS_REVIEW', 'COMPLETE'],
  institutionType: ['UNIVERSITY', 'COLLEGE', 'INSTITUTE', 'ACADEMY', 'OTHER'],
  sort: ['CREATED_DESC', 'UPDATED_DESC', 'NAME_ASC'],
};
const keys = [
  'search',
  'status',
  'completenessStatus',
  'countryReferenceId',
  'regionReferenceId',
  'cityReferenceId',
  'institutionType',
  'sort',
  'page',
];
export function readUniversityListQuery(raw: string) {
  const incoming = new URLSearchParams(raw),
    params = new URLSearchParams();
  for (const key of keys) {
    const value = (incoming.get(key) ?? (key === 'search' ? incoming.get('query') : '') ?? '')
      .trim()
      .slice(0, key === 'search' ? 200 : 240);
    if (value && (!options[key] || options[key].includes(value))) params.set(key, value);
  }
  const candidate = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(candidate) && candidate > 0 ? candidate : 1;
  params.set('page', String(page));
  params.set('pageSize', '20');
  return { params, page, queryKey: params.toString() };
}
export function useUniversityListQuery() {
  const [incoming, setIncoming] = useSearchParams();
  const pending = useRef(incoming);
  pending.current = incoming;
  const raw = incoming.toString();
  const query = useMemo(() => readUniversityListQuery(raw), [raw]);
  return useMemo(() => {
    const change = (key: string, value: string, reset = true) => {
      const next = new URLSearchParams(pending.current);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === 'search') next.delete('query');
      if (reset) next.delete('page');
      pending.current = next;
      setIncoming(next, { replace: true });
    };
    const setter = (key: string) => (next: SetStateAction<string>) =>
      change(key, typeof next === 'function' ? next(query.params.get(key) ?? '') : next);
    return {
      ...query,
      setSearchParams: (next: URLSearchParams) => {
        pending.current = next;
        setIncoming(next);
      },
      searchParams: query.params,
      searchTerm: query.params.get('search') ?? '',
      setSearchTerm: setter('search'),
      statusFilter: query.params.get('status') ?? '',
      setStatusFilter: setter('status'),
      completenessFilter: query.params.get('completenessStatus') ?? '',
      setCompletenessFilter: setter('completenessStatus'),
      countryReferenceId: query.params.get('countryReferenceId') ?? '',
      setPage: (next: SetStateAction<number>) =>
        change('page', String(typeof next === 'function' ? next(query.page) : next), false),
    };
  }, [query, setIncoming]);
}
