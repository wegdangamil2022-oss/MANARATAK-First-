import { randomUUID } from 'node:crypto';
import {
  AssetId,
  AssetSecurityClassification,
  CourseContentStatus,
  assetRightsStatus,
  type IAssetRecordRepository,
  type ICourseCurriculumRepository,
} from '@manaratak/domain';

export interface NativeCurriculumCopyOptions {
  includeAssets: boolean;
  acknowledgeAssetRights: boolean;
  moduleId?: string;
  lessonId?: string;
}

/** Caller owns the source Course version lock and transaction. Never copies
 * enrollments, attempts, completions, certificates, finance or instructor roles. */
export async function copyNativeCurriculum(
  repo: ICourseCurriculumRepository,
  assets: IAssetRecordRepository | undefined,
  sourceId: string,
  targetId: string,
  options: NativeCurriculumCopyOptions,
) {
  const source = await repo.getCurriculumSnapshot(sourceId);
  const sourceModules = source.modules.filter(
    (row) => row.status !== 'ARCHIVED' && (!options.moduleId || row.id === options.moduleId),
  );
  const moduleIds = new Set(sourceModules.map((row) => row.id));
  const lessons = source.lessons.filter(
    (row) =>
      row.status !== 'ARCHIVED' &&
      moduleIds.has(row.moduleId) &&
      (!options.lessonId || row.id === options.lessonId),
  );
  if (
    (options.moduleId && !moduleIds.has(options.moduleId)) ||
    (options.lessonId && !lessons.some((row) => row.id === options.lessonId))
  )
    throw Error('COURSE_COPY_SCOPE_INVALID');
  const lessonIds = new Set(lessons.map((row) => row.id));
  const quizzes = source.quizzes.filter(
    (row) =>
      row.status !== 'ARCHIVED' &&
      (row.lessonId
        ? lessonIds.has(row.lessonId)
        : options.lessonId
          ? false
          : row.moduleId
            ? moduleIds.has(row.moduleId)
            : !options.moduleId),
  );
  const quizIds = new Set(quizzes.map((row) => row.id));
  const all = !options.moduleId && !options.lessonId;
  const bankIds = new Set(
    source.questions
      .filter((row) => row.status !== 'ARCHIVED' && row.quizId && quizIds.has(row.quizId))
      .map((row) => row.questionBankId)
      .filter(Boolean),
  );
  const banks = source.questionBanks.filter(
    (row) => row.status !== 'ARCHIVED' && (all || bankIds.has(row.id)),
  );
  const copiedBankIds = new Set(banks.map((row) => row.id));
  const questions = source.questions.filter(
    (row) =>
      row.status !== 'ARCHIVED' &&
      (row.quizId
        ? quizIds.has(row.quizId)
        : all && row.questionBankId && copiedBankIds.has(row.questionBankId)),
  );
  if (sourceModules.length > 200 || lessons.length > 1000 || questions.length > 5000)
    throw Error('COURSE_COPY_SIZE_LIMIT_EXCEEDED');
  const attachments = source.assets.filter((row) => lessonIds.has(row.lessonId));
  if (options.includeAssets && attachments.length && !options.acknowledgeAssetRights)
    throw Error('COURSE_COPY_ASSET_RIGHTS_ACKNOWLEDGEMENT_REQUIRED');
  if (options.includeAssets)
    for (const row of attachments) {
      const asset = await assets?.findById(new AssetId(row.assetId));
      if (
        !asset ||
        ![AssetSecurityClassification.PUBLIC, AssetSecurityClassification.INTERNAL].includes(
          asset.classification,
        )
      )
        throw Error('COURSE_COPY_ASSET_NOT_REUSABLE');
      asset.assertCanDeliver();
      if (assetRightsStatus(asset.metadata.extraMetadata?.rights) === 'EXPIRED')
        throw Error('COURSE_COPY_ASSET_RIGHTS_EXPIRED');
    }
  const moduleMap = new Map<string, string>(),
    lessonMap = new Map<string, string>();
  const quizMap = new Map<string, string>(),
    bankMap = new Map<string, string>(),
    assetMap = new Map<string, string>();
  const target = sourceId === targetId ? source : await repo.getCurriculumSnapshot(targetId);
  let modulePosition = Math.max(0, ...target.modules.map((row) => row.position));
  if (options.lessonId) {
    const lesson = lessons[0];
    moduleMap.set(lesson.moduleId, lesson.moduleId);
  } else
    for (const row of [...sourceModules].sort((a, b) => a.position - b.position)) {
      const copy = await repo.createModule({
        courseId: targetId,
        title: sourceId === targetId ? row.title + ' — نسخة' : row.title,
        description: row.description ?? undefined,
        position: ++modulePosition,
        status: CourseContentStatus.DRAFT,
      });
      moduleMap.set(row.id, copy.id);
    }
  for (const row of [...lessons].sort((a, b) => a.position - b.position)) {
    const moduleId = moduleMap.get(row.moduleId)!;
    const position = options.lessonId
      ? Math.max(
          0,
          ...target.lessons
            .filter((lesson) => lesson.moduleId === moduleId)
            .map((lesson) => lesson.position),
        ) + 1
      : [...lessonMap.keys()].filter(
          (id) => lessons.find((lesson) => lesson.id === id)?.moduleId === row.moduleId,
        ).length + 1;
    const copy = await repo.createLesson({
      courseId: targetId,
      moduleId,
      title: options.lessonId ? row.title + ' — نسخة' : row.title,
      summary: row.summary ?? undefined,
      lessonType: row.lessonType,
      estimatedDurationMinutes: row.estimatedDurationMinutes ?? undefined,
      contentText: row.contentText ?? undefined,
      position,
      status: CourseContentStatus.DRAFT,
    });
    lessonMap.set(row.id, copy.id);
  }
  for (const row of banks) {
    const copy = await repo.createQuestionBank({
      courseId: targetId,
      title: row.title,
      description: row.description ?? undefined,
      status: CourseContentStatus.DRAFT,
    });
    bankMap.set(row.id, copy.id);
  }
  let quizPosition = Math.max(0, ...target.quizzes.map((row) => row.position));
  for (const row of [...quizzes].sort((a, b) => a.position - b.position)) {
    const copy = await repo.createQuiz({
      courseId: targetId,
      moduleId: row.moduleId ? moduleMap.get(row.moduleId) : undefined,
      lessonId: row.lessonId ? lessonMap.get(row.lessonId) : undefined,
      title: row.title,
      instructions: row.instructions ?? undefined,
      position: ++quizPosition,
      passingScore: row.passingScore,
      maxAttempts: row.maxAttempts,
      assessmentType: row.assessmentType,
      status: CourseContentStatus.DRAFT,
    });
    quizMap.set(row.id, copy.id);
  }
  for (const row of questions)
    await repo.createQuestion({
      courseId: targetId,
      quizId: row.quizId ? quizMap.get(row.quizId) : undefined,
      questionBankId: row.questionBankId ? bankMap.get(row.questionBankId) : undefined,
      questionType: row.questionType,
      prompt: row.prompt,
      choices: (row.choices ?? undefined) as
        Record<string, unknown> | readonly unknown[] | undefined,
      correctAnswer: (row.correctAnswer ?? undefined) as
        string | boolean | number | Record<string, unknown> | undefined,
      explanation: row.explanation ?? undefined,
      points: row.points,
      position: row.position,
      status: CourseContentStatus.DRAFT,
    });
  if (options.includeAssets)
    for (const row of attachments) {
      const copy = await repo.attachAssetToLesson({
        lessonId: lessonMap.get(row.lessonId)!,
        assetId: row.assetId,
        assetReference: row.assetReference ?? undefined,
        title: row.title ?? undefined,
        assetType: row.assetType,
        position: row.position,
        isRequired: row.isRequired,
      });
      assetMap.set(row.id, copy.id);
    }
  let blockCount = 0,
    skippedMediaBlocks = 0;
  for (const [oldId, lessonId] of lessonMap) {
    const blocks = (source.contentBlocks ?? [])
      .filter((row) => row.lessonId === oldId && row.status !== 'ARCHIVED')
      .sort((a, b) => a.position - b.position)
      .filter((row) => {
        if (row.assetReferenceId && !options.includeAssets) {
          skippedMediaBlocks++;
          return false;
        }
        if (row.quizId && !quizMap.has(row.quizId))
          throw Error('COURSE_COPY_ASSESSMENT_REFERENCE_INVALID');
        return true;
      })
      .map((row) => {
        const subtitle =
          row.type === 'VIDEO' && typeof row.payload.subtitleReferenceId === 'string'
            ? assetMap.get(row.payload.subtitleReferenceId)
            : undefined;
        if (row.type === 'VIDEO' && row.payload.subtitleReferenceId && !subtitle)
          throw Error('COURSE_COPY_SUBTITLE_REFERENCE_INVALID');
        return {
          id: randomUUID(),
          type: row.type,
          payload: subtitle ? { ...row.payload, subtitleReferenceId: subtitle } : row.payload,
          assetReferenceId: row.assetReferenceId ? assetMap.get(row.assetReferenceId) : null,
          quizId: row.quizId ? quizMap.get(row.quizId) : null,
        };
      });
    if (blocks.length) {
      if (!repo.replaceLessonBlocks) throw Error('COURSE_CONTENT_BLOCK_PERSISTENCE_REQUIRED');
      await repo.replaceLessonBlocks(targetId, lessonId, blocks);
      blockCount += blocks.length;
    }
  }
  return {
    moduleIds: [...moduleMap.values()],
    lessonIds: [...lessonMap.values()],
    modules: options.lessonId ? 0 : moduleMap.size,
    lessons: lessonMap.size,
    quizzes: quizMap.size,
    questions: questions.length,
    attachments: assetMap.size,
    blocks: blockCount,
    skippedMediaBlocks,
  };
}
