import { describe, expect, it, vi } from 'vitest';
import { FellowshipImportScreeningConsumer, parseFellowshipOwnerPayload, ReviewedFellowshipBatchUseCase, reviewedFellowshipBatchHash } from '../../packages/application/src/majors/use-cases/ReviewedFellowshipBatchUseCase';
import { ImportHandoffDispatcher } from '../../packages/application/src/import-foundation/services/ImportHandoffDispatcher';
import type { AtomicDomainMutationCoordinator } from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator';

const payload = () => ({ canonicalMajorName: 'Adult Cardiology Fellowship', classificationCode: 'FEL-0001',
  localizedNames: { ar: 'زمالة طب القلب للبالغين', en: 'Adult Cardiology Fellowship' },
  fellowshipType: 'زمالة تدريبية سريرية', professionalDomain: 'القلب والأوعية', sourceImportMode: 'CATALOG_IDENTITY_ONLY' });
const handoff = () => ({ handoffId: 'source', ownerDomain: 'FELLOWSHIPS', artifact: { sourceId: 'file', artifactId: 'asset' }, normalizedPayload: payload(),
  provenance: { sourceSystem: 'file', contentHash: 'a'.repeat(64) }, validation: { state: 'VALID' as const, issues: [] },
  execution: { executionId: 'run', dryRun: false, attempt: 1, idempotencyKey: 'key' },
  referenceMetadata: { importBatchId: 'batch', sourceRecordDedupKey: 'source-key', artifactSha256: 'a'.repeat(64) } });
describe('separate fellowship owner import', () => {
  it('dispatches a fellowship to its own pure screening consumer', async () => {
    const consumer = new FellowshipImportScreeningConsumer(), dispatcher = new ImportHandoffDispatcher({ FELLOWSHIPS: consumer });
    expect(dispatcher.hasConsumer('FELLOWSHIPS')).toBe(true);
    expect(await dispatcher.dispatch(handoff())).toMatchObject({ owner: 'FELLOWSHIPS', state: 'NEEDS_OWNER_REVIEW', payload: payload() });
  });
  it.each(['degreeLevelId', 'degreeLevel', 'linkedMajorId', 'linkedProfileId', 'approvedBy', 'status'])('rejects unreviewed owner field %s', field => {
    expect(() => parseFellowshipOwnerPayload({ ...payload(), [field]: 'invented' })).toThrow();
  });
  it('rejects wrong source prefix and invalid source data', async () => {
    expect(() => parseFellowshipOwnerPayload({ ...payload(), classificationCode: 'MAS-0001' })).toThrow();
    expect(await new FellowshipImportScreeningConsumer().accept({ ...handoff(), validation: { state: 'INVALID', issues: [] } })).toMatchObject({ state: 'INVALID' });
  });
  it('requires a reviewed batch and actor before any canonical or screening persistence', async () => {
    const gateway = { screen: vi.fn(), apply: vi.fn() }, useCase = new ReviewedFellowshipBatchUseCase(gateway, {} as AtomicDomainMutationCoordinator);
    const batch = { batchId: 'reviewed', handoffs: [handoff()], reason: 'Owner reviewed the source identities.', reviewedHash: '' };
    batch.reviewedHash = reviewedFellowshipBatchHash(batch);
    await expect(useCase.execute(batch, { actorId: '' })).rejects.toThrow('ACTOR');
    batch.handoffs[0].normalizedPayload.canonicalMajorName = 'Changed';
    await expect(useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('REVIEW_INVALID');
    expect(gateway.screen).not.toHaveBeenCalled(); expect(gateway.apply).not.toHaveBeenCalled();
  });
});
