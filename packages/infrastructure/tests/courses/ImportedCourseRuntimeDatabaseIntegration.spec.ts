import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';

const describeWithDatabase = destructiveDatabaseTestsEnabled()
  ? describe
  : describe.skip;

describeWithDatabase('WP-IC-10 Imported Course PostgreSQL Integration', () => {
  let prisma: PrismaClient;
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const providerPublicId = `provider-wpic10-${suffix}`;
  const providerSlug = `provider-wpic10-${suffix}`.toLowerCase();
  const providerCanonicalName = `WPIC10 Provider ${suffix}`;
  const normalizedCanonicalName = providerCanonicalName.toLowerCase();
  const coursePublicId = `course-wpic10-${suffix}`;
  const courseSlug = `course-wpic10-${suffix}`.toLowerCase();
  const canonicalDedupKey = `wpic10:${suffix}`;
  const sourceNativeKey = `native:${suffix}`;
  const initialUrl = `https://example.org/course/${suffix}`;
  const changedUrl = `https://example.org/course/${suffix}?v=2`;
  let providerId = '';
  let courseId = '';
  let batchId = '';
  let recordId = '';
  let identityId = '';

  beforeAll(async () => {
    prisma = new PrismaClient();
    const provider = await prisma.externalCourseProvider.create({
      data: {
        publicId: providerPublicId,
        slug: providerSlug,
        canonicalName: providerCanonicalName,
        normalizedCanonicalName,
        displayName: providerCanonicalName,
        status: 'APPROVED',
        sourceTrustLevel: 'OFFICIAL',
        importStrategy: 'FILE',
        allowedDomains: {
          create: { domain: 'example.org', normalizedDomain: 'example.org' },
        },
      },
    });
    providerId = provider.id;

    const batch = await prisma.importBatch.create({
      data: {
        sourceSystem: `WPIC10_DB_TEST:${suffix}`,
        dataType: 'COURSES',
        batchStatus: 'COMPLETED',
        totalRecords: 1,
        processedRecords: 1,
        failedRecords: 0,
      },
    });
    batchId = batch.id;

    const record = await prisma.importRecord.create({
      data: {
        batchId,
        status: 'COMPLETE',
        rawPayload: { source: 'WP-IC-10 database integration' },
        sourceDedupKey: `wpic10-record:${suffix}`,
        sourceRowNumber: 1,
      },
    });
    recordId = record.id;

    const course = await prisma.course.create({
      data: {
        publicId: coursePublicId,
        slug: courseSlug,
        canonicalName: `WPIC10 Course ${suffix}`,
        canonicalDedupKey,
        displayName: `WPIC10 Course ${suffix}`,
        accessType: 'FREE_STUDY',
        originType: 'EXTERNAL_LINKED_COURSE',
        directCourseUrl: initialUrl,
        status: 'IMPORTED',
        completenessStatus: 'COMPLETE',
        externalProviderId: providerId,
        sourceImportRecordId: recordId,
        isStudyFree: true,
        isFreeCertificate: false,
      },
    });
    courseId = course.id;

    const identity = await prisma.courseSourceIdentity.create({
      data: {
        courseId,
        providerId,
        sourceNativeKey,
        identityStrategy: 'PROVIDER_NATIVE_KEY',
        originalTitle: course.canonicalName,
        normalizedOriginalTitle: course.canonicalName.toLowerCase(),
        languageVersionKey: 'en',
        currentUrl: initialUrl,
        status: 'ACTIVE',
        urlHistory: {
          create: {
            url: initialUrl,
            normalizedUrl: initialUrl,
            isCurrent: true,
            verificationState: 'VERIFIED',
            responseCode: 200,
            checkedAt: new Date(),
          },
        },
      },
    });
    identityId = identity.id;

    await prisma.courseImportAnalysis.create({
      data: {
        importRecordId: recordId,
        providerCandidateId: providerId,
        resolvedProviderId: providerId,
        sourceNativeKey,
        normalizedPayload: { source: 'WP-IC-10 database integration' },
        eligibilityState: 'ELIGIBLE_FREE_STUDY',
        completenessState: 'COMPLETE',
        matchState: 'NOT_DUPLICATE',
        matchedCourseId: courseId,
        changeState: 'NEW',
        requiresReview: false,
      },
    });

    await prisma.courseFieldProvenance.create({
      data: {
        courseId,
        fieldKey: 'courseName',
        importRecordId: recordId,
        sourceArtifactHash: 'a'.repeat(64),
        sourceRowNumber: 1,
        providerId,
        sourceUrl: initialUrl,
        valueHash: 'b'.repeat(64),
      },
    });

    await prisma.importRecord.update({ where: { id: recordId }, data: { promotedEntityId: courseId } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.courseFieldProvenance.deleteMany({ where: { courseId } });
    await prisma.courseImportAnalysis.deleteMany({ where: { importRecordId: recordId } });
    await prisma.courseSourceUrlHistory.deleteMany({ where: { courseSourceIdentityId: identityId } });
    await prisma.courseSourceIdentity.deleteMany({ where: { id: identityId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.importRecord.deleteMany({ where: { id: recordId } });
    await prisma.importBatch.deleteMany({ where: { id: batchId } });
    await prisma.externalCourseProviderDomain.deleteMany({ where: { providerId } });
    await prisma.externalCourseProvider.deleteMany({ where: { id: providerId } });
    await prisma.$disconnect();
  });

  it('persists the provider → import record → canonical course lineage', async () => {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { externalProvider: true, sourceIdentities: { include: { urlHistory: true } }, fieldProvenance: true },
    });
    expect(course).not.toBeNull();
    expect(course?.status).toBe('IMPORTED');
    expect(course?.externalProvider?.publicId).toBe(providerPublicId);
    expect(course?.sourceIdentities).toHaveLength(1);
    expect(course?.sourceIdentities[0].urlHistory).toHaveLength(1);
    expect(course?.fieldProvenance).toHaveLength(1);

    const record = await prisma.importRecord.findUnique({ where: { id: recordId } });
    expect(record?.promotedEntityId).toBe(courseId);
  });

  it('enforces stable provider/native-key/language identity uniqueness', async () => {
    await expect(prisma.courseSourceIdentity.create({
      data: {
        courseId,
        providerId,
        sourceNativeKey,
        identityStrategy: 'PROVIDER_NATIVE_KEY',
        originalTitle: `Duplicate ${suffix}`,
        normalizedOriginalTitle: `duplicate ${suffix}`,
        languageVersionKey: 'en',
        currentUrl: initialUrl,
        status: 'ACTIVE',
      },
    })).rejects.toBeTruthy();
  });

  it('records URL evolution without creating a second canonical Course', async () => {
    await prisma.courseSourceUrlHistory.updateMany({ where: { courseSourceIdentityId: identityId }, data: { isCurrent: false } });
    await prisma.courseSourceUrlHistory.create({
      data: {
        courseSourceIdentityId: identityId,
        url: changedUrl,
        normalizedUrl: changedUrl,
        isCurrent: true,
        verificationState: 'VERIFIED',
        responseCode: 200,
        checkedAt: new Date(),
        changeImportRecordId: recordId,
      },
    });
    await prisma.courseSourceIdentity.update({ where: { id: identityId }, data: { currentUrl: changedUrl, lastSeenAt: new Date() } });
    await prisma.course.update({ where: { id: courseId }, data: { directCourseUrl: changedUrl } });

    expect(await prisma.course.count({ where: { canonicalDedupKey } })).toBe(1);
    expect(await prisma.courseSourceUrlHistory.count({ where: { courseSourceIdentityId: identityId } })).toBe(2);
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    expect(course?.status).toBe('IMPORTED');
  });
});
