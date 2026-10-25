import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaCourseCurriculumRepository } from './PrismaCourseCurriculumRepository';
import {
  AtomicPersistenceContext,
  CourseCompletionDto,
  CourseCompletionStatus,
  CourseEnrollmentDto,
  CourseEnrollmentStatus,
  CourseLessonProgressDto,
  CourseProgressStatus,
  CourseQuizAttemptDto,
  CourseQuizAttemptStatus,
  CreateCourseCompletionDto,
  CreateCourseEnrollmentDto,
  CreateQuizAttemptDto,
  GradeQuizAttemptDto,
  PendingAssessmentSubmissionDto,
  ManualAssessmentGradeDto,
  ICourseProgressRepository,
  ITransactionalCourseProgressRepository,
  StudentCourseProgressSnapshotDto,
  UpsertLessonProgressDto,
} from '@manaratak/domain';

interface CourseProgressTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

type Db = PrismaClient | Prisma.TransactionClient;
const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export class PrismaCourseProgressRepository implements ITransactionalCourseProgressRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listCourseLearners(courseId: string, input: { page: number; pageSize: number; status?: string; search?: string }): ReturnType<NonNullable<ICourseProgressRepository['listCourseLearners']>> {
    if (typeof this.prisma.$transaction === 'function') return this.prisma.$transaction(tx => new PrismaCourseProgressRepository(tx as unknown as PrismaClient).listCourseLearners(courseId, input), { isolationLevel: 'RepeatableRead' });
    const where = { courseId, ...(input.status ? { status: input.status } : {}), ...(input.search ? { id: { contains: input.search, mode: 'insensitive' as const } } : {}) };
    const total = await this.prisma.courseEnrollment.count({ where });
    const rows = await this.prisma.courseEnrollment.findMany({ where, select: { id: true, status: true, enrolledAt: true, progressPercentage: true },
      orderBy: [{ enrolledAt: 'desc' }, { id: 'asc' }], skip: (input.page - 1) * input.pageSize, take: input.pageSize });
    const flags = rows.length ? await this.prisma.$queryRaw<Array<{ id: string; started: boolean; completed: boolean; certificateEligible: boolean }>>(Prisma.sql`
      SELECT e.id, e.status IN ('ACTIVE','COMPLETED') AND (
        EXISTS (SELECT 1 FROM "CourseLessonProgress" p WHERE p."courseId"=e."courseId" AND p."studentReferenceId"=e."studentReferenceId" AND p."progressPercentage">0 AND p.status IN ('IN_PROGRESS','COMPLETED')) OR
        EXISTS (SELECT 1 FROM "CourseQuizAttempt" q WHERE q."courseId"=e."courseId" AND q."studentReferenceId"=e."studentReferenceId" AND q."submittedAt" IS NOT NULL AND q.status IN ('SUBMITTED','PASSED','FAILED'))
      ) AS started,
      e.status IN ('ACTIVE','COMPLETED') AND EXISTS (SELECT 1 FROM "CourseCompletion" f WHERE f."courseId"=e."courseId" AND f."studentReferenceId"=e."studentReferenceId" AND f.status IN ('COMPLETED','CERTIFICATE_SIGNAL_READY')) AS completed,
      e.status IN ('ACTIVE','COMPLETED') AND EXISTS (SELECT 1 FROM "CourseCompletion" f WHERE f."courseId"=e."courseId" AND f."studentReferenceId"=e."studentReferenceId" AND f.status IN ('COMPLETED','CERTIFICATE_SIGNAL_READY') AND f."eligibleForCertificate"=true) AS "certificateEligible"
      FROM "CourseEnrollment" e WHERE e."courseId"=${courseId} AND e.id IN (${Prisma.join(rows.map(row => row.id))})
    `) : [];
    if (rows.some(row => !flags.some(flag => flag.id === row.id))) throw new Error('COURSE_LEARNER_EVIDENCE_READ_INCOMPLETE');
    return { data: rows.map(row => ({ ...row, label: 'STU-' + row.id.slice(0, 8), started: flags.find(flag => flag.id === row.id)!.started,
      completed: flags.find(flag => flag.id === row.id)!.completed, certificateEligible: flags.find(flag => flag.id === row.id)!.certificateEligible })),
      total, page: input.page, pageSize: input.pageSize, totalPages: Math.ceil(total / input.pageSize) };
  }

  public async getCourseLearnerReview(courseId: string, enrollmentId: string, query = { lessonsPage: 1, attemptsPage: 1 }): ReturnType<NonNullable<ICourseProgressRepository['getCourseLearnerReview']>> {
    if (typeof this.prisma.$transaction === 'function') return this.prisma.$transaction(tx => new PrismaCourseProgressRepository(tx as unknown as PrismaClient).getCourseLearnerReview(courseId, enrollmentId, query), { isolationLevel: 'RepeatableRead' });
    const enrollment = await this.prisma.courseEnrollment.findFirst({ where: { id: enrollmentId, courseId } });
    if (!enrollment) return null;
    const where = { courseId, studentReferenceId: enrollment.studentReferenceId }, pageSize = 20;
    const [lessons, attempts, completion, lessonCount, attemptCount] = await Promise.all([
      this.prisma.courseLessonProgress.findMany({ where, select: { lessonId: true, status: true, progressPercentage: true }, orderBy: { lessonId: 'asc' }, take: pageSize, skip: (query.lessonsPage - 1) * pageSize }),
      this.prisma.courseQuizAttempt.findMany({ where, select: { id: true, quizId: true, status: true, score: true, passed: true, submittedAt: true }, orderBy: [{ startedAt: 'desc' }, { id: 'asc' }], take: pageSize, skip: (query.attemptsPage - 1) * pageSize }),
      this.prisma.courseCompletion.findUnique({ where: { courseId_studentReferenceId: where }, select: { status: true, completedAt: true, eligibleForCertificate: true } }),
      this.prisma.courseLessonProgress.count({ where }), this.prisma.courseQuizAttempt.count({ where }),
    ]);
    const rawVersion = (enrollment.metadata as Record<string, unknown> | null)?.courseVersion;
    const courseVersion = Number.isSafeInteger(rawVersion) && Number(rawVersion) > 0 ? Number(rawVersion) : null;
    const definition = await new PrismaCourseCurriculumRepository(this.prisma).getLearningVersion(courseId, courseVersion ?? undefined, enrollment.enrolledAt);
    const eligibleModules = new Set(definition?.curriculum.modules.filter(module => module.status !== 'ARCHIVED').map(module => module.id));
    const curriculumLessons = definition?.curriculum.lessons.filter(lesson => lesson.status !== 'ARCHIVED' && eligibleModules.has(lesson.moduleId));
    const completedLessonCount = curriculumLessons ? await this.prisma.courseLessonProgress.count({ where: {
      ...where, lessonId: { in: curriculumLessons.map(lesson => lesson.id) }, status: 'COMPLETED', progressPercentage: 100,
    } }) : null;
    return { id: enrollment.id, status: enrollment.status, progressPercentage: enrollment.progressPercentage,
      courseVersion, curriculumLessonCount: curriculumLessons?.length ?? null, completedLessonCount,
      lessons: lessons.map(row => ({ ...row, title: curriculumLessons?.find(lesson => lesson.id === row.lessonId)?.title ?? null })),
      attempts: attempts.map(row => ({ ...row, title: definition?.curriculum.quizzes.find(quiz => quiz.id === row.quizId)?.title ?? null })),
      completion, lessonCount, attemptCount, ...query, pageSize };
  }

  public withTransaction(context: AtomicPersistenceContext): ICourseProgressRepository {
    const transactionClient = (context as Partial<CourseProgressTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('COURSE_PROGRESS_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaCourseProgressRepository(transactionClient as unknown as PrismaClient);
  }

  public async enroll(data: CreateCourseEnrollmentDto): Promise<CourseEnrollmentDto> {
    return this.enrollment(await this.prisma.courseEnrollment.upsert({
      where: { courseId_studentReferenceId: { courseId: data.courseId, studentReferenceId: data.studentReferenceId } },
      create: { ...data, status: data.status ?? CourseEnrollmentStatus.ACTIVE, metadata: json(data.metadata) },
      update: { lastAccessedAt: new Date() },
    }));
  }

  public async enrollWithCapacity(
    data: CreateCourseEnrollmentDto,
    maximumSeats: number | null,
    waitlistEnabled: boolean,
  ): Promise<CourseEnrollmentDto> {
    return this.serializable(async db => {
      await db.$queryRaw`SELECT id FROM "Course" WHERE id = ${data.courseId} FOR UPDATE`;
      const existing = await db.courseEnrollment.findUnique({
        where: { courseId_studentReferenceId: { courseId: data.courseId, studentReferenceId: data.studentReferenceId } },
      });
      if (existing) return this.enrollment(existing);
      const owner = await db.course.findUnique({where: {id: data.courseId}, select: {version: true, status: true}});
      if (!owner || owner.status !== 'PUBLISHED' || owner.version !== data.metadata?.courseVersion) throw new Error('COURSE_ENROLLMENT_VERSION_CHANGED');
      const definition = await new PrismaCourseCurriculumRepository(db as PrismaClient).getLearningVersion(data.courseId, owner.version, new Date());
      if (!definition) throw new Error('COURSE_ENROLLMENT_VERSION_NOT_FOUND');

      let status = CourseEnrollmentStatus.ACTIVE;
      if (maximumSeats !== null) {
        const active = await db.courseEnrollment.count({
          where: { courseId: data.courseId, status: { in: [CourseEnrollmentStatus.ACTIVE, CourseEnrollmentStatus.PENDING] } },
        });
        if (active >= maximumSeats) {
          if (!waitlistEnabled) throw new Error('COURSE_ENROLLMENT_CAPACITY_FULL');
          status = CourseEnrollmentStatus.WAITLISTED;
        }
      }
      return this.enrollment(await db.courseEnrollment.create({
        data: { ...data, status, metadata: json(data.metadata) },
      }));
    });
  }

  public async lockEnrollment(courseId: string, studentReferenceId: string): Promise<void> {
    if (typeof (this.prisma as Partial<PrismaClient>).$transaction === 'function') throw new Error('COURSE_ENROLLMENT_LOCK_REQUIRES_BOUND_TRANSACTION');
    await this.prisma.$queryRaw`SELECT id FROM "CourseEnrollment" WHERE "courseId" = ${courseId} AND "studentReferenceId" = ${studentReferenceId} FOR UPDATE`;
  }

  public async findEnrollment(courseId: string, studentReferenceId: string): Promise<CourseEnrollmentDto | null> {
    const row = await this.prisma.courseEnrollment.findUnique({ where: { courseId_studentReferenceId: { courseId, studentReferenceId } } });
    return row ? this.enrollment(row) : null;
  }

  public async listEnrollmentsByStudent(studentReferenceId: string, maxRows?: number): Promise<CourseEnrollmentDto[]> {
    if (maxRows !== undefined && (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > 51))
      throw new Error('STUDENT_OWNER_READ_LIMIT_INVALID');
    const rows = await this.prisma.courseEnrollment.findMany({
      where: { studentReferenceId },
      orderBy: [{ lastAccessedAt: 'desc' }, { enrolledAt: 'desc' }],
      ...(maxRows !== undefined ? {take:maxRows} : {}),
    });
    return rows.map((row) => this.enrollment(row));
  }

  public async listEnrollmentsPageByStudent(studentReferenceId:string,limit:number,cursor?:string):Promise<{items:CourseEnrollmentDto[];nextCursor:string|null}> {
    if (!studentReferenceId.trim() || !Number.isSafeInteger(limit) || limit<1 || limit>50 ||
        (cursor!==undefined && (!cursor.trim() || cursor.length>160)))
      throw new Error('STUDENT_OWNER_READ_PAGE_INVALID');
    const rows=await this.prisma.courseEnrollment.findMany({
      where:{studentReferenceId,...(cursor?{id:{gt:cursor}}:{})},
      orderBy:{id:'asc'},take:limit+1,
    });
    const hasMore=rows.length>limit;
    const items=rows.slice(0,limit).map(row=>this.enrollment(row));
    return {items,nextCursor:hasMore?items[items.length-1].id:null};
  }

  public async countActiveEnrollments(courseId: string): Promise<number> {
    return this.prisma.courseEnrollment.count({
      where: { courseId, status: { in: [CourseEnrollmentStatus.ACTIVE, CourseEnrollmentStatus.PENDING] } },
    });
  }

  public async updateEnrollmentProgress(courseId: string, studentReferenceId: string, progressPercentage: number): Promise<CourseEnrollmentDto> {
    return this.enrollment(await this.prisma.courseEnrollment.update({
      where: { courseId_studentReferenceId: { courseId, studentReferenceId } },
      data: { progressPercentage, lastAccessedAt: new Date() },
    }));
  }

  public async markEnrollmentCompleted(courseId: string, studentReferenceId: string): Promise<CourseEnrollmentDto> {
    return this.enrollment(await this.prisma.courseEnrollment.update({
      where: { courseId_studentReferenceId: { courseId, studentReferenceId } },
      data: { status: CourseEnrollmentStatus.COMPLETED, progressPercentage: 100, completedAt: new Date(), lastAccessedAt: new Date() },
    }));
  }

  public async upsertLessonProgress(data: UpsertLessonProgressDto): Promise<CourseLessonProgressDto> {
    const now = new Date();
    return this.lessonProgress(await this.prisma.courseLessonProgress.upsert({
      where: { courseId_lessonId_studentReferenceId: { courseId: data.courseId, lessonId: data.lessonId, studentReferenceId: data.studentReferenceId } },
      create: { ...data, startedAt: now, completedAt: data.status === CourseProgressStatus.COMPLETED ? now : undefined, metadata: json(data.metadata) },
      update: { status: data.status, progressPercentage: data.progressPercentage, completedAt: data.status === CourseProgressStatus.COMPLETED ? now : null, timeSpentSeconds: data.timeSpentSeconds, metadata: json(data.metadata) },
    }));
  }

  public async listLessonProgress(courseId: string, studentReferenceId: string): Promise<CourseLessonProgressDto[]> {
    return (await this.prisma.courseLessonProgress.findMany({ where: { courseId, studentReferenceId }, orderBy: { createdAt: 'asc' } })).map(row => this.lessonProgress(row));
  }

  public async createQuizAttempt(data: CreateQuizAttemptDto): Promise<CourseQuizAttemptDto> {
    return this.serializable(async db => {
      await db.$queryRaw`SELECT id FROM "CourseEnrollment" WHERE "courseId" = ${data.courseId} AND "studentReferenceId" = ${data.studentReferenceId} FOR UPDATE`;
      const enrollment=await db.courseEnrollment.findUnique({where:{courseId_studentReferenceId:{courseId:data.courseId,studentReferenceId:data.studentReferenceId}}});
      if(!enrollment || enrollment.status!==CourseEnrollmentStatus.ACTIVE) throw new Error('COURSE_ENROLLMENT_NOT_ACTIVE');
      const metadata = enrollment.metadata as Record<string, unknown> | null;
      const version = metadata?.courseVersion;
      if (version !== undefined && (!Number.isSafeInteger(version) || (version as number) < 1)) throw new Error('COURSE_ENROLLMENT_VERSION_INVALID');
      const definition = await new PrismaCourseCurriculumRepository(db as PrismaClient).getLearningVersion(data.courseId, version as number | undefined, enrollment.enrolledAt);
      if (!definition) throw new Error('COURSE_ENROLLMENT_VERSION_NOT_FOUND');
      const quiz = definition.curriculum.quizzes.find(item => item.id === data.quizId && item.status !== 'ARCHIVED');
      if(!quiz) throw new Error('COURSE_QUIZ_SCOPE_MISMATCH');
      const existing = await db.courseQuizAttempt.findFirst({where: {quizId: data.quizId, studentReferenceId: data.studentReferenceId, status: CourseQuizAttemptStatus.IN_PROGRESS, submittedAt: null}, orderBy: {startedAt: 'desc'}});
      if (existing) return this.quizAttempt(existing);
      const count=await db.courseQuizAttempt.count({where:{quizId:data.quizId,studentReferenceId:data.studentReferenceId}});
      if(quiz.maxAttempts!=null && count>=quiz.maxAttempts) throw new Error('COURSE_QUIZ_MAX_ATTEMPTS_REACHED');
      return this.quizAttempt(await db.courseQuizAttempt.create({
        data:{...data,attemptNumber:count+1,status:CourseQuizAttemptStatus.IN_PROGRESS,answers:json(data.answers),metadata:json(data.metadata)},
      }));
    });
  }

  public async findQuizAttempt(attemptId: string): Promise<CourseQuizAttemptDto | null> {
    const row = await this.prisma.courseQuizAttempt.findUnique({ where: { id: attemptId } });
    return row ? this.quizAttempt(row) : null;
  }

  public async countQuizAttempts(quizId: string, studentReferenceId: string): Promise<number> {
    return this.prisma.courseQuizAttempt.count({ where: { quizId, studentReferenceId } });
  }

  public async submitQuizAttempt(data: GradeQuizAttemptDto): Promise<CourseQuizAttemptDto> {
    return this.serializable(async db => {
      await db.$queryRaw`SELECT id FROM "CourseQuizAttempt" WHERE id = ${data.attemptId} FOR UPDATE`;
      const current = await db.courseQuizAttempt.findUnique({ where: { id: data.attemptId } });
      if (!current) throw new Error('COURSE_QUIZ_ATTEMPT_NOT_FOUND');
      if (current.submittedAt || current.status !== CourseQuizAttemptStatus.IN_PROGRESS) throw new Error('COURSE_QUIZ_ATTEMPT_ALREADY_SUBMITTED');
      return this.quizAttempt(await db.courseQuizAttempt.update({
        where: { id: data.attemptId },
        data: { score: data.score, passed: data.passed, answers: json(data.answers), status: data.passed ? CourseQuizAttemptStatus.PASSED : CourseQuizAttemptStatus.FAILED, submittedAt: new Date() },
      }));
    });
  }

  public async submitAssessmentForReview(data: PendingAssessmentSubmissionDto): Promise<CourseQuizAttemptDto> {
    return this.serializable(async db => {
      await db.$queryRaw`SELECT id FROM "CourseQuizAttempt" WHERE id = ${data.attemptId} FOR UPDATE`;
      const current = await db.courseQuizAttempt.findUnique({where: {id: data.attemptId}});
      if (!current || current.status !== CourseQuizAttemptStatus.IN_PROGRESS || current.submittedAt) throw new Error('COURSE_QUIZ_ATTEMPT_ALREADY_SUBMITTED');
      return this.quizAttempt(await db.courseQuizAttempt.update({where: {id: data.attemptId}, data: {
        answers: json(data.answers), score: null, passed: null, status: CourseQuizAttemptStatus.SUBMITTED, submittedAt: new Date(),
        metadata: json({...((current.metadata as Record<string, unknown>) ?? {}), assessmentReview: data.review}),
      }}));
    });
  }

  public async listPendingAssessments(courseId: string, page: number, pageSize: number): Promise<CourseQuizAttemptDto[]> {
    return (await this.prisma.courseQuizAttempt.findMany({where: {courseId, status: CourseQuizAttemptStatus.SUBMITTED},
      orderBy: [{submittedAt: 'asc'}, {id: 'asc'}], skip: (page - 1) * pageSize, take: pageSize})).map(row => this.quizAttempt(row));
  }

  public async gradeAssessment(data: ManualAssessmentGradeDto): Promise<CourseQuizAttemptDto> {
    // Called with the coordinator's transaction client. The attempt lock also prevents double grading.
    return this.serializable(async db => {
      await db.$queryRaw`SELECT id FROM "CourseQuizAttempt" WHERE id = ${data.attemptId} FOR UPDATE`;
      const current = await db.courseQuizAttempt.findUnique({where: {id: data.attemptId}});
      if (!current || current.courseId !== data.courseId || current.status !== CourseQuizAttemptStatus.SUBMITTED || current.submittedAt?.toISOString() !== data.expectedSubmittedAt) throw new Error('COURSE_ASSESSMENT_REVIEW_CONFLICT');
      return this.quizAttempt(await db.courseQuizAttempt.update({where: {id: data.attemptId}, data: {
        score: data.score, passed: data.passed, status: data.passed ? CourseQuizAttemptStatus.PASSED : CourseQuizAttemptStatus.FAILED,
        metadata: json({...((current.metadata as Record<string, unknown>) ?? {}), assessmentGrade: {
          reviewerId: data.reviewerId, gradedAt: new Date().toISOString(), reason: data.reason, feedback: data.feedback, questionScores: data.questionScores,
        }}),
      }}));
    });
  }

  public async listQuizAttempts(courseId: string, studentReferenceId: string): Promise<CourseQuizAttemptDto[]> {
    return (await this.prisma.courseQuizAttempt.findMany({ where: { courseId, studentReferenceId }, orderBy: { startedAt: 'asc' } })).map(row => this.quizAttempt(row));
  }

  public async completeCourse(data: CreateCourseCompletionDto): Promise<CourseCompletionDto> {
    return this.completion(await this.prisma.courseCompletion.upsert({
      where: { courseId_studentReferenceId: { courseId: data.courseId, studentReferenceId: data.studentReferenceId } },
      create: { ...data, metadata: json(data.metadata) },
      update: {},
    }));
  }

  public async findCompletion(courseId: string, studentReferenceId: string): Promise<CourseCompletionDto | null> {
    const row = await this.prisma.courseCompletion.findUnique({ where: { courseId_studentReferenceId: { courseId, studentReferenceId } } });
    return row ? this.completion(row) : null;
  }

  public async getStudentProgressSnapshot(courseId: string, studentReferenceId: string): Promise<StudentCourseProgressSnapshotDto | null> {
    const enrollment = await this.findEnrollment(courseId, studentReferenceId);
    if (!enrollment) return null;
    const [lessons, quizAttempts, completion] = await Promise.all([
      this.listLessonProgress(courseId, studentReferenceId),
      this.listQuizAttempts(courseId, studentReferenceId),
      this.findCompletion(courseId, studentReferenceId),
    ]);
    return { enrollment, lessons, quizAttempts, completion };
  }

  private async serializable<T>(work: (db: Db) => Promise<T>): Promise<T> {
    const candidate = this.prisma as PrismaClient & { $transaction?: PrismaClient['$transaction'] };
    if (typeof candidate.$transaction !== 'function') return work(this.prisma as unknown as Prisma.TransactionClient);
    return candidate.$transaction(tx => work(tx), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private enrollment(record: any): CourseEnrollmentDto { return { ...record, status: record.status as CourseEnrollmentStatus, metadata: record.metadata as Record<string, unknown> | null }; }
  private lessonProgress(record: any): CourseLessonProgressDto { return { ...record, status: record.status as CourseProgressStatus, metadata: record.metadata as Record<string, unknown> | null }; }
  private quizAttempt(record: any): CourseQuizAttemptDto { return { ...record, status: record.status as CourseQuizAttemptStatus, answers: record.answers, metadata: record.metadata as Record<string, unknown> | null }; }
  private completion(record: any): CourseCompletionDto { return { ...record, status: record.status as CourseCompletionStatus, metadata: record.metadata as Record<string, unknown> | null }; }
}
