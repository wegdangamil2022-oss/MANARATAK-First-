import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaTransactionalOutboxStore } from '../../src/event-foundation/PrismaTransactionalOutboxStore';
import { destructiveDatabaseTestsEnabled } from '../courses/disposableDatabaseGuard';

const databaseUrl = process.env.W3_DATABASE_TEST_DATABASE_URL;
const disposable = process.env.W3_DATABASE_TEST_DATABASE_IS_DISPOSABLE === 'true';
const describeDisposable = databaseUrl && disposable && destructiveDatabaseTestsEnabled(databaseUrl) ? describe : describe.skip;

describeDisposable('MNT-AUD-0068 transactional-outbox lease fencing on disposable PostgreSQL', () => {
  let prisma: PrismaClient;
  let store: PrismaTransactionalOutboxStore;
  const prefix = 'w3-outbox-';

  beforeAll(async () => {
    if (!databaseUrl || !disposable) throw new Error('W3 disposable PostgreSQL database is required');
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    store = new PrismaTransactionalOutboxStore(prisma);
  });

  beforeEach(async () => {
    await (prisma as any).transactionalOutboxRecord.deleteMany({ where: { id: { startsWith: prefix } } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await (prisma as any).transactionalOutboxRecord.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it('reclaims an expired PROCESSING row and fences stale terminal writes', async () => {
    const id = `${prefix}reclaim`;
    const t0 = new Date('2026-09-06T20:00:00.000Z');
    await (prisma as any).transactionalOutboxRecord.create({
      data: {
        id,
        eventType: 'W3ProofEvent',
        domain: 'W3_TEST',
        payload: { proof: true },
        metadata: {},
        state: 'PENDING',
        attempts: 0,
        availableAt: t0,
        createdAt: t0,
      },
    });

    const firstClaimUntil = new Date(t0.getTime() + 5_000);
    const [a, b] = await Promise.all([
      store.claimPendingBatch({ workerId: 'outbox-a', batchSize: 1, now: t0, claimUntil: firstClaimUntil }),
      store.claimPendingBatch({ workerId: 'outbox-b', batchSize: 1, now: t0, claimUntil: firstClaimUntil }),
    ]);
    expect(a.length + b.length).toBe(1);
    const first = (a[0] ?? b[0])!;
    expect(first.lease).toBeTruthy();

    await (prisma as any).transactionalOutboxRecord.update({ where: { id }, data: { claimUntil: new Date(t0.getTime() - 1) } });
    const reclaimAt = new Date(t0.getTime() + 6_000);
    const second = await store.claimPendingBatch({ workerId: 'outbox-reclaimer', batchSize: 1, now: reclaimAt, claimUntil: new Date(reclaimAt.getTime() + 5_000) });
    expect(second).toHaveLength(1);
    expect(second[0].lease?.leaseToken).not.toBe(first.lease?.leaseToken);

    const staleProcessed = await store.markProcessed(id, first.lease!, new Date(reclaimAt.getTime() + 100));
    expect(staleProcessed).toBe(false);
    const staleFailed = await store.markFailed(id, first.lease!, { code: 'STALE', message: 'stale', failedAt: new Date(reclaimAt.getTime() + 100) }, new Date(reclaimAt.getTime() + 1_000));
    expect(staleFailed).toBe(false);

    const currentProcessed = await store.markProcessed(id, second[0].lease!, new Date(reclaimAt.getTime() + 200));
    expect(currentProcessed).toBe(true);
    const row = await (prisma as any).transactionalOutboxRecord.findUnique({ where: { id } });
    expect(row.state).toBe('PROCESSED');
    expect(row.claimedBy).toBeNull();
    expect(row.claimToken).toBeNull();
  });
});
