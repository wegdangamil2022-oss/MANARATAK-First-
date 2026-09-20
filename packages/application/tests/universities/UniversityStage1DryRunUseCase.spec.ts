import { describe, expect, it, vi } from 'vitest';
import type { UniversalImportHandoff } from '@manaratak/domain';
import { UniversityStage1DryRunUseCase } from '../../src/universities/use-cases/UniversityStage1DryRunUseCase';

function handoff(overrides: Record<string, unknown> = {}): UniversalImportHandoff {
  return {
    handoffId: 'handoff-1',
    ownerDomain: 'PHASE_11_UNIVERSITY',
    artifact: { sourceId: 'stage-1', artifactId: 'file-1', rawArtifactReference: 'universities.xlsx#4' },
    normalizedPayload: {
      sourceReferenceId: 'INS-YEM-0001',
      officialName: 'Example University',
      countryName: 'Yemen',
      countryIso3: 'YEM',
      cityName: "Sana'a",
      officialWebsite: 'https://example.edu/',
      ...overrides,
    },
    provenance: { sourceSystem: 'UNIVERSITY_STAGE_1_XLSX', acquiredAt: new Date('2026-08-12'), sourceRowNumber: 4 },
    validation: { state: 'VALID', issues: [] },
    execution: { executionId: 'dry-run-1', dryRun: true, attempt: 1, idempotencyKey: 'stage-1:file-1:4' },
  };
}

describe('UniversityStage1DryRunUseCase', () => {
  it('returns review required without inventing a canonical country', async () => {
    const result = await new UniversityStage1DryRunUseCase().execute([handoff()]);

    expect(result.databaseWrites).toBe(0);
    expect(result.dispositions.REVIEW_REQUIRED).toBe(1);
    expect(result.results[0].referenceResolution[0].status).toBe('UNRESOLVED_REFERENCE');
  });

  it('returns new when the canonical country resolves', async () => {
    const resolver = { resolveCountryByIso3: vi.fn().mockResolvedValue({ id: 'country-yem', active: true }) };
    const result = await new UniversityStage1DryRunUseCase(resolver).execute([handoff()]);

    expect(result.dispositions.NEW).toBe(1);
    expect(result.results[0].referenceResolution[0].canonicalId).toBe('country-yem');
  });

  it('matches only by stable source identity', async () => {
    const resolver = { resolveCountryByIso3: vi.fn().mockResolvedValue({ id: 'country-yem', active: true }) };
    const lookup = { findBySourceReferenceId: vi.fn().mockResolvedValue({ universityId: 'university-1' }) };
    const result = await new UniversityStage1DryRunUseCase(resolver, lookup).execute([handoff()]);

    expect(lookup.findBySourceReferenceId).toHaveBeenCalledWith('INS-YEM-0001');
    expect(result.dispositions.MATCHED).toBe(1);
  });

  it('reports duplicate source identities as conflicts', async () => {
    const result = await new UniversityStage1DryRunUseCase().execute([handoff(), handoff()]);

    expect(result.dispositions.CONFLICT).toBe(1);
    expect(result.results[1].validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DUPLICATE_SOURCE_REFERENCE_IN_BATCH' }),
    ]));
  });

  it('rejects malformed required fields and unsafe website schemes', async () => {
    const result = await new UniversityStage1DryRunUseCase().execute([
      handoff({ sourceReferenceId: 'random', officialName: '', countryIso3: 'YE', officialWebsite: 'javascript:alert(1)' }),
    ]);

    expect(result.dispositions.REJECTED).toBe(1);
    expect(result.results[0].validationIssues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'INVALID_SOURCE_REFERENCE_ID',
      'OFFICIAL_NAME_REQUIRED',
      'INVALID_COUNTRY_ISO3',
      'INVALID_OFFICIAL_WEBSITE',
    ]));
  });
});
