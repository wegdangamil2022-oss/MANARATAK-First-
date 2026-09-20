import { CourseContentStatus } from '../enums/CourseContentStatus';
import { CourseLessonType } from '../enums/CourseLessonType';
import { CourseQuestionType } from '../enums/CourseQuestionType';
import { LessonAssetType } from '../enums/LessonAssetType';

export interface CreateCourseModuleDto {
  courseId: string;
  title: string;
  description?: string;
  position: number;
  status?: CourseContentStatus;
}

export interface UpdateCourseModuleDto {
  title?: string;
  description?: string | null;
  position?: number;
  status?: CourseContentStatus;
}

export interface CourseModuleDto extends Required<Omit<CreateCourseModuleDto, 'description' | 'status'>> {
  id: string;
  description?: string | null;
  status: CourseContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseLessonDto {
  courseId: string;
  moduleId: string;
  title: string;
  summary?: string;
  lessonType: CourseLessonType;
  position: number;
  estimatedDurationMinutes?: number;
  contentText?: string;
  status?: CourseContentStatus;
}

export interface UpdateCourseLessonDto {
  title?: string;
  summary?: string | null;
  lessonType?: CourseLessonType;
  position?: number;
  estimatedDurationMinutes?: number | null;
  contentText?: string | null;
  status?: CourseContentStatus;
}

export interface CourseLessonDto extends Required<Omit<CreateCourseLessonDto, 'summary' | 'estimatedDurationMinutes' | 'contentText' | 'status'>> {
  id: string;
  summary?: string | null;
  estimatedDurationMinutes?: number | null;
  contentText?: string | null;
  status: CourseContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLessonAssetReferenceDto {
  lessonId: string;
  assetId: string;
  assetReference?: string;
  title?: string;
  assetType: LessonAssetType;
  position: number;
  isRequired?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LessonAssetReferenceDto extends Required<Omit<CreateLessonAssetReferenceDto, 'assetReference' | 'title' | 'isRequired' | 'metadata'>> {
  id: string;
  assetReference?: string | null;
  title?: string | null;
  isRequired: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseQuizDto {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  instructions?: string;
  position: number;
  passingScore?: number;
  maxAttempts?: number;
  status?: CourseContentStatus;
}

export interface CourseQuizDto extends Required<Omit<CreateCourseQuizDto, 'moduleId' | 'lessonId' | 'instructions' | 'passingScore' | 'maxAttempts' | 'status'>> {
  id: string;
  moduleId?: string | null;
  lessonId?: string | null;
  instructions?: string | null;
  passingScore?: number | null;
  maxAttempts?: number | null;
  status: CourseContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCourseQuizDto {
  moduleId?: string | null;
  lessonId?: string | null;
  title?: string;
  instructions?: string | null;
  position?: number;
  passingScore?: number | null;
  maxAttempts?: number | null;
  status?: CourseContentStatus;
}

export interface CreateCourseQuestionBankDto {
  courseId: string;
  title: string;
  description?: string;
  status?: CourseContentStatus;
}

export interface CourseQuestionBankDto extends Required<Omit<CreateCourseQuestionBankDto, 'description' | 'status'>> {
  id: string;
  description?: string | null;
  status: CourseContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCourseQuestionBankDto {
  title?: string;
  description?: string | null;
  status?: CourseContentStatus;
}

export interface CreateCourseQuestionDto {
  courseId: string;
  quizId?: string;
  questionBankId?: string;
  questionType: CourseQuestionType;
  prompt: string;
  choices?: Record<string, unknown> | readonly unknown[];
  correctAnswer?: Record<string, unknown> | readonly unknown[] | string | boolean | number;
  explanation?: string;
  points?: number;
  position: number;
  status?: CourseContentStatus;
}

export interface CourseQuestionDto extends Required<Omit<CreateCourseQuestionDto, 'quizId' | 'questionBankId' | 'choices' | 'correctAnswer' | 'explanation' | 'points' | 'status'>> {
  id: string;
  version: number;
  quizId?: string | null;
  questionBankId?: string | null;
  choices?: unknown;
  correctAnswer?: unknown;
  explanation?: string | null;
  points: number;
  status: CourseContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCourseQuestionDto {
  quizId?: string | null;
  questionBankId?: string | null;
  questionType?: CourseQuestionType;
  prompt?: string;
  choices?: Record<string, unknown> | readonly unknown[] | null;
  correctAnswer?: Record<string, unknown> | readonly unknown[] | string | boolean | number | null;
  explanation?: string | null;
  points?: number;
  position?: number;
  status?: CourseContentStatus;
}

export interface CoursePositionUpdateDto {
  id: string;
  position: number;
}
