import { randomUUID } from 'node:crypto';
import {
  LEARNING_PATH_COMPLETED_EVENT_TYPE,
  CreateLearningPathDto,
  ICourseProgressRepository,
  ICourseRepository,
  ILearningPathRepository,
  ITransactionalLearningPathRepository,
  LearningPathDto,
  LearningPathEnrollmentStatus,
  LearningPathStatus,
  CourseOriginType,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator, AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class LearningPathUseCases {
  public constructor(
    private readonly repository: ILearningPathRepository,
    private readonly courseRepository: ICourseRepository,
    private readonly progressRepository: ICourseProgressRepository,
    private readonly atomicMutations?: AtomicDomainMutationCoordinator,
  ) {}

  public async create(input: Omit<CreateLearningPathDto, 'publicId' | 'slug'> & { slug?: string }): Promise<LearningPathDto> {
    const courses = input.courses ?? [];
    if (!input.title.trim()) throw new Error('LEARNING_PATH_TITLE_REQUIRED');
    this.assertCourseGraph(courses);
    for (const item of courses) {
      const course = await this.courseRepository.findById(item.courseId);
      if (!course) throw new Error(`LEARNING_PATH_COURSE_NOT_FOUND:${item.courseId}`);
      if (course.originType !== CourseOriginType.NATIVE_MANARATAK_COURSE) {
        throw new Error(`LEARNING_PATH_NATIVE_COURSE_REQUIRED:${item.courseId}`);
      }
    }
    const identity = randomUUID().replace(/-/g, '');
    const slug = input.slug?.trim() || `${this.slug(input.title)}-${identity.slice(0, 8)}`;
    return this.repository.create({ ...input, courses, publicId: `LP-${identity.slice(0, 12).toUpperCase()}`, slug });
  }

  public async list(): Promise<LearningPathDto[]> {
    return this.repository.list();
  }

  public async get(id: string): Promise<LearningPathDto> {
    const path = await this.repository.findById(id);
    if (!path) throw new Error('LEARNING_PATH_NOT_FOUND');
    return path;
  }

  public async markReadyToPublish(id: string): Promise<LearningPathDto> {
    const path = await this.get(id);
    if (path.courses.length === 0) throw new Error('LEARNING_PATH_COURSES_REQUIRED');
    return this.repository.updateStatus(id, LearningPathStatus.READY_TO_PUBLISH);
  }

  public async publish(id: string): Promise<LearningPathDto> {
    const path = await this.get(id);
    if (path.status !== LearningPathStatus.READY_TO_PUBLISH) throw new Error('LEARNING_PATH_NOT_READY_TO_PUBLISH');
    for (const item of path.courses) {
      const course = await this.courseRepository.findById(item.courseId);
      if (!course || course.status !== 'PUBLISHED') throw new Error(`LEARNING_PATH_COURSE_NOT_PUBLISHED:${item.courseId}`);
      if (course.originType !== CourseOriginType.NATIVE_MANARATAK_COURSE) throw new Error(`LEARNING_PATH_NATIVE_COURSE_REQUIRED:${item.courseId}`);
    }
    return this.repository.updateStatus(id, LearningPathStatus.PUBLISHED);
  }

  public async archive(id: string): Promise<LearningPathDto> {
    const path = await this.get(id);
    if (path.status === LearningPathStatus.ARCHIVED) return path;
    return this.repository.updateStatus(id, LearningPathStatus.ARCHIVED);
  }

  public async enroll(pathId: string, studentReferenceId: string) {
    const path = await this.get(pathId);
    if (path.status !== LearningPathStatus.PUBLISHED) throw new Error('LEARNING_PATH_ENROLLMENT_REQUIRES_PUBLISHED_PATH');
    return this.repository.enroll(path.id, path.version, studentReferenceId);
  }

  public async refreshProgress(pathId: string, studentReferenceId: string, context?: AtomicMutationRequestContext) {
    const path = await this.get(pathId);
    const enrollment = await this.repository.findEnrollment(pathId, studentReferenceId);
    if (!enrollment || enrollment.status !== LearningPathEnrollmentStatus.ACTIVE) throw new Error('LEARNING_PATH_ACTIVE_ENROLLMENT_REQUIRED');
    const target = path.completionLogic === 'ALL' ? path.courses : path.courses.filter(item => item.required);
    const completed = new Set<string>();
    for (const item of target) if (await this.progressRepository.findCompletion(item.courseId, studentReferenceId)) completed.add(item.courseId);
    const percentage = target.length ? Math.floor(completed.size / target.length * 100) : 0;
    if (percentage < 100) return this.repository.updateEnrollmentProgress(pathId, studentReferenceId, percentage, LearningPathEnrollmentStatus.ACTIVE);

    const transactional = this.repository as Partial<ITransactionalLearningPathRepository>;
    if (!this.atomicMutations || typeof transactional.withTransaction !== 'function') throw new Error('LEARNING_PATH_COMPLETION_ATOMIC_PERSISTENCE_REQUIRED');
    const completedAt = new Date();
    await this.atomicMutations.execute({
      domain: 'COURSES', aggregateType: 'LEARNING_PATH_ENROLLMENT', aggregateId: enrollment.id,
      action: 'LEARNING_PATH_COMPLETED', context,
      outbox: {
        id: `learning-path-completed:${pathId}:${studentReferenceId}:v${enrollment.learningPathVersion}`,
        eventType: LEARNING_PATH_COMPLETED_EVENT_TYPE,
        payload: { learningPathId: pathId, studentReferenceId, completedAt: completedAt.toISOString(), eligibleForCertificate: false, certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform', sourcePhase: 'Phase 13 - Learning Platform' },
        metadata: { eventVersion: '1.0.0', category: 'LearningPlatform' },
      },
    }, async persistence => {
      const tx = (this.repository as ITransactionalLearningPathRepository).withTransaction(persistence);
      const current = await tx.findEnrollment(pathId, studentReferenceId);
      if (!current || current.status !== LearningPathEnrollmentStatus.ACTIVE) return;
      await tx.updateEnrollmentProgress(pathId, studentReferenceId, 100, LearningPathEnrollmentStatus.COMPLETED);
    });
    return this.repository.findEnrollment(pathId, studentReferenceId);
  }

  public async availableCourses(pathId: string, studentReferenceId: string): Promise<string[]> {
    const path = await this.get(pathId);
    const completed = new Set<string>();
    for (const item of path.courses) if (await this.progressRepository.findCompletion(item.courseId, studentReferenceId)) completed.add(item.courseId);
    return path.courses.filter(item => item.prerequisiteCourseIds.every(id => completed.has(id)) && (!path.isStrictlyOrdered || path.courses.filter(x => x.position < item.position && x.required).every(x => completed.has(x.courseId)))).map(item => item.courseId);
  }

  private assertCourseGraph(courses: NonNullable<CreateLearningPathDto['courses']>): void {
    const ids = new Set(courses.map(item => item.courseId));
    if (ids.size !== courses.length) throw new Error('LEARNING_PATH_DUPLICATE_COURSE');
    const positions = new Set(courses.map(item => item.position));
    if (positions.size !== courses.length) throw new Error('LEARNING_PATH_DUPLICATE_POSITION');
    for (const item of courses) for (const prerequisite of item.prerequisiteCourseIds) {
      if (prerequisite === item.courseId) throw new Error('LEARNING_PATH_SELF_PREREQUISITE');
      if (!ids.has(prerequisite)) throw new Error(`LEARNING_PATH_PREREQUISITE_NOT_IN_PATH:${prerequisite}`);
    }
  }
  private slug(value: string): string { return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 48) || 'learning-path'; }
}
