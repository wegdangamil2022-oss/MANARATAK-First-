import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { UniversalImportHandoff } from '@manaratak/domain';
import { PrismaImportScreeningReceiptStore, screeningReceiptIdentity } from '../../src/import-foundation/PrismaImportScreeningReceiptStore';

const handoff: UniversalImportHandoff = {
  handoffId: 'language:75', ownerDomain: 'REFERENCE_DATA',
  artifact: { sourceId: 'languages', artifactId: 'reviewed-packet' },
  normalizedPayload: { isoCode: 'eng' }, provenance: { sourceSystem: 'reviewed-bootstrap' },
  validation: { state: 'VALID', issues: [] },
  execution: { executionId: 'same-run', dryRun: false, attempt: 1, idempotencyKey: 'language:75' },
};

function client(prior: unknown = null) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    importScreeningReceipt: {
      findUnique: vi.fn().mockResolvedValue(prior),
      create: vi.fn().mockResolvedValue({}),
    },
  };
  const transaction = vi.fn(async (work: (value: typeof tx) => Promise<unknown>, _options?: { maxWait?: number; timeout: number }) => work(tx));
  return { prisma: { $transaction: transaction } as unknown as PrismaClient, tx, transaction };
}

describe('screening receipt transaction budgets', () => {
  it('uses the managed budget while retaining lock, screening and receipt in one transaction', async () => {
    const { prisma, tx, transaction } = client();
    const screen = vi.fn(async () => {
      expect(tx.$queryRaw).toHaveBeenCalledOnce();
      expect(tx.importScreeningReceipt.findUnique).toHaveBeenCalledOnce();
      return { state: 'NEEDS_OWNER_REVIEW', issues: [] };
    });
    const store = new PrismaImportScreeningReceiptStore(prisma, { maxWait: 10_000, timeout: 30_000 });
    await expect(store.accept(handoff, screen)).resolves.toEqual({ state: 'NEEDS_OWNER_REVIEW', issues: [] });
    expect(transaction.mock.calls[0]?.[1]).toEqual({ maxWait: 10_000, timeout: 30_000 });
    expect(tx.importScreeningReceipt.create).toHaveBeenCalledWith({ data: expect.objectContaining(screeningReceiptIdentity(handoff)) });
  });

  it('keeps the existing default and reuses the receipt on retry without screening or inserting again', async () => {
    const result = { state: 'NEEDS_OWNER_REVIEW' };
    const { prisma, tx, transaction } = client({ ...screeningReceiptIdentity(handoff), result });
    const screen = vi.fn();
    await expect(new PrismaImportScreeningReceiptStore(prisma).accept({ ...handoff, execution: { ...handoff.execution, attempt: 2 } }, screen)).resolves.toEqual(result);
    expect(transaction.mock.calls[0]?.[1]).toEqual({ timeout: 15_000 });
    expect(screen).not.toHaveBeenCalled();
    expect(tx.importScreeningReceipt.create).not.toHaveBeenCalled();
  });

  it('still rejects a changed payload and propagates transaction failure without an automatic retry', async () => {
    const { prisma, tx, transaction } = client({ requestHash: 'different-content', result: {} });
    const screen = vi.fn();
    const store = new PrismaImportScreeningReceiptStore(prisma, { maxWait: 10_000, timeout: 30_000 });
    await expect(store.accept(handoff, screen)).rejects.toThrow('IMPORT_RECEIPT_CONTENT_CONFLICT');
    expect(screen).not.toHaveBeenCalled();
    expect(tx.importScreeningReceipt.create).not.toHaveBeenCalled();
    transaction.mockRejectedValueOnce(new Error('transaction expired'));
    await expect(store.accept(handoff, screen)).rejects.toThrow('transaction expired');
    expect(transaction).toHaveBeenCalledTimes(2);
  });
});
