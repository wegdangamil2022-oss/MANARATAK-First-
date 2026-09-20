import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  CourseAccessType,
  CourseLessonType,
  CourseStatus,
  LessonAssetType,
} from '@manaratak/domain';
import { CourseAdminRouter } from '../../../../src/presentation/api/router/CourseAdminRouter';

describe('CourseAdminRouter', () => {
  const createMockUseCases = () => ({
    listCourses: vi.fn(),
    getCourse: vi.fn(),
    updateCourse: vi.fn(),
    markReadyToReview: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    reject: vi.fn(),
    archive: vi.fn(),
  });

  const createMockNativeUseCases = () => ({
    create: vi.fn(),
    getReadiness: vi.fn(),
    markReadyToReview: vi.fn(),
    markReadyToPublish: vi.fn(),
    publish: vi.fn(),
  });

  const createMockRelationshipService = () => ({
    getReviewModel: vi.fn(),
    analyzeCourse: vi.fn(),
    approveTaxonomyLink: vi.fn(),
    rejectTaxonomyLink: vi.fn(),
    approveLanguageReference: vi.fn(),
    projectMajors: vi.fn(),
    approveMajorProjection: vi.fn(),
    rejectMajorProjection: vi.fn(),
  });

  const createMockCurriculumUseCases = () => ({
    createModule: vi.fn(),
    updateModule: vi.fn(),
    deleteModule: vi.fn(),
    reorderModules: vi.fn(),
    listModules: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
    deleteLesson: vi.fn(),
    reorderLessons: vi.fn(),
    listLessons: vi.fn(),
    attachAssetToLesson: vi.fn(),
    detachAssetFromLesson: vi.fn(),
    listLessonAssets: vi.fn(),
    createQuiz: vi.fn(),
    updateQuiz: vi.fn(),
    deleteQuiz: vi.fn(),
    listQuizzes: vi.fn(),
    createQuestionBank: vi.fn(),
    updateQuestionBank: vi.fn(),
    deleteQuestionBank: vi.fn(),
    createQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    listQuizQuestions: vi.fn(),
    getCurriculumSnapshot: vi.fn(),
  });

  const createApp = (
    useCases: ReturnType<typeof createMockUseCases>,
    curriculumUseCases = createMockCurriculumUseCases(),
    nativeUseCases = createMockNativeUseCases(),
    relationshipService = createMockRelationshipService(),
  ) => {
    const app = express();
    app.use(express.json());
    app.use(
      '/admin/courses',
      CourseAdminRouter.create({
        adminCourseUseCases: useCases as any,
        courseCurriculumUseCases: curriculumUseCases as any,
        courseEnrollmentPolicyUseCases: {} as any,
        courseRelationshipResolutionService: relationshipService as any,
        learningPathUseCases: {} as any,
        nativeCourseUseCases: nativeUseCases as any,
      }),
    );
    return app;
  };

  it('GET /admin/courses calls listCourses with parsed filters', async () => {
    const useCases = createMockUseCases();
    useCases.listCourses.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      pageSize: 20,
      totalPages: 0,
    });
    const app = createApp(useCases);

    const res = await request(app).get(
      '/admin/courses?status=READY_TO_REVIEW&accessType=FREE_CERTIFICATE&platformName=Global%20Learning&page=2',
    );

    expect(res.status).toBe(200);
    expect(useCases.listCourses).toHaveBeenCalledWith({
      status: CourseStatus.READY_TO_REVIEW,
      accessType: CourseAccessType.FREE_CERTIFICATE,
      platformName: 'Global Learning',
      page: 2,
      pageSize: 20,
    });
  });

  it('PATCH /admin/courses/:id validates body and strips readonly fields', async () => {
    const useCases = createMockUseCases();
    useCases.updateCourse.mockResolvedValue({ id: 'course-1' });
    const app = createApp(useCases);

    const res = await request(app).patch('/admin/courses/course-1').send({
      id: 'injected',
      publicId: 'injected-public',
      displayName: 'Updated Course',
      directCourseUrl: 'https://example.org/course',
    });

    expect(res.status).toBe(200);
    expect(useCases.updateCourse).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({
        displayName: 'Updated Course',
        directCourseUrl: 'https://example.org/course',
      }),
    );
    expect(useCases.updateCourse).toHaveBeenCalledWith(
      'course-1',
      expect.not.objectContaining({
        id: 'injected',
        publicId: 'injected-public',
      }),
    );
  });

  it('POST /admin/courses/:id/publish calls publish', async () => {
    const useCases = createMockUseCases();
    useCases.getCourse.mockResolvedValue({ originType: 'EXTERNAL_LINKED_COURSE' });
    useCases.publish.mockResolvedValue(undefined);
    const app = createApp(useCases);

    const res = await request(app).post('/admin/courses/course-1/publish');

    expect(res.status).toBe(200);
    expect(useCases.publish).toHaveBeenCalledWith('course-1', expect.objectContaining({
      actorId: 'SYSTEM', actorType: 'IDENTITY', source: 'admin-course-api',
    }));
  });

  it('POST /admin/courses creates a persisted Native DRAFT', async () => {
    const useCases = createMockUseCases();
    const nativeUseCases = createMockNativeUseCases();
    nativeUseCases.create.mockResolvedValue({
      id: 'persisted-course',
      originType: 'NATIVE_MANARATAK_COURSE',
      status: 'DRAFT',
    });
    const app = createApp(useCases, createMockCurriculumUseCases(), nativeUseCases);

    const response = await request(app).post('/admin/courses').send({
      titleAr: 'دورة الذكاء الاصطناعي',
      titleEn: 'AI Course',
      learningLanguage: 'Arabic',
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe('persisted-course');
    expect(nativeUseCases.create).toHaveBeenCalledWith(
      expect.objectContaining({
        titleAr: 'دورة الذكاء الاصطناعي',
      }),
    );
  });

  it('uses server readiness and rejects an unready Native publish', async () => {
    const useCases = createMockUseCases();
    useCases.getCourse.mockResolvedValue({ originType: 'NATIVE_MANARATAK_COURSE' });
    const nativeUseCases = createMockNativeUseCases();
    nativeUseCases.getReadiness.mockResolvedValue({ ready: false, percentage: 25, checks: [] });
    nativeUseCases.publish.mockRejectedValue(new Error('NATIVE_COURSE_NOT_READY'));
    const app = createApp(useCases, createMockCurriculumUseCases(), nativeUseCases);

    const readiness = await request(app).get('/admin/courses/course-1/readiness');
    const publish = await request(app).post('/admin/courses/course-1/publish');

    expect(readiness.body.ready).toBe(false);
    expect(publish.status).toBe(400);
    expect(useCases.publish).not.toHaveBeenCalled();
  });

  it('GET /admin/courses/:id/curriculum returns curriculum snapshot', async () => {
    const useCases = createMockUseCases();
    const curriculumUseCases = createMockCurriculumUseCases();
    curriculumUseCases.getCurriculumSnapshot.mockResolvedValue({
      modules: [],
      lessons: [],
      assets: [],
      quizzes: [],
      questionBanks: [],
      questions: [],
    });
    const app = createApp(useCases, curriculumUseCases);

    const res = await request(app).get('/admin/courses/course-1/curriculum');

    expect(res.status).toBe(200);
    expect(curriculumUseCases.getCurriculumSnapshot).toHaveBeenCalledWith('course-1');
  });

  it('exposes a course-owner-scoped relationship review model', async () => {
    const useCases = createMockUseCases();
    const relationshipService = createMockRelationshipService();
    relationshipService.getReviewModel.mockResolvedValue({
      courseId: 'course-1',
      taxonomyLinks: [],
      majorProjections: [],
      closure: { languageCanonical: true, approvedTaxonomyLinks: 0, approvedMajorProjections: 0, reviewRequired: false },
    });
    const app = createApp(useCases, createMockCurriculumUseCases(), createMockNativeUseCases(), relationshipService);

    const res = await request(app).get('/admin/courses/course-1/relationships');

    expect(res.status).toBe(200);
    expect(res.body.courseId).toBe('course-1');
    expect(relationshipService.getReviewModel).toHaveBeenCalledWith('course-1');
  });

  it('scopes taxonomy and Major relationship approvals to the course owner id', async () => {
    const useCases = createMockUseCases();
    const relationshipService = createMockRelationshipService();
    relationshipService.approveTaxonomyLink.mockResolvedValue({ id: 'link-1', reviewState: 'APPROVED' });
    relationshipService.approveMajorProjection.mockResolvedValue({ id: 'projection-1', projectionState: 'APPROVED' });
    const app = createApp(useCases, createMockCurriculumUseCases(), createMockNativeUseCases(), relationshipService);

    const taxonomy = await request(app).post('/admin/courses/course-1/relationships/taxonomy/link-1/approve');
    const major = await request(app).post('/admin/courses/course-1/relationships/majors/projection-1/approve');

    expect(taxonomy.status).toBe(200);
    expect(major.status).toBe(200);
    expect(relationshipService.approveTaxonomyLink).toHaveBeenCalledWith('course-1', 'link-1', 'SYSTEM');
    expect(relationshipService.approveMajorProjection).toHaveBeenCalledWith('course-1', 'projection-1', 'SYSTEM');
  });

  it('POST /admin/courses/:id/modules creates course modules', async () => {
    const useCases = createMockUseCases();
    const curriculumUseCases = createMockCurriculumUseCases();
    curriculumUseCases.createModule.mockResolvedValue({ id: 'module-1' });
    const app = createApp(useCases, curriculumUseCases);

    const res = await request(app)
      .post('/admin/courses/course-1/modules')
      .send({ title: 'Getting Started', position: 1 });

    expect(res.status).toBe(201);
    expect(curriculumUseCases.createModule).toHaveBeenCalledWith({
      courseId: 'course-1',
      title: 'Getting Started',
      description: undefined,
      position: 1,
      status: undefined,
    });
  });

  it('POST /admin/courses/:id/modules/:moduleId/lessons creates lessons', async () => {
    const useCases = createMockUseCases();
    const curriculumUseCases = createMockCurriculumUseCases();
    curriculumUseCases.createLesson.mockResolvedValue({ id: 'lesson-1' });
    const app = createApp(useCases, curriculumUseCases);

    const res = await request(app).post('/admin/courses/course-1/modules/module-1/lessons').send({
      title: 'Welcome',
      lessonType: CourseLessonType.VIDEO,
      position: 1,
      estimatedDurationMinutes: 10,
    });

    expect(res.status).toBe(201);
    expect(curriculumUseCases.createLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 'course-1',
        moduleId: 'module-1',
        title: 'Welcome',
        lessonType: CourseLessonType.VIDEO,
      }),
    );
  });

  it('POST /admin/courses/:id/lessons/:lessonId/assets rejects raw URLs', async () => {
    const useCases = createMockUseCases();
    const curriculumUseCases = createMockCurriculumUseCases();
    const app = createApp(useCases, curriculumUseCases);

    const res = await request(app).post('/admin/courses/course-1/lessons/lesson-1/assets').send({
      assetId: 'https://cdn.example.com/video.mp4',
      assetType: LessonAssetType.VIDEO,
      position: 1,
    });

    expect(res.status).toBe(400);
    expect(curriculumUseCases.attachAssetToLesson).not.toHaveBeenCalled();
  });

  it('POST /admin/courses/:id/quizzes and questions create assessments', async () => {
    const useCases = createMockUseCases();
    const curriculumUseCases = createMockCurriculumUseCases();
    curriculumUseCases.createQuiz.mockResolvedValue({ id: 'quiz-1' });
    curriculumUseCases.createQuestion.mockResolvedValue({ id: 'question-1' });
    const app = createApp(useCases, curriculumUseCases);

    const quizRes = await request(app)
      .post('/admin/courses/course-1/quizzes')
      .send({ title: 'Final Quiz', position: 1, passingScore: 70 });

    const questionRes = await request(app)
      .post('/admin/courses/course-1/questions')
      .send({
        quizId: 'quiz-1',
        questionType: 'MULTIPLE_CHOICE',
        prompt: 'What is MANARATAK?',
        choices: ['A', 'B'],
        correctAnswer: 'A',
        position: 1,
      });

    expect(quizRes.status).toBe(201);
    expect(questionRes.status).toBe(201);
    expect(curriculumUseCases.createQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: 'course-1' }),
    );
    expect(curriculumUseCases.createQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: 'course-1', quizId: 'quiz-1' }),
    );
  });

  it('returns 400 on use case errors', async () => {
    const useCases = createMockUseCases();
    useCases.getCourse.mockResolvedValue({ originType: 'EXTERNAL_LINKED_COURSE' });
    useCases.publish.mockRejectedValue(new Error('Only READY_TO_PUBLISH courses can be PUBLISHED'));
    const app = createApp(useCases);

    const res = await request(app).post('/admin/courses/course-1/publish');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Only READY_TO_PUBLISH courses can be PUBLISHED' });
  });
});
