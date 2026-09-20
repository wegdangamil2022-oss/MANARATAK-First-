import { describe, expect, it, vi } from 'vitest';
import { ImportAdminUseCases } from '../../src/import-foundation/use-cases/ImportAdminUseCases';

function repo() {
  const records: any[] = [];
  return { records, createBatch: vi.fn().mockResolvedValue({ id: 'batch-1' }), bulkCreateRecords: vi.fn(async (items) => { records.push(...items); return { count: items.length }; }), updateBatchStats: vi.fn(async (_id, data) => ({ id: 'batch-1', ...data })), listBatches: vi.fn(), listRecords: vi.fn(), findBySourceDedupKey: vi.fn().mockResolvedValue(null) };
}
describe('ImportAdminUseCases generic handoff integration', () => {
  it('dispatches valid rows and persists consumer output without fabricated artifact evidence', async () => {
    const storage = repo(); const dispatch = vi.fn().mockResolvedValue({ stageState: 'STAGED_NEEDS_REVIEW', canonicalScreening: [{ state: 'UNRESOLVED' }] });
    const service = new ImportAdminUseCases(storage as any, undefined, { dispatch } as any);
    await service.stageNormalizedRows({ ownerDomain: 'SCHOLARSHIPS', sourceSystem: 'TEST', rows: [{ scholarshipName: 'Example', fundingCoverage: 'Full', degreeLevel: 'Master', applicationLink: 'https://x.test' }] });
    expect(dispatch).toHaveBeenCalledOnce();
    const handoff = dispatch.mock.calls[0][0];
    expect(handoff.normalizedPayload.scholarshipName).toBe('Example');
    expect(handoff.artifact.artifactId).toBeUndefined(); expect(handoff.artifact.rawArtifactReference).toBeUndefined();
    expect(storage.records[0].rawPayload._domainHandoff.canonicalScreening).toHaveLength(1);
  });
  it('persists invalid rows without dispatching or failing the batch', async () => {
    const storage = repo(); const dispatch = vi.fn(); const service = new ImportAdminUseCases(storage as any, undefined, { dispatch } as any);
    const result = await service.stageNormalizedRows({ ownerDomain: 'SCHOLARSHIPS', sourceSystem: 'TEST', rows: [{}] });
    expect(dispatch).not.toHaveBeenCalled(); expect(storage.records).toHaveLength(1); expect(storage.records[0].validationErrors).toContain('EMPTY_NORMALIZED_PAYLOAD'); expect(result.batch.batchStatus).toBe('COMPLETED');
  });
});
