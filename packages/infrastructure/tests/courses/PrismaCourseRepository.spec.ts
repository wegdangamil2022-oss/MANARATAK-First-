import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
} from '@manaratak/domain';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';

function courseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-db-1',
    publicId: 'crs-test-0001',
    slug: 'test-course',
    canonicalName: 'Test Course',
    canonicalDedupKey: 'legacy-dedup-key',
    displayName: 'Test Course',
    accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
    originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
    directCourseUrl: 'https://example.org/course/test',
    status: CourseStatus.IMPORTED,
    completenessStatus: CourseImportCompletenessState.COMPLETE,
    platformName: 'Example Platform',
    providerName: 'Example Provider',
    learningLanguage: 'English',
    studyDuration: '4 weeks',
    certificateAvailable: true,
    category: 'Technology',
    difficultyLevel: 'Beginner',
    sourceUrl: 'https://example.org/source/test',
    officialSourceUrl: 'https://example.org/course/test',
    thumbnailAssetId: null,
    sourceImportRecordId: 'import-record-1',
    optionalFields: { topics: ['Testing', 'Persistence'] },
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PrismaCourseRepository', () => {
  let prisma: any;
  let repository: PrismaCourseRepository;

  beforeEach(() => {
    prisma = {
      course: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      courseModule: { findMany: vi.fn().mockResolvedValue([]) },
      courseLesson: { findMany: vi.fn().mockResolvedValue([]) },
      courseLessonAsset: { findMany: vi.fn().mockResolvedValue([]) },
      courseQuiz: { findMany: vi.fn().mockResolvedValue([]) },
      courseQuestionBank: { findMany: vi.fn().mockResolvedValue([]) },
      courseQuestion: { findMany: vi.fn().mockResolvedValue([]) },
      courseVersion: { create: vi.fn().mockResolvedValue({}) },
    };
    repository = new PrismaCourseRepository(prisma);
  });

  it('maps persisted strings to strict course enums and maps database nulls to DTO undefined', async () => {
    prisma.course.findUnique.mockResolvedValue(courseRecord({
      platformName: null,
      providerName: null,
      certificateAvailable: null,
      optionalFields: null,
    }));

    const result = await repository.findById('course-db-1');

    expect(result).toMatchObject({
      accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
    });
    expect(result?.platformName).toBeUndefined();
    expect(result?.providerName).toBeUndefined();
    expect(result?.certificateAvailable).toBeUndefined();
    expect(result?.optionalFields).toBeUndefined();
  });

  it('rejects invalid persisted enum strings instead of leaking them into the domain', async () => {
    prisma.course.findUnique.mockResolvedValue(courseRecord({ status: 'NOT_A_COURSE_STATUS' }));

    await expect(repository.findById('course-db-1')).rejects.toThrow(
      'COURSE_STATUS_INVALID:NOT_A_COURSE_STATUS',
    );
  });

  it('creates a course using all current CreateCourseDto fields and strips undefined JSON values', async () => {
    prisma.course.create.mockImplementation(async ({ data }: any) => courseRecord({ ...data }));

    const created = await repository.create({
      publicId: 'crs-test-0001',
      slug: 'test-course',
      canonicalName: 'Test Course',
      canonicalDedupKey: 'legacy-dedup-key',
      displayName: 'Test Course',
      accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl: 'https://example.org/course/test',
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
      platformName: 'Example Platform',
      providerName: 'Example Provider',
      learningLanguage: 'English',
      studyDuration: '4 weeks',
      certificateAvailable: true,
      category: 'Technology',
      difficultyLevel: 'Beginner',
      sourceUrl: 'https://example.org/source/test',
      officialSourceUrl: 'https://example.org/course/test',
      sourceImportRecordId: 'import-record-1',
      optionalFields: { kept: 'value', omitted: undefined },
    });

    expect(prisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canonicalDedupKey: 'legacy-dedup-key',
        sourceImportRecordId: 'import-record-1',
        optionalFields: { kept: 'value' },
      }),
    });
    expect(created.publicId).toBe('crs-test-0001');
  });

  it('prevents optionalFields from shadowing canonical course fields', async () => {
    prisma.course.create.mockImplementation(async ({ data }: any) => courseRecord({ ...data }));

    const created = await repository.create({
      publicId: 'crs-test-0001',
      slug: 'test-course',
      canonicalName: 'Test Course',
      canonicalDedupKey: 'legacy-dedup-key',
      displayName: 'Canonical Course Name',
      accessType: CourseAccessType.FREE_STUDY,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl: 'https://example.org/course/test',
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
      optionalFields: {
        displayName: 'Shadow Name',
        status: CourseStatus.PUBLISHED,
        courseContent: 'Allowed presentation content',
      },
    });

    expect(prisma.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        displayName: 'Canonical Course Name',
        status: CourseStatus.IMPORTED,
        optionalFields: { courseContent: 'Allowed presentation content' },
      }),
    });
    expect(created.optionalFields).toEqual({ courseContent: 'Allowed presentation content' });
  });

  it('updates nullable fields and merges optionalFields without deleting existing JSON keys', async () => {
    prisma.course.findUnique.mockResolvedValue(courseRecord({ optionalFields: { existing: 'keep' } }));
    prisma.course.update.mockImplementation(async ({ data }: any) => courseRecord({
      ...courseRecord({ optionalFields: { existing: 'keep' } }),
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      optionalFields: data.optionalFields,
    }));

    const updated = await repository.update('course-db-1', {
      providerName: null,
      sourceUrl: null,
      optionalFields: { added: 'new' },
    });

    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-db-1' },
      data: expect.objectContaining({
        providerName: null,
        sourceUrl: null,
        optionalFields: { existing: 'keep', added: 'new' },
      }),
    });
    expect(updated.optionalFields).toEqual({ existing: 'keep', added: 'new' });
  });

  it('supports all direct lookup methods', async () => {
    prisma.course.findUnique.mockResolvedValue(courseRecord());

    await repository.findById('course-db-1');
    await repository.findByPublicId('crs-test-0001');
    await repository.findBySlug('test-course');
    await repository.findByDedupKey('legacy-dedup-key');

    expect(prisma.course.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 'course-db-1' } });
    expect(prisma.course.findUnique).toHaveBeenNthCalledWith(2, { where: { publicId: 'crs-test-0001' } });
    expect(prisma.course.findUnique).toHaveBeenNthCalledWith(3, { where: { slug: 'test-course' } });
    expect(prisma.course.findUnique).toHaveBeenNthCalledWith(4, { where: { canonicalDedupKey: 'legacy-dedup-key' } });
  });

  it('updates status and import-record linkage independently', async () => {
    prisma.course.update.mockResolvedValue(courseRecord());

    await repository.updateStatus('course-db-1', CourseStatus.READY_TO_REVIEW);
    await repository.updateImportLink('course-db-1', 'import-record-2');

    expect(prisma.course.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'course-db-1' },
      data: { status: CourseStatus.READY_TO_REVIEW, version: { increment: 1 } },
    });
    expect(prisma.course.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'course-db-1' },
      data: { sourceImportRecordId: 'import-record-2', version: { increment: 1 } },
    });
  });

  it('lists by status without pagination and maps results', async () => {
    prisma.course.findMany.mockResolvedValue([courseRecord()]);

    const result = await repository.listByStatus(CourseStatus.IMPORTED);

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: { status: CourseStatus.IMPORTED },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('applies admin filters and bounded pagination', async () => {
    prisma.course.findMany.mockResolvedValue([courseRecord()]);
    prisma.course.count.mockResolvedValue(201);

    const result = await repository.list({
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
      accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      platformName: 'Example Platform',
      page: 2,
      pageSize: 500,
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: {
        status: CourseStatus.IMPORTED,
        completenessStatus: CourseImportCompletenessState.COMPLETE,
        accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
        originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
        platformName: 'Example Platform',
      },
      skip: 100,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toMatchObject({ total: 201, page: 2, pageSize: 100, totalPages: 3 });
  });

  it('listPublished hard-requires PUBLISHED and supports public filters', async () => {
    prisma.course.findMany.mockResolvedValue([]);
    prisma.course.count.mockResolvedValue(0);

    await repository.listPublished({
      accessType: CourseAccessType.FREE_STUDY,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      platformName: 'Example Platform',
      category: 'Technology',
      learningLanguage: 'English',
      limit: 10,
    });

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: {
        status: CourseStatus.PUBLISHED,
        completenessStatus: CourseImportCompletenessState.COMPLETE,
        accessType: CourseAccessType.FREE_STUDY,
        originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
        platformName: 'Example Platform',
        category: 'Technology',
        learningLanguage: 'English',
        AND: [{ OR: [
          { originType: { not: CourseOriginType.EXTERNAL_LINKED_COURSE } },
          {
            originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
            accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
            isStudyFree: true,
            isFreeCertificate: true,
          },
        ] }],
      },
      take: 11,
      orderBy: { id: 'asc' },
    });
  });

  it('binds all repository operations to the supplied Prisma transaction client', async () => {
    const tx = {
      course: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(courseRecord()),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    const transactional = repository.withTransaction({
      boundaryId: 'course-test-boundary',
      transactionClient: tx,
    } as any);

    await transactional.findById('course-db-1');

    expect(tx.course.findUnique).toHaveBeenCalledWith({ where: { id: 'course-db-1' } });
    expect(prisma.course.findUnique).not.toHaveBeenCalled();
  });

  it('rejects incomplete transaction contexts', () => {
    expect(() => repository.withTransaction({ boundaryId: 'missing-client' })).toThrow(
      'COURSE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED',
    );
  });
});
