import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaReviewWorkspaceGateway } from '../../src/review-workspace/PrismaReviewWorkspaceGateway';
import { reviewDomains, reviewReasons } from '@manaratak/shared';
describe('Read-only regression of measured review analytics on the attested fixture target', () => {
  let db: PrismaClient, gateway: PrismaReviewWorkspaceGateway, actor: string;
  const evidence: { isolation: unknown; periods: unknown[] } = { isolation: null, periods: [] };
  beforeAll(async () => {
    if (
      process.env.REVIEW_WORKSPACE_DB_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw new Error('REVIEW_ISOLATED_DATABASE_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    if (contract.kind !== 'POST28_LOCAL_DATABASE_TARGETS' || contract.postgresMajor !== 16)
      throw new Error('REVIEW_LOCAL_POSTGRES16_REQUIRED');
    evidence.isolation = await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('connection_limit', '1');
    db = new PrismaClient({ datasources: { db: { url: url.href } } });
    await db.$executeRaw`SET default_transaction_read_only=on`;
    expect(await db.university.count()).toBeGreaterThanOrEqual(620);
    const [person] = await db.$queryRaw<
      Array<{ identityId: string }>
    >`SELECT "identityId" FROM "UserRecord" WHERE "displayName"='مراجع الاختبار'`;
    actor = person.identityId;
    gateway = new PrismaReviewWorkspaceGateway(db);
  });
  afterAll(async () => {
    if (process.env.REVIEW_DATABASE_EVIDENCE_FILE)
      fs.writeFileSync(
        process.env.REVIEW_DATABASE_EVIDENCE_FILE,
        JSON.stringify(
          {
            ...evidence,
            scope: 'READ_ONLY_EXISTING_ISOLATED_SYNTHETIC_FIXTURES',
            productionOrNeonTouched: false,
          },
          null,
          2,
        ),
      );
    await db?.$disconnect();
  });
  it.each([7, 30, 90, 365])(
    'aggregates the %i-day period from recorded events, including SQL integer parameter binding',
    async (days) => {
      const result = await gateway.analytics(
        { actorId: actor, domains: [...reviewDomains], coordinate: true, imports: true },
        days,
      );
      const [actual] = await db.$queryRaw<
        Array<{ entered: bigint; completed: bigint }>
      >`SELECT count(*) FILTER(WHERE action IN ('OBSERVED_ENTERED','OBSERVED_REOPENED')) entered,count(*) FILTER(WHERE action='OBSERVED_COMPLETED') completed FROM "ReviewWorkEvent" WHERE "createdAt">=CURRENT_TIMESTAMP-(${days}::int*interval '1 day')`;
      expect(result.newCases).toBe(Number(actual.entered));
      expect(result.completed).toBe(Number(actual.completed));
      expect(result.completed).toBeGreaterThanOrEqual(1);
      expect(result.medianHours).not.toBeNull();
      expect(result.measuredFrom).not.toBeNull();
      expect(result.series.reduce((sum, row) => sum + row.entered, 0)).toBe(result.newCases);
      expect(result.series.reduce((sum, row) => sum + row.completed, 0)).toBe(result.completed);
      expect(result.domains.every((row) => row.count > 0)).toBe(true);
      expect(
        result.reasons.every((row) => (reviewReasons as readonly string[]).includes(row.key)),
      ).toBe(true);
      evidence.periods.push(result);
    },
  );
});
