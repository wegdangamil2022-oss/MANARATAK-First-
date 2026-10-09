import { describe, expect, it, vi } from 'vitest';
import { lockImportOwnerCommand } from '../../src/import-foundation/ImportReviewLeaseGuard';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';
import { PrismaCourseImportTransferGateway } from '../../src/courses/PrismaCourseImportTransferGateway';
describe('owner command receipt/side effect serialization', () => {
  it('locks assignment then import row before owner writes', async () => {
    const calls: string[] = [];
    const tx = { $queryRaw: vi.fn(async (sql: TemplateStringsArray) => { calls.push(sql.join('?')); }),
      importReviewAssignment: { findUnique: async () => null } };
    await lockImportOwnerCommand(tx as any, 'r', 'reviewer');
    expect(calls[0]).toContain('pg_advisory_xact_lock');
    expect(calls[1]).toContain('FOR UPDATE');
  });
  it('refuses a competing reviewer before acquiring owner mutation lock', async () => {
    const tx = { $queryRaw: vi.fn(), importReviewAssignment: { findUnique: async () => ({ state: 'CLAIMED',
      assigneeId: 'a', claimedBy: 'a', claimUntil: new Date(Date.now() + 60000) }) } };
    await expect(lockImportOwnerCommand(tx as any, 'r', 'b')).rejects.toThrow('IMPORT_REVIEW_LEASE_REQUIRED');
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it('refuses command guard outside its owning transaction', async () => {
    await expect(new PrismaImportRepository({} as any).assertReviewLease('r', 'a')).rejects.toThrow('TRANSACTION_CONTEXT_REQUIRED');
    await expect(new PrismaCourseImportTransferGateway({} as any).assertReviewLease('r', 'a')).rejects.toThrow('TRANSACTION_CONTEXT_REQUIRED');
  });
});
