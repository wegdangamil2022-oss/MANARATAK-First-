import {Prisma} from '@prisma/client';

/** Same owner/version proof as isPublicUniversityProgram, for a program aliased p.
 * A non-null profile pointer alone does not establish publication or ownership.
 */
export function publicProgramMajorVersionProofSql(): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "MajorLevelProfile" lp
    JOIN "MajorVersion" mv ON mv.id=lp."currentPublishedVersionId"
    WHERE lp."majorId"=p."majorId" AND lp."degreeLevelId"=p."degreeLevelId"
      AND lp.status='PUBLISHED' AND mv.status='PUBLISHED'
      AND mv."majorId"=lp."majorId" AND mv."profileId"=lp.id
  )`;
}
