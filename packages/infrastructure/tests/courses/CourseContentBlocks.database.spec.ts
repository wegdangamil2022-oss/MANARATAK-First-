import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  CourseStatus,
  type CourseContentBlockInput,
  type AtomicPersistenceContext,
} from '@manaratak/domain';
import { CourseCurriculumUseCases } from '../../../application/src/courses/use-cases/CourseCurriculumUseCases';
import { CourseProgressUseCases } from '../../../application/src/courses/use-cases/CourseProgressUseCases';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';
import { PrismaCourseCurriculumRepository } from '../../src/courses/PrismaCourseCurriculumRepository';
import { PrismaCourseProgressRepository } from '../../src/courses/PrismaCourseProgressRepository';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
describe('native content blocks and private learner reads on isolated PostgreSQL', () => {
  let db: PrismaClient,
    courses: PrismaCourseRepository,
    curriculum: PrismaCourseCurriculumRepository;
  let publishedVersion = 0;
  const prefix = 'native-blocks-' + randomUUID(),
    ids = [randomUUID(), randomUUID()],
    lessonIds = [randomUUID(), randomUUID()];
  const blocks: CourseContentBlockInput[] = [
    {
      id: randomUUID(),
      type: 'TEXT',
      payload: { text: 'نص أصلي <script>not executable</script>' },
    },
    {
      id: randomUUID(),
      type: 'TABLE',
      payload: {
        rows: [
          ['العنوان', 'القيمة'],
          ['سجل', '10'],
        ],
      },
    },
    { id: randomUUID(), type: 'CODE', payload: { text: 'console.log("safe")', language: 'js' } },
  ];
  const replace = async (input: CourseContentBlockInput[], expected: number, rollback = false) =>
    db.$transaction(async (tx) => {
      const context = { boundaryId: prefix, transactionClient: tx } as AtomicPersistenceContext;
      const owner = courses.withTransaction(context);
      await owner.assertCurrentVersion!(ids[0], expected);
      const uc = new CourseCurriculumUseCases(owner, curriculum.withTransaction(context));
      const result = await uc.replaceLessonBlocks(ids[0], lessonIds[0], input);
      if (rollback) throw Error('EXPECTED_ROLLBACK');
      return result;
    });
  beforeAll(async () => {
    if (
      process.env.COURSES_ADMIN_DATABASE_TESTS !== 'YES' ||
      process.env.NODE_ENV !== 'test' ||
      process.env.POST28_TARGET_LABEL !== 'DB-T' ||
      process.env.DATABASE_URL !== process.env.DIRECT_URL
    )
      throw Error('ISOLATED_CONTENT_BLOCK_TEST_AUTHORIZATION_REQUIRED');
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
    await db.$connect();
    courses = new PrismaCourseRepository(db);
    curriculum = new PrismaCourseCurriculumRepository(db);
    for (const [index, id] of ids.entries()) {
      await db.course.create({
        data: {
          id,
          publicId: prefix + id,
          slug: prefix + id,
          canonicalName: prefix,
          canonicalDedupKey: prefix + id,
          displayName: prefix,
          originType: 'NATIVE_MANARATAK_COURSE',
          accessType: 'FREE_STUDY',
          status: 'DRAFT',
          completenessStatus: 'NEEDS_REVIEW',
          directCourseUrl: '/isolated/' + id,
        },
      });
      const module = await db.courseModule.create({
        data: { courseId: id, title: 'Module', position: 1, status: 'READY_TO_REVIEW' },
      });
      await db.courseLesson.create({
        data: {
          id: lessonIds[index],
          courseId: id,
          moduleId: module.id,
          title: 'Lecture',
          lessonType: 'MIXED',
          position: 1,
          status: 'READY_TO_REVIEW',
        },
      });
    }
  });
  afterAll(async () => {
    if (!db) return;
    const where = { courseId: { in: ids } };
    await db.courseQuizAttempt.deleteMany({ where });
    await db.courseLessonProgress.deleteMany({ where });
    await db.courseCompletion.deleteMany({ where });
    await db.courseEnrollment.deleteMany({ where });
    await db.course.deleteMany({
      where: { id: { in: ids }, canonicalDedupKey: { startsWith: prefix } },
    });
    await db.$disconnect();
  });
  it('persists ordered blocks and atomically checkpoints the curriculum and course version', async () => {
    const saved = await replace(blocks, 1);
    expect(saved.map((block) => block.position)).toEqual([1, 2, 3]);
    expect((await courses.findById(ids[0]))?.version).toBe(2);
    const snapshot = (
      await db.courseVersion.findUniqueOrThrow({
        where: { courseId_versionNumber: { courseId: ids[0], versionNumber: 2 } },
      })
    ).snapshot as { contentBlocks: unknown[] };
    expect(snapshot.contentBlocks).toHaveLength(3);
    const reordered = await replace([blocks[2], blocks[0]], 2);
    expect(reordered.map((block) => block.id)).toEqual([blocks[2].id, blocks[0].id]);
    expect(
      await db.courseLessonContentBlock.count({ where: { courseId: ids[0], status: 'ARCHIVED' } }),
    ).toBe(1);
  });
  it('preserves immutable published blocks after unpublish and later edits', async () => {
    await courses.updateStatus(ids[0], CourseStatus.PUBLISHED);
    const published = (await courses.findById(ids[0]))!;
    publishedVersion = published.version;
    const before = await curriculum.getLearningVersion(ids[0], published.version, new Date());
    await expect(replace(blocks, published.version)).rejects.toThrow('MUTATION_FORBIDDEN');
    await courses.updateStatus(ids[0], CourseStatus.DRAFT);
    const draft = (await courses.findById(ids[0]))!;
    await replace([{ ...blocks[0], payload: { text: 'نسخة جديدة مختلفة' } }], draft.version);
    const historical = await curriculum.getLearningVersion(ids[0], published.version, new Date());
    expect(historical?.curriculum.contentBlocks).toEqual(before?.curriculum.contentBlocks);
    expect(
      historical?.curriculum.contentBlocks?.find((block) => block.id === blocks[0].id)?.payload
        .text,
    ).toContain('نص أصلي');
    const old = await db.courseVersion.create({
      data: {
        courseId: ids[1],
        versionNumber: 100,
        reason: 'LEGACY_PUBLISHED_FIXTURE',
        snapshot: {
          course: { ...(await courses.findById(ids[1]))!, version: 100, status: 'PUBLISHED' },
          modules: [],
          lessons: [],
          assets: [],
          quizzes: [],
          questionBanks: [],
          questions: [],
        },
      },
    });
    expect(
      (await curriculum.getLearningVersion(ids[1], old.versionNumber, new Date()))?.curriculum
        .contentBlocks,
    ).toEqual([]);
  });
  it('rejects duplicate IDs, foreign blocks/lesson/asset references and rolls back failed writes', async () => {
    const current = (await courses.findById(ids[0]))!;
    await expect(replace([blocks[0], blocks[0]], current.version)).rejects.toThrow('DUPLICATE');
    await db.courseLessonContentBlock.create({
      data: {
        id: blocks[1].id + '-foreign',
        courseId: ids[1],
        lessonId: lessonIds[1],
        type: 'TEXT',
        payload: { text: 'Other course' },
        position: 1,
      },
    });
    await expect(
      replace([{ ...blocks[0], id: blocks[1].id + '-foreign' }], current.version),
    ).rejects.toThrow('SCOPE_MISMATCH');
    await expect(
      replace(
        [
          {
            id: randomUUID(),
            type: 'VIDEO',
            payload: { title: 'Clip' },
            assetReferenceId: randomUUID(),
          },
        ],
        current.version,
      ),
    ).rejects.toThrow('ASSET_SCOPE_OR_TYPE');
    const before = await curriculum.getCurriculumSnapshot(ids[0]);
    await expect(
      replace([{ ...blocks[0], payload: { text: 'Must rollback' } }], current.version, true),
    ).rejects.toThrow('EXPECTED_ROLLBACK');
    expect((await courses.findById(ids[0]))?.version).toBe(current.version);
    expect((await curriculum.getCurriculumSnapshot(ids[0])).contentBlocks).toEqual(
      before.contentBlocks,
    );
    const other = await db.courseModule.findFirstOrThrow({ where: { courseId: ids[1] } });
    await expect(
      db.courseLessonContentBlock.create({
        data: {
          id: randomUUID(),
          courseId: ids[0],
          lessonId: lessonIds[1],
          type: 'TEXT',
          payload: { text: 'Cross parent' },
          position: 2,
        },
      }),
    ).rejects.toThrow();
    expect(other.courseId).toBe(ids[1]);
  });
  it('serializes concurrent versioned saves and accepts exactly one of two writers', async () => {
    const current = (await courses.findById(ids[0]))!;
    const results = await Promise.allSettled([
      replace([{ ...blocks[0], payload: { text: 'Writer A' } }], current.version),
      replace([{ ...blocks[0], payload: { text: 'Writer B' } }], current.version),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await courses.findById(ids[0]))?.version).toBe(current.version + 1);
  });
  it('returns bounded private learner reads, never personal identity, answers or metadata, and enforces course scope', async () => {
    const learner = prefix + '-private-student',
      enrollment = await db.courseEnrollment.create({
        data: {
          courseId: ids[0],
          studentReferenceId: learner,
          metadata: { courseVersion: publishedVersion, privateIdentity: 'NEVER_RETURN' },
        },
      });
    await db.courseEnrollment.create({ data: { courseId: ids[1], studentReferenceId: learner } });
    await db.courseLessonProgress.create({
      data: {
        courseId: ids[0],
        lessonId: lessonIds[0],
        studentReferenceId: learner,
        status: 'IN_PROGRESS',
        progressPercentage: 50,
      },
    });
    const quiz = await db.courseQuiz.create({
      data: { courseId: ids[0], title: 'Quiz', position: 1 },
    });
    for (let index = 0; index < 23; index++)
      await db.courseQuizAttempt.create({
        data: {
          courseId: ids[0],
          quizId: quiz.id,
          studentReferenceId: learner,
          attemptNumber: index + 1,
          status: 'PASSED',
          score: 90,
          passed: true,
          submittedAt: new Date(),
          answers: { private: 'NEVER_RETURN' },
          metadata: { private: 'NEVER_RETURN' },
        },
      });
    const repo = new PrismaCourseProgressRepository(db);
    const page = await repo.listCourseLearners(ids[0], { page: 1, pageSize: 20 });
    expect(page.total).toBe(1);
    expect(page.data[0].started).toBe(true);
    const detail = (await repo.getCourseLearnerReview(ids[0], enrollment.id))!;
    expect(detail.attempts).toHaveLength(20);
    expect(detail.attemptCount).toBe(23);
    expect(detail.courseVersion).toBe(publishedVersion);
    expect(detail.curriculumLessonCount).toBe(1);
    expect(detail.completedLessonCount).toBe(0);
    expect(detail.lessons[0].title).toBeTruthy();
    // A quiz created after enrollment must not acquire a made-up historical title.
    expect(detail.attempts[0].title).toBeNull();
    expect(
      (
        await repo.getCourseLearnerReview(ids[0], enrollment.id, {
          lessonsPage: 1,
          attemptsPage: 2,
        })
      )?.attempts,
    ).toHaveLength(3);
    expect(await repo.getCourseLearnerReview(ids[1], enrollment.id)).toBeNull();
    expect(JSON.stringify({ page, detail })).not.toMatch(
      /NEVER_RETURN|studentReferenceId|answers|privateIdentity/,
    );
    expect(
      (await repo.listCourseLearners(ids[0], { page: 1, pageSize: 20, status: 'WAITLISTED' }))
        .total,
    ).toBe(0);
    const learning = new CourseProgressUseCases(courses, curriculum, repo);
    const workspace = await learning.getLearningWorkspace(ids[0], learner);
    expect(
      workspace.curriculum.contentBlocks?.find((block) => block.id === blocks[0].id)?.payload.text,
    ).toContain('نص أصلي');
    expect(workspace.curriculum.quizzes).toHaveLength(0);
    await expect(learning.getLearningWorkspace(ids[0], prefix + '-not-enrolled')).rejects.toThrow(
      'ENROLLMENT_REQUIRED',
    );
    await expect(
      learning.resolveLearningAsset(ids[0], lessonIds[0], randomUUID(), learner),
    ).rejects.toThrow('ASSET_NOT_FOUND');
    await db.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'WAITLISTED' },
    });
    await expect(learning.getLearningWorkspace(ids[0], learner)).rejects.toThrow('NOT_ACCESSIBLE');
  });
  it('archives current lesson blocks with the module while retaining its published historical content', async () => {
    const module = await db.courseModule.findFirstOrThrow({ where: { courseId: ids[0] } });
    await curriculum.deleteModule(module.id);
    expect(
      await db.courseLessonContentBlock.count({
        where: { courseId: ids[0], status: { not: 'ARCHIVED' } },
      }),
    ).toBe(0);
    expect(
      (await curriculum.getLearningVersion(ids[0], publishedVersion, new Date()))?.curriculum
        .contentBlocks,
    ).toHaveLength(2);
    const uc = new CourseCurriculumUseCases(courses, curriculum);
    await expect(uc.replaceLessonBlocks(ids[0], lessonIds[0], blocks)).rejects.toThrow(
      'LESSON_ARCHIVED',
    );
  });
});
