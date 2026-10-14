import { describe, expect, it } from 'vitest';
import { buildUniversityCitySourceQueue, type UniversityCitySourceRow } from '../../packages/application/src/universities/use-cases/UniversityCitySourceQueue';

const row: UniversityCitySourceRow = { sourceKey: 'stage1#5', sourceHash: 'a'.repeat(64), sourceReferenceId: 'INS-USA-0001', countryIso3: 'USA', cityName: 'Fairfield', officialName: 'University' };
const cities = [
  { sourceId: 'ct', countryIso3: 'USA', countryIso2: 'US', names: ['Fairfield'], regionCode: 'US-CT' },
  { sourceId: 'ca', countryIso3: 'USA', countryIso2: 'US', names: ['Fairfield'], regionCode: 'US-CA' },
];
const evidence = { sourceKey: 'enrichment#5', sourceHash: 'b'.repeat(64) };

describe('university source region evidence', () => {
  it('preserves ambiguity without region evidence', () => {
    expect(buildUniversityCitySourceQueue([row], cities, ['USA']).counts).toEqual({ AMBIGUOUS: 1 });
  });
  it('narrows by the documented university region without assigning a canonical FK', () => {
    const result = buildUniversityCitySourceQueue([{ ...row, allowedRegionCodes: ['US-CT'], regionEvidence: evidence }], cities, ['USA']);
    expect(result.counts).toEqual({ EXACT_SOURCE_CANDIDATE: 1 });
    expect(result.databaseWrites).toBe(0);
  });
  it('does not substitute a same-named city in another state when the expected state is missing', () => {
    const result = buildUniversityCitySourceQueue([{ ...row, allowedRegionCodes: ['US-TX'], regionEvidence: evidence }], cities, ['USA']);
    expect(result.queue[0]).toMatchObject({ state: 'NOT_FOUND', candidateSourceIds: [], canonicalCityId: null });
  });
  it('requires a source hash for a narrowed scope', () => {
    expect(() => buildUniversityCitySourceQueue([{ ...row, allowedRegionCodes: ['US-CT'] }], cities, ['USA'])).toThrow('UNIVERSITY_CITY_REGION_EVIDENCE_REQUIRED');
  });
  it('never bridges country or territory policy through region evidence', () => {
    const result = buildUniversityCitySourceQueue([{ ...row, countryIso3: 'XKX', allowedRegionCodes: ['US-CT'], regionEvidence: evidence }], cities, ['USA']);
    expect(result.queue[0]).toMatchObject({ state: 'TERRITORY_MISMATCH', candidateSourceIds: [], canonicalCityId: null });
  });
  it('holds an unresolved workbook row even when its city name happens to match', () => {
    const result = buildUniversityCitySourceQueue([{ ...row, geographyReviewRequired: true }], cities.slice(0, 1), ['USA']);
    expect(result.queue[0].state).toBe('SOURCE_REVIEW_REQUIRED');
    expect(result.sourceCandidateCount).toBe(0);
  });
  it('never substitutes a different source identity for an explicit binding', () => {
    const result = buildUniversityCitySourceQueue([{ ...row, expectedSourceCityId: 'missing', allowedRegionCodes: ['US-CT'], regionEvidence: evidence }], cities, ['USA']);
    expect(result.queue[0].candidateSourceIds).toEqual([]);
  });
  it('requires region evidence for an explicit source identity', () => {
    expect(() => buildUniversityCitySourceQueue([{ ...row, expectedSourceCityId: 'ct' }], cities, ['USA'])).toThrow('UNIVERSITY_CITY_REGION_EVIDENCE_REQUIRED');
  });
});
