import { describe, expect, it, vi } from 'vitest';
import { PrismaMajorPromotionLinkReconciliationGateway } from '../../packages/infrastructure/src/import-foundation/PrismaMajorPromotionLinkReconciliationGateway';

describe('P6 canonical major promotion links', () => {
  it('requires an audited owner transaction', async () => {
    await expect(new PrismaMajorPromotionLinkReconciliationGateway().reconcile('batch', {} as never)).rejects.toThrow('TRANSACTION_REQUIRED');
  });
  it('does not mark a staged source promoted without an applied owner/version proof', async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValueOnce([{ dataType: 'MAJORS', batchStatus: 'COMPLETED' }])
      .mockResolvedValueOnce([{ id: 'source', status: 'NEEDS_REVIEW', promotedEntityId: null }]).mockResolvedValueOnce([]), $executeRaw: vi.fn() };
    await expect(new PrismaMajorPromotionLinkReconciliationGateway().reconcile('batch', { boundaryId: 'test', transactionClient: tx } as never)).rejects.toThrow('APPLIED_OWNER_PROOF_REQUIRED');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('does not overwrite an existing different canonical link', async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValueOnce([{ dataType: 'MAJORS', batchStatus: 'COMPLETED' }])
      .mockResolvedValueOnce([{ id: 'source', status: 'PROMOTED', promotedEntityId: 'different-major' }])
      .mockResolvedValueOnce([{ recordId: 'source', majorId: 'reviewed-major', profileId: 'reviewed-profile', screening: {} }]), $executeRaw: vi.fn() };
    await expect(new PrismaMajorPromotionLinkReconciliationGateway().reconcile('batch', { boundaryId: 'test', transactionClient: tx } as never)).rejects.toThrow('TARGET_CONFLICT');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
