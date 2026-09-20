import type { UniversalImportHandoff } from '@manaratak/domain';

export type UniversityImportStage = 'STAGE_1' | 'STAGE_2' | 'STAGE_3' | 'STAGE_4' | 'GLOBAL_RANKINGS';
export type UniversityChangeOperation = 'CREATE' | 'UPDATE' | 'UPSERT_CHILD';

export interface UniversityImportPlannedChange {
  sequence: number;
  sourceReferenceId: string;
  entityType: 'UNIVERSITY' | 'CAMPUS' | 'ORGANIZATION_UNIT' | 'ACADEMIC_PROGRAM' | 'ADMISSION_REQUIREMENT' | 'TUITION' | 'ACCOMMODATION' | 'RANKING' | 'SOURCE_RECORD';
  entityKey: string;
  operation: UniversityChangeOperation;
  beforeState?: Readonly<Record<string, unknown>>;
  afterState: Readonly<Record<string, unknown>>;
}

export interface UniversityImportChangePlan {
  changeSetId: string;
  stage: UniversityImportStage;
  sourceArtifactId: string;
  changes: readonly UniversityImportPlannedChange[];
  validationIssues: ReadonlyArray<{ code: string; path?: string; message: string }>;
  databaseWrites: 0;
}

export interface UniversityImportPlanIdentityLookup {
  findBySourceReferenceId(sourceReferenceId: string): Promise<{ id: string; publicId: string } | null>;
}

export class UniversityImportChangePlanner {
  constructor(private readonly identities?: UniversityImportPlanIdentityLookup) {}

  async plan(stage: UniversityImportStage, handoffs: readonly UniversalImportHandoff[]): Promise<UniversityImportChangePlan> {
    const validationIssues: Array<{ code: string; path?: string; message: string }> = [];
    const changes: UniversityImportPlannedChange[] = [];
    const sourceArtifactIds = new Set(handoffs.map(item => item.artifact.artifactId));
    if (sourceArtifactIds.size !== 1) validationIssues.push({ code: 'ONE_ARTIFACT_PER_CHANGE_SET_REQUIRED', path: 'artifact.artifactId', message: 'A change set must belong to one immutable source artifact.' });
    const sourceArtifactId = [...sourceArtifactIds][0] ?? 'missing-artifact';
    const seen = new Set<string>();

    for (const handoff of handoffs) {
      if (!handoff.execution.dryRun) validationIssues.push({ code: 'DRY_RUN_REQUIRED', path: handoff.handoffId, message: 'Planning cannot accept a writable handoff.' });
      const payload = handoff.normalizedPayload as Record<string, unknown>;
      const sourceReferenceId = String(payload.sourceReferenceId ?? payload.universityRefId ?? '');
      if (!/^INS-[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(sourceReferenceId)) validationIssues.push({ code: 'INVALID_SOURCE_REFERENCE_ID', path: handoff.handoffId, message: 'Permanent INS-* identity is required.' });
      if (seen.has(sourceReferenceId)) validationIssues.push({ code: 'DUPLICATE_SOURCE_REFERENCE_IN_BATCH', path: handoff.handoffId, message: 'The same university occurs more than once.' });
      seen.add(sourceReferenceId);
      const existing = this.identities && sourceReferenceId ? await this.identities.findBySourceReferenceId(sourceReferenceId) : null;
      if (stage !== 'STAGE_1' && !this.identities) validationIssues.push({ code: 'DATABASE_IDENTITY_CHECK_REQUIRED', path: sourceReferenceId, message: 'Later stages require database identity resolution before commit.' });
      if (stage !== 'STAGE_1' && this.identities && !existing) validationIssues.push({ code: 'UNIVERSITY_IDENTITY_NOT_FOUND', path: sourceReferenceId, message: 'Later-stage data cannot create a university.' });
      if (stage === 'STAGE_3') this.validateAdmissionRequirements(payload, handoff.handoffId, validationIssues);
      changes.push({ sequence: changes.length + 1, sourceReferenceId, entityType: 'UNIVERSITY', entityKey: existing?.id ?? sourceReferenceId, operation: existing ? 'UPDATE' : 'CREATE', afterState: payload });
      for (const child of this.deriveStageChanges(stage, sourceReferenceId, payload)) {
        changes.push({ ...child, sequence: changes.length + 1 });
      }
      changes.push({ sequence: changes.length + 1, sourceReferenceId, entityType: 'SOURCE_RECORD', entityKey: handoff.handoffId, operation: 'UPSERT_CHILD', afterState: { stage, artifactId: sourceArtifactId, sourceRowNumber: handoff.provenance.sourceRowNumber, contentHash: handoff.provenance.contentHash } });
    }
    return { changeSetId: `${stage}:${sourceArtifactId}`, stage, sourceArtifactId, changes, validationIssues, databaseWrites: 0 };
  }

  private deriveStageChanges(stage: UniversityImportStage, sourceReferenceId: string, payload: Record<string, unknown>): Array<Omit<UniversityImportPlannedChange, 'sequence'>> {
    const child = (entityType: UniversityImportPlannedChange['entityType'], key: string, state: Record<string, unknown>): Omit<UniversityImportPlannedChange, 'sequence'> => ({ sourceReferenceId, entityType, entityKey: `${sourceReferenceId}:${key}`, operation: 'UPSERT_CHILD', afterState: state });
    if (stage === 'STAGE_3') {
      const faculties = array(payload.faculties);
      const programs = this.programRecords(payload);
      const requirements = arrayOfRecords(payload.admissionRequirements).filter(requirement =>
        text(requirement.internationalTestId) &&
        (text(requirement.academicProgramId) || text(requirement.academicProgramSourceReferenceId))
      );
      return [
        ...faculties.map(name => child('ORGANIZATION_UNIT', `faculty:${normalize(name)}`, { unitType: 'FACULTY', name, createsAcademicTaxonomyIdentity: false })),
        ...programs.map(program => child('ACADEMIC_PROGRAM', `program:${normalize(program.sourceProgramName)}`, {
          sourceProgramName: program.sourceProgramName,
          degreeLevelId: program.degreeLevelId,
          majorId: program.majorId,
          majorMappingState: program.majorId ? 'CANONICALLY_MAPPED' : 'MAJOR_REVIEW_REQUIRED',
          status: program.degreeLevelId ? 'DRAFT' : 'REVIEW_REQUIRED',
          metadata: {
            degreeLevelMappingState: program.degreeLevelId ? 'CANONICALLY_MAPPED' : 'PROGRAM_DEGREE_REVIEW_REQUIRED',
            degreeMappingSource: program.degreeLevelId ? program.degreeMappingSource : undefined,
          },
        })),
        ...requirements.map((requirement, index) => child('ADMISSION_REQUIREMENT', `requirement:${index + 1}`, requirement)),
      ];
    }
    if (stage === 'STAGE_4') {
      const result = [child('TUITION', 'general', {
        annualTuitionFee: payload.annualTuitionFee,
        graduateTuitionFee: payload.graduateTuitionFee,
        currencyCode: payload.tuitionCurrency,
        currencyReferenceId: payload.tuitionCurrencyReferenceId,
        officialSourceUrl: payload.officialTuitionFeeUrl,
      })];
      result.push(child('ACCOMMODATION', 'general', {
        accommodationAvailable: payload.accommodationAvailable,
        internationalEligible: payload.internationalStudentsEligibleForAccommodation,
        typicalCost: payload.typicalAccommodationCost,
        currencyCode: payload.accommodationCurrency,
        currencyReferenceId: payload.accommodationCurrencyReferenceId,
        averageMonthlyLivingCost: payload.averageMonthlyLivingCost,
        livingCostCurrencyCode: payload.livingCostCurrency,
        livingCostCurrencyReferenceId: payload.livingCostCurrencyReferenceId,
      }));
      return result;
    }
    if (stage === 'GLOBAL_RANKINGS') {
      return arrayOfRecords(payload.rankings).map(ranking => child('RANKING', `${ranking.provider}:${ranking.verifiedAt}:${ranking.scope}`, ranking));
    }
    return [];
  }

  private validateAdmissionRequirements(
    payload: Record<string, unknown>,
    path: string,
    issues: Array<{ code: string; path?: string; message: string }>,
  ): void {
    const acceptedTests = array(payload.acceptedLanguageTests);
    const requirements = arrayOfRecords(payload.admissionRequirements);
    if (acceptedTests.length > 0 && requirements.length === 0) {
      issues.push({
        code: 'ADMISSION_REQUIREMENT_CANONICAL_RESOLUTION_REQUIRED',
        path,
        message: 'Accepted test names must be resolved to an International Test and an academic program before commit.',
      });
    }
    requirements.forEach((requirement, index) => {
      if (!text(requirement.internationalTestId))
        issues.push({ code: 'CANONICAL_INTERNATIONAL_TEST_REQUIRED', path: `${path}.admissionRequirements.${index}`, message: 'Canonical International Test ID is required.' });
      if (!text(requirement.academicProgramId) && !text(requirement.academicProgramSourceReferenceId))
        issues.push({ code: 'CANONICAL_ACADEMIC_PROGRAM_REQUIRED', path: `${path}.admissionRequirements.${index}`, message: 'Academic program ID or source reference is required.' });
    });
  }

  private programRecords(payload: Record<string, unknown>): Array<{
    sourceProgramName: string;
    degreeLevelId?: string;
    majorId?: string;
    degreeMappingSource?: string;
  }> {
    const explicitPrograms = arrayOfRecords(payload.academicPrograms ?? payload.programs)
      .flatMap(record => {
        const sourceProgramName = text(record.sourceProgramName ?? record.programName ?? record.name);
        if (!sourceProgramName) return [];
        return [{
          sourceProgramName,
          degreeLevelId: text(record.degreeLevelId),
          majorId: text(record.majorId),
          degreeMappingSource: text(record.degreeMappingSource ?? record.sourceField),
        }];
      });
    if (explicitPrograms.length > 0) return explicitPrograms;
    return array(payload.keyMajors).map(sourceProgramName => ({ sourceProgramName }));
  }
}

function array(value: unknown): string[] { return Array.isArray(value) ? value.map(String).map(item => item.trim()).filter(Boolean) : []; }
function arrayOfRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Record<string, unknown>[] : []; }
function normalize(value: string): string { return value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, '-'); }
function text(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }

export interface UniversityImportChangeExecutorGateway {
  apply(plan: UniversityImportChangePlan, actorId: string): Promise<{ changeSetId: string; appliedChanges: number }>;
  rollback(changeSetId: string, actorId: string): Promise<{ changeSetId: string; revertedChanges: number }>;
}

export class UniversityImportChangeExecutor {
  constructor(private readonly gateway: UniversityImportChangeExecutorGateway) {}
  async commit(plan: UniversityImportChangePlan, input: { actorId: string; recoveryGateToken?: string; approval: 'APPROVE_COMMIT' | 'DRY_RUN_ONLY' }) {
    if (plan.validationIssues.length) throw new Error('UNIVERSITY_IMPORT_PLAN_HAS_BLOCKING_ISSUES');
    if (input.approval !== 'APPROVE_COMMIT') throw new Error('EXPLICIT_COMMIT_APPROVAL_REQUIRED');
    if (!input.recoveryGateToken) throw new Error('DATABASE_RECOVERY_GATE_REQUIRED');
    return this.gateway.apply(plan, input.actorId);
  }
  async rollback(changeSetId: string, input: { actorId: string; recoveryGateToken?: string; approval: 'APPROVE_ROLLBACK' | 'PLAN_ONLY' }) {
    if (input.approval !== 'APPROVE_ROLLBACK') throw new Error('EXPLICIT_ROLLBACK_APPROVAL_REQUIRED');
    if (!input.recoveryGateToken) throw new Error('DATABASE_RECOVERY_GATE_REQUIRED');
    return this.gateway.rollback(changeSetId, input.actorId);
  }
}
