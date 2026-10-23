import { describe, expect, it, vi } from 'vitest';
import { planUniversityScreenedSources, reviewUniversityScreeningPlan, type UniversityScreeningSnapshot } from '../../src/universities/use-cases/UniversityScreeningPlan';
import { validateUniversityImportPlanSeal } from '../../src/universities/use-cases/UniversityImportChangePlan';

const binding = { sourceReferenceId: 'INS-DZA-0001', receiptId: 'receipt-1', requestHash: 'a'.repeat(64), assetId: 'asset-1', artifactSha256: 'b'.repeat(64) };
function snapshot(): UniversityScreeningSnapshot {
  return { existingUniversity: null,
    asset: { id: 'asset-1', lifecycleState: 'ACTIVE', securityClassification: 'INTERNAL', checksumAlgorithm: 'SHA256', checksumHash: binding.artifactSha256, retentionExpiresAt: null, deletedAt: null, purgedAt: null },
    receipt: { id: 'receipt-1', ownerDomain: 'UNIVERSITIES', requestHash: binding.requestHash, result: {
      stageState: 'STAGED_COMPLETE', promotion: { automatic: false, publication: false, state: 'MANUAL_REVIEW_REQUIRED' },
      normalizedPayload: { sourceReferenceId: binding.sourceReferenceId, universityName: 'Reviewed University', metadata: { sourceWorkbookSha256: 'c'.repeat(64), rawRowSha256: 'd'.repeat(64), sourceRowNumber: 18 } },
      evidence: { artifact: { artifactId: binding.assetId }, referenceMetadata: { artifactSha256: binding.artifactSha256 }, validation: { state: 'VALID' } },
    } },
  };
}
describe('source-bound university screening preview', () => {
  it('reviews Stage 2 only as an update of a versioned existing identity', async () => {
    const data = snapshot(); data.existingUniversity = { id: 'existing', publicId: binding.sourceReferenceId, updatedAt: '2026-10-23T00:00:00.000Z', stateHash: 'e'.repeat(64) };
    const payload = (data.receipt!.result as { normalizedPayload: Record<string, unknown> }).normalizedPayload;
    payload.foundedYear = 1900;
    const [preview] = await planUniversityScreenedSources({ read: async () => data }, [binding], 'STAGE_2');
    expect(preview.stage).toBe('STAGE_2'); expect(preview.changes[0].beforeState?.stateHash).toBe('e'.repeat(64));
    const reviewed = reviewUniversityScreeningPlan(preview, { previewPlanHash: preview.planHash!, reviewedBy: 'reviewer', reason: 'Review enrichment only',
      geography: [{ sourceReferenceId: binding.sourceReferenceId, countryReferenceId: 'country', regionReferenceId: 'region', cityReferenceId: 'city' }] });
    expect(reviewed.validationIssues).toEqual([]); expect(reviewed.changes[0].operation).toBe('UPDATE');
    Object.assign(data.receipt!.result as object, { stageState: 'STAGED_DUPLICATE_REVIEW', dedupe: { duplicate: true, existingUniversityId: 'different-owner' } });
    await expect(planUniversityScreenedSources({ read: async () => data }, [binding], 'STAGE_2')).rejects.toThrow('NOT_REVIEWABLE');
    Object.assign(data.receipt!.result as object, { dedupe: { duplicate: true, existingUniversityId: 'existing' } });
    expect((await planUniversityScreenedSources({ read: async () => data }, [binding], 'STAGE_2'))[0].stage).toBe('STAGE_2');
    payload.officialLocalName = 'Requires translation owner';
    await expect(planUniversityScreenedSources({ read: async () => data }, [binding], 'STAGE_2')).rejects.toThrow('UNSUPPORTED_FIELDS');
    delete payload.officialLocalName; payload.foundedYear = 0;
    await expect(planUniversityScreenedSources({ read: async () => data }, [binding], 'STAGE_2')).rejects.toThrow('FOUNDED_YEAR_INVALID');
  });
  it('keeps an existing identity out of the initial-create review path', async () => {
    const data = snapshot(); data.existingUniversity = { id: 'existing', publicId: binding.sourceReferenceId };
    const [preview] = await planUniversityScreenedSources({ read: async () => data }, [binding]);
    expect(() => reviewUniversityScreeningPlan(preview, { previewPlanHash: preview.planHash!, reviewedBy: 'reviewer', reason: 'Review',
      geography: [{ sourceReferenceId: binding.sourceReferenceId, countryReferenceId: 'country', regionReferenceId: 'region', cityReferenceId: 'city' }] })).toThrow('EXISTING_IDENTITY_REQUIRES_UPDATE_WORKFLOW');
  });
  it('binds an explicit review to the exact preview and permits only canonical geography additions', async () => {
    const [preview] = await planUniversityScreenedSources({ read: vi.fn().mockResolvedValue(snapshot()) }, [binding]);
    const decision = { previewPlanHash: preview.planHash!, reviewedBy: 'reviewer', reason: 'Official fields checked; resolve actual geography IDs.',
      geography: [{ sourceReferenceId: binding.sourceReferenceId, countryReferenceId: 'country', regionReferenceId: 'region', cityReferenceId: 'city' }] };
    const reviewed = reviewUniversityScreeningPlan(preview, decision);
    expect(validateUniversityImportPlanSeal(reviewed)).toEqual(reviewed);
    expect(reviewed.validationIssues).toEqual([]);
    expect(reviewed.changes[0].afterState).toEqual({ ...preview.changes[0].afterState, countryReferenceId: 'country', regionReferenceId: 'region', cityReferenceId: 'city' });
    expect(reviewed.changes[1]).toEqual(preview.changes[1]);
    expect(reviewed.sourceReview.previewPlanHash).toBe(preview.planHash);
    expect(reviewed.planHash).not.toBe(preview.planHash);
    expect(() => reviewUniversityScreeningPlan(preview, { ...decision, previewPlanHash: '0'.repeat(64) })).toThrow('REVIEW_INVALID');
    expect(() => reviewUniversityScreeningPlan(preview, { ...decision, geography: [] })).toThrow('GEOGRAPHY_REQUIRED');
    expect(() => reviewUniversityScreeningPlan(preview, { ...decision, geography: [{ ...decision.geography[0], sourceReferenceId: 'INS-OTHER-0001' }] })).toThrow('GEOGRAPHY_REQUIRED');
    expect(() => reviewUniversityScreeningPlan({ ...preview, validationIssues: [] }, decision)).toThrow('PLAN_SEAL');
  });
  it('seals persisted source identities and remains blocked for owner review', async () => {
    const read = vi.fn().mockResolvedValue(snapshot());
    const [plan] = await planUniversityScreenedSources({ read }, [binding]);
    expect(read).toHaveBeenCalledWith(binding.sourceReferenceId, binding.receiptId, binding.assetId);
    expect(validateUniversityImportPlanSeal(plan)).toEqual(plan);
    expect(plan.screeningBindings).toEqual([binding]);
    expect(plan.changes[1].afterState).toMatchObject({ sourceRowNumber: 18, contentHash: 'd'.repeat(64) });
    expect(plan.validationIssues.map(row => row.code)).toContain('UNIVERSITY_SOURCE_OWNER_REVIEW_REQUIRED');
    expect(plan.databaseWrites).toBe(0);
    const changed = structuredClone(plan); changed.screeningBindings[0].requestHash = 'f'.repeat(64);
    expect(() => validateUniversityImportPlanSeal(changed)).toThrow('PLAN_SEAL');
  });
  it.each(['incomplete', 'duplicate', 'missing-receipt', 'receipt-hash', 'asset-hash', 'expired', 'archived', 'wrong-owner'])('rejects %s', async kind => {
    const data = snapshot();
    if (kind === 'incomplete') Object.assign(data.receipt!.result as object, { stageState: 'STAGED_INCOMPLETE' });
    if (kind === 'duplicate') Object.assign(data.receipt!.result as object, { stageState: 'STAGED_DUPLICATE_REVIEW' });
    if (kind === 'missing-receipt') data.receipt = null;
    if (kind === 'receipt-hash') data.receipt!.requestHash = 'f'.repeat(64);
    if (kind === 'asset-hash') data.asset!.checksumHash = 'f'.repeat(64);
    if (kind === 'expired') data.asset!.retentionExpiresAt = new Date(0);
    if (kind === 'archived') data.asset!.lifecycleState = 'ARCHIVED';
    if (kind === 'wrong-owner') data.receipt!.ownerDomain = 'SCHOLARSHIPS';
    await expect(planUniversityScreenedSources({ read: vi.fn().mockResolvedValue(data) }, [binding])).rejects.toThrow('UNIVERSITY_SCREENING_');
  });
  it('rejects duplicate receipt selection before reading', async () => {
    const read = vi.fn();
    await expect(planUniversityScreenedSources({ read }, [binding, { ...binding, sourceReferenceId: 'INS-DZA-0002' }])).rejects.toThrow('SELECTION_INVALID');
    expect(read).not.toHaveBeenCalled();
  });
});
