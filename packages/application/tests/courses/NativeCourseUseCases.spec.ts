import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseAccessType,
  CourseContentStatus,
  CourseImportCompletenessState,
  CourseLessonType,
  CourseOriginType,
  CourseStatus,
  ICourseCurriculumRepository,
  ICourseRepository,
} from '@manaratak/domain';
import { NativeCourseUseCases } from '../../src/courses/use-cases/NativeCourseUseCases';

describe('NativeCourseUseCases', () => {
  let courses: ICourseRepository;
  let curriculum: ICourseCurriculumRepository;
  let useCases: NativeCourseUseCases;

  beforeEach(() => {
    courses = {
      create: vi.fn(async (data) => ({
        ...data,
        id: 'course-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
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
    curriculum = {
      createModule: vi.fn(),
      updateModule: vi.fn(),
      deleteModule: vi.fn(),
      reorderModules: vi.fn(),
      listModulesByCourseId: vi.fn(),
      createLesson: vi.fn(),
      updateLesson: vi.fn(),
      deleteLesson: vi.fn(),
      reorderLessons: vi.fn(),
      listLessonsByModuleId: vi.fn(),
      attachAssetToLesson: vi.fn(),
      listAssetsByLessonId: vi.fn(),
      detachAssetFromLesson: vi.fn(),
      createQuiz: vi.fn(),
      updateQuiz: vi.fn(),
      deleteQuiz: vi.fn(),
      listQuizzesByCourseId: vi.fn(),
      createQuestionBank: vi.fn(),
      updateQuestionBank: vi.fn(),
      deleteQuestionBank: vi.fn(),
      createQuestion: vi.fn(),
      updateQuestion: vi.fn(),
      deleteQuestion: vi.fn(),
      listQuestionsByQuizId: vi.fn(),
      getCurriculumSnapshot: vi.fn(),
    };
    const relationships = {
      listTaxonomyLinks: vi.fn().mockResolvedValue([{ id: 'tax-link-1', courseId: 'course-1', taxonomyNodeId: 'tax-ai', relationshipType: 'PRIMARY', reviewState: 'APPROVED' }]),
      listMajorProjections: vi.fn().mockResolvedValue([]),
      listInternationalTestRelationships: vi.fn().mockResolvedValue([]),
    } as any;
    useCases = new NativeCourseUseCases(courses, curriculum, undefined, undefined, relationships);
  });

  const nativeCourse = (overrides: Record<string, unknown> = {}) => ({
    id: 'course-1',
    publicId: 'CRS-NAT-1',
    slug: 'course-1',
    canonicalName: 'دورة',
    canonicalDedupKey: 'native:دورة',
    displayName: 'دورة',
    accessType: CourseAccessType.FREE_STUDY,
    originType: CourseOriginType.NATIVE_MANARATAK_COURSE,
    directCourseUrl: '/courses/course-1',
    status: CourseStatus.DRAFT,
    completenessStatus: CourseImportCompletenessState.INCOMPLETE,
    category: 'AI',
    difficultyLevel: 'BEGINNER',
    learningLanguage: 'Arabic',
    learningLanguageReferenceId: 'lang-ar',
    optionalFields: { description: 'وصف مفيد', learningOutcomes: ['مخرج تعلم'], completionCriteria: { minimumProgress: 100 } },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  it('creates a persisted DRAFT with forced Native identity and stable internal URL', async () => {
    const result = await useCases.create({
      titleAr: ' دورة الذكاء الاصطناعي ',
      titleEn: 'AI Course',
    });

    expect(result.id).toBe('course-1');
    expect(courses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originType: CourseOriginType.NATIVE_MANARATAK_COURSE,
        status: CourseStatus.DRAFT,
        directCourseUrl: expect.stringMatching(/^\/courses\/ai-course-/),
        publicId: expect.stringMatching(/^CRS-NAT-/),
      }),
    );
  });

  it('rejects deterministic canonical duplicates', async () => {
    courses.findByDedupKey = vi.fn().mockResolvedValue(nativeCourse());
    await expect(useCases.create({ titleAr: 'دورة' })).rejects.toThrow(
      'NATIVE_COURSE_CANONICAL_DUPLICATE',
    );
    expect(courses.create).not.toHaveBeenCalled();
  });

  it('reports blockers for an empty curriculum', async () => {
    courses.findById = vi.fn().mockResolvedValue(nativeCourse());
    curriculum.getCurriculumSnapshot = vi
      .fn()
      .mockResolvedValue({
        modules: [],
        lessons: [],
        assets: [],
        quizzes: [],
        questionBanks: [],
        questions: [],
      });
    const result = await useCases.getReadiness('course-1');
    expect(result.ready).toBe(false);
    expect(result.checks.find((item) => item.key === 'modules')?.state).toBe('INCOMPLETE');
  });

  it('allows readiness when required metadata and meaningful lesson content exist', async () => {
    courses.findById = vi.fn().mockResolvedValue(nativeCourse());
    curriculum.getCurriculumSnapshot = vi.fn().mockResolvedValue({
      modules: [
        {
          id: 'module-1',
          courseId: 'course-1',
          title: 'الوحدة',
          position: 1,
          status: CourseContentStatus.DRAFT,
        },
      ],
      lessons: [
        {
          id: 'lesson-1',
          courseId: 'course-1',
          moduleId: 'module-1',
          title: 'الدرس',
          lessonType: CourseLessonType.ARTICLE,
          position: 1,
          contentText: 'شرح حقيقي',
          status: CourseContentStatus.DRAFT,
        },
      ],
      assets: [],
      quizzes: [],
      questionBanks: [],
      questions: [],
    });
    expect((await useCases.getReadiness('course-1')).ready).toBe(true);
  });

  it('re-evaluates readiness and refuses publish without READY_TO_PUBLISH state', async () => {
    courses.findById = vi
      .fn()
      .mockResolvedValue(nativeCourse({ status: CourseStatus.READY_TO_REVIEW }));
    await expect(useCases.publish('course-1')).rejects.toThrow(
      'NATIVE_COURSE_NOT_READY_TO_PUBLISH',
    );
    expect(courses.updateStatus).not.toHaveBeenCalled();
  });
});
