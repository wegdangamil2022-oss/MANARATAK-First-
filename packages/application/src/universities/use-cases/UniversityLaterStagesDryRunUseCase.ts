import {
  UniversityGlobalRankingsPayload,
  UniversityImportReadinessPolicy,
  UniversityLaterStageReadiness,
  UniversityRankingEntry,
  UniversitySourceReferenceId,
  UniversityStage3Payload,
  UniversityStage4Payload,
  UniversalImportHandoff,
} from '@manaratak/domain';
import type { UniversityStage1IdentityLookup } from './UniversityStage1DryRunUseCase';

export type UniversityLaterStage = 'STAGE_3' | 'STAGE_4' | 'GLOBAL_RANKINGS';
export interface UniversityLaterStageResult {
  sourceReferenceId: string;
  readiness: UniversityLaterStageReadiness;
  validationIssues: ReadonlyArray<{ code: string; path?: string; message: string }>;
  databaseWrites: 0;
}

export class UniversityLaterStagesDryRunUseCase {
  constructor(private readonly identityLookup?: UniversityStage1IdentityLookup) {}

  async execute(stage: UniversityLaterStage, handoffs: readonly UniversalImportHandoff[]) {
    const seen = new Set<string>();
    const results: UniversityLaterStageResult[] = [];
    for (const handoff of handoffs) results.push(await this.evaluate(stage, handoff, seen));
    return { stage, total: results.length, results, databaseWrites: 0 as const };
  }

  private async evaluate(stage: UniversityLaterStage, handoff: UniversalImportHandoff, seen: Set<string>): Promise<UniversityLaterStageResult> {
    const payload = handoff.normalizedPayload as unknown as UniversityStage3Payload | UniversityStage4Payload | UniversityGlobalRankingsPayload;
    const sourceReferenceId = String(payload.sourceReferenceId ?? '');
    const validationIssues = validateCommon(handoff, sourceReferenceId);
    if (seen.has(sourceReferenceId)) validationIssues.push(issue('DUPLICATE_SOURCE_REFERENCE_IN_BATCH', 'sourceReferenceId', 'University identity occurs more than once.'));
    seen.add(sourceReferenceId);
    if (stage === 'STAGE_3') validateStage3(payload as UniversityStage3Payload, validationIssues);
    if (stage === 'STAGE_4') validateStage4(payload as UniversityStage4Payload, validationIssues);
    if (stage === 'GLOBAL_RANKINGS') validateRankings(payload as UniversityGlobalRankingsPayload, validationIssues);

    const existing = validationIssues.length === 0 && this.identityLookup
      ? await this.identityLookup.findBySourceReferenceId(sourceReferenceId as UniversitySourceReferenceId)
      : null;
    const readiness: UniversityLaterStageReadiness = validationIssues.length
      ? 'SOURCE_INVALID'
      : !this.identityLookup
        ? 'DATABASE_IDENTITY_CHECK_REQUIRED'
        : !existing
          ? 'UNIVERSITY_IDENTITY_NOT_FOUND'
          : 'READY_TO_UPDATE';
    return { sourceReferenceId, readiness, validationIssues, databaseWrites: 0 };
  }
}

function validateCommon(handoff: UniversalImportHandoff, id: string) {
  const issues: Array<{ code: string; path?: string; message: string }> = [];
  if (!handoff.execution.dryRun) issues.push(issue('DRY_RUN_REQUIRED', 'execution.dryRun', 'Evaluation must be dry-run only.'));
  if (handoff.ownerDomain !== 'PHASE_11_UNIVERSITY') issues.push(issue('INVALID_HANDOFF_OWNER', 'ownerDomain', 'University domain must own the update.'));
  if (!UniversityImportReadinessPolicy.validateIdentity(id)) issues.push(issue('INVALID_SOURCE_REFERENCE_ID', 'sourceReferenceId', 'Expected permanent INS-* identity.'));
  return issues;
}
function validateStage3(payload: UniversityStage3Payload, issues: Array<{ code: string; path?: string; message: string }>) {
  if (payload.keyMajors.length > 8) issues.push(issue('KEY_MAJORS_LIMIT_EXCEEDED', 'keyMajors', 'At most eight key majors are allowed.'));
  checkUrls(payload, ['officialProgramCatalogUrl','undergraduateAdmissionUrl','graduateAdmissionUrl','internationalStudentAdmissionUrl','officialApplicationPortalUrl','officialLanguageRequirementsUrl'], issues);
  if (payload.acceptsInternationalStudents === false && payload.internationalStudentAdmissionUrl) issues.push(issue('INTERNATIONAL_ADMISSION_URL_NOT_APPLICABLE', 'internationalStudentAdmissionUrl', 'URL must be blank when international students are not accepted.'));
  if (payload.hasLanguageRequirements === false && (payload.requiredLanguages.length || payload.acceptedLanguageTests.length || payload.officialLanguageRequirementsUrl)) issues.push(issue('LANGUAGE_DETAILS_NOT_APPLICABLE', 'hasLanguageRequirements', 'Language details must be blank when requirements are false.'));
  for (const scholarship of payload.internationalScholarships) if (!scholarship.name || !isHttpUrl(scholarship.officialUrl)) issues.push(issue('INVALID_SCHOLARSHIP_REFERENCE', 'internationalScholarships', 'Scholarship requires a name and official URL.'));
}
function validateStage4(payload: UniversityStage4Payload, issues: Array<{ code: string; path?: string; message: string }>) {
  for (const [key, value] of Object.entries(payload)) if ((key.toLowerCase().includes('fee') || key.toLowerCase().includes('cost')) && typeof value === 'number' && value < 0) issues.push(issue('NEGATIVE_AMOUNT', key, 'Financial amounts cannot be negative.'));
  checkUrls(payload, ['officialTuitionFeeUrl','officialRequiredDocumentsUrl'], issues);
  if (payload.accommodationAvailable === false && (payload.internationalStudentsEligibleForAccommodation !== undefined || payload.typicalAccommodationCost !== undefined || payload.accommodationCurrency)) issues.push(issue('ACCOMMODATION_DETAILS_NOT_APPLICABLE', 'accommodationAvailable', 'Accommodation details must be blank when unavailable.'));
  for (const item of payload.engineeringUndergraduateFees) if (!item.faculty || item.amount < 0) issues.push(issue('INVALID_ENGINEERING_FEE', 'engineeringUndergraduateFees', 'Each fee requires a faculty and non-negative amount.'));
}
function validateRankings(payload: UniversityGlobalRankingsPayload, issues: Array<{ code: string; path?: string; message: string }>) {
  const providers = new Set<string>();
  for (const ranking of payload.rankings) {
    if (providers.has(ranking.provider)) issues.push(issue('DUPLICATE_RANKING_PROVIDER', 'rankings', 'Only one entry per provider is allowed in one snapshot.'));
    providers.add(ranking.provider);
    validateRanking(ranking, issues);
  }
}
function validateRanking(ranking: UniversityRankingEntry, issues: Array<{ code: string; path?: string; message: string }>) {
  if (!/^\d+(?:-\d+|\+)?$/.test(ranking.rank)) issues.push(issue('INVALID_RANK_FORMAT', 'rankings.rank', 'Rank must be a number, range, or plus band such as 1501+.'));
  if (!isHttpUrl(ranking.officialSourceUrl)) issues.push(issue('INVALID_RANKING_SOURCE_URL', 'rankings.officialSourceUrl', 'An official HTTP(S) source is required.'));
  if (!ranking.verifiedAt) issues.push(issue('RANKING_VERIFICATION_DATE_REQUIRED', 'rankings.verifiedAt', 'Verification date is required.'));
  if (ranking.scope !== 'GLOBAL' && ranking.scope === 'OTHER_REGIONAL' && !ranking.scopeLabel) issues.push(issue('REGIONAL_SCOPE_LABEL_REQUIRED', 'rankings.scopeLabel', 'Unknown regional scopes require their official label.'));
}
function checkUrls(payload: object, keys: string[], issues: Array<{ code: string; path?: string; message: string }>) { for (const key of keys) { const value = (payload as Record<string, unknown>)[key]; if (value && !isHttpUrl(String(value))) issues.push(issue('INVALID_URL', key, `${key} must be HTTP(S).`)); } }
function isHttpUrl(value: string) { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } }
function issue(code: string, path: string, message: string) { return { code, path, message }; }
