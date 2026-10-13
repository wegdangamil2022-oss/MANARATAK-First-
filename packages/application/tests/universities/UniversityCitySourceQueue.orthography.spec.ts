import { describe, expect, it } from 'vitest';
import { buildUniversityCitySourceQueue } from '../../src/universities/use-cases/UniversityCitySourceQueue';

const university = (cityName: string, sourceReferenceId: string, countryIso3 = 'CHN') => ({
  sourceKey: 'source#1', sourceHash: 'source-hash', sourceReferenceId,
  countryIso3, cityName, officialName: 'Example University',
});
const city = (sourceId: string, names: string[], countryIso3 = 'CHN', regionCode = 'CN-BJ') => ({
  sourceId, countryIso3, countryIso2: countryIso3 === 'CHN' ? 'CN' : 'US', names, regionCode,
});

describe('UniversityCitySourceQueue — country-scoped orthographic candidates', () => {
  it('recognizes split Latin transliterations without promoting a canonical FK', () => {
    const result = buildUniversityCitySourceQueue([university('Bei Jing', 'UNI-01')], [city('city-beijing', ['Beijing'])], ['CHN']);
    expect(result.counts.NORMALIZED_SOURCE_CANDIDATE).toBe(1);
    expect(result.sourceCandidateCount).toBe(1);
    expect(result.queue).toHaveLength(0);
    expect(result.databaseWrites).toBe(0);
    expect(result.runtime).toBe('RUNTIME_UNTESTED');
  });

  it('does not auto-select among multiple compact-name candidates', () => {
    const result = buildUniversityCitySourceQueue([university('Chang Sha', 'UNI-02')], [
      city('city-1', ['Changsha'], 'CHN', 'CN-HN'),
      city('city-2', ['Changsha'], 'CHN', 'CN-HN'),
    ], ['CHN']);
    expect(result.counts.AMBIGUOUS).toBe(1);
    expect(result.queue[0].candidateSourceIds).toEqual(['city-1', 'city-2']);
    expect(result.queue[0].canonicalCityId).toBeNull();
    expect(result.queue[0].databaseWrites).toBe(0);
  });

  it('does not borrow a city from another country', () => {
    const result = buildUniversityCitySourceQueue([university('Bei Jing', 'UNI-03', 'USA')], [
      city('city-beijing', ['Beijing']),
    ], ['CHN', 'USA']);
    expect(result.counts.NOT_FOUND).toBe(1);
    expect(result.queue[0].candidateSourceIds).toEqual([]);
  });

  it('honors an exact candidate ahead of a competing compact-only name', () => {
    const result = buildUniversityCitySourceQueue([university('New York', 'UNI-04', 'USA')], [
      city('exact', ['New York'], 'USA', 'US-NY'),
      city('compact', ['Newyork'], 'USA', 'US-NY'),
    ], ['USA']);
    expect(result.counts.EXACT_SOURCE_CANDIDATE).toBe(1);
    expect(result.sourceCandidateCount).toBe(1);
  });
});
