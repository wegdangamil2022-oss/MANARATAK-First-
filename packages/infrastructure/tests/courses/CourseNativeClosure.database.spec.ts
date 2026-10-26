import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  CourseQuestionType,
  CourseLessonType,
  CourseStatus,
  type AtomicPersistenceContext,
} from '@manaratak/domain';
import { NativeCourseUseCases } from '../../../application/src/courses/use-cases/NativeCourseUseCases';
import { CourseCurriculumUseCases } from '../../../application/src/courses/use-cases/CourseCurriculumUseCases';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';
import { PrismaCourseCurriculumRepository } from '../../src/courses/PrismaCourseCurriculumRepository';
import { PrismaCourseProgressRepository } from '../../src/courses/PrismaCourseProgressRepository';
import { CourseProgressUseCases } from '../../../application/src/courses/use-cases/CourseProgressUseCases';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';

describe('native copy and advanced authoring on attested DB-T', () => {
  let db: PrismaClient, courses: PrismaCourseRepository, repo: PrismaCourseCurriculumRepository;
  const prefix = 'native-closure-' + randomUUID(),
    ids: string[] = [];
  let moduleId: string, lessonId: string;
  const command = <T>(
    fn: (owner: PrismaCourseRepository, curriculum: PrismaCourseCurriculumRepository) => Promise<T>,
  ) =>
    db.$transaction(
      (tx) => {
        const context = { boundaryId: prefix, transactionClient: tx } as AtomicPersistenceContext;
        return fn(
          courses.withTransaction(context) as PrismaCourseRepository,
          repo.withTransaction(context) as PrismaCourseCurriculumRepository,
        );
      },
      { timeout: 20000 },
    );
  beforeAll(async () => {
    if (
      process.env.COURSES_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_NATIVE_CLOSURE_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(
      contract,
      [{ label: 'DB-T', url: process.env.DATABASE_URL }],
      process.env,
      contract.sourceSha,
      readDatabaseIdentity,
      { requireValidatedCatalog: true },
    );
    db = new PrismaClient();
    courses = new PrismaCourseRepository(db);
    repo = new PrismaCourseCurriculumRepository(db);
    const source = await new NativeCourseUseCases(courses, repo).create({ titleAr: prefix });
    ids.push(source.id);
    moduleId = (
      await repo.createModule({ courseId: source.id, title: 'الوحدة الأصلية', position: 1 })
    ).id;
    lessonId = (
      await repo.createLesson({
        courseId: source.id,
        moduleId,
        title: 'محاضرة أصلية',
        position: 1,
        lessonType: CourseLessonType.MIXED,
        contentText: 'نص قديم ' + '😀'.repeat(25001),
      })
    ).id;
    const quiz = await repo.createQuiz({
      courseId: source.id,
      moduleId,
      lessonId,
      title: 'اختبار أصلي',
      position: 1,
      maxAttempts: null,
      passingScore: 0,
    });
    const bank = await repo.createQuestionBank({ courseId: source.id, title: 'بنك أصلي' });
    for (const [index, type] of Object.values(CourseQuestionType).entries())
      await repo.createQuestion({
        courseId: source.id,
        quizId: quiz.id,
        questionBankId: bank.id,
        questionType: type,
        prompt: 'السؤال ' + type,
        position: index + 1,
        choices: type === 'MULTIPLE_CHOICE' ? ['A', 'B'] : undefined,
        correctAnswer: type === 'MULTIPLE_CHOICE' ? 'A' : type === 'TRUE_FALSE' ? false : undefined,
        points: 2,
      });
    await repo.replaceLessonBlocks!(source.id, lessonId, [
      { id: randomUUID(), type: 'TEXT', payload: { text: 'نص منظم' } },
      { id: randomUUID(), type: 'QUIZ', payload: {}, quizId: quiz.id },
    ]);
    await db.courseEnrollment.create({
      data: { courseId: source.id, studentReferenceId: prefix + '-PRIVATE', status: 'ACTIVE' },
    });
    await courses.update(source.id, {
      certificateAvailable: true,
      optionalFields: {
        description: 'وصف أصلي',
        instructor: 'اسم مدرب فقط',
        learningOutcomes: ['نتيجة'],
        certificateTemplateId: 'DO_NOT_COPY',
        financeProductId: 'DO_NOT_COPY',
        instructorIdentityIds: ['DO_NOT_COPY'],
      },
    });
  });
  afterAll(async () => {
    if (!db) return;
    await db.courseEnrollment.deleteMany({ where: { courseId: { in: ids } } });
    await db.courseQuestionVersion.deleteMany({ where: { question: { courseId: { in: ids } } } });
    await db.course.deleteMany({ where: { id: { in: ids }, displayName: { startsWith: prefix } } });
    await db.$disconnect();
  });
  it('copies a published course to a new draft with remapped IDs and no learner, finance, issuer or role inheritance', async () => {
    await courses.update(ids[0], { status: CourseStatus.PUBLISHED });
    const original = (await courses.findById(ids[0]))!;
    const copy = await command(async (owner, curriculum) => {
      await owner.assertCurrentVersion!(original.id, original.version);
      return new NativeCourseUseCases(owner, curriculum).duplicate(original.id, {
        titleAr: prefix + '-copy',
        includeAssets: false,
        acknowledgeAssetRights: false,
      });
    });
    ids.push(copy.id);
    expect(copy.status).toBe('DRAFT');
    expect(copy.certificateAvailable).toBe(false);
    expect(copy.optionalFields).not.toHaveProperty('certificateTemplateId');
    expect(copy.optionalFields).not.toHaveProperty('financeProductId');
    expect(copy.optionalFields).not.toHaveProperty('instructorIdentityIds');
    expect(await db.courseEnrollment.count({ where: { courseId: copy.id } })).toBe(0);
    expect((await courses.findById(original.id))?.version).toBe(original.version);
    const source = await repo.getCurriculumSnapshot(original.id),
      target = await repo.getCurriculumSnapshot(copy.id);
    expect(target.lessons).toHaveLength(1);
    expect(target.questions).toHaveLength(4);
    expect(target.questionBanks).toHaveLength(1);
    expect(target.quizzes[0].maxAttempts).toBeNull();
    expect(target.quizzes[0].passingScore).toBe(0);
    const oldIds = new Set(
      [
        ...source.modules,
        ...source.lessons,
        ...source.quizzes,
        ...source.questions,
        ...source.questionBanks,
        ...source.contentBlocks!,
      ].map((row) => row.id),
    );
    expect(
      [
        ...target.modules,
        ...target.lessons,
        ...target.quizzes,
        ...target.questions,
        ...target.questionBanks,
        ...target.contentBlocks!,
      ].some((row) => oldIds.has(row.id)),
    ).toBe(false);
    expect(target.contentBlocks!.find((row) => row.type === 'QUIZ')!.quizId).toBe(
      target.quizzes[0].id,
    );
    expect(
      target.questions.every(
        (row) =>
          row.quizId === target.quizzes[0].id && row.questionBankId === target.questionBanks[0].id,
      ),
    ).toBe(true);
  });
  it('rolls back the new course and every copied child on failure', async () => {
    const before = await db.course.count({ where: { displayName: { startsWith: prefix } } });
    await expect(
      command(async (owner, curriculum) => {
        await new NativeCourseUseCases(owner, curriculum).duplicate(ids[0], {
          titleAr: prefix + '-rollback',
          includeAssets: false,
          acknowledgeAssetRights: false,
        });
        throw Error('EXPECTED_COPY_ROLLBACK');
      }),
    ).rejects.toThrow('EXPECTED_COPY_ROLLBACK');
    expect(await db.course.count({ where: { displayName: { startsWith: prefix } } })).toBe(before);
  });
  it('copies a module/lecture and their content without crossing course boundaries', async () => {
    const id = ids[1],
      original = await repo.getCurriculumSnapshot(id);
    const moduleCopy = await command(async (owner, curriculum) =>
      new CourseCurriculumUseCases(owner, curriculum).duplicateContent(id, {
        moduleId: original.modules[0].id,
        includeAssets: false,
        acknowledgeAssetRights: false,
      }),
    );
    expect(moduleCopy.lessons).toBe(1);
    expect(moduleCopy.questions).toBe(4);
    const lectureCopy = await command(async (owner, curriculum) =>
      new CourseCurriculumUseCases(owner, curriculum).duplicateContent(id, {
        lessonId: original.lessons[0].id,
        includeAssets: false,
        acknowledgeAssetRights: false,
      }),
    );
    expect(lectureCopy.modules).toBe(0);
    expect(lectureCopy.lessons).toBe(1);
    await expect(
      command(async (owner, curriculum) =>
        new CourseCurriculumUseCases(owner, curriculum).duplicateContent(id, {
          lessonId,
          includeAssets: false,
          acknowledgeAssetRights: false,
        }),
      ),
    ).rejects.toThrow('SCOPE_INVALID');
    expect((await repo.getCurriculumSnapshot(id)).lessons).toHaveLength(3);
  });
  it('converts legacy text/emoji losslessly once and persists all assessment types and nullable keys', async () => {
    const id = ids[1],
      initial = (await repo.getCurriculumSnapshot(id)).lessons[0];
    await command(async (owner, curriculum) =>
        new CourseCurriculumUseCases(owner, curriculum).convertLegacyLessonText(id, initial.id),
      );
    const current = await repo.getCurriculumSnapshot(id),
      blocks = current
        .contentBlocks!.filter((row) => row.lessonId === initial.id && row.type === 'TEXT')
        .sort((a, b) => a.position - b.position);
    expect(current.lessons.find((row) => row.id === initial.id)!.contentText).toBeNull();
    expect(
      blocks
        .slice(0, 2)
        .map((row) => row.payload.text)
        .join(''),
    ).toBe(initial.contentText);
    await expect(
      command(async (owner, curriculum) =>
        new CourseCurriculumUseCases(owner, curriculum).convertLegacyLessonText(id, initial.id),
      ),
    ).rejects.toThrow('LEGACY_TEXT_EMPTY');
    await command(async (owner, curriculum) => {
      const uc = new CourseCurriculumUseCases(owner, curriculum),
        quiz = await uc.createQuiz({
          courseId: id,
          moduleId: current.modules[0].id,
          title: 'واجب الوحدة',
          assessmentType: 'ASSIGNMENT',
          position: 100,
          maxAttempts: null,
        });
      const question = await uc.createQuestion({
        courseId: id,
        quizId: quiz.id,
        questionType: CourseQuestionType.TRUE_FALSE,
        prompt: 'أعد تقييم العبارة',
        correctAnswer: false,
        position: 1,
      });
      await uc.updateQuestion(id, question.id, {
        questionType: CourseQuestionType.ESSAY,
        correctAnswer: null,
        choices: null,
      });
      await uc.updateQuiz(id, quiz.id, { moduleId: null, lessonId: null });
    });
    const final = await repo.getCurriculumSnapshot(id),
      assignment = final.quizzes.find((row) => row.title === 'واجب الوحدة')!;
    expect(assignment.assessmentType).toBe('ASSIGNMENT');
    expect(assignment.moduleId).toBeNull();
    expect(assignment.maxAttempts).toBeNull();
    expect(final.questions.find((row) => row.quizId === assignment.id)!.correctAnswer).toBeNull();
  });
  it('freezes release policy for enrolled learners and atomically saves resume without losing other enrollment metadata', async () => {
    const id = ids[1],
      snapshot = await repo.getCurriculumSnapshot(id),
      first = snapshot.lessons[0].id;
    await command(async (owner, curriculum) =>
      new CourseCurriculumUseCases(owner, curriculum).setDeliveryPolicy(id, {
        version: 1,
        sequence: 'FREE',
        lessons: { [first]: { preview: false, availableAt: '2099-01-01T00:00:00Z' } },
      }),
    );
    await courses.updateStatus(id, CourseStatus.PUBLISHED);
    const published = (await courses.findById(id))!;
    const student = prefix + '-resume';
    const enrollment = await db.courseEnrollment.create({
      data: {
        courseId: id,
        studentReferenceId: student,
        status: 'ACTIVE',
        metadata: {
          courseVersion: published.version,
          financialEvidence: 'preserve',
          preferences: { captions: true },
        },
      },
    });
    await courses.updateStatus(id, CourseStatus.DRAFT);
    await command(async (owner, curriculum) =>
      new CourseCurriculumUseCases(owner, curriculum).setDeliveryPolicy(id, {
        version: 1,
        sequence: 'FREE',
        lessons: {},
      }),
    );
    const progress = new PrismaCourseProgressRepository(db),
      learning = new CourseProgressUseCases(courses, repo, progress);
    const workspace = await learning.getLearningWorkspace(id, student);
    expect(workspace.course.version).toBe(published.version);
    expect(workspace.curriculum.lessons.find((row) => row.id === first)).toMatchObject({
      locked: true,
      contentText: null,
    });
    await expect(learning.saveResumeLesson(id, student, first)).rejects.toThrow(
      'COURSE_LESSON_LOCKED',
    );
    const available = workspace.curriculum.lessons.find((row) => !row.locked)!;
    expect(available).toBeTruthy();
    await learning.saveResumeLesson(id, student, available.id);
    const stored = await db.courseEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } });
    expect(stored.progressPercentage).toBe(0);
    expect(stored.metadata).toMatchObject({
      courseVersion: published.version,
      financialEvidence: 'preserve',
      preferences: { captions: true },
      resume: { lessonId: available.id },
    });
    await expect(
      progress.saveResumeLesson(id, student, published.version + 1, available.id),
    ).rejects.toThrow('CONFLICT');
    await expect(
      progress.saveResumeLesson(id, prefix + '-foreign', published.version, available.id),
    ).rejects.toThrow('CONFLICT');
  });
});
