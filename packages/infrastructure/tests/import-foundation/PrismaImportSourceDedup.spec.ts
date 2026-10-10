import { describe, expect, it, vi } from 'vitest';
import { PrismaImportRepository } from '../../src/import-foundation/PrismaImportRepository';

/**
 * Lightweight source contract test. A queued mock transaction stands in for
 * PostgreSQL advisory locking; real cross-process contention is Post-28.
 */
describe('Phase 6 cross-batch source identity contention', () => {
  it('locks identity BEFORE global lookup and inserts one durable observation per source key', async () => {
    const persisted: Array<Record<string, any>> = [];
    const order: string[] = [];
    let transactionTail: Promise<void> = Promise.resolve();
    const prisma = {
      $transaction: vi.fn(async (work: (client: any) => Promise<unknown>) => {
        const predecessor = transactionTail;
        let release!: () => void;
        transactionTail = new Promise<void>(resolve => { release = resolve; });
        await predecessor;
        const client = {
          $queryRaw: vi.fn(async () => { order.push('lock'); return []; }),
          importRecord: {
            findMany: vi.fn(async ({ where }: any) => {
              order.push('read');
              return persisted.filter(row => where.sourceDedupKey.in.includes(row.sourceDedupKey));
            }),
            createMany: vi.fn(async ({ data }: any) => {
              order.push('insert');
              persisted.push(...data);
              return { count: data.length };
            }),
          },
        };
        try { return await work(client); }
        finally { release(); }
      }),
    };
    const first = new PrismaImportRepository(prisma as never);
    const second = new PrismaImportRepository(prisma as never);
    const record = (batchId: string) => ({ id: `rec-${batchId}`, batchId, status: 'COMPLETE',
      sourceDedupKey: 'same-source|same-domain|id:42|sha256:content',
      rawPayload: { approved: true },
    });
    const [one, two] = await Promise.all([
      first.bulkCreateRecords([record('batch-1')]),
      second.bulkCreateRecords([record('batch-2')]),
    ]);
    expect([one.count, two.count]).toEqual([1, 0]);
    expect(one.acceptedRecordIds).toEqual(['rec-batch-1']);
    expect(two.acceptedRecordIds).toEqual([]);
    expect(persisted).toHaveLength(1);
    expect(order).toEqual(['lock', 'read', 'insert', 'lock', 'read']);
  });

  it('returns exact accepted IDs when another batch already owns a source key', async () => {
    const persisted = [{ sourceDedupKey: 'occupied' }];
    const prisma = {
      $transaction: async (work: (client: any) => Promise<unknown>) => work({
        $queryRaw: vi.fn(async () => []),
        importRecord: {
          findMany: async ({ where }: any) => persisted.filter(row => where.sourceDedupKey.in.includes(row.sourceDedupKey)),
          createMany: async ({ data }: any) => ({ count: data.length }),
        },
      }),
    };
    const repo = new PrismaImportRepository(prisma as never);
    const result = await repo.bulkCreateRecords([
      { id: 'rec-1', batchId: 'batch-new', sourceDedupKey: 'occupied', status: 'COMPLETE', rawPayload: {} },
      { id: 'rec-2', batchId: 'batch-new', sourceDedupKey: 'unseen', status: 'COMPLETE', rawPayload: {} },
    ]);
    expect(result).toEqual({ count: 1, acceptedRecordIds: ['rec-2'] });
  });
});
