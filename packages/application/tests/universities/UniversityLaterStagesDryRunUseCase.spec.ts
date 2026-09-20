import { describe, expect, it } from 'vitest';
import { UniversityLaterStagesDryRunUseCase } from '../../src/universities/use-cases/UniversityLaterStagesDryRunUseCase';

function handoff(payload: Record<string, unknown>) {
  return {
    handoffId: 'test', ownerDomain: 'PHASE_11_UNIVERSITY' as const,
    artifact: { sourceId: 'TEST', artifactId: 'test', rawArtifactReference: 'test.xlsx#2' },
    normalizedPayload: payload,
    provenance: { sourceSystem: 'TEST', acquiredAt: new Date(), sourceRowNumber: 2 },
    validation: { state: 'VALID' as const, issues: [] },
    execution: { executionId: 'test', dryRun: true, attempt: 1, idempotencyKey: 'test' },
  };
}

describe('UniversityLaterStagesDryRunUseCase', () => {
  it('keeps Stage 3 pending database identity verification and never writes', async () => {
    const result = await new UniversityLaterStagesDryRunUseCase().execute('STAGE_3', [handoff({
      sourceReferenceId: 'INS-DZA-0001', availableDegrees: [], faculties: [], languagesOfInstruction: [], studyModes: [], keyMajors: [],
      requiredLanguages: [], acceptedLanguageTests: [], internationalScholarships: [],
    })]);
    expect(result.databaseWrites).toBe(0);
    expect(result.results[0]?.readiness).toBe('DATABASE_IDENTITY_CHECK_REQUIRED');
  });

  it('rejects more than eight key majors', async () => {
    const result = await new UniversityLaterStagesDryRunUseCase().execute('STAGE_3', [handoff({
      sourceReferenceId: 'INS-DZA-0001', availableDegrees: [], faculties: [], languagesOfInstruction: [], studyModes: [],
      keyMajors: Array.from({ length: 9 }, (_, index) => `Major ${index}`), requiredLanguages: [], acceptedLanguageTests: [], internationalScholarships: [],
    })]);
    expect(result.results[0]?.validationIssues.map(issue => issue.code)).toContain('KEY_MAJORS_LIMIT_EXCEEDED');
  });

  it('rejects accommodation details when accommodation is unavailable', async () => {
    const result = await new UniversityLaterStagesDryRunUseCase().execute('STAGE_4', [handoff({
      sourceReferenceId: 'INS-DZA-0001', engineeringUndergraduateFees: [], generalRequiredDocuments: [], additionalGraduateRequirements: [],
      accommodationAvailable: false, typicalAccommodationCost: 20, accommodationCurrency: 'USD',
    })]);
    expect(result.results[0]?.validationIssues.map(issue => issue.code)).toContain('ACCOMMODATION_DETAILS_NOT_APPLICABLE');
  });

  it('accepts a documented QS Arab Region rank without claiming a global rank', async () => {
    const result = await new UniversityLaterStagesDryRunUseCase().execute('GLOBAL_RANKINGS', [handoff({
      sourceReferenceId: 'INS-DZA-0001', universityName: 'Example University', rankings: [{
        provider: 'QS', rank: '251-300', scope: 'ARAB_REGION', officialSourceUrl: 'https://www.topuniversities.com/example', verifiedAt: '2026-08-14',
      }],
    })]);
    expect(result.results[0]?.validationIssues).toEqual([]);
    expect(result.results[0]?.readiness).toBe('DATABASE_IDENTITY_CHECK_REQUIRED');
  });
});
