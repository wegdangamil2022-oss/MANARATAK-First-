import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaImportedCourseOperationsRepository } from '../../src/courses/PrismaImportedCourseOperationsRepository';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';

const runDatabaseTests =
  destructiveDatabaseTestsEnabled();

const describeDatabase = runDatabaseTests ? describe : describe.skip;

describeDatabase('PrismaImportedCourseOperationsRepository disposable PostgreSQL', () => {
  const prisma = new PrismaClient();

  it('reads imported courses, DB counters, provider policy and persisted link health', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const provider = await prisma.externalCourseProvider.create({
      data: {
        publicId: `wp07-provider-${suffix}`,
        slug: `wp07-provider-${suffix}`,
        canonicalName: `WP07 Provider ${suffix}`,
        normalizedCanonicalName: `wp07 provider ${suffix}`,
        displayName: `WP07 Provider ${suffix}`,
        status: 'APPROVED',
        sourceTrustLevel: 'TEST',
        importStrategy: 'FILE',
        allowedDomains: {
          create: [{
            domain: 'example.org',
            normalizedDomain: 'example.org',
          }],
        },
      },
    });

    const course = await prisma.course.create({
      data: {
        publicId: `wp07-course-public-${suffix}`,
        slug: `wp07-course-${suffix}`,
        canonicalName: `WP07 Course ${suffix}`,
        canonicalDedupKey: `wp07-dedup-${suffix}`,
        displayName: `WP07 Course ${suffix}`,
        accessType: 'FREE_STUDY',
        originType: 'EXTERNAL_LINKED_COURSE',
        directCourseUrl: 'https://example.org/course',
        status: 'IMPORTED',
        completenessStatus: 'COMPLETE',
        externalProviderId: provider.id,
        originalSourceTitle: `WP07 Course ${suffix}`,
        isStudyFree: true,
        isFreeCertificate: false,
        certificateType: 'No free certificate',
        learningLanguageRaw: 'English',
        studyLevelRaw: 'Beginner',
        studyDurationRaw: '1 hour',
        shortCourseTopicsRaw: 'Testing',
      },
    });

    const identity = await prisma.courseSourceIdentity.create({
      data: {
        courseId: course.id,
        providerId: provider.id,
        sourceNativeKey: `native-${suffix}`,
        identityStrategy: 'EXPLICIT_NATIVE_ID',
        originalTitle: course.displayName,
        normalizedOriginalTitle: course.displayName.toLowerCase(),
        languageVersionKey: 'english',
        currentUrl: course.directCourseUrl,
        status: 'ACTIVE',
      },
    });

    await prisma.courseSourceUrlHistory.create({
      data: {
        courseSourceIdentityId: identity.id,
        url: course.directCourseUrl,
        normalizedUrl: course.directCourseUrl,
        isCurrent: true,
        verificationState: 'UNVERIFIED',
      },
    });

    try {
      const repository = new PrismaImportedCourseOperationsRepository(prisma);
      const page = await repository.listImportedCourses({
        providerId: provider.id,
        page: 1,
        pageSize: 20,
      });

      expect(page.total).toBe(1);
      expect(page.data[0].sourceVerified).toBe(true);
      expect(page.data[0].linkHealth).toBe('NEEDS_REVIEW');

      const overview = await repository.getOverview();
      expect(overview.total).toBeGreaterThanOrEqual(1);
      expect(overview.needsVerification).toBeGreaterThanOrEqual(1);

      const detail = await repository.getImportedCourseById(course.id);
      expect(detail?.provider?.id).toBe(provider.id);
      expect(detail?.sourceIdentity?.id).toBe(identity.id);

      await repository.recordLinkCheck(course.id, {
        state: 'VERIFIED_DIRECT',
        responseCode: 200,
        checkedAt: new Date(),
      }, course.directCourseUrl);

      const verified = await repository.getImportedCourseById(course.id);
      expect(verified?.linkHealth).toBe('VERIFIED_DIRECT');
      expect(verified?.linkResponseCode).toBe(200);
    } finally {
      await prisma.courseSourceUrlHistory.deleteMany({ where: { courseSourceIdentityId: identity.id } });
      await prisma.courseSourceIdentity.deleteMany({ where: { id: identity.id } });
      await prisma.course.deleteMany({ where: { id: course.id } });
      await prisma.externalCourseProviderDomain.deleteMany({ where: { providerId: provider.id } });
      await prisma.externalCourseProvider.deleteMany({ where: { id: provider.id } });
    }
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
