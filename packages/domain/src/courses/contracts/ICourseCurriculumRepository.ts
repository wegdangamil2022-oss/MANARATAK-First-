import {
  CourseLessonDto,
  CourseModuleDto,
  CourseQuestionBankDto,
  CourseQuestionDto,
  CourseQuizDto,
  CreateCourseLessonDto,
  CreateCourseModuleDto,
  CreateCourseQuestionBankDto,
  CreateCourseQuestionDto,
  CreateCourseQuizDto,
  CreateLessonAssetReferenceDto,
  LessonAssetReferenceDto,
  UpdateCourseLessonDto,
  UpdateCourseModuleDto,
  UpdateCourseQuestionBankDto,
  UpdateCourseQuestionDto,
  UpdateCourseQuizDto,
  CoursePositionUpdateDto
} from '../entities/CourseCurriculum';

export interface CourseCurriculumSnapshotDto {
  modules: CourseModuleDto[];
  lessons: CourseLessonDto[];
  assets: LessonAssetReferenceDto[];
  quizzes: CourseQuizDto[];
  questionBanks: CourseQuestionBankDto[];
  questions: CourseQuestionDto[];
}

export interface ICourseCurriculumRepository {
  createModule(data: CreateCourseModuleDto): Promise<CourseModuleDto>;
  updateModule(id: string, data: UpdateCourseModuleDto): Promise<CourseModuleDto>;
  deleteModule(id: string): Promise<void>;
  reorderModules(courseId: string, positions: CoursePositionUpdateDto[]): Promise<void>;
  listModulesByCourseId(courseId: string): Promise<CourseModuleDto[]>;

  createLesson(data: CreateCourseLessonDto): Promise<CourseLessonDto>;
  updateLesson(id: string, data: UpdateCourseLessonDto): Promise<CourseLessonDto>;
  deleteLesson(id: string): Promise<void>;
  reorderLessons(moduleId: string, positions: CoursePositionUpdateDto[]): Promise<void>;
  listLessonsByModuleId(moduleId: string): Promise<CourseLessonDto[]>;

  attachAssetToLesson(data: CreateLessonAssetReferenceDto): Promise<LessonAssetReferenceDto>;
  listAssetsByLessonId(lessonId: string): Promise<LessonAssetReferenceDto[]>;
  detachAssetFromLesson(id: string): Promise<void>;

  createQuiz(data: CreateCourseQuizDto): Promise<CourseQuizDto>;
  updateQuiz(id: string, data: UpdateCourseQuizDto): Promise<CourseQuizDto>;
  deleteQuiz(id: string): Promise<void>;
  listQuizzesByCourseId(courseId: string): Promise<CourseQuizDto[]>;

  createQuestionBank(data: CreateCourseQuestionBankDto): Promise<CourseQuestionBankDto>;
  updateQuestionBank(id: string, data: UpdateCourseQuestionBankDto): Promise<CourseQuestionBankDto>;
  deleteQuestionBank(id: string): Promise<void>;
  createQuestion(data: CreateCourseQuestionDto): Promise<CourseQuestionDto>;
  updateQuestion(id: string, data: UpdateCourseQuestionDto): Promise<CourseQuestionDto>;
  deleteQuestion(id: string): Promise<void>;
  listQuestionsByQuizId(quizId: string): Promise<CourseQuestionDto[]>;

  getCurriculumSnapshot(courseId: string): Promise<CourseCurriculumSnapshotDto>;
}
