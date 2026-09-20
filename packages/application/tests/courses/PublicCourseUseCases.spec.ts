import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  ICourseRepository
} from '@manaratak/domain';
import { PublicCourseUseCases } from '../../src/courses/use-cases/PublicCourseUseCases';

describe('PublicCourseUseCases', () => {
  let mockRepo: ICourseRepository;
  let useCases: PublicCourseUseCases;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findByDedupKey: vi.fn(),
      findById: vi.fn(),
      findByPublicId: vi.fn(),
      findBySlug: vi.fn(),
      updateStatus: vi.fn(),
      updateImportLink: vi.fn(),
      listByStatus: vi.fn(),
      list: vi.fn(),
      listPublished: vi.fn(),
    };
    useCases = new PublicCourseUseCases(mockRepo);
  });

  it('listCourses calls listPublished and strips internal fields', async () => {
    const filters = { accessType: CourseAccessType.FREE_CERTIFICATE, page: 1, pageSize: 20 };
    mockRepo.listPublished = vi.fn().mockResolvedValue({
      data: [{
        id: 'internal-id',
        publicId: 'pub-1',
        slug: 'intro-data-science',
        displayName: 'Introduction to Data Science',
        canonicalName: 'Introduction to Data Science',
        canonicalDedupKey: 'secret-key',
        accessType: CourseAccessType.FREE_CERTIFICATE,
        originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
        directCourseUrl: 'https://example.org/course',
        status: CourseStatus.PUBLISHED,
        completenessStatus: CourseImportCompletenessState.COMPLETE,
        sourceImportRecordId: 'rec-1',
        externalProviderId: 'provider-1',
        learningLanguageReferenceId: 'lang-en',
        optionalFields: { acquiredSkills: ['Data analysis'], sourceArtifactHash: 'must-not-leak' },
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    });

    const result = await useCases.listCourses(filters);

    expect(mockRepo.listPublished).toHaveBeenCalledWith(filters);
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0]).not.toHaveProperty('canonicalDedupKey');
    expect(result.data[0]).not.toHaveProperty('sourceImportRecordId');
    expect(result.data[0]).not.toHaveProperty('status');
    expect(result.data[0]).not.toHaveProperty('sourceArtifactHash');
    expect(result.data[0]).toHaveProperty('ownerId', 'internal-id');
    expect(result.data[0]).toHaveProperty('externalProviderId', 'provider-1');
    expect(result.data[0]).toHaveProperty('learningLanguageReferenceId', 'lang-en');
    expect(result.data[0]).toHaveProperty('displayName', 'Introduction to Data Science');
    expect(result.data[0]).toHaveProperty('acquiredSkills', ['Data analysis']);
  });

  it('getCourse returns mapped DTO only if PUBLISHED', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'course-1',
      publicId: 'pub-1',
      slug: 'intro-data-science',
      displayName: 'Introduction to Data Science',
      canonicalName: 'Introduction to Data Science',
      accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl: 'https://example.org/course',
      status: CourseStatus.PUBLISHED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
      isStudyFree: true,
      isFreeCertificate: true,
      learningLanguageReferenceId: 'lang-en',
      optionalFields: { courseContent: 'Foundations of data science.' },
      updatedAt: new Date()
    });

    const result = await useCases.getCourse('intro-data-science');

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('status');
    expect(result).toHaveProperty('ownerId', 'course-1');
    expect(result).toHaveProperty('learningLanguageReferenceId', 'lang-en');
    expect(result).toHaveProperty('displayName', 'Introduction to Data Science');
    expect(result).toHaveProperty('courseContent', 'Foundations of data science.');
  });

  it('getCourse throws if not PUBLISHED', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'course-1',
      slug: 'intro-data-science',
      status: CourseStatus.READY_TO_PUBLISH,
      displayName: 'Introduction to Data Science'
    });

    await expect(useCases.getCourse('intro-data-science')).rejects.toThrow('Course not found');
  });
  it('projects localizedNames by requested locale and strips the translation carrier', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'course-1',
      publicId: 'pub-1',
      slug: 'data-science',
      displayName: 'Data Science',
      canonicalName: 'Data Science',
      accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl: 'https://example.org/course',
      status: CourseStatus.PUBLISHED,
      completenessStatus: CourseImportCompletenessState.COMPLETE,
      isStudyFree: true,
      isFreeCertificate: true,
      optionalFields: { localizedNames: { ar: 'علم البيانات', en: 'Data Science' } },
      updatedAt: new Date(),
    });

    const arabic = await useCases.getCourse('data-science', 'ar');
    const english = await useCases.getCourse('data-science', 'en');

    expect(arabic.displayName).toBe('علم البيانات');
    expect(english.displayName).toBe('Data Science');
    expect(arabic).not.toHaveProperty('localizedNames');
  });

  it('localizes relationship read-model results without leaking alternate names', () => {
    const localized = useCases.localizeRelationshipPage({
      data: [{ displayName: 'Data Science', localizedNames: { ar: 'علم البيانات', en: 'Data Science' } }],
      total: 1, page: 1, pageSize: 20, totalPages: 1,
    }, 'ar');

    expect(localized.data[0].displayName).toBe('علم البيانات');
    expect(localized.data[0]).not.toHaveProperty('localizedNames');
  });

});
