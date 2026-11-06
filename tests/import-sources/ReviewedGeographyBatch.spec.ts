import { describe, expect, it, vi } from 'vitest';
import { ReviewedGeographyBatchUseCase, geographyBatchReviewHash, geographySourceRowHash, type ReviewedGeographyBatch } from '../../packages/application/src/reference-data/use-cases/ReviewedGeographyBatchUseCase';
import type { AtomicDomainMutationCoordinator } from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
const make = (): ReviewedGeographyBatch => {
  const raw = { countryIso2: 'YE', regionCode: 'YE-AD', nameEn: 'Aden' };
  const batch = { batchId: 'batch-1', entity: 'REGION' as const, countryIso2Code: 'YE', sourceArtifactId: 'asset-1', sourceContentHash: 'a'.repeat(64),
    rows: [{ sourceKey: 'file.csv#2', sourceRowHash: geographySourceRowHash(raw), sourceFileHash: 'b'.repeat(64), raw, payload: { countryIso2Code: 'YE', regionCode: 'YE-AD', name: 'Aden' } }], reason: 'Delegated owner reviewed source identity only.', reviewedHash: '' };
  batch.reviewedHash = geographyBatchReviewHash(batch); return batch;
};
const fixture = () => {
  const gateway = { screen: vi.fn().mockResolvedValue(undefined), create: vi.fn().mockResolvedValue({ replay: false, records: [] }) };
  const execute = vi.fn(async (_definition, work) => work({ boundaryId: 'test' }));
  const useCase = new ReviewedGeographyBatchUseCase(gateway, { execute } as unknown as AtomicDomainMutationCoordinator);
  return { gateway, execute, useCase };
};
describe('bounded reviewed geography owner commands', () => {
  it('requires an actor and exact reviewed content before persistence', async () => {
    const f = fixture(), batch = make();
    await expect(f.useCase.execute(batch, { actorId: '' })).rejects.toThrow('ACTOR');
    batch.rows[0].payload.name = 'Invented';
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('REVIEW_INVALID');
    expect(f.gateway.create).not.toHaveBeenCalled();
  });
  it('rejects changes to raw source and fabricated mappings even when rehashed', async () => {
    const f = fixture(), batch = make(); batch.rows[0].raw.nameEn = 'Changed'; batch.reviewedHash = geographyBatchReviewHash(batch);
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('ROW_INVALID');
    batch.rows[0].sourceRowHash = geographySourceRowHash(batch.rows[0].raw); batch.reviewedHash = geographyBatchReviewHash(batch);
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('MAPPING_CONFLICT');
  });
  it.each(['id','isActive','lifecycleState','expectedVersion','countryReferenceId'])('rejects canonical command field %s', async field => {
    const f = fixture(), batch = make(); batch.rows[0].payload = { ...batch.rows[0].payload, [field]: 'unsafe' }; batch.reviewedHash = geographyBatchReviewHash(batch);
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('ROW_INVALID'); expect(f.execute).not.toHaveBeenCalled();
  });
  it('enforces bounded size and country scope without touching persistence', async () => {
    const f = fixture(), batch = make(); batch.rows = Array(101).fill(batch.rows[0]); batch.reviewedHash = geographyBatchReviewHash(batch);
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('REVIEW_INVALID');
    batch.rows = [make().rows[0]]; batch.countryIso2Code = 'CN'; batch.reviewedHash = geographyBatchReviewHash(batch);
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('ROW_INVALID');
  });
  it('records review provenance through the atomic owner boundary', async () => {
    const f = fixture(), batch = make(); await f.useCase.execute(batch, { actorId: 'owner' });
    expect(f.execute.mock.calls[0][0]).toMatchObject({ domain: 'REFERENCE_DATA', auditMetadata: { reviewedHash: batch.reviewedHash, rows: 1 } });
    expect(f.gateway.create).toHaveBeenCalledWith(batch, { boundaryId: 'test' }, 'owner'); expect(f.gateway.screen).not.toHaveBeenCalled();
  });
  it('screens cities before any canonical mutation and rejects unverified extra fields', async () => {
    const f = fixture(), batch = make(), raw = { countryIso2: 'YE', cityNameEn: 'Aden' };
    batch.entity = 'CITY'; batch.rows = [{ ...batch.rows[0], raw, sourceRowHash: geographySourceRowHash(raw), payload: { countryIso2Code: 'YE', name: 'Aden', administrativeRegionId: 'real-region', region: 'Aden' } }];
    batch.reviewedHash = geographyBatchReviewHash(batch); await f.useCase.execute(batch, { actorId: 'owner' });
    expect(f.gateway.screen).toHaveBeenCalledOnce(); expect(f.gateway.screen.mock.calls[0][1][0]).toMatchObject({ effect: 'SCREENING_ONLY', canonicalWrites: 0 });
    batch.rows[0].payload.metadata = { unsafe: 'x'.repeat(9000) }; batch.reviewedHash = geographyBatchReviewHash(batch);
    await expect(f.useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('SCREENING_INVALID');
  });
});
