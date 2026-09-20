import {
  UniversityImportDryRunResult,
  UniversityImportReadinessPolicy,
  UniversitySourceReferenceId,
  UniversityStage2EnrichmentPayload,
  UniversityStage2Readiness,
  UniversalImportHandoff,
} from '@manaratak/domain';
import type {
  UniversityStage1CountryResolver,
  UniversityStage1IdentityLookup,
} from './UniversityStage1DryRunUseCase';

export interface UniversityStage2DryRunResult extends UniversityImportDryRunResult {
  stage2Readiness: UniversityStage2Readiness;
}

export interface UniversityStage2DryRunSummary {
  total: number;
  sourceValid: number;
  databaseWrites: 0;
  readiness: Record<UniversityStage2Readiness, number>;
  dispositions: Record<UniversityImportDryRunResult['disposition'], number>;
  results: readonly UniversityStage2DryRunResult[];
}

export class UniversityStage2EnrichmentDryRunUseCase {
  constructor(
    private readonly countryResolver?: UniversityStage1CountryResolver,
    private readonly identityLookup?: UniversityStage1IdentityLookup,
  ) {}

  async execute(handoffs: readonly UniversalImportHandoff[]): Promise<UniversityStage2DryRunSummary> {
    const seen = new Set<string>();
    const results: UniversityStage2DryRunResult[] = [];
    for (const handoff of handoffs) results.push(await this.evaluate(handoff, seen));

    const readiness: Record<UniversityStage2Readiness, number> = {
      SOURCE_INVALID: 0,
      DATABASE_IDENTITY_CHECK_REQUIRED: 0,
      STAGE_1_IDENTITY_NOT_FOUND: 0,
      READY_TO_UPDATE: 0,
    };
    const dispositions: Record<UniversityImportDryRunResult['disposition'], number> = {
      NEW: 0, MATCHED: 0, UPDATE: 0, NO_CHANGE: 0, CONFLICT: 0, REVIEW_REQUIRED: 0, REJECTED: 0,
    };
    for (const result of results) {
      readiness[result.stage2Readiness] += 1;
      dispositions[result.disposition] += 1;
    }
    return {
      total: results.length,
      sourceValid: results.filter(result => result.stage2Readiness !== 'SOURCE_INVALID').length,
      databaseWrites: 0,
      readiness,
      dispositions,
      results,
    };
  }

  private async evaluate(handoff: UniversalImportHandoff, seen: Set<string>): Promise<UniversityStage2DryRunResult> {
    const payload = handoff.normalizedPayload as unknown as UniversityStage2EnrichmentPayload;
    const sourceReferenceId = String(payload.sourceReferenceId ?? 'INVALID-SOURCE-REFERENCE');
    const validationIssues: Array<{ code: string; path?: string; message: string }> = [];

    if (!handoff.execution.dryRun) validationIssues.push(issue('DRY_RUN_REQUIRED', 'execution.dryRun', 'Stage 2 evaluation must be a dry run.'));
    if (handoff.ownerDomain !== 'PHASE_11_UNIVERSITY') validationIssues.push(issue('INVALID_HANDOFF_OWNER', 'ownerDomain', 'University domain must own enrichment semantics.'));
    if (!UniversityImportReadinessPolicy.validateIdentity(sourceReferenceId)) validationIssues.push(issue('INVALID_SOURCE_REFERENCE_ID', 'sourceReferenceId', 'Expected the permanent INS-* identity.'));
    if (!payload.officialEnglishName?.trim()) validationIssues.push(issue('OFFICIAL_ENGLISH_NAME_REQUIRED', 'officialEnglishName', 'Official English name is required.'));
    if (!payload.countryName?.trim()) validationIssues.push(issue('COUNTRY_NAME_REQUIRED', 'countryName', 'Country name is required.'));
    if (!/^[A-Z]{3}$/.test(payload.countryIso3 ?? '')) validationIssues.push(issue('INVALID_COUNTRY_ISO3', 'countryIso3', 'Country ISO3 must contain three uppercase letters.'));
    if (!payload.continent?.trim()) validationIssues.push(issue('CONTINENT_REQUIRED', 'continent', 'Continent is required.'));
    if (!payload.verifiedInstitutionType?.trim()) validationIssues.push(issue('INSTITUTION_TYPE_REQUIRED', 'verifiedInstitutionType', 'Verified institution type is required.'));
    if (!payload.verifiedOwnership?.trim()) validationIssues.push(issue('OWNERSHIP_REQUIRED', 'verifiedOwnership', 'Verified ownership is required.'));
    if (payload.foundedYear && (payload.foundedYear < 800 || payload.foundedYear > new Date().getUTCFullYear())) {
      validationIssues.push(issue('INVALID_FOUNDED_YEAR', 'foundedYear', 'Founded year is outside the accepted range.'));
    }
    for (const [path, value] of Object.entries(urlFields(payload))) {
      if (value && !isHttpUrl(value)) validationIssues.push(issue('INVALID_URL', path, `${path} must be an HTTP or HTTPS URL.`));
    }

    const validIdentity = UniversityImportReadinessPolicy.validateIdentity(sourceReferenceId);
    const duplicate = validIdentity && seen.has(sourceReferenceId);
    if (validIdentity) seen.add(sourceReferenceId);
    if (duplicate) validationIssues.push(issue('DUPLICATE_SOURCE_REFERENCE_IN_BATCH', 'sourceReferenceId', 'Source identity occurs more than once in this batch.'));

    const sourceInvalid = validationIssues.some(item => item.code !== 'DUPLICATE_SOURCE_REFERENCE_IN_BATCH');
    const country = !sourceInvalid && this.countryResolver
      ? await this.countryResolver.resolveCountryByIso3(payload.countryIso3)
      : null;
    const existing = !sourceInvalid && validIdentity && this.identityLookup
      ? await this.identityLookup.findBySourceReferenceId(sourceReferenceId)
      : null;

    let stage2Readiness: UniversityStage2Readiness;
    if (sourceInvalid || duplicate) stage2Readiness = 'SOURCE_INVALID';
    else if (!this.identityLookup) stage2Readiness = 'DATABASE_IDENTITY_CHECK_REQUIRED';
    else if (!existing) stage2Readiness = 'STAGE_1_IDENTITY_NOT_FOUND';
    else stage2Readiness = 'READY_TO_UPDATE';

    const disposition: UniversityImportDryRunResult['disposition'] = duplicate
      ? 'CONFLICT'
      : sourceInvalid
        ? 'REJECTED'
        : stage2Readiness === 'READY_TO_UPDATE' && country?.id && country.active !== false
          ? 'UPDATE'
          : 'REVIEW_REQUIRED';

    return {
      stage2Readiness,
      disposition,
      sourceReferenceId: sourceReferenceId as UniversitySourceReferenceId,
      proposedUniversityId: existing?.universityId,
      referenceResolution: [{
        referenceType: 'COUNTRY',
        sourceValue: payload.countryIso3,
        canonicalId: country?.id,
        status: country?.id && country.active !== false ? 'RESOLVED' : 'UNRESOLVED_REFERENCE',
      }],
      validationIssues,
      provenance: handoff.provenance,
      databaseWrites: 0,
    };
  }
}

function issue(code: string, path: string, message: string) { return { code, path, message }; }
function isHttpUrl(value: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
function urlFields(payload: UniversityStage2EnrichmentPayload): Record<string, string | undefined> {
  return {
    originalWebsiteUrl: payload.originalWebsiteUrl,
    originalSourceUrl: payload.originalSourceUrl,
    mapUrl: payload.mapUrl,
    officialWebsiteUrl: payload.officialWebsiteUrl,
    officialWebsiteSource: payload.officialWebsiteSource,
    officialApplicationPortalUrl: payload.officialApplicationPortalUrl,
    governmentRegistryUrl: payload.governmentRegistryUrl,
    universitySystemUrl: payload.universitySystemUrl,
    centralAdmissionsPortalUrl: payload.centralAdmissionsPortalUrl,
    trustedInternationalDirectoryUrl: payload.trustedInternationalDirectoryUrl,
    primarySourceUrl: payload.primarySourceUrl,
    mainOfficialSocialMediaUrl: payload.mainOfficialSocialMediaUrl,
  };
}
