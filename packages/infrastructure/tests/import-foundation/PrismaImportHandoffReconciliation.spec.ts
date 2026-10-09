import { describe, expect, it, vi } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

describe('Import handoff reconciliation read model', () => {
  it('returns only selected operational fields and bounded pages', async () => {
    const prisma = {
      importRecord: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'rec-review', batchId: 'batch-review', status: 'NEEDS_REVIEW',
          updatedAt: new Date('2026-10-09T12:00:00Z'),
          rawPayload: {
            studentDetails: { personalNotes: 'not-for-report' },
            _phase6HandoffState: 'MANUAL_RECONCILIATION_REQUIRED',
            _phase6HandoffEnvelope: {
              handoffId: 'handoff:abc', ownerDomain: 'UNIVERSITIES',
              normalizedPayload: { title: 'private-source-data' },
            },
          },
        }]),
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const repo = new PrismaImportRepository(prisma as any);
    const page = await repo.listHandoffReconciliation({ batchId: 'batch-review', page: 3, pageSize: 12 });
    expect(page).toMatchObject({
      total: 1, page: 3, pageSize: 12,
      data: [{
        recordId: 'rec-review', batchId: 'batch-review',
        handoffState: 'MANUAL_RECONCILIATION_REQUIRED',
        handoffId: 'handoff:abc', ownerDomain: 'UNIVERSITIES',
        manualVerificationRequired: true,
      }],
    });
    expect(JSON.stringify(page)).not.toContain('not-for-report');
    expect(JSON.stringify(page)).not.toContain('private-source-data');
    expect(prisma.importRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 24, take: 12,
        where: expect.objectContaining({
          batchId: 'batch-review',
          OR: expect.arrayContaining([
            { rawPayload: { path: ['_phase6HandoffState'], equals: 'DISPATCH_IN_FLIGHT' } },
            { rawPayload: { path: ['_phase6HandoffState'], equals: 'MANUAL_RECONCILIATION_REQUIRED' } },
          ]),
        }),
      }),
    );
  });

  it('filters by batch in development-only mode without modifying any record', async () => {
    const repo = new PrismaImportRepository(undefined, 'DEVELOPMENT_ONLY');
    const a = await repo.createBatch({ dataType: 'GENERIC' });
    const b = await repo.createBatch({ dataType: 'GENERIC' });
    for (const [batchId, state] of [
      [a.id, 'AWAITING_DOMAIN_INTEGRATION'],
      [a.id, 'DISPATCH_IN_FLIGHT'],
      [a.id, 'DISPATCHED'],
      [b.id, 'MANUAL_RECONCILIATION_REQUIRED'],
    ]) {
      await repo.createRecord({
        batchId, status: 'COMPLETE',
        rawPayload: { _phase6HandoffState: state },
      });
    }
    const page = await repo.listHandoffReconciliation({ batchId: a.id, pageSize: 300 });
    expect(page.total).toBe(2);
    expect(page.pageSize).toBe(100);
    expect(page.data.some(row => row.manualVerificationRequired === false)).toBe(true);
    expect((await repo.listRecords({ batchId: a.id })).total).toBe(3);
    await expect(repo.listHandoffReconciliation({ batchId: '' }))
      .rejects.toThrow('IMPORT_RECONCILIATION_BATCH_REQUIRED');
  });
});
