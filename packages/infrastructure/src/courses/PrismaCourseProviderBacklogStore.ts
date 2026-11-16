import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import type { CourseProviderBacklogStore } from '@manaratak/domain';
export class PrismaCourseProviderBacklogStore implements CourseProviderBacklogStore {
  constructor(private readonly db: PrismaClient) {}
  async changedLinks(providerId: string, cursor: string | undefined, limit: number) {
    let after = '';
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (
          decoded.providerId !== providerId ||
          typeof decoded.id !== 'string' ||
          !decoded.id ||
          decoded.id.length > 128
        )
          throw 0;
        after = decoded.id;
      } catch {
        throw new Error('COURSE_PROVIDER_CURSOR_INVALID');
      }
    }
    const size = Math.min(100, Math.max(1, Math.floor(limit)));
    // Linked records deduplicate by canonical source course; unmatched import records retain their own identity.
    const cte = Prisma.sql`WITH ranked AS (SELECT a.*, ROW_NUMBER() OVER (PARTITION BY COALESCE(a."matchedCourseId",a."importRecordId") ORDER BY a."analyzedAt" DESC,a."id" ASC) AS rank FROM "CourseImportAnalysis" a JOIN "ImportRecord" r ON r."id"=a."importRecordId" JOIN "ImportBatch" b ON b."id"=r."batchId" WHERE a."resolvedProviderId"=${providerId} AND b."dataType"='COURSES' AND a."requiresReview"=TRUE AND a."changeState" IN ('URL_CHANGED','URL_AND_METADATA_CHANGED')), pending AS (SELECT * FROM ranked WHERE rank=1 AND "changeState" IN ('URL_CHANGED','URL_AND_METADATA_CHANGED') AND "requiresReview"=TRUE)`;
    return this.db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{
            id: string;
            importRecordId: string;
            matchedCourseId: string | null;
            sourceNativeKey: string | null;
            changeState: string;
            analyzedAt: Date;
          }>
        >(
          Prisma.sql`${cte} SELECT "id","importRecordId","matchedCourseId","sourceNativeKey","changeState","analyzedAt" FROM pending WHERE "id">${after} ORDER BY "id" ASC LIMIT ${size + 1}`,
        );
        const count = await tx.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`${cte} SELECT count(*)::bigint AS total FROM pending`,
        );
        const data = rows.slice(0, size);
        return {
          data,
          total: Number(count[0]?.total ?? 0),
          nextCursor:
            rows.length > size
              ? Buffer.from(JSON.stringify({ providerId, id: data[data.length - 1].id })).toString(
                  'base64url',
                )
              : null,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async metrics(providerId: string) {
    const [checkpoint, retry, deadLetter, deadLetterItems] = await Promise.all([
      this.db.courseProviderHealthCheckpoint.findUnique({
        where: { providerId },
        select: { cursor: true, cycle: true, scanned: true, completedAt: true, updatedAt: true },
      }),
      this.db.courseProviderHealthRetry.count({ where: { providerId, state: 'RETRY' } }),
      this.db.courseProviderHealthRetry.count({ where: { providerId, state: 'DEAD_LETTER' } }),
      this.db.courseProviderHealthRetry.findMany({
        where: { providerId, state: 'DEAD_LETTER' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: 20,
        select: { id: true, courseId: true, attempts: true, updatedAt: true },
      }),
    ]);
    return { checkpoint, retry, deadLetter, deadLetterItems };
  }
  async requeue(providerId: string, id: string, actorId: string, reason: string) {
    if (!actorId || reason.trim().length < 3)
      throw new Error('COURSE_PROVIDER_RETRY_REVIEW_REQUIRED');
    const changed = await this.db.courseProviderHealthRetry.updateMany({
      where: { providerId, id, state: 'DEAD_LETTER' },
      data: {
        state: 'RETRY',
        attempts: 0,
        nextAttemptAt: new Date(),
        reviewedBy: actorId,
        reviewReason: reason,
      },
    });
    if (changed.count !== 1) throw new Error('COURSE_PROVIDER_RETRY_STATE_CONFLICT');
  }
  async claim(providerId: string) {
    return this.db.$transaction(async (tx) => {
      await tx.courseProviderHealthCheckpoint.upsert({
        where: { providerId },
        create: { providerId },
        update: {},
      });
      await tx.$queryRaw`SELECT "providerId" FROM "CourseProviderHealthCheckpoint" WHERE "providerId"=${providerId} FOR UPDATE`;
      const current = await tx.courseProviderHealthCheckpoint.findUniqueOrThrow({
        where: { providerId },
      });
      if (current.leaseToken && current.leaseExpiresAt && current.leaseExpiresAt > new Date())
        throw new Error('COURSE_PROVIDER_HEALTH_JOB_CONFLICT');
      const token = randomUUID();
      await tx.courseProviderHealthCheckpoint.update({
        where: { providerId },
        data: { leaseToken: token, leaseExpiresAt: new Date(Date.now() + 900000) },
      });
      return { token, cursor: current.cursor, cycle: current.cycle };
    });
  }
  async page(providerId: string, cursor: string | null, limit: number) {
    return this.db.$queryRaw<Array<{ id: string; directCourseUrl: string }>>(
      Prisma.sql`SELECT c.id,c."directCourseUrl" FROM "Course" c WHERE c."externalProviderId"=${providerId} AND c."originType"='EXTERNAL_LINKED_COURSE' AND c.id>${cursor ?? ''} AND NOT EXISTS (SELECT 1 FROM "CourseProviderHealthRetry" r WHERE r."providerId"=${providerId} AND r."courseId"=c.id AND r.url=c."directCourseUrl" AND r.state='DEAD_LETTER') ORDER BY c.id ASC LIMIT ${Math.min(10, Math.max(0, Math.floor(limit)))}`,
    );
  }

  async retries(providerId: string, limit: number) {
    return this.db.courseProviderHealthRetry.findMany({
      where: { providerId, state: 'RETRY', nextAttemptAt: { lte: new Date() } },
      orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, courseId: true, url: true, attempts: true },
    });
  }
  async checkpoint(providerId: string, token: string, cursor: string | null, done: boolean) {
    const result = await this.db.courseProviderHealthCheckpoint.updateMany({
      where: { providerId, leaseToken: token, leaseExpiresAt: { gt: new Date() } },
      data: {
        cursor: done ? null : cursor,
        scanned: { increment: cursor ? 1 : 0 },
        leaseExpiresAt: new Date(Date.now() + 900000),
        ...(done ? { cycle: { increment: 1 }, completedAt: new Date() } : {}),
      },
    });
    if (result.count !== 1) throw new Error('COURSE_PROVIDER_HEALTH_LEASE_CONFLICT');
  }
  async recordFailure(
    providerId: string,
    courseId: string,
    url: string,
    failed: boolean,
    maxAttempts: number,
  ) {
    const urlHash = createHash('sha256').update(url).digest('hex');
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${courseId} FOR UPDATE`;
      const key = { providerId_courseId_urlHash: { providerId, courseId, urlHash } };
      const old = await tx.courseProviderHealthRetry.findUnique({ where: key });
      if (!failed) {
        if (old)
          await tx.courseProviderHealthRetry.update({
            where: key,
            data: { state: 'RESOLVED', nextAttemptAt: null },
          });
        return;
      }
      const attempts = (old?.attempts ?? 0) + 1;
      const data = {
        attempts,
        state: attempts >= maxAttempts ? 'DEAD_LETTER' : 'RETRY',
        nextAttemptAt:
          attempts >= maxAttempts
            ? null
            : new Date(Date.now() + Math.min(3600000, 60000 * 2 ** (attempts - 1))),
      };
      await tx.courseProviderHealthRetry.upsert({
        where: key,
        create: { providerId, courseId, url, urlHash, ...data },
        update: data,
      });
    });
  }
  async release(providerId: string, token: string) {
    await this.db.courseProviderHealthCheckpoint.updateMany({
      where: { providerId, leaseToken: token },
      data: { leaseToken: null, leaseExpiresAt: null },
    });
  }
}
