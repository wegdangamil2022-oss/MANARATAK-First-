import { describe, expect, it, vi } from 'vitest';
import { PrismaFellowshipPromotionLinkReconciliationGateway } from '../../packages/infrastructure/src/import-foundation/PrismaFellowshipPromotionLinkReconciliationGateway';

describe('separate fellowship P6 owner backlinks', () => {
  it('requires the owner transaction', async () => {
    await expect(new PrismaFellowshipPromotionLinkReconciliationGateway().reconcile('batch', {} as never)).rejects.toThrow('TRANSACTION');
  });
  it('rejects a major batch before examining or changing its rows', async () => {
    const tx = { $queryRaw: vi.fn().mockResolvedValue([{ dataType: 'MAJORS', batchStatus: 'COMPLETED' }]), $executeRaw: vi.fn() };
    await expect(new PrismaFellowshipPromotionLinkReconciliationGateway().reconcile('batch', { boundaryId: 'owner', transactionClient: tx } as never)).rejects.toThrow('TERMINAL_BATCH');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1); expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it.each([false, true])('rejects missing owner proof or a conflicting canonical target (%s)', async conflict => {
    const tx = { $queryRaw: vi.fn().mockResolvedValueOnce([{ dataType: 'FELLOWSHIPS', batchStatus: 'COMPLETED' }])
      .mockResolvedValueOnce([{ id: 'record', status: 'NEEDS_REVIEW', promotedEntityId: conflict ? 'other-target' : null }])
      .mockResolvedValueOnce(conflict ? [{ recordId: 'record', fellowshipId: 'applied-target', receiptId: 'receipt' }] : []), $executeRaw: vi.fn() };
    await expect(new PrismaFellowshipPromotionLinkReconciliationGateway().reconcile('batch', { boundaryId: 'owner', transactionClient: tx } as never)).rejects.toThrow(conflict ? 'TARGET_CONFLICT' : 'OWNER_PROOF');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
