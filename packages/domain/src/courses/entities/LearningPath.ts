export enum LearningPathStatus {
  DRAFT = 'DRAFT',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum LearningPathEnrollmentStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface LearningPathCourseDto {
  courseId: string;
  position: number;
  required: boolean;
  prerequisiteCourseIds: string[];
}

export interface LearningPathDto {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  description?: string | null;
  status: LearningPathStatus;
  version: number;
  isStrictlyOrdered: boolean;
  completionLogic: 'ALL_REQUIRED' | 'ALL';
  courses: LearningPathCourseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLearningPathDto {
  publicId: string;
  slug: string;
  title: string;
  description?: string | null;
  isStrictlyOrdered?: boolean;
  completionLogic?: 'ALL_REQUIRED' | 'ALL';
  courses?: LearningPathCourseDto[];
}

export interface LearningPathEnrollmentDto {
  id: string;
  learningPathId: string;
  learningPathVersion: number;
  studentReferenceId: string;
  status: LearningPathEnrollmentStatus;
  progressPercentage: number;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
