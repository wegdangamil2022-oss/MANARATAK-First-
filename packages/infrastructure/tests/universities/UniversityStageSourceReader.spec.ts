import { describe, it, expect } from 'vitest';
import { UniversityStageSourceReader } from '../../src/universities/UniversityStageSourceReader';
import { UNIVERSITY_STAGE_CARDS } from '@manaratak/domain';
import catalog from '../../src/universities/UniversityStageSourceCatalog';
describe('University stages reflect pinned source files, not guessed completion', () => {
  const reader = new UniversityStageSourceReader();
  it('covers all source columns, including current geography evidence and 44 enrichment columns', () => {
    for (const artifact of catalog.filter((a) => a.stage <= 2)) {
      const columns = UNIVERSITY_STAGE_CARDS.filter((c) => c.stage === artifact.stage).flatMap(
        (c) => c.fields.map((f) => f.source),
      );
      expect([...columns].sort()).toEqual([...artifact.headers!].sort());
      expect(new Set(columns).size).toBe(artifact.stage === 2 ? 44 : 16);
    }
  });
  it.each(['South America', 'Oceania'])(
    'does not invent later source files for %s',
    async (continent) => {
      const rows = await reader.read('INS-ADMIN-NO-SOURCE', [], {
        region: continent === 'South America' ? 'Americas' : 'Oceania',
        subregion: continent,
      });
      expect(rows.map((s) => s.sourceState)).toEqual([
        'AVAILABLE',
        'NOT_SUPPLIED',
        'NOT_SUPPLIED',
        'NOT_SUPPLIED',
        'NOT_SUPPLIED',
      ]);
      expect(rows.every((s) => s.importState === 'UNKNOWN')).toBe(true);
      expect(rows[0].issues).toContain('SOURCE_IDENTITY_NOT_FOUND_IN_ARTIFACT');
    },
  );
  it('shares one European Markdown source but keeps stages independent and never invents a ranking file', async () => {
    const rows = await reader.read('INS-ADMIN-NO-SOURCE', [], { region: 'Europe' });
    expect(rows[2].sourceHash).toBe(rows[3].sourceHash);
    expect(rows.map((s) => s.sourceState)).toEqual([
      'AVAILABLE',
      'AVAILABLE',
      'AVAILABLE',
      'AVAILABLE',
      'NOT_SUPPLIED',
    ]);
    expect(rows[4].fields).toEqual({});
  });
  it('does not infer a continent or successful import from a display name', async () => {
    const rows = await reader.read('University of Europe', []);
    expect(
      rows.slice(0, 4).every((s) => s.sourceState === 'UNAVAILABLE' && s.continent === null),
    ).toBe(true);
  });
  it('requires a real owner source record and matching artifact for import proof', async () => {
    const artifact = catalog.find((a) => a.stage === 2 && a.continent === 'Europe')!;
    const rows = await reader.read(
      'INS-ADMIN-NO-SOURCE',
      [
        {
          id: 'source-2',
          stage: 'STAGE_2',
          sourceArtifactId: artifact.sha256,
          importedAt: '2026-10-24T00:00:00Z',
        },
      ],
      { region: 'Europe' },
    );
    expect(rows[1].importState).toBe('IMPORTED');
    expect(rows[2].importState).toBe('UNKNOWN');
  });
});
