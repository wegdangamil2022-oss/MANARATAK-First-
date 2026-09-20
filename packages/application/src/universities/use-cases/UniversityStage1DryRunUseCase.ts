import {
  UniversityImportDryRunResult,
  UniversityImportReadinessPolicy,
  UniversitySourceReferenceId,
  UniversalImportHandoff,
} from '@manaratak/domain';

export interface UniversityStage1CountryResolver {
  resolveCountryByIso3(iso3: string): Promise<{ id: string; active: boolean | null } | null>;
}

export interface UniversityStage1IdentityLookup {
  findBySourceReferenceId(
    sourceReferenceId: UniversitySourceReferenceId,
  ): Promise<{ universityId: string } | null>;
}

export interface UniversityStage1DryRunSummary {
  total: number;
  databaseWrites: 0;
  dispositions: Record<UniversityImportDryRunResult['disposition'], number>;
  results: readonly UniversityImportDryRunResult[];
}

type Stage1Payload = {
  sourceReferenceId?: string;
  officialName?: string;
  countryName?: string;
  countryIso3?: string;
  cityName?: string;
  officialWebsite?: string;
};

export class UniversityStage1DryRunUseCase {
  constructor(
    private readonly countryResolver?: UniversityStage1CountryResolver,
    private readonly identityLookup?: UniversityStage1IdentityLookup,
  ) {}

  public async execute(handoffs: readonly UniversalImportHandoff[]): Promise<UniversityStage1DryRunSummary> {
    const seenSourceReferences = new Set<string>();
    const results: UniversityImportDryRunResult[] = [];

    for (const handoff of handoffs) {
      results.push(await this.evaluate(handoff, seenSourceReferences));
    }

    const dispositions = this.emptyDispositions();
    for (const result of results) dispositions[result.disposition] += 1;

    return {
      total: results.length,
      databaseWrites: 0,
      dispositions,
      results,
    };
  }

  private async evaluate(
    handoff: UniversalImportHandoff,
    seenSourceReferences: Set<string>,
  ): Promise<UniversityImportDryRunResult> {
    const payload = handoff.normalizedPayload as Stage1Payload;
    const sourceReferenceId = String(payload.sourceReferenceId ?? 'INVALID-SOURCE-REFERENCE');
    const validationIssues: Array<{ code: string; path?: string; message: string }> = [];

    if (!handoff.execution.dryRun) {
      validationIssues.push({ code: 'DRY_RUN_REQUIRED', path: 'execution.dryRun', message: 'Stage 1 evaluation must be a dry run.' });
    }
    if (handoff.ownerDomain !== 'PHASE_11_UNIVERSITY') {
      validationIssues.push({ code: 'INVALID_HANDOFF_OWNER', path: 'ownerDomain', message: 'University domain must own semantic evaluation.' });
    }
    if (!UniversityImportReadinessPolicy.validateIdentity(sourceReferenceId)) {
      validationIssues.push({ code: 'INVALID_SOURCE_REFERENCE_ID', path: 'sourceReferenceId', message: 'Expected a stable INS-* source identity.' });
    }
    if (!payload.officialName?.trim()) {
      validationIssues.push({ code: 'OFFICIAL_NAME_REQUIRED', path: 'officialName', message: 'Official English name is required.' });
    }
    if (!/^[A-Z]{3}$/.test(payload.countryIso3 ?? '')) {
      validationIssues.push({ code: 'INVALID_COUNTRY_ISO3', path: 'countryIso3', message: 'Country ISO3 must contain three uppercase letters.' });
    }
    if (payload.officialWebsite && !this.isHttpUrl(payload.officialWebsite)) {
      validationIssues.push({ code: 'INVALID_OFFICIAL_WEBSITE', path: 'officialWebsite', message: 'Official website must be an HTTP or HTTPS URL.' });
    }

    const validIdentity = UniversityImportReadinessPolicy.validateIdentity(sourceReferenceId);
    const duplicateInBatch = validIdentity && seenSourceReferences.has(sourceReferenceId);
    if (validIdentity) seenSourceReferences.add(sourceReferenceId);
    if (duplicateInBatch) {
      validationIssues.push({ code: 'DUPLICATE_SOURCE_REFERENCE_IN_BATCH', path: 'sourceReferenceId', message: 'Source identity occurs more than once in this batch.' });
    }

    const country = /^[A-Z]{3}$/.test(payload.countryIso3 ?? '') && this.countryResolver
      ? await this.countryResolver.resolveCountryByIso3(payload.countryIso3!)
      : null;
    const referenceResolution: UniversityImportDryRunResult['referenceResolution'] = [{
      referenceType: 'COUNTRY',
      sourceValue: payload.countryIso3,
      canonicalId: country?.id,
      status: country?.id && country.active !== false ? 'RESOLVED' : 'UNRESOLVED_REFERENCE',
    }];

    const existing = validIdentity && this.identityLookup
      ? await this.identityLookup.findBySourceReferenceId(sourceReferenceId)
      : null;
    const hasBlockingValidation = validationIssues.some(issue =>
      issue.code !== 'DUPLICATE_SOURCE_REFERENCE_IN_BATCH'
    );
    const disposition: UniversityImportDryRunResult['disposition'] = duplicateInBatch
      ? 'CONFLICT'
      : hasBlockingValidation
        ? 'REJECTED'
        : !country?.id || country.active === false
          ? 'REVIEW_REQUIRED'
          : existing
            ? 'MATCHED'
            : 'NEW';

    return {
      disposition,
      sourceReferenceId: sourceReferenceId as UniversitySourceReferenceId,
      proposedUniversityId: existing?.universityId,
      referenceResolution,
      validationIssues,
      provenance: handoff.provenance,
      databaseWrites: 0,
    };
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private emptyDispositions(): Record<UniversityImportDryRunResult['disposition'], number> {
    return {
      NEW: 0,
      MATCHED: 0,
      UPDATE: 0,
      NO_CHANGE: 0,
      CONFLICT: 0,
      REVIEW_REQUIRED: 0,
      REJECTED: 0,
    };
  }
}
