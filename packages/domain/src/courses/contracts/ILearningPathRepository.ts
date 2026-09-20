import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import {
  CreateLearningPathDto,
  LearningPathDto,
  LearningPathEnrollmentDto,
  LearningPathEnrollmentStatus,
  LearningPathStatus,
} from '../entities/LearningPath';

export interface ILearningPathRepository {
  create(data: CreateLearningPathDto): Promise<LearningPathDto>;
  findById(id: string): Promise<LearningPathDto | null>;
  findBySlug(slug: string): Promise<LearningPathDto | null>;
  list(): Promise<LearningPathDto[]>;
  updateStatus(id: string, status: LearningPathStatus): Promise<LearningPathDto>;
  enroll(pathId: string, version: number, studentReferenceId: string): Promise<LearningPathEnrollmentDto>;
  findEnrollment(pathId: string, studentReferenceId: string): Promise<LearningPathEnrollmentDto | null>;
  updateEnrollmentProgress(pathId: string, studentReferenceId: string, progressPercentage: number, status: LearningPathEnrollmentStatus): Promise<LearningPathEnrollmentDto>;
}

export interface ITransactionalLearningPathRepository extends ILearningPathRepository {
  withTransaction(context: AtomicPersistenceContext): ILearningPathRepository;
}
