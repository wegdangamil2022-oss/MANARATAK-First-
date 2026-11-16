import { Prisma } from '@prisma/client';
import { COURSE_SOURCE_FACT_KEYS } from '@manaratak/domain';
/** Return the author of the original uninterrupted fact version, not an unrelated later metadata editor. */
export function courseSourceFactAuthorQuery(
  courseId: string,
  currentVersion: number,
  facts: Record<string, unknown>,
) {
  const snapshotFacts = Prisma.sql`jsonb_build_object(${Prisma.join(COURSE_SOURCE_FACT_KEYS.map((key) => Prisma.sql`${key}::text, v.snapshot->'course'->${key}::text`))})`;
  return Prisma.sql`WITH history AS (SELECT v."createdBy",v."versionNumber",${snapshotFacts} AS facts FROM "CourseVersion" v WHERE v."courseId"=${courseId} AND v."versionNumber"<=${currentVersion}), boundary AS (SELECT COALESCE(MAX("versionNumber"),0) AS version FROM history WHERE facts IS DISTINCT FROM CAST(${JSON.stringify(facts)} AS jsonb)) SELECT h."createdBy",h."versionNumber" FROM history h CROSS JOIN boundary b WHERE h."versionNumber"=b.version+1 AND (SELECT count(*) FROM history WHERE "versionNumber">b.version)=${currentVersion}-b.version ORDER BY h."versionNumber" ASC LIMIT 1`;
}
