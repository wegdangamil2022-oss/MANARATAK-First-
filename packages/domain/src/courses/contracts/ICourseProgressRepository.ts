import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import {
  CourseCompletionDto,
  CourseEnrollmentDto,
  CourseLessonProgressDto,
  CourseQuizAttemptDto,
  CreateCourseCompletionDto,
  CreateCourseEnrollmentDto,
  CreateQuizAttemptDto,
  GradeQuizAttemptDto,
  PendingAssessmentSubmissionDto,
  ManualAssessmentGradeDto,
  StudentCourseProgressSnapshotDto,
  UpsertLessonProgressDto
} from '../entities/CourseProgress';

export interface ICourseProgressRepository {
  enroll(data: CreateCourseEnrollmentDto): Promise<CourseEnrollmentDto>;
  enrollWithCapacity(data: CreateCourseEnrollmentDto, maximumSeats: number | null, waitlistEnabled: boolean): Promise<CourseEnrollmentDto>;
  lockEnrollment?(courseId: string, studentReferenceId: string): Promise<void>;
  findEnrollment(courseId: string, studentReferenceId: string): Promise<CourseEnrollmentDto | null>;
  listEnrollmentsByStudent(studentReferenceId: string, maxRows?: number): Promise<CourseEnrollmentDto[]>;
  /** Stable ID keyset enumeration of all enrollments. Owner-scoped and bounded. */
  listEnrollmentsPageByStudent?(studentReferenceId:string,limit:number,cursor?:string):Promise<{items:CourseEnrollmentDto[];nextCursor:string|null}>;
  countActiveEnrollments(courseId: string): Promise<number>;
  updateEnrollmentProgress(courseId: string, studentReferenceId: string, progressPercentage: number): Promise<CourseEnrollmentDto>;
  markEnrollmentCompleted(courseId: string, studentReferenceId: string): Promise<CourseEnrollmentDto>;

  upsertLessonProgress(data: UpsertLessonProgressDto): Promise<CourseLessonProgressDto>;
  listLessonProgress(courseId: string, studentReferenceId: string): Promise<CourseLessonProgressDto[]>;

  createQuizAttempt(data: CreateQuizAttemptDto): Promise<CourseQuizAttemptDto>;
  findQuizAttempt(attemptId: string): Promise<CourseQuizAttemptDto | null>;
  countQuizAttempts(quizId: string, studentReferenceId: string): Promise<number>;
  submitQuizAttempt(data: GradeQuizAttemptDto): Promise<CourseQuizAttemptDto>;
  submitAssessmentForReview?(data: PendingAssessmentSubmissionDto): Promise<CourseQuizAttemptDto>;
  gradeAssessment?(data: ManualAssessmentGradeDto): Promise<CourseQuizAttemptDto>;
  listPendingAssessments?(courseId: string, page: number, pageSize: number): Promise<CourseQuizAttemptDto[]>;
  listQuizAttempts(courseId: string, studentReferenceId: string): Promise<CourseQuizAttemptDto[]>;

  completeCourse(data: CreateCourseCompletionDto): Promise<CourseCompletionDto>;
  findCompletion(courseId: string, studentReferenceId: string): Promise<CourseCompletionDto | null>;
  getStudentProgressSnapshot(courseId: string, studentReferenceId: string): Promise<StudentCourseProgressSnapshotDto | null>;
}

export interface ITransactionalCourseProgressRepository extends ICourseProgressRepository {
  withTransaction(context: AtomicPersistenceContext): ICourseProgressRepository;
}
