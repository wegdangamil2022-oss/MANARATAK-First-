import {
  AssetId,
  AssetLifecycleState,
  AssetSecurityClassification,
  CourseDto,
  CourseOriginType,
  CoursePositionUpdateDto,
  CourseStatus,
  CourseCurriculumSnapshotDto,
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
  ICourseCurriculumRepository,
  ICourseRepository,
  IAssetRecordRepository,
  LessonAssetReferenceDto,
  UpdateCourseLessonDto,
  UpdateCourseModuleDto,
  UpdateCourseQuestionBankDto,
  UpdateCourseQuestionDto,
  UpdateCourseQuizDto,
} from '@manaratak/domain';

export class CourseCurriculumUseCases {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly curriculumRepository: ICourseCurriculumRepository,
    private readonly assetRepository?: IAssetRecordRepository,
  ) {}

  private async ensureAuthorableCourse(courseId: string): Promise<CourseDto> {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }
    if (course.originType === CourseOriginType.EXTERNAL_LINKED_COURSE) {
      throw new Error('External linked courses cannot own native curriculum content');
    }
    return course;
  }

  private ensureEapAssetReference(data: CreateLessonAssetReferenceDto): void {
    if (!data.assetId || data.assetId.trim().length === 0) {
      throw new Error('Lesson assets must reference Phase 05 EAP using assetId');
    }
    if (/^https?:\/\//i.test(data.assetId)) {
      throw new Error('Lesson assets must not store raw URLs as assetId');
    }
    if (data.assetReference && /^https?:\/\//i.test(data.assetReference)) {
      throw new Error('Lesson assets must not store raw URLs as assetReference');
    }
  }

  private async ensureMutableCourse(courseId: string): Promise<CourseDto> {
    const course = await this.ensureAuthorableCourse(courseId);
    if (course.status === CourseStatus.PUBLISHED || course.status === CourseStatus.ARCHIVED) {
      throw new Error('PUBLISHED_OR_ARCHIVED_COURSE_CONTENT_MUTATION_FORBIDDEN');
    }
    return course;
  }

  private async ensureCurriculumMember(
    courseId: string,
    kind: keyof CourseCurriculumSnapshotDto,
    id: string,
  ): Promise<void> {
    const snapshot = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    const collection = snapshot[kind] as Array<{ id: string }>;
    if (!collection.some((item) => item.id === id))
      throw new Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
  }


  private async checkpointCourseVersion(courseId: string): Promise<void> {
    // PrismaCourseRepository turns even a no-field update into an immutable
    // version checkpoint containing the complete current curriculum snapshot.
    await this.courseRepository.update(courseId, {});
  }

  private assertExactIds(expected: readonly string[], actual: readonly string[], code: string): void {
    const left = [...new Set(expected)].sort();
    const right = [...new Set(actual)].sort();
    if (left.length !== right.length || left.some((value, index) => value !== right[index])) {
      throw new Error(code);
    }
  }

  private async assertQuizReferences(
    courseId: string,
    moduleId?: string | null,
    lessonId?: string | null,
  ): Promise<void> {
    const snapshot = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    if (moduleId && !snapshot.modules.some((item) => item.id === moduleId))
      throw new Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
    if (lessonId) {
      const lesson = snapshot.lessons.find((item) => item.id === lessonId);
      if (!lesson) throw new Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
      if (moduleId && lesson.moduleId !== moduleId) throw new Error('COURSE_QUIZ_MODULE_LESSON_MISMATCH');
    }
  }

  private async assertQuestionReferences(
    courseId: string,
    quizId?: string | null,
    questionBankId?: string | null,
  ): Promise<void> {
    const snapshot = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    if (quizId && !snapshot.quizzes.some((item) => item.id === quizId))
      throw new Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
    if (questionBankId && !snapshot.questionBanks.some((item) => item.id === questionBankId))
      throw new Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
  }

  public async createModule(data: CreateCourseModuleDto): Promise<CourseModuleDto> {
    await this.ensureMutableCourse(data.courseId);
    const created = await this.curriculumRepository.createModule(data);
    await this.checkpointCourseVersion(data.courseId);
    return created;
  }

  public async updateModule(
    courseId: string,
    moduleId: string,
    data: UpdateCourseModuleDto,
  ): Promise<CourseModuleDto> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'modules', moduleId);
    const updated = await this.curriculumRepository.updateModule(moduleId, data);
    await this.checkpointCourseVersion(courseId);
    return updated;
  }

  public async deleteModule(courseId: string, moduleId: string): Promise<void> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'modules', moduleId);
    await this.curriculumRepository.deleteModule(moduleId);
    await this.checkpointCourseVersion(courseId);
  }

  public async reorderModules(
    courseId: string,
    positions: CoursePositionUpdateDto[],
  ): Promise<void> {
    await this.ensureMutableCourse(courseId);
    const snapshot = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    this.assertExactIds(snapshot.modules.map((item) => item.id), positions.map((item) => item.id), 'COURSE_MODULE_REORDER_MUST_INCLUDE_ALL_MODULES');
    await this.curriculumRepository.reorderModules(courseId, positions);
    await this.checkpointCourseVersion(courseId);
  }

  public async listModules(courseId: string): Promise<CourseModuleDto[]> {
    await this.ensureAuthorableCourse(courseId);
    return this.curriculumRepository.listModulesByCourseId(courseId);
  }

  public async createLesson(data: CreateCourseLessonDto): Promise<CourseLessonDto> {
    await this.ensureMutableCourse(data.courseId);
    await this.ensureCurriculumMember(data.courseId, 'modules', data.moduleId);
    const created = await this.curriculumRepository.createLesson(data);
    await this.checkpointCourseVersion(data.courseId);
    return created;
  }

  public async updateLesson(
    courseId: string,
    lessonId: string,
    data: UpdateCourseLessonDto,
  ): Promise<CourseLessonDto> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'lessons', lessonId);
    const updated = await this.curriculumRepository.updateLesson(lessonId, data);
    await this.checkpointCourseVersion(courseId);
    return updated;
  }

  public async deleteLesson(courseId: string, lessonId: string): Promise<void> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'lessons', lessonId);
    await this.curriculumRepository.deleteLesson(lessonId);
    await this.checkpointCourseVersion(courseId);
  }

  public async reorderLessons(
    courseId: string,
    moduleId: string,
    positions: CoursePositionUpdateDto[],
  ): Promise<void> {
    await this.ensureMutableCourse(courseId);
    const snapshot = await this.curriculumRepository.getCurriculumSnapshot(courseId);
    if (!snapshot.modules.some((item) => item.id === moduleId)) throw new Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
    const moduleLessons = snapshot.lessons.filter((item) => item.moduleId === moduleId);
    this.assertExactIds(moduleLessons.map((item) => item.id), positions.map((item) => item.id), 'COURSE_LESSON_REORDER_MUST_INCLUDE_ALL_LESSONS');
    await this.curriculumRepository.reorderLessons(moduleId, positions);
    await this.checkpointCourseVersion(courseId);
  }

  public async listLessons(courseId: string, moduleId: string): Promise<CourseLessonDto[]> {
    await this.ensureAuthorableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'modules', moduleId);
    return this.curriculumRepository.listLessonsByModuleId(moduleId);
  }

  public async attachAssetToLesson(
    courseId: string,
    data: CreateLessonAssetReferenceDto,
  ): Promise<LessonAssetReferenceDto> {
    this.ensureEapAssetReference(data);
    if (!this.assetRepository) throw new Error('COURSE_ASSET_PLATFORM_NOT_CONFIGURED');
    const asset = await this.assetRepository.findById(new AssetId(data.assetId));
    if (!asset) throw new Error('COURSE_LESSON_ASSET_NOT_FOUND');
    if (asset.state !== AssetLifecycleState.ACTIVE) {
      throw new Error(`COURSE_LESSON_ASSET_NOT_ACTIVE:${asset.state}`);
    }
    if (![AssetSecurityClassification.PUBLIC, AssetSecurityClassification.INTERNAL].includes(asset.classification)) {
      throw new Error(`COURSE_LESSON_ASSET_CLASSIFICATION_NOT_ALLOWED:${asset.classification}`);
    }
    const allowedMimePrefixes: Record<string, readonly string[]> = {
      VIDEO: ['video/'], IMAGE: ['image/'], PDF: ['application/pdf'],
      DOCUMENT: ['application/', 'text/'], AUDIO: ['audio/'], SUBTITLE: ['text/'], OTHER: [],
    };
    const allowed = allowedMimePrefixes[data.assetType] ?? [];
    if (allowed.length && !allowed.some((prefix) => asset.metadata.mimeType.toLowerCase().startsWith(prefix))) {
      throw new Error(`COURSE_LESSON_ASSET_MIME_NOT_ALLOWED:${asset.metadata.mimeType}`);
    }
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'lessons', data.lessonId);
    const created = await this.curriculumRepository.attachAssetToLesson(data);
    await this.checkpointCourseVersion(courseId);
    return created;
  }

  public async detachAssetFromLesson(courseId: string, assetId: string): Promise<void> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'assets', assetId);
    await this.curriculumRepository.detachAssetFromLesson(assetId);
    await this.checkpointCourseVersion(courseId);
  }

  public async listLessonAssets(courseId: string, lessonId: string): Promise<LessonAssetReferenceDto[]> {
    await this.ensureAuthorableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'lessons', lessonId);
    return this.curriculumRepository.listAssetsByLessonId(lessonId);
  }

  public async createQuiz(data: CreateCourseQuizDto): Promise<CourseQuizDto> {
    await this.ensureMutableCourse(data.courseId);
    await this.assertQuizReferences(data.courseId, data.moduleId, data.lessonId);
    const created = await this.curriculumRepository.createQuiz(data);
    await this.checkpointCourseVersion(data.courseId);
    return created;
  }

  public async updateQuiz(
    courseId: string,
    quizId: string,
    data: UpdateCourseQuizDto,
  ): Promise<CourseQuizDto> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'quizzes', quizId);
    await this.assertQuizReferences(courseId, data.moduleId, data.lessonId);
    const updated = await this.curriculumRepository.updateQuiz(quizId, data);
    await this.checkpointCourseVersion(courseId);
    return updated;
  }

  public async deleteQuiz(courseId: string, quizId: string): Promise<void> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'quizzes', quizId);
    await this.curriculumRepository.deleteQuiz(quizId);
    await this.checkpointCourseVersion(courseId);
  }

  public async listQuizzes(courseId: string): Promise<CourseQuizDto[]> {
    await this.ensureAuthorableCourse(courseId);
    return this.curriculumRepository.listQuizzesByCourseId(courseId);
  }

  public async createQuestionBank(
    data: CreateCourseQuestionBankDto,
  ): Promise<CourseQuestionBankDto> {
    await this.ensureMutableCourse(data.courseId);
    const created = await this.curriculumRepository.createQuestionBank(data);
    await this.checkpointCourseVersion(data.courseId);
    return created;
  }

  public async updateQuestionBank(
    courseId: string,
    bankId: string,
    data: UpdateCourseQuestionBankDto,
  ): Promise<CourseQuestionBankDto> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'questionBanks', bankId);
    const updated = await this.curriculumRepository.updateQuestionBank(bankId, data);
    await this.checkpointCourseVersion(courseId);
    return updated;
  }

  public async deleteQuestionBank(courseId: string, bankId: string): Promise<void> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'questionBanks', bankId);
    await this.curriculumRepository.deleteQuestionBank(bankId);
    await this.checkpointCourseVersion(courseId);
  }

  public async createQuestion(data: CreateCourseQuestionDto): Promise<CourseQuestionDto> {
    await this.ensureMutableCourse(data.courseId);
    await this.assertQuestionReferences(data.courseId, data.quizId, data.questionBankId);
    const created = await this.curriculumRepository.createQuestion(data);
    await this.checkpointCourseVersion(data.courseId);
    return created;
  }

  public async updateQuestion(
    courseId: string,
    questionId: string,
    data: UpdateCourseQuestionDto,
  ): Promise<CourseQuestionDto> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'questions', questionId);
    await this.assertQuestionReferences(courseId, data.quizId, data.questionBankId);
    const updated = await this.curriculumRepository.updateQuestion(questionId, data);
    await this.checkpointCourseVersion(courseId);
    return updated;
  }

  public async deleteQuestion(courseId: string, questionId: string): Promise<void> {
    await this.ensureMutableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'questions', questionId);
    await this.curriculumRepository.deleteQuestion(questionId);
    await this.checkpointCourseVersion(courseId);
  }

  public async listQuizQuestions(courseId: string, quizId: string): Promise<CourseQuestionDto[]> {
    await this.ensureAuthorableCourse(courseId);
    await this.ensureCurriculumMember(courseId, 'quizzes', quizId);
    return this.curriculumRepository.listQuestionsByQuizId(quizId);
  }

  public async getCurriculumSnapshot(courseId: string): Promise<CourseCurriculumSnapshotDto> {
    await this.ensureAuthorableCourse(courseId);
    return this.curriculumRepository.getCurriculumSnapshot(courseId);
  }
}
