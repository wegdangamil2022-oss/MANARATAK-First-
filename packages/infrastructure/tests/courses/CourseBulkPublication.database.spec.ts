import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaCourseBulkPublicationRepository } from '../../src/courses/PrismaCourseBulkPublicationRepository';
import type { AtomicPersistenceContext, CourseBulkSelection } from '@manaratak/domain';

describe('external publication snapshots on attested isolated PostgreSQL16', () => {
  let db: PrismaClient, repo: PrismaCourseBulkPublicationRepository;
  const run = randomUUID(), prefix = 'bulk07-' + run, actor = 'bulk-owner-' + run, ids: string[] = [], jobs: string[] = [];
  beforeAll(async () => {
    if (process.env.COURSES_ADMIN_DATABASE_TESTS !== 'YES' || process.env.NODE_ENV !== 'test' || process.env.POST28_TARGET_LABEL !== 'DB-T' || process.env.DATABASE_URL !== process.env.DIRECT_URL) throw Error('ISOLATED_CATALOG_TEST_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(contract, [{ label: 'DB-T', url: process.env.DATABASE_URL }], process.env, contract.sourceSha, readDatabaseIdentity, { requireValidatedCatalog: true });
    db = new PrismaClient(); repo = new PrismaCourseBulkPublicationRepository(db);
    const rows = Array.from({ length: 10005 }, (_, index) => { const id = randomUUID(); ids.push(id); return {
      id, publicId: prefix + '-' + id, slug: prefix + '-' + id, canonicalName: prefix, canonicalDedupKey: prefix + '-' + id,
      displayName: prefix, status: 'READY_TO_PUBLISH', completenessStatus: 'COMPLETE', originType: 'EXTERNAL_LINKED_COURSE',
      directCourseUrl: 'https://example.org/course/isolated', accessType: 'FREE_STUDY', isStudyFree: true, version: index % 3 + 1,
    }; });
    for (let index = 0; index < rows.length; index += 500) await db.course.createMany({ data: rows.slice(index, index + 500) });
  });
  afterAll(async () => {
    if (!db) return;
    await db.backgroundJobRecord.deleteMany({ where: { ownerReference: 'course-publication:' + actor } });
    await db.course.deleteMany({ where: { canonicalDedupKey: { startsWith: prefix } } }); await db.$disconnect();
  });
  const tx = <T>(fn: (context: AtomicPersistenceContext) => Promise<T>) => db.$transaction(client => fn({ boundaryId: 'isolated-test-transaction', transactionClient: client } as unknown as AtomicPersistenceContext), { timeout: 30000 });
  const snapshot = async (selection: CourseBulkSelection, reference = prefix + '-' + randomUUID(), digest = reference) => {
    const result = await tx(context => repo.createSnapshot(context, { reference, actorId: actor, requestDigest: digest, reason: 'Isolated acceptance only', selection }));
    jobs.push(result.id); return repo.read(result.id, actor);
  };
  it('freezes 10,005 IDs/versions server-side, pages 20, and does not expand with later matching records', async () => {
    const first = await snapshot({ filters: { search: prefix } }); expect(first.summary.total).toBe(10005); expect(first.data).toHaveLength(20);
    expect(first.totalPages).toBe(501);
    const id = randomUUID(); await db.course.create({ data: { id, publicId: prefix + id, slug: prefix + id, canonicalName: prefix, canonicalDedupKey: prefix + id, displayName: prefix, status: 'DRAFT', completenessStatus: 'COMPLETE', originType: 'EXTERNAL_LINKED_COURSE', directCourseUrl: 'https://example.org/course/new', accessType: 'FREE_STUDY' } });
    const second = await repo.read(first.summary.id, actor, 2);
    expect(second.summary.total).toBe(10005); expect(new Set([...first.data, ...second.data].map(row => row.id)).size).toBe(40);
    expect((await repo.read(first.summary.id, actor, 501)).data).toHaveLength(5);
    await expect(repo.read(first.summary.id, 'other-owner')).rejects.toThrow('NOT_FOUND');
    expect((await repo.list('other-owner')).data).toEqual([]);
    expect((await repo.list(actor)).data.some(row => row.id === first.summary.id)).toBe(true);
    expect((await db.backgroundJobRecord.findUniqueOrThrow({ where: { id: first.summary.id } })).status).toBe('CREATED');
  });
  it('requires audited transaction and rejects mixed native/missing IDs atomically', async () => {
    await expect(repo.createSnapshot({} as never, { reference: prefix, actorId: actor, requestDigest: prefix, reason: 'Isolated only', selection: { ids: [ids[0]] } })).rejects.toThrow('AUDITED_TRANSACTION_REQUIRED');
    await expect(snapshot({ ids: [ids[0], randomUUID()] })).rejects.toThrow('EXTERNAL_SELECTION_REQUIRED');
    const id = randomUUID(); await db.course.create({ data: { id, publicId: prefix + id, slug: prefix + id, canonicalName: prefix, canonicalDedupKey: prefix + id, displayName: prefix, status: 'DRAFT', completenessStatus: 'COMPLETE', originType: 'NATIVE_MANARATAK_COURSE', directCourseUrl: 'https://example.org/course/native', accessType: 'FREE_STUDY' } });
    await expect(snapshot({ ids: [id] })).rejects.toThrow('EMPTY_SELECTION');
  });
  it('serializes duplicate snapshot requests and rejects a different request under the same key', async () => {
    const reference = prefix + '-same-key';
    const results = await Promise.all([snapshot({ ids: [ids[0]] }, reference), snapshot({ ids: [ids[0]] }, reference)]);
    expect(results[0].summary.id).toBe(results[1].summary.id);
    await expect(snapshot({ ids: [ids[1]] }, reference, 'different')).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });
  it('requires complete preview and explicit eligible-only consent, guards leases and frozen item identity', async () => {
    const batch = await snapshot({ ids: ids.slice(0, 3) }), id = batch.summary.id;
    await expect(tx(context => repo.confirm(context, id, actor, batch.summary.digest, false, 'Confirm isolated'))).rejects.toThrow('PREVIEW_REQUIRED');
    const claim = (await repo.claim(id, actor))!; expect(claim.items).toHaveLength(3);
    await expect(repo.claim(id, actor)).rejects.toThrow('BUSY');
    await expect(repo.checkpoint(id, actor, 'wrong-token', claim.items)).rejects.toThrow('LEASE_LOST');
    await expect(repo.checkpoint(id, actor, claim.lease, [{ ...claim.items[0], id: randomUUID(), state: 'ELIGIBLE' }])).rejects.toThrow('ITEM_INVALID');
    await repo.checkpoint(id, actor, claim.lease, claim.items.map((item, index) => ({ ...item, state: index === 0 ? 'ELIGIBLE' : index === 1 ? 'BLOCKED' : 'FAILED', reasons: index ? ['ISOLATED_BLOCKER'] : [] })));
    const preview = await repo.read(id, actor); expect(preview.summary.phase).toBe('PREVIEWED'); expect(preview.summary.counts).toMatchObject({ ELIGIBLE: 1, BLOCKED: 1, FAILED: 1 });
    await expect(tx(context => repo.confirm(context, id, actor, 'wrong-digest', true, 'Confirm isolated'))).rejects.toThrow('SNAPSHOT_CONFLICT');
    await expect(tx(context => repo.confirm(context, id, actor, batch.summary.digest, false, 'Confirm isolated'))).rejects.toThrow('ELIGIBLE_ONLY_CONFIRMATION_REQUIRED');
    await tx(context => repo.confirm(context, id, actor, batch.summary.digest, true, 'Confirm eligible only'));
    const execution = (await repo.claim(id, actor))!; expect(execution.items).toHaveLength(1);
    await repo.checkpoint(id, actor, execution.lease, execution.items.map(item => ({ ...item, state: 'SUCCESS', reasons: [] })));
    expect((await repo.read(id, actor)).summary).toMatchObject({ phase: 'COMPLETE', counts: { SUCCESS: 1, BLOCKED: 1, FAILED: 1 } });
    expect(await repo.claim(id, actor)).toBeNull();
    expect(await repo.retrySelection(id, actor)).toEqual([claim.items[2].id]);
    expect((await repo.read(id, actor, 1, 'FAILED')).data.map(item => item.id)).toEqual([claim.items[2].id]);
  });
  it('bounds each preview to 20 and execution to 5, cancellation preserves completed outcomes', async () => {
    const batch = await snapshot({ ids: ids.slice(0, 26) }), id = batch.summary.id;
    const first = (await repo.claim(id, actor))!; expect(first.items).toHaveLength(20);
    await expect(tx(context => repo.cancel(context, id, actor))).rejects.toThrow('BUSY');
    await repo.checkpoint(id, actor, first.lease, first.items.map(item => ({ ...item, state: 'ELIGIBLE', reasons: [] })));
    const second = (await repo.claim(id, actor))!; expect(second.items).toHaveLength(6);
    await repo.checkpoint(id, actor, second.lease, second.items.map(item => ({ ...item, state: 'ELIGIBLE', reasons: [] })));
    await tx(context => repo.confirm(context, id, actor, batch.summary.digest, false, 'Confirm isolated'));
    const execute = (await repo.claim(id, actor))!; expect(execute.items).toHaveLength(5);
    await repo.checkpoint(id, actor, execute.lease, execute.items.map(item => ({ ...item, state: 'SUCCESS', reasons: [] })));
    await tx(context => repo.cancel(context, id, actor));
    expect((await repo.read(id, actor)).summary).toMatchObject({ phase: 'CANCELLED', counts: { SUCCESS: 5, NOT_EXECUTED: 21 } });
  });
  it('recovers publication only with the exact canonical receipt correlation and actor', async () => {
    expect(await repo.publicationReceipt(ids[0], 2, jobs[0], actor)).toBe(false);
  });
});
