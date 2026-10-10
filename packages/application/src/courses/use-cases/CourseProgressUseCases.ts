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
  AssessmentReviewSnapshot,
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

  private learnerSnapshot(snapshot: StudentCourseProgressSnapshotDto): StudentCourseProgressSnapshotDto {
    return {...snapshot, quizAttempts: (snapshot.quizAttempts ?? []).map(attempt => {
      const grade = attempt.metadata?.assessmentGrade as {feedback?: string; gradedAt?: string} | undefined;
      return {...attempt, metadata: grade ? {assessmentGrade: {feedback: grade.feedback, gradedAt: grade.gradedAt}} : null};
    })};
  }

  private async ensureTrackableCourse(courseId: string): Promise<CourseDto> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new Error(`Course with id ${courseId} not found`);
    if (course.originType === CourseOriginType.EXTERNAL_LINKED_COURSE) {
      throw new Error('External linked courses do not support MANARATAK enrollment or local progress tracking');
    }
    if (course.status !== CourseStatus.PUBLISHED) throw new Error('COURSE_LEARNING_REQUIRES_PUBLISHED_COURSE');
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

  public async resolveLearningAsset(courseId: string, lessonId: string, assetReferenceId: string, studentReferenceId: string): Promise<string> {
    await this.ensureTrackableCourse(courseId);
    await this.requireLearningAccessEnrollment(courseId, studentReferenceId);
    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    const lesson = curriculum.lessons.find(row => row.id === lessonId && row.status !== CourseContentStatus.ARCHIVED);
    const module = lesson && curriculum.modules.find(row => row.id === lesson.moduleId && row.status !== CourseContentStatus.ARCHIVED);
    const asset = curriculum.assets.find(row => row.id === assetReferenceId && row.lessonId === lessonId);
    if (!lesson || !module || !asset) throw new Error('COURSE_LEARNING_ASSET_NOT_FOUND');
    return asset.assetId;
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

    const publicModules = modules.map(({id,courseId,title,description,position,status}) => ({id,courseId,title,description,position,status}));
    const publicLessons = lessons.map(({id,courseId,moduleId,title,summary,lessonType,position,estimatedDurationMinutes,contentText,status}) =>
      ({id,courseId,moduleId,title,summary,lessonType,position,estimatedDurationMinutes,contentText,status}));
    const publicQuizzes = quizzes.map(({id,courseId,moduleId,lessonId,title,instructions,position,passingScore,maxAttempts,assessmentType,status}) =>
      ({id,courseId,moduleId,lessonId,title,instructions,position,passingScore,maxAttempts,assessmentType,status}));
    return { progress: this.learnerSnapshot(progress), curriculum: { modules:publicModules, lessons:publicLessons, assets, quizzes:publicQuizzes, questions } };
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
      return this.learnerSnapshot(existingSnapshot);
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
    return this.learnerSnapshot(snapshot);
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
    if (!Number.isFinite(data.progressPercentage)) throw new Error('COURSE_PROGRESS_PERCENTAGE_INVALID');
    const activeModules = new Set(curriculum.modules.filter(module => module.status !== CourseContentStatus.ARCHIVED).map(module => module.id));
    const targetLesson = curriculum.lessons.find(lesson => lesson.id === data.lessonId)!;
    if (!activeModules.has(targetLesson.moduleId) || targetLesson.lessonType === 'QUIZ') throw new Error('COURSE_LESSON_NOT_TRACKABLE');
    const trackableIds = new Set(curriculum.lessons
      .filter(lesson => lesson.lessonType !== 'QUIZ' && lesson.status !== CourseContentStatus.ARCHIVED && activeModules.has(lesson.moduleId))
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
        status: normalizedPercentage >= 100 ? CourseProgressStatus.COMPLETED : CourseProgressStatus.IN_PROGRESS,
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
    return this.learnerSnapshot(snapshot);
  }

  public async startQuizAttempt(
    data: Omit<CreateQuizAttemptDto, 'attemptNumber'>,
  ): Promise<CourseQuizAttemptDto> {
    await this.ensureTrackableCourse(data.courseId);
    await this.requireActiveEnrollment(data.courseId, data.studentReferenceId);
    const curriculum = await this.curriculumRepository.getCurriculumSnapshot(data.courseId);
    const quiz = curriculum.quizzes.find(item => item.id === data.quizId && item.status !== CourseContentStatus.ARCHIVED);
    if (!quiz) throw new Error('COURSE_QUIZ_SCOPE_MISMATCH');
    const existing = (await this.progressRepository.listQuizAttempts(data.courseId, data.studentReferenceId))
      .find(attempt => attempt.quizId === quiz.id && attempt.status === CourseQuizAttemptStatus.IN_PROGRESS && !attempt.submittedAt);
    if (existing) return existing;
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
    if (!data.answers || Array.isArray(data.answers)) throw new Error('COURSE_ASSESSMENT_ANSWER_MAP_REQUIRED');

    const answerMap = data.answers as Record<string, unknown>;
    if (Object.keys(answerMap).some(id => !questions.some(q => q.id === id))) throw new Error('COURSE_ASSESSMENT_UNKNOWN_QUESTION');
    if (JSON.stringify(answerMap).length > 100000) throw new Error('COURSE_ASSESSMENT_ANSWERS_TOO_LARGE');
    const manualQuestions: AssessmentReviewSnapshot['questions'] = [];
    let earned = 0;
    let total = 0;
    for (const question of questions) {
      const points = question.points;
      if (!Number.isFinite(points) || points <= 0) throw new Error('COURSE_ASSESSMENT_INVALID_POINTS');
      total += points;
      if (question.questionType === CourseQuestionType.ESSAY || question.questionType === CourseQuestionType.SHORT_ANSWER) {
        if (typeof answerMap[question.id] !== 'string' || !(answerMap[question.id] as string).trim()) throw new Error('COURSE_ASSESSMENT_WRITTEN_ANSWER_REQUIRED');
        manualQuestions.push({id: question.id, prompt: question.prompt, maximumPoints: points});
        continue;
      }
      if (question.correctAnswer === undefined || question.correctAnswer === null) throw new Error('COURSE_ASSESSMENT_ANSWER_KEY_REQUIRED');
      if (this.sameAnswer((data.answers as Record<string, unknown>)[question.id], question.correctAnswer)) earned += points;
    }
    if (manualQuestions.length) {
      if (!this.progressRepository.submitAssessmentForReview) throw new Error('COURSE_MANUAL_GRADING_PERSISTENCE_REQUIRED');
      return this.progressRepository.submitAssessmentForReview({attemptId: data.attemptId, answers: answerMap,
        review: {passingScore: quiz.passingScore, totalPoints: total, automaticPoints: earned, questions: manualQuestions}});
    }
    const score = total > 0 ? Math.round((earned / total) * 10000) / 100 : 0;
    return this.progressRepository.submitQuizAttempt({
      attemptId: data.attemptId,
      score,
      passed: score >= quiz.passingScore,
      answers: data.answers,
    });
  }

  public async listPendingAssessments(courseId: string, page = 1, pageSize = 20): Promise<CourseQuizAttemptDto[]> {
    if (!await this.courseRepository.findById(courseId)) throw new Error('COURSE_NOT_FOUND');
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) throw new Error('COURSE_REVIEW_PAGINATION_INVALID');
    if (!this.progressRepository.listPendingAssessments) throw new Error('COURSE_MANUAL_GRADING_PERSISTENCE_REQUIRED');
    return this.progressRepository.listPendingAssessments(courseId, page, pageSize);
  }

  public async gradeAssessment(courseId: string, attemptId: string, input: {
    expectedSubmittedAt: string; questionScores: Record<string, number>; feedback: string; reason: string;
  }, context: AtomicMutationRequestContext): Promise<CourseQuizAttemptDto> {
    if (!context.actorId || !input.reason.trim() || input.reason.trim().length < 3 || input.reason.length > 2000 || input.feedback.length > 5000) throw new Error('COURSE_REVIEW_CONTEXT_REQUIRED');
    const attempt = await this.progressRepository.findQuizAttempt(attemptId);
    if (!attempt || attempt.courseId !== courseId) throw new Error('COURSE_QUIZ_ATTEMPT_SCOPE_MISMATCH');
    if (attempt.status !== CourseQuizAttemptStatus.SUBMITTED || !attempt.submittedAt) throw new Error('COURSE_ASSESSMENT_NOT_PENDING');
    if (attempt.submittedAt.toISOString() !== input.expectedSubmittedAt) throw new Error('COURSE_ASSESSMENT_REVIEW_CONFLICT');
    const review = attempt.metadata?.assessmentReview as AssessmentReviewSnapshot | undefined;
    if (!review || !Array.isArray(review.questions) || !review.questions.length || review.questions.some(q => !Number.isFinite(q.maximumPoints) || q.maximumPoints <= 0) || new Set(review.questions.map(q => q.id)).size !== review.questions.length || !Number.isFinite(review.totalPoints) || review.totalPoints <= 0 || !Number.isFinite(review.automaticPoints) || review.automaticPoints < 0 || !Number.isFinite(review.passingScore) || review.passingScore < 0 || review.passingScore > 100) throw new Error('COURSE_REVIEW_SNAPSHOT_REQUIRED');
    if (Object.keys(input.questionScores).length !== review.questions.length || Object.keys(input.questionScores).some(id => !review.questions.some(q => q.id === id))) throw new Error('COURSE_REVIEW_QUESTION_SCOPE_MISMATCH');
    let earned = review.automaticPoints;
    for (const question of review.questions) {
      const points = input.questionScores[question.id];
      if (!Number.isFinite(points) || points < 0 || points > question.maximumPoints) throw new Error('COURSE_REVIEW_POINTS_OUT_OF_RANGE');
      earned += points;
    }
    if (earned > review.totalPoints) throw new Error('COURSE_REVIEW_POINTS_OUT_OF_RANGE');
    const score = Math.round(earned / review.totalPoints * 10000) / 100;
    const transactional = this.progressRepository as Partial<ITransactionalCourseProgressRepository>;
    if (!this.atomicMutations || !transactional.withTransaction) throw new Error('COURSE_REVIEW_ATOMIC_PERSISTENCE_REQUIRED');
    return this.atomicMutations.execute({domain: 'COURSES', aggregateType: 'COURSE_QUIZ_ATTEMPT', aggregateId: attemptId,
      action: 'COURSE_ASSESSMENT_GRADED', context,
      auditMetadata: {courseId, reason: input.reason.trim(), score},
      outbox: {eventType: 'COURSE_ASSESSMENT_GRADED', payload: {courseId, attemptId, studentReferenceId: attempt.studentReferenceId, score, passed: score >= review.passingScore}},
    }, async tx => {
      const repo = transactional.withTransaction!(tx);
      if (!repo.gradeAssessment) throw new Error('COURSE_MANUAL_GRADING_PERSISTENCE_REQUIRED');
      return repo.gradeAssessment({attemptId, courseId, expectedSubmittedAt: input.expectedSubmittedAt, score,
        passed: score >= review.passingScore, reviewerId: context.actorId, reason: input.reason.trim(), feedback: input.feedback.trim(), questionScores: input.questionScores});
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
      return this.learnerSnapshot(completedSnapshot);
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
    return this.learnerSnapshot(snapshot);
  }

  public async getProgress(courseId: string, studentReferenceId: string): Promise<StudentCourseProgressSnapshotDto | null> {
    await this.ensureTrackableCourse(courseId);
    const snapshot = await this.progressRepository.getStudentProgressSnapshot(courseId, studentReferenceId);
    return snapshot ? this.learnerSnapshot(snapshot) : null;
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
