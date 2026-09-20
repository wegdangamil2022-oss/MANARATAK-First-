import { describe, expect, it, vi } from 'vitest';
import {
  CourseOriginType,
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderStatus,
} from '@manaratak/domain';
import { ImportedCourseAdminUseCases } from '../../src/courses/use-cases/ImportedCourseAdminUseCases';

function imported(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-1',
    publicId: 'course-public-1',
    slug: 'course-1',
    displayName: 'Course One',
    canonicalName: 'Course One',
    accessType: 'FREE_STUDY',
    originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
    directCourseUrl: 'https://example.org/course',
    status: 'READY_TO_PUBLISH',
    completenessStatus: 'COMPLETE',
    externalProviderId: 'provider-1',
    sourceVerified: true,
    linkHealth: 'VERIFIED_DIRECT',
    missingFields: [],
    missingFieldsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    provenance: [],
    ...overrides,
  } as any;
}

function createFixture() {
  const course = imported();
  const repository = {
    listImportedCourses: vi.fn().mockResolvedValue({
      data: [course], total: 1, page: 1, pageSize: 50, totalPages: 1,
      overview: { total: 1, review: 0, incomplete: 0, broken: 0, needsVerification: 0, ready: 1, published: 0, archived: 0 },
    }),
    getImportedCourseById: vi.fn().mockResolvedValue(course),
    getOverview: vi.fn(),
    getVerificationContext: vi.fn().mockResolvedValue({
      courseId: 'course-1',
      directCourseUrl: 'https://example.org/course',
      providerId: 'provider-1',
      sourceIdentityId: 'source-1',
    }),
    recordLinkCheck: vi.fn(),
    getImportOperationsOverview: vi.fn(),
    listCourseBatches: vi.fn(),
    getCourseBatchById: vi.fn(),
    listReviewQueue: vi.fn(),
  };
  const provider = {
    id: 'provider-1',
    publicId: 'ecp-example',
    slug: 'example',
    canonicalName: 'Example',
    normalizedCanonicalName: 'example',
    displayName: 'Example',
    status: ExternalCourseProviderStatus.APPROVED,
    sourceTrustLevel: 'REVIEWED',
    importStrategy: ExternalCourseProviderImportStrategy.FILE,
    allowedDomains: ['example.org'],
    aliases: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;
  const providers = {
    findById: vi.fn().mockResolvedValue(provider),
    findByPublicId: vi.fn(),
    list: vi.fn(),
    resolveByName: vi.fn(),
    isDomainApproved: vi.fn().mockResolvedValue(true),
    upsertSeedProvider: vi.fn(),
  };
  const admin = {
    updateCourse: vi.fn().mockResolvedValue(course),
    markReadyToPublish: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    unpublish: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
  };
  const linkChecker = {
    check: vi.fn().mockResolvedValue({
      state: 'VERIFIED_DIRECT',
      responseCode: 200,
      checkedAt: new Date(),
    }),
  };
  return {
    course, repository, provider, providers, admin, linkChecker,
    useCases: new ImportedCourseAdminUseCases(
      repository as any,
      providers as any,
      admin as any,
      linkChecker as any,
    ),
  };
}

describe('ImportedCourseAdminUseCases', () => {
  it('lists imported courses through the production operations repository', async () => {
    const f = createFixture();
    const result = await f.useCases.list({ page: 1 });
    expect(result.total).toBe(1);
    expect(f.repository.listImportedCourses).toHaveBeenCalledWith({ page: 1 });
  });

  it('verifies source only when provider and direct URL domain are approved', async () => {
    const f = createFixture();
    const result = await f.useCases.verifySource('course-1');
    expect(result.verified).toBe(true);
    expect(f.providers.isDomainApproved).toHaveBeenCalledWith('provider-1', 'https://example.org/course');
  });

  it('checks only the already registered direct URL and records link health', async () => {
    const f = createFixture();
    const result = await f.useCases.checkLink('course-1');
    expect(result.state).toBe('VERIFIED_DIRECT');
    expect(f.linkChecker.check).toHaveBeenCalledWith({
      url: 'https://example.org/course',
      allowedDomains: ['example.org'],
    });
    expect(f.repository.recordLinkCheck).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ state: 'VERIFIED_DIRECT' }),
      'https://example.org/course',
    );
  });

  it('does not crawl FILE-only providers for fetch-missing', async () => {
    const f = createFixture();
    await expect(f.useCases.fetchMissing('course-1'))
      .rejects.toThrow('COURSE_FETCH_MISSING_PROVIDER_POLICY_FILE_ONLY');
  });

  it('requires a verified link before mark-ready', async () => {
    const f = createFixture();
    f.repository.getImportedCourseById.mockResolvedValue(imported({ linkHealth: 'UNKNOWN' }));
    await expect(f.useCases.markReady('course-1'))
      .rejects.toThrow('IMPORTED_COURSE_LINK_VERIFICATION_REQUIRED:UNKNOWN');
    expect(f.admin.markReadyToPublish).not.toHaveBeenCalled();
  });

  it('publishes through AdminCourseUseCases only after source/link gates', async () => {
    const f = createFixture();
    await f.useCases.publish('course-1');
    expect(f.admin.publish).toHaveBeenCalledWith('course-1');
  });

  it('forbids changing provider identity through the generic imported-course patch', async () => {
    const f = createFixture();
    await expect(f.useCases.update('course-1', {
      externalProviderId: 'provider-2',
    } as any)).rejects.toThrow('IMPORTED_COURSE_PROVIDER_IDENTITY_CHANGE_FORBIDDEN');
  });

  it('forbids manual direct URL mutation so source identity/history cannot diverge', async () => {
    const f = createFixture();
    await expect(f.useCases.update('course-1', {
      directCourseUrl: 'https://example.org/new-course',
    } as any)).rejects.toThrow('IMPORTED_COURSE_DIRECT_URL_CHANGE_REQUIRES_CONTROLLED_IMPORT');
    expect(f.admin.updateCourse).not.toHaveBeenCalled();
    expect(f.providers.isDomainApproved).not.toHaveBeenCalled();
    expect(f.repository.recordLinkCheck).not.toHaveBeenCalled();
  });

  it('forbids changing an imported course to another origin type', async () => {
    const f = createFixture();
    await expect(f.useCases.update('course-1', {
      originType: CourseOriginType.NATIVE_MANARATAK_COURSE,
    } as any)).rejects.toThrow('IMPORTED_COURSE_ORIGIN_CHANGE_FORBIDDEN');
  });
});
