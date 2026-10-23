import type { UniversalImportHandoff } from '@manaratak/domain';
import { UniversityImportChangePlanner, sealUniversityImportPlan, validateUniversityImportPlanSeal, type UniversityImportChangePlan } from './UniversityImportChangePlan';

export interface UniversityScreeningSourceBinding {
  sourceReferenceId: string; receiptId: string; requestHash: string; assetId: string; artifactSha256: string;
}
export interface UniversityScreeningSnapshot {
  receipt: { id: string; ownerDomain: string; requestHash: string; result: unknown } | null;
  asset: { id: string; lifecycleState: string; securityClassification: string; checksumAlgorithm: string | null;
    checksumHash: string | null; retentionExpiresAt: Date | null; deletedAt: Date | null; purgedAt: Date | null } | null;
  existingUniversity: { id: string; publicId: string; updatedAt?: string; stateHash?: string } | null;
}
export interface UniversityScreeningPlanGateway {
  read(sourceReferenceId: string, receiptId: string, assetId: string): Promise<UniversityScreeningSnapshot>;
}
export interface UniversityScreeningPlan extends UniversityImportChangePlan { screeningBindings: UniversityScreeningSourceBinding[]; }
export interface UniversitySourceReviewDecision {
  previewPlanHash: string;
  reviewedBy: string;
  reason: string;
  geography: Array<{ sourceReferenceId: string; countryReferenceId: string; regionReferenceId: string; cityReferenceId: string }>;
}
export interface UniversityReviewedScreeningPlan extends UniversityScreeningPlan { sourceReview: UniversitySourceReviewDecision; }

/** Explicit owner decision, not an authorization grant. The writer rechecks persisted evidence and geography. */
export function reviewUniversityScreeningPlan(preview: UniversityScreeningPlan, decision: UniversitySourceReviewDecision): UniversityReviewedScreeningPlan {
  validateUniversityImportPlanSeal(preview);
  if (!['STAGE_1', 'STAGE_2'].includes(preview.stage) || decision.previewPlanHash !== preview.planHash || !decision.reviewedBy?.trim()
    || !decision.reason?.trim() || decision.reason.length > 2000 || !Array.isArray(preview.screeningBindings)
    || !preview.screeningBindings.length || preview.validationIssues.length !== 1
    || preview.validationIssues[0].code !== 'UNIVERSITY_SOURCE_OWNER_REVIEW_REQUIRED') throw new Error('UNIVERSITY_SOURCE_REVIEW_INVALID');
  const roots = preview.changes.filter(row => row.entityType === 'UNIVERSITY');
  if (preview.stage === 'STAGE_1' && roots.some(row => row.operation !== 'CREATE')) throw new Error('UNIVERSITY_SOURCE_REVIEW_EXISTING_IDENTITY_REQUIRES_UPDATE_WORKFLOW');
  if (preview.stage === 'STAGE_2' && roots.some(row => row.operation !== 'UPDATE' || !row.beforeState?.stateHash || !row.beforeState?.updatedAt)) throw new Error('UNIVERSITY_ENRICHMENT_VERSION_REQUIRED');
  if (!Array.isArray(decision.geography) || roots.length !== preview.screeningBindings.length || decision.geography.length !== roots.length
    || new Set(decision.geography.map(row => row.sourceReferenceId)).size !== roots.length
    || decision.geography.some(row => !roots.some(root => root.sourceReferenceId === row.sourceReferenceId)
      || [row.countryReferenceId, row.regionReferenceId, row.cityReferenceId].some(id => !id?.trim()))) throw new Error('UNIVERSITY_SOURCE_REVIEW_GEOGRAPHY_REQUIRED');
  const changes = preview.changes.map(row => {
    if (row.entityType !== 'UNIVERSITY') return row;
    const location = decision.geography.find(item => item.sourceReferenceId === row.sourceReferenceId)!;
    return { ...row, afterState: { ...row.afterState, countryReferenceId: location.countryReferenceId,
      regionReferenceId: location.regionReferenceId, cityReferenceId: location.cityReferenceId } };
  });
  return sealUniversityImportPlan({ ...preview, changes, validationIssues: [], sourceReview: structuredClone(decision) } as UniversityReviewedScreeningPlan) as UniversityReviewedScreeningPlan;
}

/** Preview only: creates no review approval, canonical entity or source asset. */
export async function planUniversityScreenedSources(gateway: UniversityScreeningPlanGateway,
  bindings: UniversityScreeningSourceBinding[], stage: 'STAGE_1' | 'STAGE_2' = 'STAGE_1'): Promise<UniversityScreeningPlan[]> {
  if (!['STAGE_1', 'STAGE_2'].includes(stage) || !bindings.length || bindings.length > 5 || new Set(bindings.map(row => row.sourceReferenceId)).size !== bindings.length
    || new Set(bindings.map(row => row.receiptId)).size !== bindings.length) throw new Error('UNIVERSITY_SCREENING_SELECTION_INVALID');
  const handoffs: UniversalImportHandoff[] = [], existing = new Map<string, NonNullable<UniversityScreeningSnapshot['existingUniversity']>>();
  for (const binding of bindings) {
    if (!/^[a-f0-9]{64}$/.test(binding.requestHash) || !/^[a-f0-9]{64}$/.test(binding.artifactSha256)) throw new Error('UNIVERSITY_SCREENING_BINDING_INVALID');
    const { receipt, asset, existingUniversity } = await gateway.read(binding.sourceReferenceId, binding.receiptId, binding.assetId);
    if (!receipt || receipt.id !== binding.receiptId || !['UNIVERSITY', 'UNIVERSITIES'].includes(receipt.ownerDomain)
      || receipt.requestHash !== binding.requestHash) throw new Error('UNIVERSITY_SCREENING_RECEIPT_MISMATCH');
    if (!asset || asset.id !== binding.assetId || asset.lifecycleState !== 'ACTIVE' || asset.deletedAt || asset.purgedAt
      || asset.securityClassification !== 'INTERNAL' || asset.checksumAlgorithm?.toUpperCase() !== 'SHA256'
      || asset.checksumHash !== binding.artifactSha256 || (asset.retentionExpiresAt && asset.retentionExpiresAt.getTime() <= Date.now())) throw new Error('UNIVERSITY_SCREENING_ASSET_UNAVAILABLE');
    const result = receipt.result as { stageState?: string; normalizedPayload?: Record<string, unknown>; dedupe?: { duplicate?: boolean; existingUniversityId?: string };
      promotion?: { automatic?: boolean; publication?: boolean; state?: string }; evidence?: {
        artifact?: { artifactId?: string }; referenceMetadata?: Record<string, string>; validation?: { state?: string } } };
    const payload = result?.normalizedPayload, metadata = payload?.metadata as Record<string, unknown> | undefined;
    const reviewable = result?.stageState === 'STAGED_COMPLETE' || (stage === 'STAGE_2' && result?.stageState === 'STAGED_DUPLICATE_REVIEW'
      && result.dedupe?.duplicate === true && existingUniversity && result.dedupe.existingUniversityId === existingUniversity.id);
    if (!reviewable || result.promotion?.automatic !== false || result.promotion?.publication !== false
      || result.promotion?.state !== 'MANUAL_REVIEW_REQUIRED' || result.evidence?.validation?.state !== 'VALID') throw new Error('UNIVERSITY_SCREENING_NOT_REVIEWABLE');
    if (payload?.sourceReferenceId !== binding.sourceReferenceId || result.evidence?.artifact?.artifactId !== asset.id
      || result.evidence?.referenceMetadata?.artifactSha256 !== asset.checksumHash
      || !/^[a-f0-9]{64}$/.test(String(metadata?.sourceWorkbookSha256)) || !/^[a-f0-9]{64}$/.test(String(metadata?.rawRowSha256))
      || !Number.isSafeInteger(metadata?.sourceRowNumber) || Number(metadata?.sourceRowNumber) < 1) throw new Error('UNIVERSITY_SCREENING_PROVENANCE_MISMATCH');
    if (stage === 'STAGE_2') {
      const supported = new Set(['sourceReferenceId', 'universityName', 'country', 'countryIso3', 'city', 'institutionType', 'officialWebsite', 'officialSourceUrl', 'foundedYear', 'metadata']);
      if (Object.keys(payload!).some(key => !supported.has(key))) throw new Error('UNIVERSITY_ENRICHMENT_UNSUPPORTED_FIELDS');
      if (!Number.isInteger(payload!.foundedYear) || Number(payload!.foundedYear) < 800
        || Number(payload!.foundedYear) > new Date().getUTCFullYear()) throw new Error('UNIVERSITY_ENRICHMENT_FOUNDED_YEAR_INVALID');
    }
    if (existingUniversity) existing.set(binding.sourceReferenceId, existingUniversity);
    handoffs.push({ handoffId: receipt.id, ownerDomain: 'PHASE_11_UNIVERSITY', artifact: {
      sourceId: 'REVIEWED_UNIVERSITY_SCREENING', artifactId: String(metadata!.sourceWorkbookSha256) }, normalizedPayload: payload!,
      provenance: { sourceSystem: 'REVIEWED_UNIVERSITY_SCREENING', sourceRowNumber: Number(metadata!.sourceRowNumber), contentHash: String(metadata!.rawRowSha256) },
      validation: { state: 'VALID', issues: [] }, execution: { executionId: receipt.id, idempotencyKey: receipt.id, attempt: 1, dryRun: true } });
  }
  const planner = new UniversityImportChangePlanner({ findBySourceReferenceId: async id => existing.get(id) ?? null });
  const plans: UniversityScreeningPlan[] = [];
  for (const artifact of new Set(handoffs.map(row => row.artifact.artifactId))) {
    const selected = handoffs.filter(row => row.artifact.artifactId === artifact);
    const plan = await planner.plan(stage, selected);
    const ids = new Set(selected.map(row => String(row.normalizedPayload.sourceReferenceId)));
    const screeningBindings = bindings.filter(row => ids.has(row.sourceReferenceId)).map(row => ({ ...row }));
    plans.push(sealUniversityImportPlan({ ...plan, screeningBindings, validationIssues: [...plan.validationIssues, {
      code: 'UNIVERSITY_SOURCE_OWNER_REVIEW_REQUIRED', message: 'Source-bound preview requires owning-domain review and live canonical relationship resolution before commit.',
    }] } as UniversityScreeningPlan) as UniversityScreeningPlan);
  }
  return plans;
}
