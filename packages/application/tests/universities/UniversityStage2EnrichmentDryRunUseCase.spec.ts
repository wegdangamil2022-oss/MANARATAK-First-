import { describe, expect, it, vi } from 'vitest';
import type { UniversalImportHandoff } from '@manaratak/domain';
import { UniversityStage2EnrichmentDryRunUseCase } from '../../src/universities/use-cases/UniversityStage2EnrichmentDryRunUseCase';

function handoff(overrides: Record<string, unknown> = {}): UniversalImportHandoff {
  return {
    handoffId: 'stage-2-row', ownerDomain: 'PHASE_11_UNIVERSITY',
    artifact: { sourceId: 'stage-2', artifactId: 'file', rawArtifactReference: 'stage-2.xlsx#5' },
    normalizedPayload: {
      sourceReferenceId: 'INS-YEM-0001', officialEnglishName: 'Example University', countryName: 'Yemen', countryIso3: 'YEM',
      continent: 'Asia', verifiedInstitutionType: 'University', verifiedOwnership: 'Public', officialWebsiteUrl: 'https://example.edu/', ...overrides,
    },
    provenance: { sourceSystem: 'UNIVERSITY_STAGE_2_ENRICHMENT_XLSX', acquiredAt: new Date('2026-08-14'), sourceRowNumber: 5 },
    validation: { state: 'VALID', issues: [] }, execution: { executionId: 'dry', dryRun: true, attempt: 1, idempotencyKey: 'file:5' },
  };
}

describe('UniversityStage2EnrichmentDryRunUseCase', () => {
  const countryResolver = { resolveCountryByIso3: vi.fn().mockResolvedValue({ id: 'country-yem', active: true }) };

  it('requires database identity evidence before an enrichment update', async () => {
    const result = await new UniversityStage2EnrichmentDryRunUseCase(countryResolver).execute([handoff()]);
    expect(result.sourceValid).toBe(1);
    expect(result.readiness.DATABASE_IDENTITY_CHECK_REQUIRED).toBe(1);
    expect(result.databaseWrites).toBe(0);
  });

  it('updates only the Stage 1 identity matched by permanent source reference', async () => {
    const identityLookup = { findBySourceReferenceId: vi.fn().mockResolvedValue({ universityId: 'university-1' }) };
    const result = await new UniversityStage2EnrichmentDryRunUseCase(countryResolver, identityLookup).execute([handoff()]);
    expect(identityLookup.findBySourceReferenceId).toHaveBeenCalledWith('INS-YEM-0001');
    expect(result.dispositions.UPDATE).toBe(1);
    expect(result.results[0].proposedUniversityId).toBe('university-1');
  });

  it('does not create a university when the Stage 1 identity is missing', async () => {
    const identityLookup = { findBySourceReferenceId: vi.fn().mockResolvedValue(null) };
    const result = await new UniversityStage2EnrichmentDryRunUseCase(countryResolver, identityLookup).execute([handoff()]);
    expect(result.readiness.STAGE_1_IDENTITY_NOT_FOUND).toBe(1);
    expect(result.dispositions.NEW).toBe(0);
    expect(result.dispositions.REVIEW_REQUIRED).toBe(1);
  });

  it('rejects malformed identity, URL, and required enrichment fields', async () => {
    const result = await new UniversityStage2EnrichmentDryRunUseCase(countryResolver).execute([handoff({ sourceReferenceId: 'random', officialEnglishName: '', officialWebsiteUrl: 'javascript:alert(1)' })]);
    expect(result.readiness.SOURCE_INVALID).toBe(1);
    expect(result.dispositions.REJECTED).toBe(1);
    expect(result.results[0].validationIssues.map(issue => issue.code)).toEqual(expect.arrayContaining(['INVALID_SOURCE_REFERENCE_ID', 'OFFICIAL_ENGLISH_NAME_REQUIRED', 'INVALID_URL']));
  });
});
