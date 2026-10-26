import type { CourseCurriculumSnapshotDto } from './contracts/ICourseCurriculumRepository';
export type CourseDeliveryPolicy = {
  version: 1;
  sequence: 'FREE' | 'SEQUENTIAL';
  lessons: Record<string, { preview: boolean; availableAt: string | null }>;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeCourseDeliveryPolicy(value: unknown): CourseDeliveryPolicy {
  if (value === undefined || value === null) return { version: 1, sequence: 'FREE', lessons: {} };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('COURSE_DELIVERY_POLICY_INVALID');
  const policy = value as Record<string, unknown>;
  if (
    Object.keys(policy).some((key) => !['version', 'sequence', 'lessons'].includes(key)) ||
    policy.version !== 1 ||
    !['FREE', 'SEQUENTIAL'].includes(String(policy.sequence)) ||
    !policy.lessons ||
    typeof policy.lessons !== 'object' ||
    Array.isArray(policy.lessons) ||
    Object.keys(policy.lessons).length > 1000
  )
    throw Error('COURSE_DELIVERY_POLICY_INVALID');
  const lessons: CourseDeliveryPolicy['lessons'] = {};
  for (const [id, input] of Object.entries(policy.lessons)) {
    if (!uuid.test(id) || !input || typeof input !== 'object' || Array.isArray(input))
      throw Error('COURSE_DELIVERY_POLICY_INVALID');
    const rule = input as Record<string, unknown>;
    if (
      Object.keys(rule).some((key) => !['preview', 'availableAt'].includes(key)) ||
      typeof rule.preview !== 'boolean' ||
      (rule.availableAt !== null &&
        (typeof rule.availableAt !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(rule.availableAt) ||
          !Number.isFinite(Date.parse(rule.availableAt)) ||
          new Date(rule.availableAt).toISOString().replace('.000Z', 'Z') !==
            rule.availableAt.replace('.000Z', 'Z')))
    )
      throw Error('COURSE_DELIVERY_POLICY_INVALID');
    lessons[id] = { preview: rule.preview, availableAt: rule.availableAt as string | null };
  }
  return { version: 1, sequence: policy.sequence as CourseDeliveryPolicy['sequence'], lessons };
}
export function courseLessonAccess(
  curriculum: CourseCurriculumSnapshotDto,
  policy: CourseDeliveryPolicy,
  progress: readonly { lessonId: string; progressPercentage: number }[],
  now = new Date(),
  attempts: readonly { quizId: string; passed?: boolean | null }[] = [],
) {
  const modulePositions = new Map(
    curriculum.modules
      .filter((row) => row.status !== 'ARCHIVED')
      .map((row) => [row.id, row.position]),
  );
  const lessons = curriculum.lessons
    .filter((row) => row.status !== 'ARCHIVED' && modulePositions.has(row.moduleId))
    .sort(
      (a, b) =>
        modulePositions.get(a.moduleId)! - modulePositions.get(b.moduleId)! ||
        a.position - b.position ||
        a.id.localeCompare(b.id),
    );
  const completed = new Set(
    progress.filter((row) => row.progressPercentage >= 100).map((row) => row.lessonId),
  );
  for (const lesson of lessons.filter((row) => row.lessonType === 'QUIZ')) {
    const quizzes = curriculum.quizzes.filter(
      (row) => row.lessonId === lesson.id && row.status !== 'ARCHIVED',
    );
    if (
      quizzes.length &&
      quizzes.every((quiz) =>
        attempts.some((attempt) => attempt.quizId === quiz.id && attempt.passed === true),
      )
    )
      completed.add(lesson.id);
  }
  return lessons.map((lesson, index) => {
    const rule = policy.lessons[lesson.id],
      scheduled = Boolean(rule?.availableAt && Date.parse(rule.availableAt) > now.getTime()),
      previous =
        policy.sequence === 'SEQUENTIAL' && index > 0 && !completed.has(lessons[index - 1].id);
    return {
      lessonId: lesson.id,
      accessible: !scheduled && !previous,
      lockReason: scheduled
        ? ('SCHEDULED' as const)
        : previous
          ? ('PREVIOUS_LESSON' as const)
          : null,
      availableAt: rule?.availableAt ?? null,
      previewAvailable: rule?.preview === true && !scheduled,
    };
  });
}
