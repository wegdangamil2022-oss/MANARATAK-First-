import { useMemo, useRef, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STUDY_DESTINATION_READINESS_KEYS } from '@manaratak/domain';
const choices: Record<string, readonly string[]> = {
  region: ['Asia', 'Africa', 'Europe', 'Americas', 'Oceania'],
  status: ['NO_PROFILE', 'DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'],
  completenessStatus: ['INCOMPLETE', 'READY_FOR_REVIEW', 'READY_TO_PUBLISH', 'COMPLETE'],
  missingCheck: STUDY_DESTINATION_READINESS_KEYS,
};
export function readDestinationListQuery(raw: string) {
  const incoming = new URLSearchParams(raw),
    params = new URLSearchParams();
  for (const key of ['q', 'region', 'status', 'completenessStatus', 'missingCheck']) {
    const value = (incoming.get(key) ?? '').trim().slice(0, 200);
    if (value && (!choices[key] || choices[key].includes(value))) params.set(key, value);
  }
  const candidate = Number(incoming.get('page') ?? 1),
    page = Number.isSafeInteger(candidate) && candidate > 0 ? candidate : 1;
  params.set('page', String(page));
  params.set('pageSize', '24');
  return { params, page };
}
export function useDestinationListQuery() {
  const [incoming, setIncoming] = useSearchParams(),
    raw = incoming.toString();
  const pending = useRef(incoming);
  pending.current = incoming;
  const query = useMemo(() => readDestinationListQuery(raw), [raw]);
  return useMemo(() => {
    const change = (key: string, next: SetStateAction<string>) => {
      const params = new URLSearchParams(pending.current);
      const value = typeof next === 'function' ? next(query.params.get(key) ?? '') : next;
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== 'page') params.delete('page');
      pending.current = params;
      setIncoming(params, { replace: true });
    };
    return {
      page: query.page,
      setPage: (next: SetStateAction<number>) =>
        change('page', String(typeof next === 'function' ? next(query.page) : next)),
      query: query.params.get('q') ?? '',
      setQuery: (next: SetStateAction<string>) => change('q', next),
      region: query.params.get('region') ?? '',
      setRegion: (next: SetStateAction<string>) => change('region', next),
      status: query.params.get('status') ?? '',
      setStatus: (next: SetStateAction<string>) => change('status', next),
      completeness: query.params.get('completenessStatus') ?? '',
      setCompleteness: (next: SetStateAction<string>) => change('completenessStatus', next),
      missingCheck: query.params.get('missingCheck') ?? '',
      setMissingCheck: (next: SetStateAction<string>) => change('missingCheck', next),
      searchParams: query.params,
      setSearchParams: setIncoming,
    };
  }, [query, setIncoming]);
}
