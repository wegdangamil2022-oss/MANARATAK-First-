import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaImportedCourseOperationsRepository } from '../../src/courses/PrismaImportedCourseOperationsRepository';
import { PrismaExternalCourseProviderRepository } from '../../src/courses/PrismaExternalCourseProviderRepository';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';
import { ImportedCourseAdminUseCases } from '../../../application/src/courses/use-cases/ImportedCourseAdminUseCases';
import { CourseOriginType, type ManualExternalCourseInput } from '@manaratak/domain';

describe('manual external creation on attested isolated PostgreSQL16', () => {
  let db: PrismaClient; const providerId = randomUUID(), run = randomUUID();
  const input: ManualExternalCourseInput = { originalSourceTitle: 'Manual acceptance ' + run, externalProviderId: providerId,
    directCourseUrl: `https://example.org/course/${run}?utm_source=manual`, evidenceUrl: `https://example.org/course/${run}`,
    evidenceObservedAt: '2026-01-01T00:00:00Z', learningLanguageRaw: 'English', isStudyFree: true, isFreeCertificate: null, description: 'Owner description retained' };
  beforeAll(async () => {
    if (process.env.COURSES_ADMIN_DATABASE_TESTS !== 'YES' || process.env.NODE_ENV !== 'test' || process.env.POST28_TARGET_LABEL !== 'DB-T' || process.env.DATABASE_URL !== process.env.DIRECT_URL) throw Error('ISOLATED_CATALOG_TEST_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(contract, [{ label: 'DB-T', url: process.env.DATABASE_URL }], process.env, contract.sourceSha, readDatabaseIdentity, { requireValidatedCatalog: true });
    db = new PrismaClient();
    await db.externalCourseProvider.create({ data: { id: providerId, publicId: 'manual-' + run, slug: 'manual-' + run,
      canonicalName: 'Manual provider ' + run, normalizedCanonicalName: 'manual ' + run, displayName: 'Manual acceptance provider', status: 'APPROVED', sourceTrustLevel: 'HIGH', importStrategy: 'FILE',
      allowedDomains: { create: { domain: 'example.org', normalizedDomain: 'example.org' } } } });
  });
  afterAll(async () => {
    if (!db) return;
    await db.courseSourceIdentity.deleteMany({ where: { providerId } });
    await db.course.deleteMany({ where: { externalProviderId: providerId } });
    await db.externalCourseProvider.deleteMany({ where: { id: providerId } }); await db.$disconnect();
  });
  const create = (values: ManualExternalCourseInput) => db.$transaction(async tx => {
    const service = new ImportedCourseAdminUseCases(new PrismaImportedCourseOperationsRepository(tx as unknown as PrismaClient, true), new PrismaExternalCourseProviderRepository(tx as unknown as PrismaClient), {} as never, {} as never);
    return service.createManual(values, 'isolated-manual-owner');
  }, { timeout: 15000 });
  it('creates one canonical course, source identity, unverified history and version without a fake import batch', async () => {
    const result = await create(input);
    expect(result.status).toBe('DRAFT'); expect(result.completenessStatus).toBe('NEEDS_REVIEW'); expect(result.sourceImportRecordId).toBeUndefined();
    expect(result.optionalFields).toMatchObject({ creationOrigin: 'MANUAL', description: 'Owner description retained' });
    const identity = await db.courseSourceIdentity.findFirstOrThrow({ where: { courseId: result.id }, include: { urlHistory: true } });
    expect(identity.languageVersionKey).toBe('en'); expect(identity.urlHistory[0].verificationState).toBe('UNVERIFIED');
    expect(await db.courseVersion.count({ where: { courseId: result.id } })).toBe(1);
    expect(await db.courseImportAnalysis.count({ where: { matchedCourseId: result.id } })).toBe(0);
    expect((await new PrismaImportedCourseOperationsRepository(db).getImportedCourseById(result.id))?.linkHealth).toBe('NEEDS_REVIEW');
  });
  it('rejects normalized URL/title/language duplicates and safely serializes concurrent manual submissions', async () => {
    await expect(create({ ...input, directCourseUrl: `https://example.org/course/${run}?utm_source=other#tracking` })).rejects.toThrow('DUPLICATE');
    const concurrent = { ...input, originalSourceTitle: 'Concurrent ' + run, directCourseUrl: `https://example.org/course/concurrent-${run}` };
    const results = await Promise.allSettled([create(concurrent), create(concurrent)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.course.count({ where: { externalProviderId: providerId, originalSourceTitle: concurrent.originalSourceTitle } })).toBe(1);
    expect(await db.courseSourceIdentity.count({ where: { providerId, originalTitle: concurrent.originalSourceTitle } })).toBe(1);
  });
  it('permits distinct source language versions without duplicating an identical identity', async () => {
    const translated = await create({ ...input, learningLanguageRaw: 'Arabic' });
    expect(translated.id).toBeTruthy();
    expect(await db.courseSourceIdentity.count({ where: { providerId, originalTitle: input.originalSourceTitle } })).toBe(2);
  });
  it('requires a transaction and rolls back source/course/version together', async () => {
    const service = new ImportedCourseAdminUseCases(new PrismaImportedCourseOperationsRepository(db), new PrismaExternalCourseProviderRepository(db), {} as never, {} as never);
    await expect(service.createManual({ ...input, originalSourceTitle: 'No transaction ' + run }, 'owner')).rejects.toThrow('AUDITED_TRANSACTION_REQUIRED');
    const before = await db.course.count({ where: { externalProviderId: providerId } });
    await expect(db.$transaction(async tx => {
      const nested = new ImportedCourseAdminUseCases(new PrismaImportedCourseOperationsRepository(tx as unknown as PrismaClient, true), new PrismaExternalCourseProviderRepository(tx as unknown as PrismaClient), {} as never, {} as never);
      await nested.createManual({ ...input, originalSourceTitle: 'Rollback ' + run, directCourseUrl: 'https://example.org/course/rollback-' + run }, 'owner');
      throw new Error('ISOLATED_ROLLBACK_SENTINEL');
    })).rejects.toThrow('ISOLATED_ROLLBACK_SENTINEL');
    expect(await db.course.count({ where: { externalProviderId: providerId } })).toBe(before);
    expect(await db.courseSourceIdentity.count({ where: { providerId, originalTitle: 'Rollback ' + run } })).toBe(0);
  });
  it('preserves source lineage during section edits and invalidates reviewed language on source change', async () => {
    const record = await db.course.findFirstOrThrow({ where: { externalProviderId: providerId, originalSourceTitle: input.originalSourceTitle } });
    await db.course.update({ where: { id: record.id }, data: { learningLanguageResolutionState: 'RESOLVED', learningLanguageAdminReviewedRaw: 'English', status: 'READY_TO_PUBLISH' } });
    const identities = await db.courseSourceIdentity.findMany({ where: { courseId: record.id }, include: { urlHistory: true } });
    await new PrismaCourseRepository(db).update(record.id, { learningLanguageRaw: 'French', optionalFields: { description: 'Explicit owner section edit' } });
    const updated = await db.course.findUniqueOrThrow({ where: { id: record.id } });
    expect(updated.learningLanguageResolutionState).toBe('UNRESOLVED'); expect(updated.learningLanguageAdminReviewedRaw).toBeNull();
    expect(updated.status).toBe('READY_TO_REVIEW'); expect(updated.directCourseUrl).toBe(record.directCourseUrl);
    expect(await db.courseSourceIdentity.findMany({ where: { courseId: record.id }, include: { urlHistory: true } })).toEqual(identities);
    expect(updated.optionalFields).toMatchObject({ creationOrigin: 'MANUAL', description: 'Explicit owner section edit' });
  });
  it('filters recorded current link outcomes on the server and reports filtered totals, preserving unknown states', async () => {
    const repository = new PrismaCourseRepository(db);
    const filters = { externalProviderId: providerId, originType: CourseOriginType.EXTERNAL_LINKED_COURSE, includeStatistics: true };
    const initial = await repository.list(filters);
    expect(initial.externalOverview?.needsVerification).toBe(initial.total);
    expect(initial.externalOverview?.broken).toBe(0);
    const identity = await db.courseSourceIdentity.findFirstOrThrow({ where: { providerId }, include: { urlHistory: true } });
    await db.courseSourceUrlHistory.update({ where: { id: identity.urlHistory[0].id }, data: { verificationState: 'BROKEN', checkedAt: new Date(), responseCode: 404 } });
    const broken = await repository.list({ ...filters, linkHealth: 'BROKEN' });
    expect(broken.data.map(course => course.id)).toEqual([identity.courseId]); expect(broken.total).toBe(1); expect(broken.externalOverview?.broken).toBe(1);
    const unknown = await repository.list({ ...filters, linkHealth: 'UNKNOWN' }); expect(unknown.total).toBe(0);
    const review = await repository.list({ ...filters, linkHealth: 'NEEDS_REVIEW' }); expect(review.total).toBe(initial.total - 1);
    const history = await new PrismaImportedCourseOperationsRepository(db).history(identity.courseId!, 1);
    expect(history.versions.length).toBeGreaterThan(0); expect(history.versions[0]).not.toHaveProperty('snapshot');
  });
  it('makes unresolved source language/level searchable without pretending they are canonical references', async () => {
    const repository = new PrismaCourseRepository(db);
    const record = await db.course.findFirstOrThrow({ where: { externalProviderId: providerId } });
    const raw = 'Source level ' + run;
    await db.course.update({ where: { id: record.id }, data: { difficultyLevel: null, studyLevelRaw: raw, learningLanguage: null, learningLanguageRaw: 'Source language ' + run } });
    expect((await repository.list({ externalProviderId: providerId, difficultyLevel: raw })).data.map(course => course.id)).toEqual([record.id]);
    expect((await repository.list({ externalProviderId: providerId, learningLanguage: 'Source language ' + run })).data.map(course => course.id)).toEqual([record.id]);
    expect((await repository.catalogOptions({ field: 'difficultyLevel', originType: CourseOriginType.EXTERNAL_LINKED_COURSE, search: raw, page: 1 })).data).toEqual([raw]);
    expect((await repository.catalogOptions({ field: 'learningLanguage', originType: CourseOriginType.EXTERNAL_LINKED_COURSE, search: run, page: 1 })).data).toEqual(['Source language ' + run]);
  });
});
