import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaBackgroundJobExecutionGateway } from '../../src/background-jobs/PrismaBackgroundJobExecutionGateway';
import { destructiveDatabaseTestsEnabled } from '../courses/disposableDatabaseGuard';

const databaseUrl = process.env.W3_DATABASE_TEST_DATABASE_URL;
const disposable = process.env.W3_DATABASE_TEST_DATABASE_IS_DISPOSABLE === 'true';
const describeDisposable = databaseUrl && disposable && destructiveDatabaseTestsEnabled(databaseUrl) ? describe : describe.skip;

describeDisposable('MNT-AUD-0007 durable background-job lease fencing on disposable PostgreSQL', () => {
  let prisma: PrismaClient;
  let gateway: PrismaBackgroundJobExecutionGateway;
  const prefix = 'w3-bg-lease-';

  beforeAll(async () => {
    if (!databaseUrl || !disposable) throw new Error('W3 disposable PostgreSQL database is required');
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    gateway = new PrismaBackgroundJobExecutionGateway(prisma);
  });

  beforeEach(async () => {
    await (prisma as any).backgroundJobDeadLetterRecord.deleteMany({ where: { jobReference: { startsWith: prefix } } });
    await (prisma as any).backgroundJobExecutionRecord.deleteMany({ where: { jobReference: { startsWith: prefix } } });
    await (prisma as any).backgroundJobRecord.deleteMany({ where: { reference: { startsWith: prefix } } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await (prisma as any).backgroundJobDeadLetterRecord.deleteMany({ where: { jobReference: { startsWith: prefix } } });
    await (prisma as any).backgroundJobExecutionRecord.deleteMany({ where: { jobReference: { startsWith: prefix } } });
    await (prisma as any).backgroundJobRecord.deleteMany({ where: { reference: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it('allows exactly one concurrent claimant, reclaims expiry, and rejects the stale owner', async () => {
    const reference = `${prefix}concurrent`;
    const t0 = new Date('2026-09-06T20:00:00.000Z');
    await (prisma as any).backgroundJobRecord.create({
      data: {
        id: reference,
        reference,
        jobType: 'test.concurrent',
        parameters: { proof: true },
        status: 'SCHEDULED',
        availableAt: t0,
        maxAttempts: 3,
        timeoutSeconds: 30,
      },
    });

    const request = { batchSize: 1, leaseDurationMs: 5_000, now: t0 };
    const [a, b] = await Promise.all([
      gateway.claimDue({ ...request, workerId: 'worker-a' }),
      gateway.claimDue({ ...request, workerId: 'worker-b' }),
    ]);
    expect(a.length + b.length).toBe(1);
    const first = (a[0] ?? b[0])!;

    await (prisma as any).backgroundJobRecord.update({
      where: { reference },
      data: { leaseUntil: new Date(t0.getTime() - 1) },
    });
    const reclaimed = await gateway.claimDue({ workerId: 'worker-reclaimer', batchSize: 1, leaseDurationMs: 5_000, now: new Date(t0.getTime() + 6_000) });
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0].leaseToken).not.toBe(first.leaseToken);

    const stale = await gateway.complete({
      jobReference: reference,
      workerId: first.workerId,
      leaseToken: first.leaseToken,
      now: new Date(t0.getTime() + 6_100),
    });
    expect(stale).toBe(false);

    const current = reclaimed[0];
    const heartbeat = await gateway.heartbeat({
      jobReference: reference,
      workerId: current.workerId,
      leaseToken: current.leaseToken,
      now: new Date(t0.getTime() + 6_200),
      leaseDurationMs: 5_000,
    });
    expect(heartbeat).toBe(true);
    const completed = await gateway.complete({
      jobReference: reference,
      workerId: current.workerId,
      leaseToken: current.leaseToken,
      now: new Date(t0.getTime() + 6_300),
    });
    expect(completed).toBe(true);

    const row = await (prisma as any).backgroundJobRecord.findUnique({ where: { reference } });
    expect(row.status).toBe('COMPLETED');
    const executions = await (prisma as any).backgroundJobExecutionRecord.findMany({ where: { jobReference: reference }, orderBy: { startedAt: 'asc' } });
    expect(executions).toHaveLength(2);
    expect(executions[0].outcome).toBe('LEASE_EXPIRED');
    expect(executions[1].outcome).toBe('SUCCEEDED');
  });
});
