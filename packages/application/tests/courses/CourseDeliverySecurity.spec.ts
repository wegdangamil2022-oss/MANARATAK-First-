import { describe, it, expect, vi } from 'vitest';
import { CourseProgressUseCases } from '../../src/courses/use-cases/CourseProgressUseCases';
import { PublicCourseUseCases } from '../../src/courses/use-cases/PublicCourseUseCases';
const first = '11111111-1111-4111-8111-111111111111',
  second = '22222222-2222-4222-8222-222222222222';
function fixture() {
  const policy = {
    version: 1,
    sequence: 'SEQUENTIAL',
    lessons: {
      [first]: { preview: true, availableAt: null },
      [second]: { preview: true, availableAt: '2099-01-01T00:00:00Z' },
    },
  };
  const course = {
    id: 'c',
    slug: 'course',
    version: 4,
    displayName: 'Course',
    status: 'PUBLISHED',
    originType: 'NATIVE_MANARATAK_COURSE',
    completenessStatus: 'COMPLETE',
    optionalFields: { deliveryPolicy: policy },
  };
  const curriculum = {
    modules: [{ id: 'm', position: 1, status: 'PUBLISHED', title: 'Module' }],
    lessons: [
      {
        id: first,
        moduleId: 'm',
        title: 'First',
        position: 1,
        contentText: 'Public text',
        status: 'PUBLISHED',
      },
      {
        id: second,
        moduleId: 'm',
        title: 'Future',
        position: 2,
        contentText: 'DO NOT LEAK',
        status: 'PUBLISHED',
      },
    ],
    assets: [{ id: 'a', lessonId: second, assetId: 'secret-eap', position: 1 }],
    quizzes: [{ id: 'q', lessonId: second, status: 'PUBLISHED', position: 1 }],
    questions: [{ id: 'answer-key', quizId: 'q', correctAnswer: 'secret' }],
    questionBanks: [],
    contentBlocks: [
      { id: 'b', lessonId: second, type: 'TEXT', payload: { text: 'secret block' }, position: 1 },
    ],
  };
  const courses = {
    findById: vi.fn().mockResolvedValue(course),
    findPublishedBySlug: vi.fn().mockResolvedValue(course),
  };
  const curr = {
    getLearningVersion: vi.fn().mockResolvedValue({ course, curriculum }),
    getCurriculumSnapshot: vi.fn().mockResolvedValue(curriculum),
  };
  const enrollment = {
    id: 'e',
    studentReferenceId: 'student',
    status: 'ACTIVE',
    metadata: { courseVersion: 4, resume: { lessonId: second } },
    enrolledAt: new Date(),
    progressPercentage: 0,
  };
  const progress = {
    findEnrollment: vi.fn().mockResolvedValue(enrollment),
    listLessonProgress: vi.fn().mockResolvedValue([]),
    listQuizAttempts: vi.fn().mockResolvedValue([]),
    saveResumeLesson: vi.fn(),
    createQuizAttempt: vi.fn(),
    getStudentProgressSnapshot: vi
      .fn()
      .mockResolvedValue({ enrollment, lessons: [], quizAttempts: [], completion: null }),
  };
  const learner = new CourseProgressUseCases(courses as never, curr as never, progress as never);
  return { policy, course, curriculum, courses, curr, progress, learner };
}
describe('frozen course delivery security', () => {
  it('redacts text, blocks, assets, questions and quiz metadata of locked lectures', async () => {
    const f = fixture(),
      result = await f.learner.getLearningWorkspace('c', 'student');
    expect(result.curriculum.lessons[1]).toMatchObject({
      locked: true,
      contentText: null,
      lockReason: 'SCHEDULED',
    });
    expect(result.curriculum.assets).toEqual([]);
    expect(result.curriculum.contentBlocks).toEqual([]);
    expect(result.curriculum.quizzes).toEqual([]);
    expect(result.curriculum.questions).toEqual([]);
    expect(result.resumeLessonId).toBe(first);
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(f.curr.getLearningVersion).toHaveBeenCalledWith('c', 4, expect.any(Date));
  });
  it('denies direct asset and quiz requests before release', async () => {
    const f = fixture();
    await expect(f.learner.resolveLearningAsset('c', second, 'a', 'student')).rejects.toThrow(
      'COURSE_LESSON_LOCKED',
    );
    await expect(
      f.learner.startQuizAttempt({ courseId: 'c', studentReferenceId: 'student', quizId: 'q' }),
    ).rejects.toThrow('COURSE_LESSON_LOCKED');
    expect(f.progress.createQuizAttempt).not.toHaveBeenCalled();
  });
  it('does not accept progress or resume writes for locked lectures', async () => {
    const f = fixture();
    await expect(
      f.learner.markLessonProgress({
        courseId: 'c',
        studentReferenceId: 'student',
        lessonId: second,
        status: 'COMPLETED',
        progressPercentage: 100,
      } as never),
    ).rejects.toThrow('COURSE_LESSON_LOCKED');
    await expect(f.learner.saveResumeLesson('c', 'student', second)).rejects.toThrow(
      'COURSE_LESSON_LOCKED',
    );
    expect(f.progress.saveResumeLesson).not.toHaveBeenCalled();
  });
  it('saves resume only against the enrolled published version, without altering progress', async () => {
    const f = fixture();
    await f.learner.saveResumeLesson('c', 'student', first);
    expect(f.progress.saveResumeLesson).toHaveBeenCalledWith('c', 'student', 4, first);
  });
  it('denies nonmembers and does not read their frozen curriculum', async () => {
    const f = fixture();
    f.progress.findEnrollment.mockResolvedValue(null);
    await expect(f.learner.saveResumeLesson('c', 'intruder', first)).rejects.toThrow(
      'COURSE_ENROLLMENT_REQUIRED',
    );
    expect(f.curr.getLearningVersion).not.toHaveBeenCalled();
  });
  it('exposes only released explicit previews, never quizzes, keys or EAP identifiers', async () => {
    const f = fixture();
    const publicApi = new PublicCourseUseCases(f.courses as never, f.curr as never),
      result = await publicApi.preview('course');
    expect(result.curriculum.lessons[0].contentText).toBe('Public text');
    expect(result.curriculum.lessons[1]).toMatchObject({
      previewAvailable: false,
      contentText: null,
    });
    expect(JSON.stringify(result)).not.toContain('secret');
    await expect(publicApi.resolvePreviewAsset('course', second, 'a')).rejects.toThrow(
      'Course preview not found',
    );
  });
  it('returns no draft preview even when the repository returns a draft', async () => {
    const f = fixture();
    f.course.status = 'DRAFT';
    await expect(
      new PublicCourseUseCases(f.courses as never, f.curr as never).preview('course'),
    ).rejects.toThrow('Course not found');
  });
  it('requires an explicit preview flag and honors independent free lesson ordering', async () => {
    const f = fixture();
    f.policy.sequence = 'FREE';
    f.policy.lessons[second].availableAt = null as unknown as string;
    f.policy.lessons[second].preview = false;
    const result = await new PublicCourseUseCases(f.courses as never, f.curr as never).preview(
      'course',
    );
    expect(result.curriculum.lessons[1].contentText).toBeNull();
    await f.learner.saveResumeLesson('c', 'student', second);
    expect(f.progress.saveResumeLesson).toHaveBeenCalled();
  });
});
