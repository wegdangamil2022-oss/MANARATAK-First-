import type { CourseDto } from './entities/Course';
export const COURSE_SOURCE_FACT_KEYS = ['directCourseUrl','externalProviderId','originalSourceTitle','sourceImportRecordId','sourceUrl','officialSourceUrl','accessType','isStudyFree','isFreeCertificate','certificateType','certificateAvailable','learningLanguageRaw','learningLanguage','studyLevelRaw','studyDurationRaw','studyDuration','shortCourseTopicsRaw'] as const;
export function courseSourceFacts(course: CourseDto): Record<string, string|boolean|null> {
  return Object.fromEntries(COURSE_SOURCE_FACT_KEYS.map(key => [key, course[key as keyof CourseDto] ?? null])) as Record<string,string|boolean|null>;
}
/** A course with approved, active quizzes cannot opt out of them through editorial JSON. */
export function requiredCompletionQuizIds(quizzes: readonly {id:string;status:string}[], legacyAssessmentRequired: unknown): string[] {
  const ids = quizzes.filter(quiz=>quiz.status !== 'ARCHIVED').map(quiz=>quiz.id);
  if (legacyAssessmentRequired === true && !ids.length) throw new Error('COURSE_ASSESSMENT_REQUIRED_BUT_MISSING');
  return ids;
}
