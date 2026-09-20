import {
  ScholarshipCompletenessClassifier,
  ScholarshipCompletenessState,
  ScholarshipDeduplicationService,
  ScholarshipImportPayloadSchema,
  ScholarshipNamingService,
  type IImportHandoffConsumer,
  type UniversalImportHandoff,
} from '@manaratak/domain';
import type {
  IScholarshipHandoffCanonicalScreening,
  IScholarshipHandoffDuplicateLookup,
  ScholarshipDedupeScreeningResult,
  ScholarshipImportStagingCandidate,
  ScholarshipImportStagingState,
} from './ScholarshipImportHandoffContracts';

const ALLOWED_OWNER_DOMAINS = new Set(['SCHOLARSHIP', 'SCHOLARSHIPS']);

/**
 * Phase 6 -> Phase 12 handoff adapter.
 *
 * This service performs semantic validation/screening only. It deliberately
 * does not persist a Scholarship, transfer a record to Catalog, or publish it.
 */
export class ScholarshipImportHandoffService
  implements IImportHandoffConsumer<ScholarshipImportStagingCandidate>
{
  constructor(
    private readonly screening?: IScholarshipHandoffCanonicalScreening,
    private readonly duplicateLookup?: IScholarshipHandoffDuplicateLookup,
  ) {}

  async accept(handoff: UniversalImportHandoff): Promise<ScholarshipImportStagingCandidate> {
    const ownerDomain = handoff.ownerDomain.trim().toUpperCase();
    if (!ALLOWED_OWNER_DOMAINS.has(ownerDomain)) {
      throw new Error(`SCHOLARSHIP_HANDOFF_OWNER_DOMAIN_INVALID:${handoff.ownerDomain}`);
    }
    if (handoff.validation.state === 'INVALID') {
      throw new Error('SCHOLARSHIP_HANDOFF_INVALID');
    }

    const parsed = ScholarshipImportPayloadSchema.safeParse(handoff.normalizedPayload);
    if (!parsed.success) {
      throw new Error('SCHOLARSHIP_HANDOFF_PAYLOAD_INVALID');
    }

    const nameScreening = ScholarshipNamingService.clean(
      parsed.data.scholarshipName,
      this.sourceAliases(parsed.data.metadata?.sourceAliases),
    );
    const canonicalScreening = this.screening
      ? await this.screening.screen(parsed.data)
      : [];
    const providerCanonicalPublicId = canonicalScreening.find(
      (result) => result.target === 'PROVIDER_UNIVERSITY' && result.state === 'RESOLVED',
    )?.canonicalPublicId ?? null;

    const completeness = ScholarshipCompletenessClassifier.classify({
      ...parsed.data,
      cleanedScholarshipName: nameScreening.cleanedScholarshipName,
      providerCanonicalPublicId,
      sourceTraceable: Boolean(
        handoff.artifact.rawArtifactReference ||
        handoff.provenance.sourceSystem,
      ),
      extractedFundingTypeCode: nameScreening.extracted.fundingTypeCode,
      extractedDegreeLevels: nameScreening.extracted.degreeLevelLabels,
    });

    const dedupeInput = {
      cleanedScholarshipName: nameScreening.cleanedScholarshipName,
      providerName: parsed.data.providerName ?? parsed.data.sponsorName,
      providerCanonicalPublicId,
      year: this.stringMetadata(parsed.data.metadata?.academicYear) ?? nameScreening.detectedYear,
      countryReferenceId: canonicalScreening.find((item) => item.target === 'COUNTRY' && item.state === 'RESOLVED')?.canonicalReferenceId ?? null,
      countrySourceLabel: parsed.data.studyCountry ?? null,
      officialSourceUrl: parsed.data.officialSourceUrl ?? parsed.data.sourceUrl ?? parsed.data.officialWebsite ?? parsed.data.applicationLink ?? null,
      incomingSourceImportRecordId:
        handoff.referenceMetadata?.importRecordId ?? handoff.execution.idempotencyKey,
    };
    const dedupe = await this.assessDuplicate(dedupeInput, completeness.identityReady);

    return {
      stagingKey: this.stagingKey(handoff),
      stageState: this.stageState(completeness.state),
      normalizedPayload: parsed.data,
      nameScreening,
      completeness,
      dedupe,
      canonicalScreening,
      evidence: {
        handoffId: handoff.handoffId,
        artifact: handoff.artifact,
        provenance: handoff.provenance,
        execution: handoff.execution,
        validation: handoff.validation,
        correlationId: handoff.correlationId,
        referenceMetadata: handoff.referenceMetadata,
      },
    };
  }

  private async assessDuplicate(
    input: Parameters<typeof ScholarshipDeduplicationService.assess>[0],
    identityReady: boolean,
  ): Promise<ScholarshipDedupeScreeningResult> {
    const unchecked = ScholarshipDeduplicationService.assess(input);
    if (!identityReady || !this.duplicateLookup) return unchecked;
    const matches = await this.duplicateLookup.findMatchesByDedupKey(unchecked.duplicateKey);
    if (matches.length > 0) return ScholarshipDeduplicationService.assess(input, matches);

    const legacyKey = ScholarshipDeduplicationService.buildLegacyKey(input);
    const legacyMatches = await this.duplicateLookup.findMatchesByDedupKey(legacyKey);
    if (legacyMatches.length === 0) return ScholarshipDeduplicationService.assess(input, []);
    const compatible = legacyMatches.filter((match) => this.legacyMatchCompatible(match, input));
    if (compatible.length !== legacyMatches.length || compatible.length !== 1) {
      const assessment = ScholarshipDeduplicationService.assess(input, legacyMatches);
      return { ...assessment, state: 'COLLISION_REVIEW', requiresReview: true, reason: 'Legacy v1 dedupe candidate requires country/official-URL reconciliation before transfer.' };
    }
    return ScholarshipDeduplicationService.assess(input, compatible);
  }

  private legacyMatchCompatible(
    match: { countryReferenceId?: string | null; countrySourceLabel?: string | null; officialSourceUrl?: string | null },
    input: Parameters<typeof ScholarshipDeduplicationService.assess>[0],
  ): boolean {
    const norm = (value?: string | null) => value?.normalize('NFKC').trim().toLocaleLowerCase('und') ?? '';
    const countryMatches = Boolean(input.countryReferenceId && match.countryReferenceId && input.countryReferenceId === match.countryReferenceId) ||
      Boolean(input.countrySourceLabel && match.countrySourceLabel && norm(input.countrySourceLabel) === norm(match.countrySourceLabel));
    const url = (value?: string | null) => {
      if (!value?.trim()) return '';
      try { const parsed = new URL(value); return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/u, '') || '/'}`; }
      catch { return norm(value); }
    };
    return Boolean(countryMatches && url(input.officialSourceUrl) && url(input.officialSourceUrl) === url(match.officialSourceUrl));
  }

  private sourceAliases(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((alias): alias is string => typeof alias === 'string');
  }

  private stringMetadata(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private stagingKey(handoff: UniversalImportHandoff): string {
    return `SCHOLARSHIP|${handoff.execution.idempotencyKey}`;
  }

  private stageState(state: ScholarshipCompletenessState): ScholarshipImportStagingState {
    if (state === ScholarshipCompletenessState.COMPLETE) return 'STAGED_COMPLETE';
    if (state === ScholarshipCompletenessState.NEEDS_REVIEW) return 'STAGED_NEEDS_REVIEW';
    return 'STAGED_INCOMPLETE';
  }
}
