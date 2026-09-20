import { describe, expect, it } from 'vitest';
import { UniversityImportReadinessPolicy } from '../../src/universities/UniversityReadinessContracts';

const handoff = {
  handoffId: 'handoff-1',
  ownerDomain: 'PHASE_11_UNIVERSITY',
  artifact: { sourceId: 'source-1', artifactId: 'artifact-1', rawArtifactReference: 'Asia_Universities.xlsx' },
  normalizedPayload: {},
  provenance: { sourceSystem: 'explicit-file-selection', acquiredAt: new Date('2026-08-12') },
  validation: { state: 'VALID' as const, issues: [] },
  execution: { executionId: 'execution-1', dryRun: true, attempt: 1, idempotencyKey: 'dry-run-1' },
};

describe('Phase 11 university readiness contracts', () => {
  it('preserves stable INS source identities and rejects name-only duplicate decisions', () => {
    expect(UniversityImportReadinessPolicy.validateIdentity('INS-CHN-00001')).toBe(true);
    expect(UniversityImportReadinessPolicy.validateIdentity('uni-random')).toBe(false);
    expect(UniversityImportReadinessPolicy.canResolveDuplicateAutomatically({ name: 'Same University' })).toBe(false);
    expect(UniversityImportReadinessPolicy.canResolveDuplicateAutomatically({ sourceReferenceId: 'INS-CHN-00001' })).toBe(true);
  });

  it('requires Phase 6 dry run and explicit root-file selection', () => {
    expect(UniversityImportReadinessPolicy.validateRequest({
      importType: 'UNIVERSITY',
      targetDomain: 'PHASE_11_UNIVERSITY',
      source: { kind: 'PROJECT_ROOT_FILE', artifactId: 'artifact-1', explicitlySelectedFileName: '' },
      handoff,
      approvalMode: 'DRY_RUN_ONLY',
    })).toContain('EXPLICIT_ROOT_FILE_SELECTION_REQUIRED');
  });

  it('does not expose commit approval during readiness preparation', () => {
    expect(UniversityImportReadinessPolicy.validateRequest({
      importType: 'UNIVERSITY',
      targetDomain: 'PHASE_11_UNIVERSITY',
      source: { kind: 'UPLOADED_FILE', artifactId: 'artifact-1', fileName: 'universities.xlsx' },
      handoff,
      approvalMode: 'EXPLICIT_COMMIT_APPROVAL_REQUIRED',
    })).toContain('COMMIT_APPROVAL_NOT_AVAILABLE');
  });
});
