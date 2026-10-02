import { normalizeSourceLabel } from '../../import-foundation/services/CanonicalSourceReview';

export interface UniversityCitySourceRow { sourceKey: string; sourceHash: string; sourceReferenceId: string; countryIso3: string; cityName: string; officialName: string }
export interface UniversitySourceCity { sourceId: string; countryIso3: string; countryIso2: string; names: string[]; regionCode?: string }
const normalized = (value: string) => normalizeSourceLabel(value).normalize('NFKD').replace(/\p{M}/gu, '');
export function buildUniversityCitySourceQueue(rows: readonly UniversityCitySourceRow[], cities: readonly UniversitySourceCity[], countryIso3Codes: readonly string[]) {
  const countries = new Set(countryIso3Codes);
  const exact = new Map<string, Map<string, UniversitySourceCity>>(); const folded = new Map<string, Map<string, UniversitySourceCity>>();
  const add = (index: typeof exact, key: string, city: UniversitySourceCity) => { const values = index.get(key) ?? new Map<string, UniversitySourceCity>(); values.set(city.sourceId, city); index.set(key, values); };
  for (const city of cities) for (const name of city.names.filter(Boolean)) {
    add(exact, `${city.countryIso3}|${name.trim()}`, city);
    add(folded, `${city.countryIso3}|${normalized(name)}`, city);
  }
  const seen = new Set<string>();
  const results = rows.map(row => {
    if (seen.has(row.sourceReferenceId)) throw new Error('UNIVERSITY_CITY_QUEUE_DUPLICATE_SOURCE_ID');
    seen.add(row.sourceReferenceId);
    const direct = [...(exact.get(`${row.countryIso3}|${row.cityName.trim()}`)?.values() ?? [])];
    const candidates = direct.length ? direct : [...(folded.get(`${row.countryIso3}|${normalized(row.cityName)}`)?.values() ?? [])];
    const state = !countries.has(row.countryIso3) ? 'TERRITORY_MISMATCH' : candidates.length > 1 ? 'AMBIGUOUS' : !candidates.length ? 'NOT_FOUND' : direct.length ? 'EXACT_SOURCE_CANDIDATE' : 'NORMALIZED_SOURCE_CANDIDATE';
    const policyAction = state === 'TERRITORY_MISMATCH' ? 'HOLD_COUNTRY_POLICY_NO_PARENT_INFERENCE' : state === 'AMBIGUOUS' ? 'HOLD_SCOPED_MANUAL_CITY_SELECTION' : state === 'NOT_FOUND' ? 'REQUEST_AUTHORITATIVE_CITY_NAME_OR_SCOPED_ALIAS' : 'REVALIDATE_CANONICAL_ID_IN_CONNECTED_ENVIRONMENT';
    return { ...row, state, policyAction, candidateSourceIds: candidates.map(city => city.sourceId).sort(), candidates: candidates.map(city => ({ sourceId: city.sourceId, countryIso2: city.countryIso2, regionCode: city.regionCode ?? null })), canonicalCityId: null, reviewer: null, databaseWrites: 0 as const };
  });
  const counts: Record<string, number> = {};
  for (const row of results) counts[row.state] = (counts[row.state] ?? 0) + 1;
  return { total: rows.length, counts, queue: results.filter(row => ['AMBIGUOUS', 'NOT_FOUND', 'TERRITORY_MISMATCH'].includes(row.state)), sourceCandidateCount: results.filter(row => row.state.endsWith('SOURCE_CANDIDATE')).length, draftPolicy: 'RAW_LABEL_AND_PENDING_MAPPING_ALLOWED_IN_DRAFT_ONLY; NO_GUESSED_FK; REQUIRED_GEOGRAPHY_BLOCKS_PUBLICATION', databaseWrites: 0 as const, runtime: 'RUNTIME_UNTESTED' as const };
}
