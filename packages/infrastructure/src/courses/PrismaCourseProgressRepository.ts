import { Prisma, PrismaClient } from '@prisma/client';
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

  public withTransaction(context: AtomicPersistenceContext): ICourseProgressRepository {
    const transactionClient = (context as Partial<CourseProgressTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('COURSE_PROGRESS_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaCourseProgressRepository(transactionClient as unknown as PrismaClient);
  }

  public async enroll(data: CreateCourseEnrollmentDto): Promise<CourseEnrollmentDto> {
    return this.enrollment(await this.prisma.courseEnrollment.upsert({
      where: { courseId_studentReferenceId: { courseId: data.courseId, studentReferenceId: data.studentReferenceId } },
      create: { ...data, status: data.status ?? CourseEnrollmentStatus.ACTIVE, metadata: json(data.metadata) },
      update: { lastAccessedAt: new Date(), metadata: json(data.metadata) },
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

  public async findEnrollment(courseId: string, studentReferenceId: string): Promise<CourseEnrollmentDto | null> {
    const row = await this.prisma.courseEnrollment.findUnique({ where: { courseId_studentReferenceId: { courseId, studentReferenceId } } });
    return row ? this.enrollment(row) : null;
  }

  public async listEnrollmentsByStudent(studentReferenceId: string): Promise<CourseEnrollmentDto[]> {
    const rows = await this.prisma.courseEnrollment.findMany({
      where: { studentReferenceId },
      orderBy: [{ lastAccessedAt: 'desc' }, { enrolledAt: 'desc' }],
    });
    return rows.map((row) => this.enrollment(row));
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
    return this.quizAttempt(await this.prisma.courseQuizAttempt.create({
      data: { ...data, status: CourseQuizAttemptStatus.IN_PROGRESS, answers: json(data.answers), metadata: json(data.metadata) },
    }));
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
      const current = await db.courseQuizAttempt.findUnique({ where: { id: data.attemptId } });
      if (!current) throw new Error('COURSE_QUIZ_ATTEMPT_NOT_FOUND');
      if (current.submittedAt || current.status !== CourseQuizAttemptStatus.IN_PROGRESS) throw new Error('COURSE_QUIZ_ATTEMPT_ALREADY_SUBMITTED');
      return this.quizAttempt(await db.courseQuizAttempt.update({
        where: { id: data.attemptId },
        data: { score: data.score, passed: data.passed, answers: json(data.answers), status: data.passed ? CourseQuizAttemptStatus.PASSED : CourseQuizAttemptStatus.FAILED, submittedAt: new Date() },
      }));
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
