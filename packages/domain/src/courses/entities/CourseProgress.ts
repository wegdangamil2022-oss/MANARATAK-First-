import { CourseCompletionStatus } from '../enums/CourseCompletionStatus';
import { CourseEnrollmentStatus } from '../enums/CourseEnrollmentStatus';
import { CourseProgressStatus } from '../enums/CourseProgressStatus';
import { CourseQuizAttemptStatus } from '../enums/CourseQuizAttemptStatus';

export interface CreateCourseEnrollmentDto {
  courseId: string;
  studentReferenceId: string;
  status?: CourseEnrollmentStatus;
  metadata?: Record<string, unknown>;
}

export interface CourseEnrollmentDto extends Required<Omit<CreateCourseEnrollmentDto, 'status' | 'metadata'>> {
  id: string;
  status: CourseEnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date | null;
  progressPercentage: number;
  lastAccessedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertLessonProgressDto {
  courseId: string;
  lessonId: string;
  studentReferenceId: string;
  status: CourseProgressStatus;
  progressPercentage: number;
  timeSpentSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface CourseLessonProgressDto extends Required<Omit<UpsertLessonProgressDto, 'timeSpentSeconds' | 'metadata'>> {
  id: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  timeSpentSeconds?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuizAttemptDto {
  courseId: string;
  quizId: string;
  studentReferenceId: string;
  attemptNumber: number;
  answers?: Record<string, unknown> | readonly unknown[];
  metadata?: Record<string, unknown>;
}

export interface SubmitQuizAttemptDto {
  attemptId: string;
  courseId: string;
  studentReferenceId: string;
  answers: Record<string, unknown> | readonly unknown[];
}

/** Internal repository command. Score/pass are server-derived and never accepted from HTTP callers. */
export interface GradeQuizAttemptDto {
  attemptId: string;
  score: number;
  passed: boolean;
  answers: Record<string, unknown> | readonly unknown[];
}

export interface CourseQuizAttemptDto extends Required<Omit<CreateQuizAttemptDto, 'answers' | 'metadata'>> {
  id: string;
  status: CourseQuizAttemptStatus;
  score?: number | null;
  passed?: boolean | null;
  answers?: unknown;
  startedAt: Date;
  submittedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseCompletionDto {
  id?: string;
  courseId: string;
  studentReferenceId: string;
  status: CourseCompletionStatus;
  completionSource: string;
  eligibleForCertificate: boolean;
  courseVersion: number;
  metadata?: Record<string, unknown>;
}

export interface CourseCompletionDto extends Required<Omit<CreateCourseCompletionDto, 'metadata' | 'id'>> {
  id: string;
  completedAt: Date;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentCourseProgressSnapshotDto {
  enrollment: CourseEnrollmentDto;
  lessons: CourseLessonProgressDto[];
  quizAttempts: CourseQuizAttemptDto[];
  completion?: CourseCompletionDto | null;
}

export interface CourseLearnerQuestionDto {
  id: string;
  quizId?: string | null;
  questionType: string;
  prompt: string;
  choices?: unknown;
  points: number;
  position: number;
}

export interface CourseLearnerAssetDto {
  id: string;
  lessonId: string;
  title?: string | null;
  assetType: string;
  position: number;
  isRequired: boolean;
}

export interface CourseLearnerWorkspaceDto {
  progress: StudentCourseProgressSnapshotDto;
  curriculum: {
    modules: import('./CourseCurriculum').CourseModuleDto[];
    lessons: import('./CourseCurriculum').CourseLessonDto[];
    assets: CourseLearnerAssetDto[];
    quizzes: import('./CourseCurriculum').CourseQuizDto[];
    questions: CourseLearnerQuestionDto[];
  };
}
