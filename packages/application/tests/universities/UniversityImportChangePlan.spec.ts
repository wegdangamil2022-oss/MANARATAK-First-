import { describe, expect, it, vi } from 'vitest';
import { UniversityImportChangeExecutor, UniversityImportChangePlanner } from '../../src/universities/use-cases/UniversityImportChangePlan';

const handoff = (dryRun = true, normalizedPayload: Record<string, unknown> = { sourceReferenceId: 'INS-DZA-0001', faculties: ['Medicine'] }) => ({
  handoffId: 'artifact:2', ownerDomain: 'PHASE_11_UNIVERSITY',
  artifact: { sourceId: 'UNIVERSITY_STAGE_3_XLSX', artifactId: 'artifact', rawArtifactReference: 'sample.xlsx#2' },
  normalizedPayload,
  provenance: { sourceSystem: 'UNIVERSITY_STAGE_3_XLSX', acquiredAt: new Date(), sourceRowNumber: 2, contentHash: 'hash' },
  validation: { state: 'VALID', issues: [] },
  execution: { executionId: 'dry', dryRun, attempt: 1, idempotencyKey: 'artifact:2' },
} as any);

describe('UniversityImportChangePlan', () => {
  it('creates a zero-write plan and requires a database identity check for later stages', async () => {
    const plan = await new UniversityImportChangePlanner().plan('STAGE_3', [handoff()]);
    expect(plan.databaseWrites).toBe(0);
    expect(plan.validationIssues.map(issue => issue.code)).toContain('DATABASE_IDENTITY_CHECK_REQUIRED');
    expect(plan.changes.map(change => change.entityType)).toEqual(['UNIVERSITY', 'ORGANIZATION_UNIT', 'SOURCE_RECORD']);
  });

  it('plans an update when the permanent identity resolves', async () => {
    const plan = await new UniversityImportChangePlanner({ findBySourceReferenceId: vi.fn().mockResolvedValue({ id: 'db-1', publicId: 'INS-DZA-0001' }) }).plan('STAGE_3', [handoff()]);
    expect(plan.validationIssues).toEqual([]);
    expect(plan.changes[0]).toMatchObject({ operation: 'UPDATE', entityKey: 'db-1' });
    expect(plan.changes[1]).toMatchObject({ entityType: 'ORGANIZATION_UNIT', afterState: { createsAcademicTaxonomyIdentity: false } });
  });

  it('keeps programs derived from general keyMajors in review until an explicit degree mapping exists', async () => {
    const plan = await new UniversityImportChangePlanner({
      findBySourceReferenceId: vi.fn().mockResolvedValue({ id: 'db-1', publicId: 'INS-DZA-0001' }),
    }).plan('STAGE_3', [handoff(true, {
      sourceReferenceId: 'INS-DZA-0001',
      keyMajors: ['Computer Science'],
      availableDegrees: ['Bachelor', 'Master'],
    })]);

    const program = plan.changes.find(change => change.entityType === 'ACADEMIC_PROGRAM');
    expect(program?.afterState).toMatchObject({
      sourceProgramName: 'Computer Science',
      status: 'REVIEW_REQUIRED',
      majorMappingState: 'MAJOR_REVIEW_REQUIRED',
      metadata: expect.objectContaining({
        degreeLevelMappingState: 'PROGRAM_DEGREE_REVIEW_REQUIRED',
      }),
    });
    expect(program?.afterState.degreeLevelId).toBeUndefined();
  });

  it('uses only explicit program to DegreeLevel mappings for academic program degree references', async () => {
    const plan = await new UniversityImportChangePlanner({
      findBySourceReferenceId: vi.fn().mockResolvedValue({ id: 'db-1', publicId: 'INS-DZA-0001' }),
    }).plan('STAGE_3', [handoff(true, {
      sourceReferenceId: 'INS-DZA-0001',
      academicPrograms: [{ sourceProgramName: 'Computer Science', degreeLevelId: 'degree-bachelor' }],
      availableDegrees: ['Bachelor', 'Master'],
    })]);

    expect(plan.changes.find(change => change.entityType === 'ACADEMIC_PROGRAM')?.afterState)
      .toMatchObject({ sourceProgramName: 'Computer Science', degreeLevelId: 'degree-bachelor', status: 'DRAFT' });
  });

  it('blocks named accepted tests until canonical test and program identities are resolved', async () => {
    const plan = await new UniversityImportChangePlanner({
      findBySourceReferenceId: vi.fn().mockResolvedValue({ id: 'db-1', publicId: 'INS-DZA-0001' }),
    }).plan('STAGE_3', [handoff(true, {
      sourceReferenceId: 'INS-DZA-0001', acceptedLanguageTests: ['IELTS'],
    })]);
    expect(plan.validationIssues.map(issue => issue.code)).toContain('ADMISSION_REQUIREMENT_CANONICAL_RESOLUTION_REQUIRED');
    expect(plan.changes.some(change => change.entityType === 'ADMISSION_REQUIREMENT')).toBe(false);
  });

  it('emits executable admission requirements only with canonical identities', async () => {
    const plan = await new UniversityImportChangePlanner({
      findBySourceReferenceId: vi.fn().mockResolvedValue({ id: 'db-1', publicId: 'INS-DZA-0001' }),
    }).plan('STAGE_3', [handoff(true, {
      sourceReferenceId: 'INS-DZA-0001',
      acceptedLanguageTests: ['IELTS'],
      admissionRequirements: [{ sourceTestName: 'IELTS', academicProgramId: 'program-1', internationalTestId: 'test-ielts' }],
    })]);
    expect(plan.validationIssues).toEqual([]);
    expect(plan.changes.find(change => change.entityType === 'ADMISSION_REQUIREMENT')?.afterState)
      .toMatchObject({ academicProgramId: 'program-1', internationalTestId: 'test-ielts' });
  });

  it('blocks commit and rollback without the recovery gate and explicit approval', async () => {
    const gateway = { apply: vi.fn(), rollback: vi.fn() };
    const executor = new UniversityImportChangeExecutor(gateway);
    const plan = await new UniversityImportChangePlanner({ findBySourceReferenceId: vi.fn().mockResolvedValue({ id: 'db-1', publicId: 'INS-DZA-0001' }) }).plan('STAGE_3', [handoff()]);
    await expect(executor.commit(plan, { actorId: 'admin', approval: 'APPROVE_COMMIT' })).rejects.toThrow('DATABASE_RECOVERY_GATE_REQUIRED');
    await expect(executor.rollback(plan.changeSetId, { actorId: 'admin', approval: 'PLAN_ONLY' })).rejects.toThrow('EXPLICIT_ROLLBACK_APPROVAL_REQUIRED');
    expect(gateway.apply).not.toHaveBeenCalled();
    expect(gateway.rollback).not.toHaveBeenCalled();
  });
});
