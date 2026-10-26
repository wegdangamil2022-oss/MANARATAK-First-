import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { CourseOriginType } from '@manaratak/domain';
import type { AtomicPersistenceContext, CourseBulkClaim, CourseBulkItem, CourseBulkPage, CourseBulkPhase, CourseBulkSelection, CourseBulkState, CourseBulkSummary, ICourseBulkPublicationRepository } from '@manaratak/domain';
import { courseCatalogWhere } from '../courses/CourseCatalogQuery';

const TYPE = 'COURSE_PUBLICATION_BATCH';
const STATES: CourseBulkState[] = ['PENDING', 'ELIGIBLE', 'BLOCKED', 'SUCCESS', 'FAILED', 'NOT_EXECUTED'];
type Metadata = CourseBulkSummary & { schemaVersion: number; requestDigest: string };
type Db = Prisma.TransactionClient;
type Row = { metadata: Metadata; leaseUntil: Date | null };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

/** Durable, API-driven bounded job using the existing background-job store.
 * CREATED jobs are never claimed by the generic SCHEDULED/STARTED worker.
 * Course content stays in Course; the job stores frozen references and results only.
 */
export class PrismaCourseBulkPublicationRepository implements ICourseBulkPublicationRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private transaction(context: AtomicPersistenceContext): Db {
    const client = (context as AtomicPersistenceContext & { transactionClient?: Db }).transactionClient;
    if (!context.boundaryId || !client) throw new Error('COURSE_BULK_AUDITED_TRANSACTION_REQUIRED');
    return client;
  }
  private owner(actorId: string) { return 'course-publication:' + actorId; }
  private async metadata(db: Db, id: string, actorId: string, lock = false): Promise<Row> {
    const rows = await db.$queryRaw<Row[]>(Prisma.sql`SELECT "parameters" - 'items' AS "metadata", "leaseUntil"
      FROM "BackgroundJobRecord" WHERE "id" = ${id} AND "jobType" = ${TYPE} AND "ownerReference" = ${this.owner(actorId)} ${lock ? Prisma.sql`FOR UPDATE` : Prisma.empty}`);
    const row = rows[0];
    if (!row) throw new Error('COURSE_BULK_NOT_FOUND');
    if (row.metadata.schemaVersion !== 1 || row.metadata.id !== id || !Number.isSafeInteger(row.metadata.total) || row.metadata.total < 1 || row.metadata.total > 20000) throw new Error('COURSE_BULK_RECORD_INVALID');
    return row;
  }
  private active(row: Row) {
    if (Date.parse(row.metadata.expiresAt) <= Date.now()) throw new Error('COURSE_BULK_EXPIRED');
    if (row.leaseUntil && row.leaseUntil.getTime() > Date.now()) throw new Error('COURSE_BULK_BUSY');
  }
  private summary(metadata: Metadata, leaseUntil: Date | null): CourseBulkSummary {
    return { id: metadata.id, digest: metadata.digest, phase: metadata.phase, createdAt: metadata.createdAt,
      expiresAt: metadata.expiresAt, reason: metadata.reason, total: metadata.total, counts: metadata.counts,
      leaseUntil: leaseUntil?.toISOString() ?? null };
  }
  async list(actorId: string, page = 1) {
    return this.prisma.$transaction(async db => {
      const total = await db.backgroundJobRecord.count({ where: { jobType: TYPE, ownerReference: this.owner(actorId) } });
      const totalPages = Math.max(1, Math.ceil(total / 20)), safePage = Math.min(totalPages, Math.max(1, page));
      const rows = await db.$queryRaw<Row[]>(Prisma.sql`SELECT "parameters" - 'items' AS metadata, "leaseUntil"
        FROM "BackgroundJobRecord" WHERE "jobType" = ${TYPE} AND "ownerReference" = ${this.owner(actorId)}
        ORDER BY "createdAt" DESC, "id" ASC LIMIT 20 OFFSET ${(safePage - 1) * 20}`);
      return { data: rows.map(row => this.summary(row.metadata, row.leaseUntil)), page: safePage, totalPages };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async retrySelection(id: string, actorId: string) {
    return this.prisma.$transaction(async db => {
      const row = await this.metadata(db, id, actorId);
      if (!['PREVIEWED', 'COMPLETE', 'CANCELLED'].includes(row.metadata.phase)) throw new Error('COURSE_BULK_RETRY_PHASE_INVALID');
      const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT item->>'id' AS id
        FROM "BackgroundJobRecord" job CROSS JOIN LATERAL jsonb_array_elements(job."parameters"->'items') item
        WHERE job."id" = ${id} AND item->>'state' = 'FAILED' LIMIT 20000`);
      return rows.map(row => row.id);
    });
  }
  async createSnapshot(context: AtomicPersistenceContext, input: { reference: string; actorId: string; requestDigest: string; reason: string; selection: CourseBulkSelection }) {
    const db = this.transaction(context);
    await db.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.reference}))::text`);
    const existing = await db.backgroundJobRecord.findUnique({ where: { reference: input.reference }, select: { id: true, ownerReference: true } });
    if (existing) {
      const row = await this.metadata(db, existing.id, input.actorId);
      if (row.metadata.requestDigest !== input.requestDigest) throw new Error('COURSE_BULK_IDEMPOTENCY_CONFLICT');
      return { id: existing.id, replayed: true };
    }
    const ids = input.selection.ids ? [...new Set(input.selection.ids)] : undefined;
    if (ids && (!ids.length || ids.length > 20000)) throw new Error('COURSE_BULK_SELECTION_LIMIT');
    const where = courseCatalogWhere({ ...input.selection.filters, originType: CourseOriginType.EXTERNAL_LINKED_COURSE });
    if (ids) where.id = { in: ids };
    const rows = await db.course.findMany({ where, orderBy: { id: 'asc' }, take: 20001, select: { id: true, displayName: true, version: true } });
    if (!rows.length) throw new Error('COURSE_BULK_EMPTY_SELECTION');
    if (rows.length > 20000) throw new Error('COURSE_BULK_SELECTION_LIMIT');
    if (ids && ids.length !== rows.length) throw new Error('COURSE_BULK_EXTERNAL_SELECTION_REQUIRED');
    const items: CourseBulkItem[] = rows.map(row => ({ id: row.id, name: row.displayName, version: row.version, state: 'PENDING', reasons: [] }));
    const digest = createHash('sha256').update(JSON.stringify(items.map(item => [item.id, item.version]))).digest('hex');
    const id = randomUUID(), now = new Date();
    const metadata: Metadata = { schemaVersion: 1, id, digest, requestDigest: input.requestDigest, phase: 'PREVIEWING',
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86400000).toISOString(), reason: input.reason, total: items.length,
      counts: { PENDING: items.length, ELIGIBLE: 0, BLOCKED: 0, SUCCESS: 0, FAILED: 0, NOT_EXECUTED: 0 } };
    await db.backgroundJobRecord.create({ data: { id, reference: input.reference, jobType: TYPE, ownerReference: this.owner(input.actorId),
      status: 'CREATED', parameters: json({ ...metadata, items }), timeoutSeconds: 600, maxAttempts: 1 } });
    return { id, replayed: false };
  }
  async read(id: string, actorId: string, page = 1, state?: CourseBulkState): Promise<CourseBulkPage> {
    return this.prisma.$transaction(async db => {
      const { metadata, leaseUntil } = await this.metadata(db, id, actorId);
      const total = state ? metadata.counts[state] : metadata.total;
      const last = Math.max(1, Math.ceil(total / 20)), safePage = Math.min(last, Math.max(1, page));
      const rows = await db.$queryRaw<Array<{ item: CourseBulkItem }>>(Prisma.sql`
        SELECT entry.item FROM "BackgroundJobRecord" job CROSS JOIN LATERAL jsonb_array_elements(job."parameters"->'items') WITH ORDINALITY entry(item, position)
        WHERE job."id" = ${id} ${state ? Prisma.sql`AND entry.item->>'state' = ${state}` : Prisma.empty}
        ORDER BY entry.position LIMIT 20 OFFSET ${(safePage - 1) * 20}`);
      return { summary: this.summary(metadata, leaseUntil), data: rows.map(row => row.item), page: safePage, total, totalPages: last };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async confirm(context: AtomicPersistenceContext, id: string, actorId: string, digest: string, eligibleOnly: boolean, reason: string) {
    const db = this.transaction(context), row = await this.metadata(db, id, actorId, true);
    if (row.metadata.digest !== digest) throw new Error('COURSE_BULK_SNAPSHOT_CONFLICT');
    if (['EXECUTING', 'COMPLETE'].includes(row.metadata.phase)) return { replayed: true };
    this.active(row);
    if (row.metadata.phase !== 'PREVIEWED') throw new Error('COURSE_BULK_PREVIEW_REQUIRED');
    if (!row.metadata.counts.ELIGIBLE) throw new Error('COURSE_BULK_NO_ELIGIBLE_RECORDS');
    if ((row.metadata.counts.BLOCKED || row.metadata.counts.FAILED) && !eligibleOnly) throw new Error('COURSE_BULK_ELIGIBLE_ONLY_CONFIRMATION_REQUIRED');
    await db.$executeRaw(Prisma.sql`UPDATE "BackgroundJobRecord" SET "parameters" = jsonb_set(jsonb_set("parameters", '{phase}', '"EXECUTING"'), '{reason}', ${JSON.stringify(reason)}::jsonb), "updatedAt" = NOW() WHERE "id" = ${id}`);
    return { replayed: false };
  }
  async claim(id: string, actorId: string): Promise<CourseBulkClaim | null> {
    return this.prisma.$transaction(async db => {
      const row = await this.metadata(db, id, actorId, true);
      if (!['PREVIEWING', 'EXECUTING'].includes(row.metadata.phase)) return null;
      this.active(row);
      const state = row.metadata.phase === 'PREVIEWING' ? 'PENDING' : 'ELIGIBLE';
      const rows = await db.$queryRaw<Array<{ item: CourseBulkItem; index: bigint }>>(Prisma.sql`
        SELECT entry.item, entry.position - 1 AS "index" FROM "BackgroundJobRecord" job CROSS JOIN LATERAL jsonb_array_elements(job."parameters"->'items') WITH ORDINALITY entry(item, position)
        WHERE job."id" = ${id} AND entry.item->>'state' = ${state} ORDER BY entry.position LIMIT ${state === 'PENDING' ? 20 : 5}`);
      const lease = randomUUID();
      await db.backgroundJobRecord.update({ where: { id }, data: { leasedBy: actorId, leaseToken: lease, leaseUntil: new Date(Date.now() + 600000) } });
      return { summary: row.metadata, lease, items: rows.map(row => ({ ...row.item, index: Number(row.index) })) };
    });
  }
  private async recalculate(db: Db, id: string, phase: CourseBulkPhase) {
    const counts = Object.fromEntries(STATES.map(state => [state, 0])) as CourseBulkSummary['counts'];
    const groups = await db.$queryRaw<Array<{ state: CourseBulkState; count: bigint }>>(Prisma.sql`
      SELECT item->>'state' AS state, count(*) AS count FROM "BackgroundJobRecord" job CROSS JOIN LATERAL jsonb_array_elements(job."parameters"->'items') item
      WHERE job."id" = ${id} GROUP BY item->>'state'`);
    for (const group of groups) counts[group.state] = Number(group.count);
    const next = phase === 'PREVIEWING' && counts.PENDING === 0 ? 'PREVIEWED' : phase === 'EXECUTING' && counts.ELIGIBLE === 0 ? 'COMPLETE' : phase;
    await db.$executeRaw(Prisma.sql`UPDATE "BackgroundJobRecord" SET "parameters" = jsonb_set(jsonb_set("parameters", '{counts}', ${JSON.stringify(counts)}::jsonb), '{phase}', ${JSON.stringify(next)}::jsonb),
      "status" = ${next === 'COMPLETE' ? 'COMPLETED' : next === 'CANCELLED' ? 'CANCELLED' : 'CREATED'}, "updatedAt" = NOW(), "leaseUntil" = NULL, "leaseToken" = NULL, "leasedBy" = NULL WHERE "id" = ${id}`);
  }
  async checkpoint(id: string, actorId: string, lease: string, items: Array<CourseBulkItem & { index: number }>) {
    await this.prisma.$transaction(async db => {
      const row = await this.metadata(db, id, actorId, true);
      const lock = await db.backgroundJobRecord.findFirst({ where: { id, leaseToken: lease }, select: { id: true } });
      if (!lock) throw new Error('COURSE_BULK_LEASE_LOST');
      if (items.length > (row.metadata.phase === 'PREVIEWING' ? 20 : 5) || new Set(items.map(item => item.index)).size !== items.length) throw new Error('COURSE_BULK_ITEM_INVALID');
      let expression = Prisma.sql`"parameters"`;
      for (const { index, ...item } of items) {
        if (!Number.isSafeInteger(index) || index < 0 || index >= row.metadata.total) throw new Error('COURSE_BULK_ITEM_INVALID');
        const stored = await db.$queryRaw<Array<{ item: CourseBulkItem }>>(Prisma.sql`SELECT "parameters"->'items'->(${index}::integer) AS item FROM "BackgroundJobRecord" WHERE "id" = ${id}`);
        const previous = stored[0]?.item;
        const permitted = row.metadata.phase === 'PREVIEWING' ? ['ELIGIBLE', 'BLOCKED', 'FAILED'] : ['SUCCESS', 'BLOCKED', 'FAILED'];
        if (!previous || previous.id !== item.id || previous.version !== item.version || previous.name !== item.name ||
            previous.state !== (row.metadata.phase === 'PREVIEWING' ? 'PENDING' : 'ELIGIBLE') || !permitted.includes(item.state)) throw new Error('COURSE_BULK_ITEM_INVALID');
        expression = Prisma.sql`jsonb_set(${expression}, ARRAY['items', ${String(index)}], ${JSON.stringify(item)}::jsonb)`;
      }
      await db.$executeRaw(Prisma.sql`UPDATE "BackgroundJobRecord" SET "parameters" = ${expression} WHERE "id" = ${id} AND "leaseToken" = ${lease}`);
      await this.recalculate(db, id, row.metadata.phase);
    });
  }
  async release(id: string, actorId: string, lease: string) {
    await this.prisma.backgroundJobRecord.updateMany({ where: { id, jobType: TYPE, ownerReference: this.owner(actorId), leaseToken: lease }, data: { leaseToken: null, leaseUntil: null, leasedBy: null } });
  }
  async publicationReceipt(courseId: string, version: number, batchId: string, actorId: string) {
    const receipt = await this.prisma.transactionalOutboxRecord.findUnique({ where: { id: `course-published:${courseId}:v${version}` }, select: { correlationId: true, metadata: true } });
    return receipt?.correlationId === batchId && (receipt.metadata as Record<string, unknown>)?.actorId === actorId;
  }
  async cancel(context: AtomicPersistenceContext, id: string, actorId: string) {
    const db = this.transaction(context), row = await this.metadata(db, id, actorId, true);
    if (row.metadata.phase === 'CANCELLED') return { replayed: true };
    if (row.metadata.phase === 'COMPLETE') throw new Error('COURSE_BULK_ALREADY_COMPLETE');
    if (row.leaseUntil && row.leaseUntil.getTime() > Date.now()) throw new Error('COURSE_BULK_BUSY');
    await db.$executeRaw(Prisma.sql`UPDATE "BackgroundJobRecord" job SET "parameters" = jsonb_set("parameters", '{items}',
      (SELECT jsonb_agg(CASE WHEN item->>'state' IN ('PENDING', 'ELIGIBLE') THEN jsonb_set(item, '{state}', '"NOT_EXECUTED"') ELSE item END ORDER BY position)
       FROM jsonb_array_elements(job."parameters"->'items') WITH ORDINALITY entry(item, position))) WHERE "id" = ${id}`);
    await this.recalculate(db, id, 'CANCELLED');
    return { replayed: false };
  }
}
