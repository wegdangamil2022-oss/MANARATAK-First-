import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';
import { CourseOriginType } from '@manaratak/domain';
import { certificateFact, studyFact } from '../../../../apps/admin/src/features/courses/catalogState';

describe('course catalog on attested isolated PostgreSQL16', () => {
  let db: PrismaClient, repo: PrismaCourseRepository;
  const run = randomUUID(), prefix = `catalog07-${run}`, ids: string[] = [];
  const matrix: Array<{ id: string; originType: string; accessType: string; isFreeCertificate: boolean | null; certificateAvailable: boolean | null; isStudyFree: boolean | null }> = [];
  beforeAll(async () => {
    if (process.env.COURSES_ADMIN_DATABASE_TESTS !== 'YES' || process.env.NODE_ENV !== 'test' || process.env.POST28_TARGET_LABEL !== 'DB-T' || process.env.DATABASE_URL !== process.env.DIRECT_URL) throw Error('ISOLATED_CATALOG_TEST_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(contract, [{ label: 'DB-T', url: process.env.DATABASE_URL }], process.env, contract.sourceSha, readDatabaseIdentity, { requireValidatedCatalog: true });
    db = new PrismaClient(); await db.$connect(); repo = new PrismaCourseRepository(db);
    for (const originType of ['NATIVE_MANARATAK_COURSE', 'EXTERNAL_LINKED_COURSE', 'PAID_COURSE']) for (const accessType of ['FREE_STUDY', 'FREE_CERTIFICATE', 'FREE_STUDY_AND_CERTIFICATE', 'PAID']) for (const certificateAvailable of [null, false, true]) for (const isFreeCertificate of [null, false, true]) for (const isStudyFree of [null, false, true]) matrix.push({ id: randomUUID(), originType, accessType, certificateAvailable, isFreeCertificate, isStudyFree });
    const fixed = { status: 'DRAFT', completenessStatus: 'COMPLETE', directCourseUrl: 'https://example.org/course/isolated', updatedAt: new Date('2026-01-01T00:00:00Z') };
    const rows = [
      ...matrix.map(row => ({ ...fixed, ...row, publicId: prefix + '-' + row.id, slug: prefix + '-' + row.id, canonicalName: prefix + '-matrix', canonicalDedupKey: prefix + '-' + row.id, displayName: prefix + '-matrix', learningLanguage: row.accessType === 'PAID' ? 'Arabic' : 'English' })),
      ...Array.from({ length: 10005 }, (_, index) => { const id = randomUUID(); return { ...fixed, id, publicId: prefix + '-' + id, slug: prefix + '-' + id, canonicalName: prefix + '-large', canonicalDedupKey: prefix + '-' + id, displayName: prefix + '-large', originType: 'EXTERNAL_LINKED_COURSE', accessType: 'FREE_STUDY', isStudyFree: true, status: index % 2 ? 'PUBLISHED' : 'IMPORTED', completenessStatus: index % 2 ? 'COMPLETE' : 'NEEDS_REVIEW' }; }),
    ];
    ids.push(...rows.map(row => row.id));
    for (let index = 0; index < rows.length; index += 500) await db.course.createMany({ data: rows.slice(index, index + 500) });
  });
  afterAll(async () => {
    if (db) { await db.course.deleteMany({ where: { id: { in: ids }, canonicalDedupKey: { startsWith: prefix } } }); await db.$disconnect(); }
  });
  it('matches all 324 NULL/boolean/origin/access combinations against displayed certificate semantics', async () => {
    for (const certificateState of ['FREE', 'NON_FREE', 'UNAVAILABLE', 'UNKNOWN'] as const) {
      const expected = matrix.filter(row => certificateFact(row) === certificateState).map(row => row.id).sort();
      const actual: string[] = [];
      for (let page = 1; ; page++) { const result = await repo.list({ search: prefix + '-matrix', certificateState, page, pageSize: 100 }); actual.push(...result.data.map(row => row.id)); if (page >= result.totalPages) break; }
      expect(actual.sort()).toEqual(expected);
    }
  });
  it('keeps free/paid/unknown study independent of certificate and legacy paid origin', async () => {
    for (const studyAccess of ['FREE', 'PAID', 'UNKNOWN'] as const) {
      const expected = matrix.filter(row => studyFact(row) === studyAccess).map(row => row.id).sort();
      const actual: string[] = [];
      for (let page = 1; ; page++) { const result = await repo.list({ search: prefix + '-matrix', studyAccess, page, pageSize: 100 }); actual.push(...result.data.map(row => row.id)); if (page >= result.totalPages) break; }
      expect(actual.sort()).toEqual(expected);
    }
  });
  it('pages a 10,005-record tied-name/timestamp catalog stably without loading the whole catalog', async () => {
    for (const sort of ['NAME_ASC', 'NAME_DESC', 'UPDATED_DESC', 'UPDATED_ASC', 'STATUS_ASC'] as const) {
      const first = await repo.list({ search: prefix + '-large', sort, page: 1, pageSize: 100 });
      const second = await repo.list({ search: prefix + '-large', sort, page: 2, pageSize: 100 });
      expect(first.total).toBe(10005); expect(first.data.length).toBe(100); expect(second.data.length).toBe(100);
      expect(new Set([...first.data, ...second.data].map(row => row.id)).size).toBe(200);
      expect((await repo.list({ search: prefix + '-large', sort, page: 1, pageSize: 100 })).data.map(row => row.id)).toEqual(first.data.map(row => row.id));
    }
  });
  it('returns filtered whole-result metrics in the same read transaction, not page counts', async () => {
    const result = await repo.list({ search: prefix + '-large', pageSize: 20, includeStatistics: true });
    expect(result.data.length).toBe(20);
    expect(result.statistics).toEqual({ scope: 'FILTERED', total: 10005, published: 5002, needsReview: 5003, drafts: 0, native: 0, external: 10005, legacyPaidOrigin: 0 });
    const native = await repo.list({ search: prefix + '-matrix', originType: CourseOriginType.NATIVE_MANARATAK_COURSE, studyAccess: 'PAID', includeStatistics: true });
    expect(native.total).toBe(matrix.filter(row => row.originType === 'NATIVE_MANARATAK_COURSE' && studyFact(row) === 'PAID').length);
    expect(native.statistics?.external).toBe(0);
  });
  it('searches source title and topics and combines conditions with AND', async () => {
    const target = matrix.find(row => row.originType === 'EXTERNAL_LINKED_COURSE' && row.isStudyFree === true && row.isFreeCertificate === false && row.certificateAvailable === true)!;
    await db.course.update({ where: { id: target.id }, data: { originalSourceTitle: prefix + '-source-title', shortCourseTopicsRaw: prefix + '-unique-topic' } });
    const byTitle = await repo.list({ search: prefix + '-source-title', studyAccess: 'FREE', certificateState: 'NON_FREE' });
    expect(byTitle.data.map(row => row.id)).toEqual([target.id]);
    expect((await repo.list({ search: prefix + '-unique-topic', studyAccess: 'PAID' })).total).toBe(0);
  });
  it('reads real bounded language options with server scope and rejects free-form field selection at the API', async () => {
    const result = await repo.catalogOptions({ field: 'learningLanguage', search: 'English', originType: CourseOriginType.NATIVE_MANARATAK_COURSE, page: 1 });
    expect(result.data).toContain('English'); expect(result.data.length).toBeLessThanOrEqual(25);
  });
  it('paginates distinct options in PostgreSQL and never treats SQL wildcard characters as search wildcards', async () => {
    const targets = matrix.filter(row => row.originType === 'EXTERNAL_LINKED_COURSE').slice(0, 38);
    for (let index = 0; index < targets.length; index++) await db.course.update({ where: { id: targets[index].id }, data: {
      learningLanguage: index === 37 ? ' ' : prefix + '-language-' + String(index).padStart(2, '0'),
    } });
    const first = await repo.catalogOptions({ field: 'learningLanguage', search: prefix + '-language-', page: 1 });
    const second = await repo.catalogOptions({ field: 'learningLanguage', search: prefix + '-language-', page: 2 });
    expect(first.data).toHaveLength(25); expect(first.hasMore).toBe(true);
    expect(second.data).toHaveLength(12); expect(second.hasMore).toBe(false);
    expect(new Set([...first.data, ...second.data]).size).toBe(37);
    expect((await repo.catalogOptions({ field: 'learningLanguage', search: prefix + '%', page: 1 })).data).toEqual([]);
    await expect(repo.catalogOptions({ field: 'canonicalDedupKey' as 'learningLanguage', page: 1 })).rejects.toThrow('COURSE_CATALOG_OPTION_FIELD_FORBIDDEN');
  });
});
