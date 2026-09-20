import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
} from '@manaratak/domain';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';

const databaseUrl = process.env.COURSE_PERSISTENCE_TEST_DATABASE_URL;
const disposable = process.env.COURSE_PERSISTENCE_TEST_DATABASE_IS_DISPOSABLE === 'true';
const describeDisposable = databaseUrl && disposable && destructiveDatabaseTestsEnabled(databaseUrl) ? describe : describe.skip;

describeDisposable('PrismaCourseRepository disposable PostgreSQL integration', () => {
  let prisma: PrismaClient;
  let repository: PrismaCourseRepository;

  beforeAll(async () => {
    if (!databaseUrl || !disposable) {
      throw new Error('Dedicated disposable course persistence database is required');
    }
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    repository = new PrismaCourseRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.course.deleteMany({ where: { publicId: { startsWith: 'crs-wp-ic01-' } } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.course.deleteMany({ where: { publicId: { startsWith: 'crs-wp-ic01-' } } });
      await prisma.$disconnect();
    }
  });

  it('persists, finds, filters, updates and binds writes to a transaction', async () => {
    const created = await repository.create({
      publicId: 'crs-wp-ic01-0001',
      slug: 'wp-ic01-course-0001',
      canonicalName: 'WP IC01 Course',
      canonicalDedupKey: 'wp-ic01-legacy-key-0001',
      displayName: 'WP IC01 Course',
      accessType: CourseAccessType.FREE_STUDY,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl: 'https://example.org/course/wp-ic01',
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
      platformName: 'WP IC01 Test Platform',
      providerName: 'WP IC01 Test Provider',
      sourceImportRecordId: 'wp-ic01-import-record-1',
      optionalFields: { topics: ['Persistence'] },
    });

    expect((await repository.findById(created.id))?.publicId).toBe('crs-wp-ic01-0001');
    expect((await repository.findByPublicId('crs-wp-ic01-0001'))?.id).toBe(created.id);
    expect((await repository.findBySlug('wp-ic01-course-0001'))?.id).toBe(created.id);
    expect((await repository.findByDedupKey('wp-ic01-legacy-key-0001'))?.id).toBe(created.id);

    await repository.update(created.id, {
      providerName: null,
      optionalFields: { verifiedByIntegration: true },
    });
    await repository.updateImportLink(created.id, 'wp-ic01-import-record-2');
    await repository.updateStatus(created.id, CourseStatus.READY_TO_REVIEW);

    const updated = await repository.findById(created.id);
    expect(updated?.providerName).toBeUndefined();
    expect(updated?.sourceImportRecordId).toBe('wp-ic01-import-record-2');
    expect(updated?.optionalFields).toMatchObject({
      topics: ['Persistence'],
      verifiedByIntegration: true,
    });

    const listed = await repository.list({
      status: CourseStatus.READY_TO_REVIEW,
      platformName: 'WP IC01 Test Platform',
      page: 1,
      pageSize: 10,
    });
    expect(listed.total).toBe(1);

    await expect(
      prisma.$transaction(async (transactionClient) => {
        const txRepository = repository.withTransaction({
          boundaryId: 'wp-ic01-rollback-boundary',
          transactionClient,
        } as any);
        await txRepository.updateStatus(created.id, CourseStatus.ARCHIVED);
        throw new Error('FORCE_ROLLBACK');
      }),
    ).rejects.toThrow('FORCE_ROLLBACK');

    expect((await repository.findById(created.id))?.status).toBe(CourseStatus.READY_TO_REVIEW);
  });
});
