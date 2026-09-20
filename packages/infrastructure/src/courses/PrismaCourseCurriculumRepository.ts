import { Prisma, PrismaClient } from '@prisma/client';
import {
  CourseContentStatus,
  CourseCurriculumSnapshotDto,
  CourseLessonDto,
  CourseLessonType,
  CourseModuleDto,
  CoursePositionUpdateDto,
  CourseQuestionBankDto,
  CourseQuestionDto,
  CourseQuestionType,
  CourseQuizDto,
  CreateCourseLessonDto,
  CreateCourseModuleDto,
  CreateCourseQuestionBankDto,
  CreateCourseQuestionDto,
  CreateCourseQuizDto,
  CreateLessonAssetReferenceDto,
  ICourseCurriculumRepository,
  LessonAssetReferenceDto,
  LessonAssetType,
  UpdateCourseLessonDto,
  UpdateCourseModuleDto,
  UpdateCourseQuestionBankDto,
  UpdateCourseQuestionDto,
  UpdateCourseQuizDto,
} from '@manaratak/domain';

const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

export class PrismaCourseCurriculumRepository implements ICourseCurriculumRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createModule(data: CreateCourseModuleDto): Promise<CourseModuleDto> {
    return this.module(
      await this.prisma.courseModule.create({
        data: { ...data, status: data.status ?? CourseContentStatus.DRAFT },
      }),
    );
  }

  public async updateModule(id: string, data: UpdateCourseModuleDto): Promise<CourseModuleDto> {
    return this.module(await this.prisma.courseModule.update({ where: { id }, data }));
  }

  public async deleteModule(id: string): Promise<void> {
    await this.prisma.courseModule.delete({ where: { id } });
  }

  public async reorderModules(
    courseId: string,
    positions: CoursePositionUpdateDto[],
  ): Promise<void> {
    await this.reorder('module', courseId, positions);
  }

  public async listModulesByCourseId(courseId: string): Promise<CourseModuleDto[]> {
    return (
      await this.prisma.courseModule.findMany({ where: { courseId }, orderBy: { position: 'asc' } })
    ).map((item) => this.module(item));
  }

  public async createLesson(data: CreateCourseLessonDto): Promise<CourseLessonDto> {
    return this.lesson(
      await this.prisma.courseLesson.create({
        data: { ...data, status: data.status ?? CourseContentStatus.DRAFT },
      }),
    );
  }

  public async updateLesson(id: string, data: UpdateCourseLessonDto): Promise<CourseLessonDto> {
    return this.lesson(await this.prisma.courseLesson.update({ where: { id }, data }));
  }

  public async deleteLesson(id: string): Promise<void> {
    await this.prisma.courseLesson.delete({ where: { id } });
  }

  public async reorderLessons(
    moduleId: string,
    positions: CoursePositionUpdateDto[],
  ): Promise<void> {
    await this.reorder('lesson', moduleId, positions);
  }

  public async listLessonsByModuleId(moduleId: string): Promise<CourseLessonDto[]> {
    return (
      await this.prisma.courseLesson.findMany({ where: { moduleId }, orderBy: { position: 'asc' } })
    ).map((item) => this.lesson(item));
  }

  public async attachAssetToLesson(
    data: CreateLessonAssetReferenceDto,
  ): Promise<LessonAssetReferenceDto> {
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: data.lessonId },
      select: { courseId: true },
    });
    if (!lesson) throw new Error('COURSE_LESSON_NOT_FOUND');
    const record = await this.prisma.courseLessonAsset.create({
      data: {
        courseId: lesson.courseId,
        lessonId: data.lessonId,
        assetId: data.assetId,
        assetReference: data.assetReference,
        title: data.title,
        assetType: data.assetType,
        position: data.position,
        isRequired: data.isRequired ?? false,
        metadata: json(data.metadata),
      },
    });
    return this.asset(record);
  }

  public async listAssetsByLessonId(lessonId: string): Promise<LessonAssetReferenceDto[]> {
    return (
      await this.prisma.courseLessonAsset.findMany({
        where: { lessonId },
        orderBy: { position: 'asc' },
      })
    ).map((item) => this.asset(item));
  }

  public async detachAssetFromLesson(id: string): Promise<void> {
    await this.prisma.courseLessonAsset.delete({ where: { id } });
  }

  public async createQuiz(data: CreateCourseQuizDto): Promise<CourseQuizDto> {
    return this.quiz(
      await this.prisma.courseQuiz.create({
        data: { ...data, status: data.status ?? CourseContentStatus.DRAFT },
      }),
    );
  }

  public async updateQuiz(id: string, data: UpdateCourseQuizDto): Promise<CourseQuizDto> {
    return this.quiz(await this.prisma.courseQuiz.update({ where: { id }, data }));
  }

  public async deleteQuiz(id: string): Promise<void> {
    await this.prisma.courseQuiz.delete({ where: { id } });
  }

  public async listQuizzesByCourseId(courseId: string): Promise<CourseQuizDto[]> {
    return (
      await this.prisma.courseQuiz.findMany({ where: { courseId }, orderBy: { position: 'asc' } })
    ).map((item) => this.quiz(item));
  }

  public async createQuestionBank(
    data: CreateCourseQuestionBankDto,
  ): Promise<CourseQuestionBankDto> {
    return this.bank(
      await this.prisma.courseQuestionBank.create({
        data: { ...data, status: data.status ?? CourseContentStatus.DRAFT },
      }),
    );
  }

  public async updateQuestionBank(
    id: string,
    data: UpdateCourseQuestionBankDto,
  ): Promise<CourseQuestionBankDto> {
    return this.bank(await this.prisma.courseQuestionBank.update({ where: { id }, data }));
  }

  public async deleteQuestionBank(id: string): Promise<void> {
    await this.prisma.courseQuestionBank.delete({ where: { id } });
  }

  public async createQuestion(data: CreateCourseQuestionDto): Promise<CourseQuestionDto> {
    const record = await this.prisma.$transaction(async tx => {
      const created = await tx.courseQuestion.create({
        data: {
          courseId: data.courseId,
          quizId: data.quizId,
          questionBankId: data.questionBankId,
          questionType: data.questionType,
          prompt: data.prompt,
          choices: json(data.choices),
          correctAnswer: json(data.correctAnswer),
          explanation: data.explanation,
          points: data.points ?? 1,
          position: data.position,
          status: data.status ?? CourseContentStatus.DRAFT,
        },
      });
      await tx.courseQuestionVersion.create({
        data: {
          questionId: created.id,
          versionNumber: created.version,
          reason: 'QUESTION_CREATED',
          snapshot: json(created)!,
        },
      });
      return created;
    });
    return this.question(record);
  }

  public async updateQuestion(
    id: string,
    data: UpdateCourseQuestionDto,
  ): Promise<CourseQuestionDto> {
    const record = await this.prisma.$transaction(async tx => {
      const updated = await tx.courseQuestion.update({
        where: { id },
        data: {
          quizId: data.quizId,
          questionBankId: data.questionBankId,
          questionType: data.questionType,
          prompt: data.prompt,
          choices: data.choices === null ? Prisma.JsonNull : json(data.choices),
          correctAnswer: data.correctAnswer === null ? Prisma.JsonNull : json(data.correctAnswer),
          explanation: data.explanation,
          points: data.points,
          position: data.position,
          status: data.status,
          version: { increment: 1 },
        },
      });
      await tx.courseQuestionVersion.create({
        data: {
          questionId: updated.id,
          versionNumber: updated.version,
          reason: 'QUESTION_UPDATED',
          snapshot: json(updated)!,
        },
      });
      return updated;
    });
    return this.question(record);
  }

  public async deleteQuestion(id: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const archived = await tx.courseQuestion.update({
        where: { id },
        data: { status: CourseContentStatus.ARCHIVED, version: { increment: 1 } },
      });
      await tx.courseQuestionVersion.create({
        data: {
          questionId: archived.id,
          versionNumber: archived.version,
          reason: 'QUESTION_ARCHIVED',
          snapshot: json(archived)!,
        },
      });
    });
  }

  public async listQuestionsByQuizId(quizId: string): Promise<CourseQuestionDto[]> {
    return (
      await this.prisma.courseQuestion.findMany({ where: { quizId, status: { not: CourseContentStatus.ARCHIVED } }, orderBy: { position: 'asc' } })
    ).map((item) => this.question(item));
  }

  public async getCurriculumSnapshot(courseId: string): Promise<CourseCurriculumSnapshotDto> {
    const [modules, lessons, assets, quizzes, questionBanks, questions] = await Promise.all([
      this.prisma.courseModule.findMany({ where: { courseId }, orderBy: { position: 'asc' } }),
      this.prisma.courseLesson.findMany({
        where: { courseId },
        orderBy: [{ moduleId: 'asc' }, { position: 'asc' }],
      }),
      this.prisma.courseLessonAsset.findMany({
        where: { courseId },
        orderBy: [{ lessonId: 'asc' }, { position: 'asc' }],
      }),
      this.prisma.courseQuiz.findMany({ where: { courseId }, orderBy: { position: 'asc' } }),
      this.prisma.courseQuestionBank.findMany({
        where: { courseId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.courseQuestion.findMany({
        where: { courseId, status: { not: CourseContentStatus.ARCHIVED } },
        orderBy: [{ quizId: 'asc' }, { position: 'asc' }],
      }),
    ]);
    return {
      modules: modules.map((item) => this.module(item)),
      lessons: lessons.map((item) => this.lesson(item)),
      assets: assets.map((item) => this.asset(item)),
      quizzes: quizzes.map((item) => this.quiz(item)),
      questionBanks: questionBanks.map((item) => this.bank(item)),
      questions: questions.map((item) => this.question(item)),
    };
  }

  private async reorder(
    kind: 'module' | 'lesson',
    ownerId: string,
    positions: CoursePositionUpdateDto[],
  ): Promise<void> {
    const ids = new Set(positions.map((item) => item.id));
    if (
      ids.size !== positions.length ||
      new Set(positions.map((item) => item.position)).size !== positions.length
    ) {
      throw new Error('COURSE_CURRICULUM_REORDER_DUPLICATE');
    }
    if (positions.some((item) => item.position < 1))
      throw new Error('COURSE_CURRICULUM_POSITION_INVALID');
    await this.prisma.$transaction(async (tx) => {
      const records =
        kind === 'module'
          ? await tx.courseModule.findMany({
              where: { courseId: ownerId, id: { in: [...ids] } },
              select: { id: true },
            })
          : await tx.courseLesson.findMany({
              where: { moduleId: ownerId, id: { in: [...ids] } },
              select: { id: true },
            });
      if (records.length !== positions.length)
        throw new Error('COURSE_CURRICULUM_REORDER_SCOPE_MISMATCH');
      for (let index = 0; index < positions.length; index += 1) {
        const item = positions[index];
        if (kind === 'module')
          await tx.courseModule.update({
            where: { id: item.id },
            data: { position: -(index + 1) },
          });
        else
          await tx.courseLesson.update({
            where: { id: item.id },
            data: { position: -(index + 1) },
          });
      }
      for (const item of positions) {
        if (kind === 'module')
          await tx.courseModule.update({
            where: { id: item.id },
            data: { position: item.position },
          });
        else
          await tx.courseLesson.update({
            where: { id: item.id },
            data: { position: item.position },
          });
      }
    });
  }

  private module(record: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    position: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): CourseModuleDto {
    return { ...record, status: record.status as CourseContentStatus };
  }

  private lesson(record: {
    id: string;
    courseId: string;
    moduleId: string;
    title: string;
    summary: string | null;
    lessonType: string;
    position: number;
    estimatedDurationMinutes: number | null;
    contentText: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): CourseLessonDto {
    return {
      ...record,
      lessonType: record.lessonType as CourseLessonType,
      status: record.status as CourseContentStatus,
    };
  }

  private asset(record: {
    id: string;
    lessonId: string;
    assetId: string;
    assetReference: string | null;
    title: string | null;
    assetType: string;
    position: number;
    isRequired: boolean;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): LessonAssetReferenceDto {
    return {
      ...record,
      assetType: record.assetType as LessonAssetType,
      metadata: record.metadata as Record<string, unknown> | null,
    };
  }

  private quiz(record: {
    id: string;
    courseId: string;
    moduleId: string | null;
    lessonId: string | null;
    title: string;
    instructions: string | null;
    position: number;
    passingScore: number | null;
    maxAttempts: number | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): CourseQuizDto {
    return { ...record, status: record.status as CourseContentStatus };
  }

  private bank(record: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): CourseQuestionBankDto {
    return { ...record, status: record.status as CourseContentStatus };
  }

  private question(record: {
    id: string;
    courseId: string;
    version: number;
    quizId: string | null;
    questionBankId: string | null;
    questionType: string;
    prompt: string;
    choices: Prisma.JsonValue | null;
    correctAnswer: Prisma.JsonValue | null;
    explanation: string | null;
    points: number;
    position: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): CourseQuestionDto {
    return {
      ...record,
      questionType: record.questionType as CourseQuestionType,
      status: record.status as CourseContentStatus,
    };
  }
}
