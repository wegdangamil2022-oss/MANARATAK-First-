
import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';
import { createHash } from 'node:crypto';
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
const ALLOWED_FIELDS: Record<keyof typeof TYPE_FIELDS, ReadonlySet<string>> = {
  COUNTRY: new Set(['iso2Code', 'iso3Code', 'name', 'nameAr', 'officialName',
    'region', 'subregion', 'defaultCurrencyCode', 'defaultLanguageCode',
    'callingCode', 'flagAssetId', 'metadata']),
  CURRENCY: new Set(['isoCode', 'name', 'nameAr', 'numericCode', 'symbol', 'minorUnit', 'metadata']),
  LANGUAGE: new Set(['isoCode', 'name', 'nameAr', 'nativeName', 'direction', 'metadata']),
  CITY: new Set(['countryIso2Code', 'name', 'nameAr', 'region', 'timezone',
    'latitude', 'longitude', 'administrativeRegionId', 'metadata']),
};
function isBoundedJson(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 5000;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 100 &&
    value.every(item => isBoundedJson(item, depth + 1));
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length <= 100 &&
    entries.every(([key, item]) => key.length <= 100 && isBoundedJson(item, depth + 1));
}

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
    if (FORBIDDEN_P6_CANONICAL_FIELDS.has(field) ||
        !ALLOWED_FIELDS[entityType].has(field)) return field;
    if (value === undefined || value === null) continue;
    if (OPTIONAL_STRING_FIELDS.has(field) &&
        (typeof value !== 'string' || value.length > 500)) return field;
    if (OPTIONAL_NUMERIC_FIELDS.has(field) &&
        (typeof value !== 'number' || !Number.isFinite(value))) return field;
    if (field === 'metadata') {
      if (!value || typeof value !== 'object' || Array.isArray(value) ||
          !isBoundedJson(value)) return field;
      try { if (JSON.stringify(value).length > 8192) return field; }
      catch { return field; }
    }
  }
  return null;
}

/** Stable content fingerprint of mapped source fields only, NOT an approval.
 * Future owner receipt/apply must compare this digest to exact replayed data.
 */
function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForHash);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, val]) => [key, normalizeForHash(val)]));
  }
  return value;
}
export function referenceImportPayloadDigest(payload: Readonly<Record<string, unknown>>): string {
  return createHash('sha256').update(JSON.stringify(normalizeForHash(payload))).digest('hex');
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
  normalizedPayloadHash: string | null;
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
      deterministicKey: null, normalizedPayloadHash: null, issues: [], canonicalWrites: 0,
      state: 'NEEDS_OWNER_REVIEW',
    };
    const sourceIssues = (Array.isArray(handoff.validation?.issues) ? handoff.validation.issues : [])
      .slice(0, 100).map(issue => ({
        code: typeof issue?.code === 'string' ? issue.code.slice(0, 80) : 'P6_UNKNOWN_ISSUE',
        message: typeof issue?.message === 'string' ? issue.message.slice(0, 500) : 'Unverified P6 validation issue',
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
    let malformed: string | null;
    try { malformed = invalidP7FieldShape(entityType, handoff.normalizedPayload); }
    catch { malformed = 'payload'; }
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
      normalizedPayloadHash: referenceImportPayloadDigest(handoff.normalizedPayload),
      deterministicKey: report.deterministicKey || null,
      state: report.canBeImported ? 'NEEDS_OWNER_REVIEW' : 'INVALID',
      issues: [...sourceIssues, ...issues],
    };
  }
}
