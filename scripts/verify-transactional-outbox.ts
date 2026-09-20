import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRaw<Array<{
    state: string;
    records: bigint;
    totalAttempts: bigint;
    expiredClaims: bigint;
  }>>`
    SELECT
      "state",
      COUNT(*)::bigint AS "records",
      COALESCE(SUM("attempts"), 0)::bigint AS "totalAttempts",
      COUNT(*) FILTER (WHERE "claimUntil" < NOW())::bigint AS "expiredClaims"
    FROM "TransactionalOutboxRecord"
    GROUP BY "state"
    ORDER BY "state"
  `;

  console.log(JSON.stringify({
    capability: 'TRANSACTIONAL_OUTBOX',
    mode: 'READ_ONLY_VERIFICATION',
    states: rows.map(row => ({
      state: row.state,
      records: Number(row.records),
      totalAttempts: Number(row.totalAttempts),
      expiredClaims: Number(row.expiredClaims),
    })),
    databaseWrites: 0,
  }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const notMigrated = /TransactionalOutboxRecord|does not exist/i.test(message);
  console.error(JSON.stringify({
    capability: 'TRANSACTIONAL_OUTBOX',
    status: notMigrated ? 'NOT_MIGRATED' : 'UNAVAILABLE',
    databaseWrites: 0,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
