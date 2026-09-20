import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseAccessType,
  CourseCompletionStatus,
  CourseEnrollmentStatus,
  CourseImportCompletenessState,
  CourseLessonType,
  CourseOriginType,
  CourseProgressStatus,
  CourseQuestionType,
  CourseStatus,
  ICourseCurriculumRepository,
  ICourseProgressRepository,
  ICourseRepository,
} from '@manaratak/domain';
import { CourseProgressUseCases } from '../../src/courses/use-cases/CourseProgressUseCases';

const atomic = {
  execute: vi.fn(async (_definition: unknown, mutation: (context: any) => Promise<unknown>) =>
    mutation({ boundaryId: 'test-boundary', transactionClient: {} })),
} as any;

describe('CourseProgressUseCases W9 integrity', () => {
  let courseRepo: ICourseRepository;
  let curriculumRepo: ICourseCurriculumRepository;
  let progressRepo: ICourseProgressRepository;
  let useCases: CourseProgressUseCases;

  const nativeCourse = {
    id: 'course-1', publicId: 'crs-1', slug: 'native-course', canonicalName: 'Native Course',
    canonicalDedupKey: 'native-course', displayName: 'Native Course', version: 3,
    accessType: CourseAccessType.FREE_CERTIFICATE, originType: CourseOriginType.NATIVE_MANARATAK_COURSE,
    directCourseUrl: '/courses/native-course', status: CourseStatus.PUBLISHED,
    completenessStatus: CourseImportCompletenessState.COMPLETE, certificateAvailable: true,
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    atomic.execute.mockClear();
    courseRepo = {
      create: vi.fn(), update: vi.fn(), findByDedupKey: vi.fn(), findById: vi.fn().mockResolvedValue(nativeCourse),
      findByPublicId: vi.fn(), findBySlug: vi.fn(), updateStatus: vi.fn(), updateImportLink: vi.fn(),
      listByStatus: vi.fn(), list: vi.fn(), listPublished: vi.fn(),
    };
    curriculumRepo = {
      createModule: vi.fn(), updateModule: vi.fn(), deleteModule: vi.fn(), reorderModules: vi.fn(), listModulesByCourseId: vi.fn(),
      createLesson: vi.fn(), updateLesson: vi.fn(), deleteLesson: vi.fn(), reorderLessons: vi.fn(), listLessonsByModuleId: vi.fn(),
      attachAssetToLesson: vi.fn(), listAssetsByLessonId: vi.fn(), detachAssetFromLesson: vi.fn(),
      createQuiz: vi.fn(), updateQuiz: vi.fn(), deleteQuiz: vi.fn(), listQuizzesByCourseId: vi.fn(),
      createQuestionBank: vi.fn(), updateQuestionBank: vi.fn(), deleteQuestionBank: vi.fn(),
      createQuestion: vi.fn(), updateQuestion: vi.fn(), deleteQuestion: vi.fn(), listQuestionsByQuizId: vi.fn(),
      getCurriculumSnapshot: vi.fn().mockResolvedValue({
        modules: [],
        lessons: [
          { id: 'lesson-1', courseId: 'course-1', moduleId: 'm1', lessonType: CourseLessonType.VIDEO, status: 'PUBLISHED' },
          { id: 'lesson-2', courseId: 'course-1', moduleId: 'm1', lessonType: CourseLessonType.ARTICLE, status: 'PUBLISHED' },
        ],
        assets: [], quizzes: [], questionBanks: [], questions: [],
      }),
    } as any;
    progressRepo = {
      enroll: vi.fn(),
      enrollWithCapacity: vi.fn().mockResolvedValue({ id: 'enrollment-1', status: CourseEnrollmentStatus.ACTIVE, progressPercentage: 0, enrolledAt: new Date() }),
      findEnrollment: vi.fn().mockResolvedValue({ id: 'enrollment-1', status: CourseEnrollmentStatus.ACTIVE, progressPercentage: 100, enrolledAt: new Date() }),
      countActiveEnrollments: vi.fn().mockResolvedValue(1), updateEnrollmentProgress: vi.fn(), markEnrollmentCompleted: vi.fn(),
      upsertLessonProgress: vi.fn(), listLessonProgress: vi.fn().mockResolvedValue([
        { lessonId: 'lesson-1', status: CourseProgressStatus.COMPLETED }, { lessonId: 'lesson-2', status: CourseProgressStatus.COMPLETED },
      ]),
      createQuizAttempt: vi.fn().mockResolvedValue({ id: 'attempt-1' }), findQuizAttempt: vi.fn(), countQuizAttempts: vi.fn().mockResolvedValue(0),
      submitQuizAttempt: vi.fn(), listQuizAttempts: vi.fn().mockResolvedValue([]),
      completeCourse: vi.fn().mockResolvedValue({ id: 'completion-1' }), findCompletion: vi.fn(),
      getStudentProgressSnapshot: vi.fn().mockResolvedValue({ enrollment: { id: 'enrollment-1', status: CourseEnrollmentStatus.ACTIVE, progressPercentage: 100 }, lessons: [], quizAttempts: [], completion: null }),
      withTransaction: vi.fn().mockReturnThis(),
    } as any;
    useCases = new CourseProgressUseCases(courseRepo, curriculumRepo, progressRepo, undefined, undefined, atomic);
  });

  it('enrolls only through guarded capacity enrollment', async () => {
    (progressRepo.findEnrollment as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await useCases.enroll('course-1', 'student-1');
    expect(progressRepo.enrollWithCapacity).toHaveBeenCalledWith({ courseId: 'course-1', studentReferenceId: 'student-1' }, null, false);
  });

  it('rejects foreign lesson progress', async () => {
    await expect(useCases.markLessonProgress({ courseId: 'course-1', lessonId: 'foreign', studentReferenceId: 'student-1', status: CourseProgressStatus.IN_PROGRESS, progressPercentage: 100 }))
      .rejects.toThrow('COURSE_LESSON_SCOPE_MISMATCH');
  });


  it('returns an enrolled learner workspace without answer keys or internal asset handles', async () => {
    (curriculumRepo.getCurriculumSnapshot as any).mockResolvedValue({
      modules: [{ id: 'm1', courseId: 'course-1', title: 'Module', position: 1, status: 'PUBLISHED' }],
      lessons: [{ id: 'lesson-1', courseId: 'course-1', moduleId: 'm1', title: 'Lesson', lessonType: CourseLessonType.ARTICLE, position: 1, status: 'PUBLISHED' }],
      assets: [{ id: 'la-1', lessonId: 'lesson-1', assetId: 'asset-secret-handle', assetReference: 'internal-ref', title: 'ملف', assetType: 'DOCUMENT', position: 1, isRequired: true, metadata: { private: 'value' } }],
      quizzes: [{ id: 'quiz-1', courseId: 'course-1', moduleId: 'm1', title: 'Quiz', position: 1, passingScore: 70, status: 'PUBLISHED' }],
      questionBanks: [],
      questions: [{ id: 'q1', courseId: 'course-1', quizId: 'quiz-1', questionType: CourseQuestionType.MULTIPLE_CHOICE, prompt: 'Question?', choices: ['A', 'B'], correctAnswer: 'A', explanation: 'secret explanation', points: 1, position: 1, status: 'PUBLISHED' }],
    });

    const result = await useCases.getLearningWorkspace('course-1', 'student-1');
    expect(result.curriculum.questions[0]).toEqual(expect.objectContaining({ id: 'q1', prompt: 'Question?' }));
    expect(result.curriculum.questions[0]).not.toHaveProperty('correctAnswer');
    expect(result.curriculum.questions[0]).not.toHaveProperty('explanation');
    expect(result.curriculum.assets[0]).not.toHaveProperty('assetId');
    expect(result.curriculum.assets[0]).not.toHaveProperty('assetReference');
    expect(result.curriculum.assets[0]).not.toHaveProperty('metadata');
  });

  it('completes and emits through one atomic boundary', async () => {
    await useCases.completeCourse('course-1', 'student-1');
    expect(atomic.execute).toHaveBeenCalledWith(expect.objectContaining({ outbox: expect.objectContaining({ eventType: 'CourseCompleted' }) }), expect.any(Function));
    expect(progressRepo.completeCourse).toHaveBeenCalledWith(expect.objectContaining({ courseVersion: 3, status: CourseCompletionStatus.CERTIFICATE_SIGNAL_READY }));
    expect(progressRepo.markEnrollmentCompleted).toHaveBeenCalled();
  });
});
