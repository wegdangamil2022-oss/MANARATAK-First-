import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { CourseOriginType, type CourseFilters } from '@manaratak/domain';
import { preflightTargets } from '../../../../scripts/database/post28-isolation.mjs';
import { readDatabaseIdentity } from '../../../../scripts/database/post28-preflight.mjs';
import { PrismaCourseRepository } from '../../src/courses/PrismaCourseRepository';

describe('native learning counts on attested PostgreSQL only', () => {
  let db: PrismaClient, repo: PrismaCourseRepository;
  const prefix = 'native07-' + randomUUID(), ids: string[] = [];
  const courseIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const majorId = randomUUID();
  const native = CourseOriginType.NATIVE_MANARATAK_COURSE;
  const filters: CourseFilters = { originType: native, search: prefix + '-cohort', includeStatistics: true };
  beforeAll(async () => {
    if (process.env.COURSES_ADMIN_DATABASE_TESTS !== 'YES' || process.env.NODE_ENV !== 'test' || process.env.POST28_TARGET_LABEL !== 'DB-T' || process.env.DATABASE_URL !== process.env.DIRECT_URL) throw Error('ISOLATED_NATIVE_COURSE_TEST_AUTHORIZATION_REQUIRED');
    const contract = JSON.parse(fs.readFileSync(process.env.POST28_TARGET_CONTRACT_FILE!, 'utf8'));
    await preflightTargets(contract, [{ label: 'DB-T', url: process.env.DATABASE_URL }], process.env, contract.sourceSha, readDatabaseIdentity, { requireValidatedCatalog: true });
    db = new PrismaClient(); await db.$connect(); repo = new PrismaCourseRepository(db);
    for (const [index, id] of courseIds.entries()) {
      ids.push(id); await db.course.create({ data: { id, publicId: prefix + id, slug: prefix + id, canonicalName: prefix + '-cohort', canonicalDedupKey: prefix + id, displayName: prefix + '-cohort-' + index,
        originType: index === 2 ? 'EXTERNAL_LINKED_COURSE' : index === 3 ? 'PAID_COURSE' : native, accessType: index === 1 ? 'PAID' : 'FREE_STUDY', status: index === 1 ? 'PUBLISHED' : 'DRAFT', completenessStatus: 'COMPLETE', directCourseUrl: '/isolated/native/' + id } });
    }
    const people = ['alice', 'bob', 'idle', 'waiting', 'suspended', 'cancelled', 'old', 'new', 'pending'];
    const student = (name: string) => prefix + people.indexOf(name);
    const rows = [
      [0, 'alice', 'ACTIVE', 50, '2026-01-05'], [0, 'bob', 'COMPLETED', 100, '2026-01-10'], [0, 'idle', 'ACTIVE', 0, '2026-02-01'],
      [0, 'waiting', 'WAITLISTED', 0, '2026-01-10'], [0, 'suspended', 'SUSPENDED', 10, '2026-01-10'], [0, 'cancelled', 'CANCELLED', 100, '2026-01-10'], [0, 'old', 'ACTIVE', 0, '2025-12-31'],
      [1, 'alice', 'COMPLETED', 100, '2026-01-15'], [1, 'new', 'ACTIVE', 0, '2026-01-20'], [1, 'pending', 'PENDING', 0, '2026-02-01'],
      [2, 'alice', 'ACTIVE', 100, '2026-01-10'], [3, 'alice', 'ACTIVE', 100, '2026-01-10'],
    ] as const;
    for (const [index, name, status, progressPercentage, when] of rows) await db.courseEnrollment.create({ data: { courseId: courseIds[index], studentReferenceId: student(name), status, progressPercentage, enrolledAt: new Date(when), lastAccessedAt: new Date('2026-03-01'), metadata: { privateStudentDetail: 'MUST_NOT_LEAVE_REPORT' } } });
    const module = await db.courseModule.create({ data: { courseId: courseIds[0], title: 'Lab module', position: 1 } });
    const lesson = await db.courseLesson.create({ data: { courseId: courseIds[0], moduleId: module.id, title: 'Lab lesson', lessonType: 'TEXT', position: 1 } });
    for (const name of ['alice', 'waiting', 'suspended']) await db.courseLessonProgress.create({ data: { courseId: courseIds[0], lessonId: lesson.id, studentReferenceId: student(name), status: 'IN_PROGRESS', progressPercentage: 25 } });
    for (const index of [0, 1]) {
      const quiz = await db.courseQuiz.create({ data: { courseId: courseIds[index], title: 'Lab quiz', position: 1, passingScore: 50 } });
      const name = index ? 'alice' : 'bob';
      for (const attemptNumber of [1, 2, 3]) await db.courseQuizAttempt.create({ data: { courseId: courseIds[index], quizId: quiz.id, studentReferenceId: student(name), attemptNumber, status: 'PASSED', passed: true, score: 100, submittedAt: new Date('2026-03-01'), answers: { privateAnswer: 'MUST_NOT_LEAVE_REPORT' } } });
      if (index) await db.courseQuizAttempt.create({ data: { courseId: courseIds[index], quizId: quiz.id, studentReferenceId: student('new'), attemptNumber: 1, status: 'IN_PROGRESS' } });
      await db.courseCompletion.create({ data: { courseId: courseIds[index], studentReferenceId: student(name), status: 'COMPLETED', completionSource: 'ISOLATED_TEST', eligibleForCertificate: Boolean(index), courseVersion: 1, completedAt: new Date('2026-03-01') } });
    }
    await db.courseCompletion.create({ data: { courseId: courseIds[0], studentReferenceId: student('cancelled'), status: 'COMPLETED', completionSource: 'ISOLATED_TEST', eligibleForCertificate: true, courseVersion: 1 } });
  });
  afterAll(async () => {
    if (!db) return;
    const where = { courseId: { in: ids } };
    await db.courseQuizAttempt.deleteMany({ where }); await db.courseLessonProgress.deleteMany({ where }); await db.courseCompletion.deleteMany({ where }); await db.courseEnrollment.deleteMany({ where });
    await db.course.deleteMany({ where: { id: { in: ids }, canonicalDedupKey: { startsWith: prefix } } }); await db.major.deleteMany({ where: { id: majorId, canonicalDedupKey: { startsWith: prefix } } }); await db.$disconnect();
  });
  it('counts enrollment IDs, distinct students, genuine starts and completions without attempt fanout', async () => {
    const result = await repo.list(filters), report = result.nativeLearning!;
    expect(result.total).toBe(3); expect(result.statistics?.published).toBe(1); expect(result.statistics?.legacyPaidOrigin).toBe(0);
    expect(report.totals).toMatchObject({ enrollments: 10, uniqueStudents: 9, eligibleEnrollments: 6, started: 3, completions: 2, completionRate: 33.33 });
    expect(report.totals.averageProgress).toBeCloseTo(250 / 6);
    expect(report.byCourse[courseIds[0]]).toMatchObject({ enrollments: 7, started: 2, completions: 1 });
    expect(report.byCourse[courseIds[1]]).toMatchObject({ enrollments: 3, started: 1, completions: 1 });
    expect(JSON.stringify(report)).not.toMatch(/MUST_NOT_LEAVE_REPORT|privateAnswer|privateStudentDetail|studentReferenceId/);
  });
  it('uses the database snapshot clock even when the application clock is behind', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2000-01-01T00:00:00Z'));
    try {
      const report = (await repo.list(filters)).nativeLearning!;
      expect(report.totals.enrollments).toBe(10); expect(report.totals.started).toBe(3); expect(report.totals.completions).toBe(2);
      expect(report.asOf > '2026-03-01T00:00:00.000Z').toBe(true);
    } finally { vi.useRealTimers(); }
  });
  it('uses an enrollment cohort with inclusive/exclusive UTC boundaries, not completion-event dates', async () => {
    const report = (await repo.list({ ...filters, cohortFrom: '2026-01-01', cohortTo: '2026-02-01' })).nativeLearning!;
    expect(report.totals).toEqual({ enrollments: 7, uniqueStudents: 6, eligibleEnrollments: 4, started: 3, completions: 2, averageProgress: 62.5, completionRate: 50 });
    expect(report.cohortFrom).toBe('2026-01-01'); expect(report.cohortTo).toBe('2026-02-01');
    const empty = (await repo.list({ ...filters, cohortFrom: '2024-01-01', cohortTo: '2024-02-01' })).nativeLearning!;
    expect(empty.totals).toMatchObject({ enrollments: 0, started: 0, completions: 0, averageProgress: null, completionRate: null });
  });
  it('filters courses by actual cohort enrollments and excludes unresolved legacy paid origins', async () => {
    expect((await repo.list({ ...filters, hasEnrollments: true })).data.map(row => row.id).sort()).toEqual(courseIds.slice(0, 2).sort());
    const empty = await repo.list({ ...filters, hasEnrollments: false });
    expect(empty.data.map(row => row.id)).toEqual([courseIds[4]]); expect(empty.nativeLearning?.totals.enrollments).toBe(0);
    const old = await repo.list({ ...filters, hasEnrollments: true, cohortTo: '2026-01-01' });
    expect(old.data.map(row => row.id)).toEqual([courseIds[0]]); expect(old.nativeLearning?.totals.enrollments).toBe(1);
  });
  it('matches canonical filters and null facts in both the catalog and SQL aggregate predicate', async () => {
    const matrix: string[] = [];
    for (const accessType of ['FREE_STUDY', 'FREE_CERTIFICATE', 'FREE_STUDY_AND_CERTIFICATE', 'PAID']) for (const certificateAvailable of [null, false, true]) for (const isFreeCertificate of [null, false, true]) for (const isStudyFree of [null, false, true]) {
      const id = randomUUID(); ids.push(id); matrix.push(id);
      await db.course.create({ data: { id, publicId: prefix + id, slug: prefix + id, canonicalName: prefix + '-matrix', canonicalDedupKey: prefix + id, displayName: prefix + '-matrix', originType: native, accessType, certificateAvailable, isFreeCertificate, isStudyFree,
        status: accessType === 'PAID' ? 'PUBLISHED' : 'DRAFT', completenessStatus: 'COMPLETE', learningLanguage: 'English', difficultyLevel: 'Beginner', category: 'Science', optionalFields: { instructor: prefix + '-Instructor%_', privateField: 'NEVER_EXPOSE' }, directCourseUrl: '/isolated/' + id } });
      await db.courseEnrollment.create({ data: { courseId: id, studentReferenceId: prefix + id, enrolledAt: new Date('2026-01-10') } });
    }
    await db.major.create({ data: { id: majorId, publicId: prefix + '-major', slug: prefix + '-major', canonicalName: prefix + '-ApprovedMajor', canonicalDedupKey: prefix + '-major', displayName: prefix + '-ApprovedMajor', status: 'PUBLISHED', completenessStatus: 'COMPLETE' } });
    for (const [index, courseId] of matrix.slice(0, 2).entries()) await db.courseMajorProjection.create({ data: { projectionKey: prefix + courseId, courseId, majorId, sourceType: 'DIRECT', relationshipType: 'PRIMARY', projectionState: index === 0 ? 'APPROVED' : 'PROPOSED' } });
    const cases: CourseFilters[] = [
      { majorId }, { search: prefix + '-ApprovedMajor' }, { instructor: prefix + '-instructor%_' },
      ...['FREE', 'NON_FREE', 'UNAVAILABLE', 'UNKNOWN'].map(certificateState => ({ certificateState } as CourseFilters)),
      ...['FREE', 'PAID', 'UNKNOWN'].map(studyAccess => ({ studyAccess } as CourseFilters)),
      { learningLanguage: 'english', difficultyLevel: 'begin', category: 'science' }, { instructor: prefix + '-Instructor%_' },
      { search: prefix + '-Instructor%_' }, { status: 'PUBLISHED' as CourseFilters['status'] },
      { studyAccess: 'FREE', certificateState: 'NON_FREE', learningLanguage: 'Eng' }, { isFreeCertificate: true }, { isFreeCertificate: false },
    ];
    for (const input of cases) {
      const result = await repo.list({ ...filters, search: prefix + '-matrix', ...input });
      expect(result.nativeLearning?.totals.enrollments, JSON.stringify(input)).toBe(result.total);
      expect(Object.keys(result.nativeLearning!.byCourse)).toHaveLength(result.data.length);
    }
    expect((await repo.list({ ...filters, search: prefix + '-Instructor%_' })).total).toBe(matrix.length);
    expect((await repo.list({ ...filters, search: prefix + '%not-a-wildcard' })).total).toBe(0);
  });
  it('returns bounded page reports for 1005 courses and 2010 enrollments while preserving whole-scope unique counts', async () => {
    const large = Array.from({ length: 1005 }, () => { const id = randomUUID(); ids.push(id); return { id, publicId: prefix + id, slug: prefix + id, canonicalName: prefix + '-large', canonicalDedupKey: prefix + id, displayName: prefix + '-large', originType: native, accessType: 'FREE_STUDY', status: 'DRAFT', completenessStatus: 'COMPLETE', directCourseUrl: '/isolated/' + id }; });
    for (let index = 0; index < large.length; index += 500) await db.course.createMany({ data: large.slice(index, index + 500) });
    const enrollments = large.flatMap(row => [prefix + '-shared', prefix + row.id].map(studentReferenceId => ({ courseId: row.id, studentReferenceId })));
    for (let index = 0; index < enrollments.length; index += 500) await db.courseEnrollment.createMany({ data: enrollments.slice(index, index + 500) });
    const result = await repo.list({ ...filters, search: prefix + '-large', pageSize: 20 });
    expect(result.total).toBe(1005); expect(result.data).toHaveLength(20); expect(Object.keys(result.nativeLearning!.byCourse)).toHaveLength(20);
    expect(result.nativeLearning?.totals).toMatchObject({ enrollments: 2010, uniqueStudents: 1006, started: 0, completions: 0 });
    const page2 = await repo.list({ ...filters, search: prefix + '-large', pageSize: 20, page: 2 });
    expect(new Set([...result.data, ...page2.data].map(row => row.id)).size).toBe(40);
    expect(page2.nativeLearning?.totals).toEqual(result.nativeLearning?.totals);
  });
});
