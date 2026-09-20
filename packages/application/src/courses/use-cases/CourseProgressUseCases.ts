import { randomUUID } from 'node:crypto';
import {
  COURSE_COMPLETED_EVENT_TYPE,
  COURSE_ENROLLED_EVENT_TYPE,
  COURSE_PROGRESS_UPDATED_EVENT_TYPE,
  CourseCompletionStatus,
  CourseContentStatus,
  CourseDto,
  CourseEnrollmentStatus,
  CourseOriginType,
  CourseProgressStatus,
  CourseQuestionType,
  CourseQuizAttemptDto,
  CourseLearnerWorkspaceDto,
  CourseQuizAttemptStatus,
  CourseStatus,
  CreateQuizAttemptDto,
  ICourseCurriculumRepository,
  ICourseEnrollmentPolicyRepository,
  ICourseFinancialClearanceGateway,
  ICourseProgressRepository,
  ICourseRepository,
  ITransactionalCourseProgressRepository,
  StudentCourseProgressSnapshotDto,
  SubmitQuizAttemptDto,
  UpsertLessonProgressDto,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class CourseProgressUseCases {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly curriculumRepository: ICourseCurriculumRepository,
    private readonly progressRepository: ICourseProgressRepository,
    private readonly enrollmentPolicies?: ICourseEnrollmentPolicyRepository,
    private readonly financialClearance?: ICourseFinancialClearanceGateway,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
  ) {}

  private async ensureTrackableCourse(courseId: string): Promise<CourseDto> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new Error(`Course with id ${courseId} not found`);
    if (course.originType === CourseOriginType.EXTERNAL_LINKED_COURSE) {
      throw new Error('External linked courses do not support MANARATAK enrollment or local progress tracking');
    }
    return course;
  }

  private async requireActiveEnrollment(courseId: string, studentReferenceId: string) {
    const enrollment = await this.progressRepository.findEnrollment(courseId, studentReferenceId);
    if (!enrollment) throw new Error('COURSE_ENROLLMENT_REQUIRED');
    if (enrollment.status !== CourseEnrollmentStatus.ACTIVE) throw new Error(`COURSE_ENROLLMENT_NOT_ACTIVE:${enrollment.status}`);
    return enrollment;
  }

  private async requireLearningAccessEnrollment(courseId: string, studentReferenceId: string) {
    const enrollment = await this.progressRepository.findEnrollment(courseId, studentReferenceId);
    if (!enrollment) throw new Error('COURSE_ENROLLMENT_REQUIRED');
    if (enrollment.status !== CourseEnrollmentStatus.ACTIVE && enrollment.status !== CourseEnrollmentStatus.COMPLETED) {
      throw new Error(`COURSE_ENROLLMENT_NOT_ACCESSIBLE:${enrollment.status}`);
    }
    return enrollment;
  }

  public async getLearningWorkspace(courseId: string, studentReferenceId: string): Promise<CourseLearnerWorkspaceDto> {
    await this.ensureTrackableCourse(courseId);
    await this.requireLearningAccessEnrollment(courseId, studentReferenceId);
    const [progress, curriculum] = await Promise.all([
      this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId),
      this.curriculumRepository.getCurriculumSnapshot(courseId),
    ]);
    if (!progress) throw new Error('COURSE_PROGRESS_SNAPSHOT_NOT_FOUND');

    const modules = curriculum.modules
      .filter(item => item.status !== CourseContentStatus.ARCHIVED)
      .sort((a, b) => a.position - b.position);
    const moduleIds = new Set(modules.map(item => item.id));
    const lessons = curriculum.lessons
      .filter(item => item.status !== CourseContentStatus.ARCHIVED && moduleIds.has(item.moduleId))
      .sort((a, b) => a.position - b.position);
    const lessonIds = new Set(lessons.map(item => item.id));
    const assets = curriculum.assets
      .filter(item => lessonIds.has(item.lessonId))
      .sort((a, b) => a.position - b.position)
      .map(item => ({
        id: item.id,
        lessonId: item.lessonId,
        title: item.title,
        assetType: item.assetType,
        position: item.position,
        isRequired: item.isRequired,
      }));
    const quizzes = curriculum.quizzes
      .filter(item => item.status !== CourseContentStatus.ARCHIVED
        && (!item.moduleId || moduleIds.has(item.moduleId))
        && (!item.lessonId || lessonIds.has(item.lessonId)))
      .sort((a, b) => a.position - b.position);
    const quizIds = new Set(quizzes.map(item => item.id));
    const questions = curriculum.questions
      .filter(item => item.status !== CourseContentStatus.ARCHIVED && Boolean(item.quizId) && quizIds.has(item.quizId as string))
      .sort((a, b) => a.position - b.position)
      .map(item => ({
        id: item.id,
        quizId: item.quizId,
        questionType: item.questionType,
        prompt: item.prompt,
        ...(item.choices == null ? {} : { choices: item.choices }),
        points: item.points,
        position: item.position,
      }));

    // Never expose correctAnswer or explanation in learner read models before submission.
    return { progress, curriculum: { modules, lessons, assets, quizzes, questions } };
  }

  public async enroll(
    courseId: string,
    studentReferenceId: string,
    context?: AtomicMutationRequestContext,
  ): Promise<StudentCourseProgressSnapshotDto> {
    const course = await this.ensureTrackableCourse(courseId);
    if (course.status !== CourseStatus.PUBLISHED) throw new Error('COURSE_ENROLLMENT_REQUIRES_PUBLISHED_COURSE');

    const policy = await this.enrollmentPolicies?.getPolicy(courseId);
    if (policy?.requiresApproval) throw new Error('COURSE_ENROLLMENT_APPROVAL_REQUIRED');
    if (policy?.eligibilityRules && Object.keys(policy.eligibilityRules).length > 0) {
      throw new Error('COURSE_ENROLLMENT_ELIGIBILITY_EVALUATOR_REQUIRED');
    }
    for (const prerequisiteCourseId of policy?.prerequisiteCourseIds ?? []) {
      if (!await this.progressRepository.findCompletion(prerequisiteCourseId, studentReferenceId)) {
        throw new Error(`COURSE_PREREQUISITE_NOT_COMPLETED:${prerequisiteCourseId}`);
      }
    }

    const existingEnrollment = await this.progressRepository.findEnrollment(courseId, studentReferenceId);
    if (existingEnrollment) {
      const existingSnapshot = await this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId);
      if (!existingSnapshot) throw new Error('Enrollment snapshot could not be loaded');
      return existingSnapshot;
    }

    const needsFinance = Boolean(policy?.requiresFinancialClearance || course.originType === CourseOriginType.PAID_COURSE || course.accessType === 'PAID');
    if (needsFinance) {
      if (!this.financialClearance) throw new Error('COURSE_FINANCIAL_CLEARANCE_NOT_CONFIGURED');
      if (!await this.financialClearance.hasCourseFinancialClearance(courseId, studentReferenceId)) {
        throw new Error('COURSE_FINANCIAL_CLEARANCE_REQUIRED');
      }
    }

    const transactional = this.progressRepository as Partial<ITransactionalCourseProgressRepository>;
    if (!this.atomicMutations || typeof transactional.withTransaction !== 'function') {
      throw new Error('COURSE_ENROLLMENT_ATOMIC_PERSISTENCE_REQUIRED');
    }
    const occurredAt = new Date();
    const enrollmentPayload: Record<string, unknown> = { courseId, studentReferenceId, occurredAt: occurredAt.toISOString() };
    await this.atomicMutations.execute({
      domain: 'COURSES', aggregateType: 'COURSE_ENROLLMENT', aggregateId: `${courseId}:${studentReferenceId}`,
      action: 'COURSE_ENROLLED', context: context ?? { actorId: studentReferenceId, actorType: 'STUDENT', source: 'learner-api' },
      outbox: {
        id: `course-enrolled:${courseId}:${studentReferenceId}`,
        eventType: COURSE_ENROLLED_EVENT_TYPE,
        payload: enrollmentPayload,
        metadata: { eventVersion: '1.0.0', category: 'LearningPlatform' },
      },
    }, async persistence => {
      const tx = (this.progressRepository as ITransactionalCourseProgressRepository).withTransaction(persistence);
      const enrollment = await tx.enrollWithCapacity(
        { courseId, studentReferenceId },
        policy?.isCapacityLimited ? policy.maximumSeats ?? null : null,
        Boolean(policy?.waitlistEnabled),
      );
      enrollmentPayload.enrollmentId = enrollment.id;
      enrollmentPayload.enrollmentStatus = enrollment.status;
      enrollmentPayload.progressPercentage = enrollment.progressPercentage;
      enrollmentPayload.enrolledAt = enrollment.enrolledAt.toISOString();
    });
    const snapshot = await this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId);
    if (!snapshot) throw new Error('Enrollment snapshot could not be created');
    return snapshot;
  }

  public async markLessonProgress(
    data: UpsertLessonProgressDto,
    context?: AtomicMutationRequestContext,
  ): Promise<StudentCourseProgressSnapshotDto> {
    await this.ensureTrackableCourse(data.courseId);
    const enrollment = await this.requireActiveEnrollment(data.courseId, data.studentReferenceId);
    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(data.courseId);
    if (!curriculum.lessons.some(lesson => lesson.id === data.lessonId && lesson.status !== CourseContentStatus.ARCHIVED)) {
      throw new Error('COURSE_LESSON_SCOPE_MISMATCH');
    }
    const trackableIds = new Set(curriculum.lessons
      .filter(lesson => lesson.lessonType !== 'QUIZ' && lesson.status !== CourseContentStatus.ARCHIVED)
      .map(lesson => lesson.id));
    const transactional = this.progressRepository as Partial<ITransactionalCourseProgressRepository>;
    if (!this.atomicMutations || typeof transactional.withTransaction !== 'function') {
      throw new Error('COURSE_PROGRESS_ATOMIC_PERSISTENCE_REQUIRED');
    }

    const normalizedPercentage = Math.max(0, Math.min(100, data.progressPercentage));
    const occurredAt = new Date();
    const eventPayload: Record<string, unknown> = {
      courseId: data.courseId, studentReferenceId: data.studentReferenceId, enrollmentId: enrollment.id,
      lessonId: data.lessonId, lessonProgressPercentage: normalizedPercentage,
      progressPercentage: enrollment.progressPercentage, enrollmentStatus: enrollment.status, occurredAt: occurredAt.toISOString(),
    };
    await this.atomicMutations.execute({
      domain: 'COURSES', aggregateType: 'COURSE_ENROLLMENT', aggregateId: enrollment.id,
      action: 'COURSE_PROGRESS_UPDATED', context: context ?? { actorId: data.studentReferenceId, actorType: 'STUDENT', source: 'learner-api' },
      outbox: {
        id: `course-progress:${enrollment.id}:${data.lessonId}:${normalizedPercentage}:${data.status}`,
        eventType: COURSE_PROGRESS_UPDATED_EVENT_TYPE, payload: eventPayload,
        metadata: { eventVersion: '1.0.0', category: 'LearningPlatform' },
      },
    }, async persistence => {
      const tx = (this.progressRepository as ITransactionalCourseProgressRepository).withTransaction(persistence);
      await tx.upsertLessonProgress({
        ...data,
        status: normalizedPercentage >= 100 ? CourseProgressStatus.COMPLETED : data.status,
        progressPercentage: normalizedPercentage,
      });
      const progress = await tx.listLessonProgress(data.courseId, data.studentReferenceId);
      const completed = new Set(progress
        .filter(record => trackableIds.has(record.lessonId) && record.status === CourseProgressStatus.COMPLETED)
        .map(record => record.lessonId));
      const overallPercentage = trackableIds.size === 0 ? 0 : Math.floor((completed.size / trackableIds.size) * 100);
      const updatedEnrollment = await tx.updateEnrollmentProgress(data.courseId, data.studentReferenceId, overallPercentage);
      eventPayload.progressPercentage = overallPercentage;
      eventPayload.enrollmentStatus = updatedEnrollment.status;
    });
    const snapshot = await this.progressRepository.getStudentProgressSnapshot(data.courseId, data.studentReferenceId);
    if (!snapshot) throw new Error('Progress snapshot could not be loaded');
    return snapshot;
  }

  public async startQuizAttempt(
    data: Omit<CreateQuizAttemptDto, 'attemptNumber'>,
  ): Promise<CourseQuizAttemptDto> {
    await this.ensureTrackableCourse(data.courseId);
    await this.requireActiveEnrollment(data.courseId, data.studentReferenceId);
    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(data.courseId);
    const quiz = curriculum.quizzes.find(item => item.id === data.quizId && item.status !== CourseContentStatus.ARCHIVED);
    if (!quiz) throw new Error('COURSE_QUIZ_SCOPE_MISMATCH');
    const attempts = await this.progressRepository.countQuizAttempts(quiz.id, data.studentReferenceId);
    if (quiz.maxAttempts != null && attempts >= quiz.maxAttempts) throw new Error('COURSE_QUIZ_MAX_ATTEMPTS_REACHED');
    return this.progressRepository.createQuizAttempt({ ...data, attemptNumber: attempts + 1 });
  }

  public async submitQuizAttempt(data: SubmitQuizAttemptDto): Promise<CourseQuizAttemptDto> {
    await this.ensureTrackableCourse(data.courseId);
    await this.requireActiveEnrollment(data.courseId, data.studentReferenceId);
    const attempt = await this.progressRepository.findQuizAttempt(data.attemptId);
    if (!attempt || attempt.courseId !== data.courseId || attempt.studentReferenceId !== data.studentReferenceId) {
      throw new Error('COURSE_QUIZ_ATTEMPT_SCOPE_MISMATCH');
    }
    if (attempt.status !== CourseQuizAttemptStatus.IN_PROGRESS || attempt.submittedAt) throw new Error('COURSE_QUIZ_ATTEMPT_ALREADY_SUBMITTED');

    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(data.courseId);
    const quiz = curriculum.quizzes.find(item => item.id === attempt.quizId && item.status !== CourseContentStatus.ARCHIVED);
    if (!quiz) throw new Error('COURSE_QUIZ_SCOPE_MISMATCH');
    if (quiz.passingScore == null) throw new Error('COURSE_QUIZ_PASSING_SCORE_REQUIRED');
    const questions = curriculum.questions.filter(q => q.quizId === quiz.id && q.status !== CourseContentStatus.ARCHIVED);
    if (questions.length === 0) throw new Error('COURSE_QUIZ_QUESTIONS_REQUIRED');
    if (questions.some(q => q.questionType === CourseQuestionType.ESSAY || q.questionType === CourseQuestionType.SHORT_ANSWER)) {
      throw new Error('COURSE_ASSESSMENT_MANUAL_GRADING_REQUIRED');
    }
    if (!data.answers || Array.isArray(data.answers)) throw new Error('COURSE_ASSESSMENT_ANSWER_MAP_REQUIRED');

    let earned = 0;
    let total = 0;
    for (const question of questions) {
      const points = Math.max(1, question.points);
      total += points;
      if (this.sameAnswer((data.answers as Record<string, unknown>)[question.id], question.correctAnswer)) earned += points;
    }
    const score = total > 0 ? Math.round((earned / total) * 10000) / 100 : 0;
    return this.progressRepository.submitQuizAttempt({
      attemptId: data.attemptId,
      score,
      passed: score >= quiz.passingScore,
      answers: data.answers,
    });
  }

  public async completeCourse(
    courseId: string,
    studentReferenceId: string,
    context?: AtomicMutationRequestContext,
  ): Promise<StudentCourseProgressSnapshotDto> {
    const course = await this.ensureTrackableCourse(courseId);
    const existing = await this.progressRepository.findCompletion(courseId, studentReferenceId);
    if (existing) {
      const completedSnapshot = await this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId);
      if (!completedSnapshot) throw new Error('COURSE_COMPLETION_SNAPSHOT_NOT_FOUND');
      return completedSnapshot;
    }
    const enrollment = await this.requireActiveEnrollment(courseId, studentReferenceId);
    const completionCriteria = course.optionalFields?.completionCriteria && typeof course.optionalFields.completionCriteria === 'object' && !Array.isArray(course.optionalFields.completionCriteria)
      ? course.optionalFields.completionCriteria as Record<string, unknown>
      : {};
    if (enrollment.progressPercentage < 100) throw new Error('Course progress must reach 100% before completion');
    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    const assessmentRequired = completionCriteria.assessmentRequired === true;
    if (assessmentRequired) {
      const requiredQuizzes = curriculum.quizzes.filter(quiz => quiz.status !== CourseContentStatus.ARCHIVED);
      if (requiredQuizzes.length === 0) throw new Error('COURSE_ASSESSMENT_REQUIRED_BUT_MISSING');
      const attempts = await this.progressRepository.listQuizAttempts(courseId, studentReferenceId);
      for (const quiz of requiredQuizzes) {
        if (quiz.passingScore == null) throw new Error(`COURSE_QUIZ_PASSING_SCORE_REQUIRED:${quiz.id}`);
        if (!attempts.some(attempt => attempt.quizId === quiz.id && attempt.passed === true)) {
          throw new Error(`COURSE_ASSESSMENT_NOT_PASSED:${quiz.id}`);
        }
      }
    }

    const transactional = this.progressRepository as Partial<ITransactionalCourseProgressRepository>;
    if (!this.atomicMutations || typeof transactional.withTransaction !== 'function') {
      throw new Error('COURSE_COMPLETION_ATOMIC_PERSISTENCE_REQUIRED');
    }
    const completionId = randomUUID();
    const completedAt = new Date();
    await this.atomicMutations.execute({
      domain: 'COURSES', aggregateType: 'COURSE_COMPLETION', aggregateId: `${courseId}:${studentReferenceId}`,
      action: 'COURSE_COMPLETED', context,
      outbox: {
        id: `course-completed:${courseId}:${studentReferenceId}:v${course.version}`,
        eventType: COURSE_COMPLETED_EVENT_TYPE,
        payload: {
          courseId, studentReferenceId, enrollmentId: enrollment.id, completionId, courseVersion: course.version,
          progressPercentage: 100, enrollmentStatus: CourseEnrollmentStatus.COMPLETED,
          enrolledAt: enrollment.enrolledAt.toISOString(), completedAt: completedAt.toISOString(), eligibleForCertificate: Boolean(course.certificateAvailable),
          certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform', sourcePhase: 'Phase 13 - Learning Platform',
        },
        metadata: { eventVersion: '1.0.0', category: 'LearningPlatform' },
      },
    }, async persistence => {
      const tx = (this.progressRepository as ITransactionalCourseProgressRepository).withTransaction(persistence);
      if (await tx.findCompletion(courseId, studentReferenceId)) return;
      const currentEnrollment = await tx.findEnrollment(courseId, studentReferenceId);
      if (!currentEnrollment || currentEnrollment.status !== CourseEnrollmentStatus.ACTIVE || currentEnrollment.progressPercentage < 100) {
        throw new Error('COURSE_COMPLETION_STATE_CHANGED');
      }
      await tx.completeCourse({
        id: completionId, courseId, studentReferenceId, courseVersion: course.version,
        status: course.certificateAvailable ? CourseCompletionStatus.CERTIFICATE_SIGNAL_READY : CourseCompletionStatus.COMPLETED,
        completionSource: 'PHASE_13_LEARNING_PROGRESS', eligibleForCertificate: Boolean(course.certificateAvailable),
        metadata: { phase14OwnsCertificateIssuance: true },
      });
      await tx.markEnrollmentCompleted(courseId, studentReferenceId);
    });

    const snapshot = await this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId);
    if (!snapshot) throw new Error('Completion snapshot could not be loaded');
    return snapshot;
  }

  public async getProgress(courseId: string, studentReferenceId: string): Promise<StudentCourseProgressSnapshotDto | null> {
    await this.ensureTrackableCourse(courseId);
    return this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId);
  }

  private sameAnswer(left: unknown, right: unknown): boolean {
    return this.stable(left) === this.stable(right);
  }

  private stable(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
    if (Array.isArray(value)) return `[${value.map(item => this.stable(item)).join(',')}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${this.stable(record[key])}`).join(',')}}`;
  }
}
