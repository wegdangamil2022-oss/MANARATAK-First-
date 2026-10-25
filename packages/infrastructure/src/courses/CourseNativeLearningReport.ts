import { Prisma, type PrismaClient } from '@prisma/client';
import type { CourseFilters, NativeCourseLearningCounts, PaginatedCourseResult } from '@manaratak/domain';

const contains = (column: Prisma.Sql, value: string) => Prisma.sql`strpos(lower(COALESCE(${column}, '')), lower(${value})) > 0`;
const cohort = (filters: CourseFilters) => Prisma.sql`${filters.cohortFrom ? Prisma.sql`AND e."enrolledAt" >= ${new Date(filters.cohortFrom)}` : Prisma.empty}
  ${filters.cohortTo ? Prisma.sql`AND e."enrolledAt" < ${new Date(filters.cohortTo)}` : Prisma.empty}`;

/** Native-only SQL twin of the canonical catalog predicate, parity-tested on PostgreSQL.
 * Reporting stays in the database; neither enrollment rows nor all matching course IDs leave it. */
export function nativeCourseReportWhere(filters: CourseFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`c."originType" = 'NATIVE_MANARATAK_COURSE'`];
  if (filters.status) conditions.push(Prisma.sql`c.status = ${filters.status}`);
  if (filters.accessType) conditions.push(Prisma.sql`c."accessType" = ${filters.accessType}`);
  if (filters.category) conditions.push(contains(Prisma.sql`c.category`, filters.category));
  if (filters.learningLanguage) conditions.push(contains(Prisma.sql`c."learningLanguage"`, filters.learningLanguage));
  if (filters.difficultyLevel) conditions.push(contains(Prisma.sql`c."difficultyLevel"`, filters.difficultyLevel));
  if (filters.instructor) conditions.push(Prisma.sql`strpos(COALESCE(c."optionalFields"->>'instructor', ''), ${filters.instructor}) > 0`);
  if (filters.majorId) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "CourseMajorProjection" m WHERE m."courseId" = c.id AND m."majorId" = ${filters.majorId} AND m."projectionState" = 'APPROVED')`);
  if (filters.search) conditions.push(Prisma.sql`(${Prisma.join([
    ...['displayName', 'canonicalName', 'publicId', 'platformName', 'providerName', 'originalSourceTitle', 'shortCourseTopicsRaw'].map(key => contains(Prisma.sql`c.${Prisma.raw('"' + key + '"')}`, filters.search!)),
    Prisma.sql`strpos(COALESCE(c."optionalFields"->>'instructor', ''), ${filters.search}) > 0`,
    Prisma.sql`EXISTS (SELECT 1 FROM "CourseMajorProjection" m JOIN "Major" a ON a.id = m."majorId" WHERE m."courseId" = c.id AND m."projectionState" = 'APPROVED' AND ${contains(Prisma.sql`a."displayName"`, filters.search)})`,
    Prisma.sql`EXISTS (SELECT 1 FROM "ExternalCourseProvider" p WHERE p.id = c."externalProviderId" AND (${contains(Prisma.sql`p."displayName"`, filters.search)} OR ${contains(Prisma.sql`p."canonicalName"`, filters.search)}))`,
  ], ' OR ')})`);
  const freeCertificate = Prisma.sql`(c."certificateAvailable" IS DISTINCT FROM false AND (c."isFreeCertificate" = true OR (c."certificateAvailable" = true AND c."isFreeCertificate" IS NULL AND c."accessType" IN ('FREE_CERTIFICATE', 'FREE_STUDY_AND_CERTIFICATE'))))`;
  const nonFreeCertificate = Prisma.sql`(c."certificateAvailable" = true AND c."isFreeCertificate" = false)`;
  if (filters.certificateState === 'FREE') conditions.push(freeCertificate);
  if (filters.certificateState === 'NON_FREE') conditions.push(nonFreeCertificate);
  if (filters.certificateState === 'UNAVAILABLE') conditions.push(Prisma.sql`c."certificateAvailable" = false`);
  if (filters.certificateState === 'UNKNOWN') conditions.push(Prisma.sql`c."certificateAvailable" IS DISTINCT FROM false AND (${freeCertificate}) IS NOT TRUE AND (${nonFreeCertificate}) IS NOT TRUE`);
  if (filters.isFreeCertificate !== undefined) {
    const legacyFree = Prisma.sql`c."certificateAvailable" = true AND c."accessType" IN ('FREE_CERTIFICATE', 'FREE_STUDY_AND_CERTIFICATE')`;
    conditions.push(filters.isFreeCertificate ? legacyFree : Prisma.sql`NOT (${legacyFree})`);
  }
  if (filters.studyAccess === 'UNKNOWN') conditions.push(Prisma.sql`c."isStudyFree" IS NULL AND c."accessType" = 'FREE_CERTIFICATE'`);
  if (filters.studyAccess === 'FREE') conditions.push(Prisma.sql`(c."isStudyFree" = true OR (c."isStudyFree" IS NULL AND c."accessType" IN ('FREE_STUDY', 'FREE_STUDY_AND_CERTIFICATE')))`);
  if (filters.studyAccess === 'PAID') conditions.push(Prisma.sql`(c."isStudyFree" = false OR (c."isStudyFree" IS NULL AND c."accessType" = 'PAID'))`);
  if (filters.hasEnrollments !== undefined) conditions.push(Prisma.sql`${filters.hasEnrollments ? Prisma.empty : Prisma.sql`NOT`} EXISTS (SELECT 1 FROM "CourseEnrollment" e WHERE e."courseId" = c.id ${cohort(filters)})`);
  return Prisma.join(conditions, ' AND ');
}

type AggregateRow = { courseId: string | null; enrollments: bigint; uniqueStudents: bigint; eligibleEnrollments: bigint; started: bigint; completions: bigint; averageProgress: number | null };
function counts(row?: AggregateRow): NativeCourseLearningCounts {
  const eligible = Number(row?.eligibleEnrollments ?? 0), completions = Number(row?.completions ?? 0);
  return { enrollments: Number(row?.enrollments ?? 0), uniqueStudents: Number(row?.uniqueStudents ?? 0), eligibleEnrollments: eligible,
    started: Number(row?.started ?? 0), completions, averageProgress: row?.averageProgress ?? null,
    completionRate: eligible ? Math.round(completions / eligible * 10000) / 100 : null };
}

export async function nativeCourseLearningReport(db: PrismaClient, filters: CourseFilters, pageIds: string[]): Promise<NonNullable<PaginatedCourseResult<unknown>['nativeLearning']>> {
  // Use the database clock inside the same read transaction. A small app/DB
  // clock skew must not hide registrations which have already committed.
  const [{ asOf }] = await db.$queryRaw<Array<{ asOf: Date }>>(Prisma.sql`SELECT transaction_timestamp() AS "asOf"`);
  const rows = await db.$queryRaw<AggregateRow[]>(Prisma.sql`
    WITH enrolled AS (
      SELECT e.*, e.status IN ('ACTIVE', 'COMPLETED') AS eligible,
        EXISTS (SELECT 1 FROM "CourseLessonProgress" p WHERE p."courseId" = e."courseId" AND p."studentReferenceId" = e."studentReferenceId"
          AND p."updatedAt" <= ${asOf} AND p."progressPercentage" > 0 AND p.status IN ('IN_PROGRESS', 'COMPLETED'))
        OR EXISTS (SELECT 1 FROM "CourseQuizAttempt" q WHERE q."courseId" = e."courseId" AND q."studentReferenceId" = e."studentReferenceId"
          AND q."submittedAt" <= ${asOf} AND q.status IN ('SUBMITTED', 'PASSED', 'FAILED')) AS started,
        EXISTS (SELECT 1 FROM "CourseCompletion" f WHERE f."courseId" = e."courseId" AND f."studentReferenceId" = e."studentReferenceId"
          AND f.status IN ('COMPLETED', 'CERTIFICATE_SIGNAL_READY') AND f."completedAt" <= ${asOf}) AS completed
      FROM "CourseEnrollment" e JOIN "Course" c ON c.id = e."courseId"
      WHERE ${nativeCourseReportWhere(filters)} AND e."enrolledAt" <= ${asOf} ${cohort(filters)}
    )
    SELECT "courseId", count(*) AS enrollments, count(DISTINCT "studentReferenceId") AS "uniqueStudents",
      count(*) FILTER (WHERE eligible) AS "eligibleEnrollments", count(*) FILTER (WHERE eligible AND started) AS started,
      count(*) FILTER (WHERE eligible AND completed) AS completions,
      avg("progressPercentage") FILTER (WHERE eligible)::float AS "averageProgress"
    FROM enrolled GROUP BY GROUPING SETS ((), ("courseId"))
    HAVING GROUPING("courseId") = 1 OR "courseId" IN (${Prisma.join(pageIds.length ? pageIds : [''])})
  `);
  return { scope: 'FILTERED_ENROLLMENT_COHORT', asOf: asOf.toISOString(), cohortFrom: filters.cohortFrom ?? null, cohortTo: filters.cohortTo ?? null,
    eligibleStatuses: ['ACTIVE', 'COMPLETED'], totals: counts(rows.find(row => row.courseId === null)),
    byCourse: Object.fromEntries(pageIds.map(id => [id, counts(rows.find(row => row.courseId === id))])) };
}
