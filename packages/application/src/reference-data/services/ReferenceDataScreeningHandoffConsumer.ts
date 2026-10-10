
import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';
import { ReferenceDataImportHandoffService } from './ReferenceDataImportHandoffService';

/**
 * P6 payloads are UNTRUSTED runtime objects. A TS cast is not validation;
 * String(value) in the domain validator would otherwise turn arrays/objects
 * into fake source identifiers. The screening boundary does not "fix" them.
 */
const TYPE_FIELDS: Record<'COUNTRY'|'CURRENCY'|'LANGUAGE'|'CITY', readonly string[]> = {
  COUNTRY: ['iso2Code', 'iso3Code', 'name'],
  CURRENCY: ['isoCode', 'name'],
  LANGUAGE: ['isoCode', 'name', 'direction'],
  CITY: ['countryIso2Code', 'name'],
};
const OPTIONAL_STRING_FIELDS = new Set([
  'nameAr', 'officialName', 'region', 'subregion', 'defaultCurrencyCode',
  'defaultLanguageCode', 'callingCode', 'flagAssetId', 'numericCode', 'symbol',
  'nativeName', 'timezone', 'administrativeRegionId',
]);
const OPTIONAL_NUMERIC_FIELDS = new Set(['latitude', 'longitude', 'minorUnit']);
const FORBIDDEN_P6_CANONICAL_FIELDS = new Set([
  'id', 'expectedVersion', 'isActive', 'lifecycleState', 'versionNumber',
  'countryReferenceId', 'canonicalIdentityKey', 'effectiveFrom', 'effectiveTo',
  'providerMappings', 'aliases', 'sourceApprovedAt', 'appliedAt',
]);
function invalidP7FieldShape(
  entityType: keyof typeof TYPE_FIELDS,
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'payload';
  const fields = payload as Record<string, unknown>;
  if (Object.keys(fields).length > 80) return 'fieldCount';
  for (const field of TYPE_FIELDS[entityType]) {
    if (typeof fields[field] !== 'string') return field;
    if (fields[field].length > 500) return field;
  }
  for (const [field, value] of Object.entries(fields)) {
    if (FORBIDDEN_P6_CANONICAL_FIELDS.has(field)) return field;
    if (value === undefined || value === null) continue;
    if (OPTIONAL_STRING_FIELDS.has(field) &&
        (typeof value !== 'string' || value.length > 500)) return field;
    if (OPTIONAL_NUMERIC_FIELDS.has(field) &&
        (typeof value !== 'number' || !Number.isFinite(value))) return field;
    if (field === 'metadata') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return field;
      try { if (JSON.stringify(value).length > 8192) return field; }
      catch { return field; }
    }
  }
  return null;
}

export interface P7ScreeningDecision {
  ownerDomain: 'REFERENCE_DATA';
  effect: 'SCREENING_ONLY';
  state: 'NEEDS_OWNER_REVIEW' | 'INVALID';
  handoffId: string;
  entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY' | null;
  sourceArtifactId: string | null;
  sourceContentHash: string | null;
  deterministicKey: string | null;
  issues: Array<{ code: string; message: string }>;
  /** Preview is NOT approval; no canonical mutation has occurred. */
  canonicalWrites: 0;
}

/**
 * P6 -> P7 SCREENING-ONLY integration. Receipt durability is provided by the
 * generic ImportScreeningReceiptStore in the dispatcher (if configured).
 * The consumer must never call SeedApply or a canonical repository upsert.
 */
export class ReferenceDataScreeningHandoffConsumer implements IImportHandoffConsumer<P7ScreeningDecision> {
  public readonly effectMode = 'SCREENING_ONLY' as const;
  constructor(private readonly planner = new ReferenceDataImportHandoffService()) {}

  public async accept(handoff: UniversalImportHandoff): Promise<P7ScreeningDecision> {
    if (handoff.ownerDomain.trim().toUpperCase() !== 'REFERENCE_DATA') {
      throw new Error('P7_IMPORT_WRONG_OWNER_DOMAIN');
    }
    const givenType = handoff.referenceMetadata?.referenceEntityType ?? null;
    const entityType: P7ScreeningDecision['entityType'] =
      givenType === 'COUNTRY' || givenType === 'CURRENCY' || givenType === 'LANGUAGE' || givenType === 'CITY'
        ? givenType : null;
    const decision: P7ScreeningDecision = {
      ownerDomain: 'REFERENCE_DATA', effect: 'SCREENING_ONLY',
      handoffId: handoff.handoffId, entityType,
      sourceArtifactId: handoff.artifact.artifactId ?? null,
      sourceContentHash: handoff.provenance.contentHash ?? null,
      deterministicKey: null, issues: [], canonicalWrites: 0,
      state: 'NEEDS_OWNER_REVIEW',
    };
    const sourceIssues = (handoff.validation.issues || [])
      .slice(0, 100).map(issue => ({
        code: issue.code, message: issue.message,
      }));
    if (!handoff.artifact.artifactId || !/^[a-fA-F0-9]{64}$/.test(handoff.provenance.contentHash || '')) {
      return {
        ...decision, state: 'INVALID',
        issues: [...sourceIssues, {
          code: 'P7_DURABLE_SOURCE_SHA256_AND_ARTIFACT_REQUIRED',
          message: 'A source artifact ID and verified SHA-256 source hash are mandatory for P7 review.',
        }],
      };
    }
    if (handoff.validation.state === 'INVALID') {
      return { ...decision, state: 'INVALID',
        issues: sourceIssues };
    }
    if (!entityType) {
      return { ...decision, state: 'NEEDS_OWNER_REVIEW',
        issues: [...sourceIssues, { code: 'P7_EXPLICIT_REFERENCE_TYPE_REQUIRED',
          message: 'Supply referenceMetadata.referenceEntityType; P7 will not guess from field shapes.' }] };
    }
    const malformed = invalidP7FieldShape(entityType, handoff.normalizedPayload);
    if (malformed) return {
      ...decision, state: 'INVALID',
      issues: [...sourceIssues, { code: 'P7_IMPORT_SOURCE_SHAPE_INVALID',
        message: 'Field ' + malformed + ' requires verified P6 canonical source mapping.' }],
    };
    let report: ReturnType<ReferenceDataImportHandoffService['prepareSeedBatch']>['records'][number]['validationReport'];
    try {
      const batch = this.planner.prepareSeedBatch({
        seedBatchId: handoff.handoffId,
        sourceName: handoff.provenance.sourceSystem,
        sourceVersion: handoff.referenceMetadata?.sourceVersion || 'UNVERIFIED',
        entityType,
        records: [{ ...handoff.normalizedPayload }],
      });
      report = batch.records[0]?.validationReport;
    } catch {
      // Untrusted P6 field types can be numbers, arrays or malformed objects.
      // A bad source row must be INVALID, not a retrying exception or mutation.
      return {
        ...decision, state: 'INVALID',
        issues: [{ code: 'P7_IMPORT_SOURCE_SHAPE_INVALID',
          message: 'Malformed reference-data source fields require manual correction.' }],
      };
    }
    if (!report) return { ...decision, state: 'INVALID',
      issues: [{ code: 'P7_IMPORT_SCREENING_REPORT_REQUIRED', message: 'Validation evidence unavailable' }] };
    const issues = report.issues
      .filter(issue => issue.severity === 'ERROR')
      .map(issue => ({ code: issue.code, message: issue.message }));
    return {
      ...decision,
      deterministicKey: report.deterministicKey || null,
      state: report.canBeImported ? 'NEEDS_OWNER_REVIEW' : 'INVALID',
      issues: [...sourceIssues, ...issues],
    };
  }
}
