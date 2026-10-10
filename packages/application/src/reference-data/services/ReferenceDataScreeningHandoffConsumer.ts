
import type { IImportHandoffConsumer, UniversalImportHandoff } from '@manaratak/domain';
import { ReferenceDataImportHandoffService } from './ReferenceDataImportHandoffService';

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
