import { describe, expect, it, vi } from 'vitest';
import type { UniversalImportHandoff } from '@manaratak/domain';
import {
  ScholarshipImportHandoffService,
  type IScholarshipHandoffCanonicalScreening,
} from '../../src/scholarships/handoff';

function handoff(overrides: Partial<UniversalImportHandoff> = {}): UniversalImportHandoff {
  return {
    handoffId: 'handoff-1',
    ownerDomain: 'Scholarships',
    artifact: {
      sourceId: 'source-1',
      artifactId: 'artifact-1',
      rawArtifactReference: 'archive://artifact-1',
    },
    normalizedPayload: {
      scholarshipName: 'Example Scholarship',
      providerName: 'Example Foundation',
    },
    provenance: {
      sourceSystem: 'official-feed',
      acquiredAt: new Date('2026-08-21T00:00:00.000Z'),
      sourceRowNumber: 17,
      contentHash: 'sha256:row-17',
    },
    validation: {
      state: 'NEEDS_REVIEW',
      issues: [{
        code: 'SOURCE_FIELD_OPTIONAL',
        message: 'Optional enrichment fields are absent.',
        severity: 'WARNING',
      }],
    },
    execution: {
      executionId: 'execution-1',
      importSessionId: 'session-1',
      dryRun: true,
      attempt: 2,
      idempotencyKey: 'source-1:artifact-1:17',
    },
    correlationId: 'corr-1',
    referenceMetadata: { sourceLocale: 'en' },
    ...overrides,
  };
}

describe('ScholarshipImportHandoffService', () => {
  it('stages a parseable but incomplete-enrichment row instead of rejecting it', async () => {
    const service = new ScholarshipImportHandoffService();
    const result = await service.accept(handoff());

    expect(result.stageState).toBe('STAGED_NEEDS_REVIEW');
    expect(result.completeness.identityMissingFields).toEqual([]);
    expect(result.completeness.coreMissingFields).toEqual([
      'fundingType',
      'benefits',
      'countryOrScope',
      'degreeTargets',
      'eligibility',
      'requiredDocumentsOrTests',
      'deadlineMode',
    ]);
    expect(result.nameScreening.rawSourceTitle).toBe('Example Scholarship');
    expect(result.dedupe.state).toBe('NOT_CHECKED');
    expect(result.normalizedPayload.scholarshipName).toBe('Example Scholarship');
  });

  it('preserves Phase 6 provenance, validation and idempotency evidence', async () => {
    const service = new ScholarshipImportHandoffService();
    const result = await service.accept(handoff());

    expect(result.stagingKey).toBe('SCHOLARSHIP|source-1:artifact-1:17');
    expect(result.evidence.handoffId).toBe('handoff-1');
    expect(result.evidence.artifact.artifactId).toBe('artifact-1');
    expect(result.evidence.provenance.sourceRowNumber).toBe(17);
    expect(result.evidence.execution.attempt).toBe(2);
    expect(result.evidence.validation.state).toBe('NEEDS_REVIEW');
  });

  it('produces the same staging key on Phase 6 replay', async () => {
    const service = new ScholarshipImportHandoffService();
    const first = await service.accept(handoff());
    const replay = await service.accept(handoff({ handoffId: 'handoff-replay' }));

    expect(replay.stagingKey).toBe(first.stagingKey);
  });

  it('rejects an INVALID Phase 6 handoff before Scholarship screening', async () => {
    const screening: IScholarshipHandoffCanonicalScreening = {
      screen: vi.fn().mockResolvedValue([]),
    };
    const service = new ScholarshipImportHandoffService(screening);

    await expect(service.accept(handoff({
      validation: {
        state: 'INVALID',
        issues: [{ code: 'PARSE_ERROR', message: 'Invalid row', severity: 'ERROR' }],
      },
    }))).rejects.toThrow('SCHOLARSHIP_HANDOFF_INVALID');
    expect(screening.screen).not.toHaveBeenCalled();
  });

  it('delegates canonical reference screening without requiring canonical Scholarship persistence', async () => {
    const screening: IScholarshipHandoffCanonicalScreening = {
      screen: vi.fn().mockResolvedValue([{
        target: 'COUNTRY',
        state: 'UNRESOLVED',
        rawValue: 'Exampleland',
        requestedCanonicalId: null,
        requestedStandardCode: null,
        canonicalReferenceId: null,
        canonicalPublicId: null,
        canonicalStandardCode: null,
        canonicalName: null,
        method: null,
        candidates: [],
        reason: 'No existing canonical entity matched.',
      }]),
    };
    const service = new ScholarshipImportHandoffService(screening);
    const result = await service.accept(handoff());

    expect(screening.screen).toHaveBeenCalledOnce();
    expect(result.canonicalScreening[0].state).toBe('UNRESOLVED');
  });
});
