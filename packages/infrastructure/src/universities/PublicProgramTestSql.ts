import { Prisma } from '@prisma/client';
/** Same owner/version/variant/scale proof as isPublicAdmissionRequirement. Alias p is the program. */
export function publicProgramTestMatchSql(
  testId?: string,
  testExpression?: Prisma.Sql,
): Prisma.Sql {
  return Prisma.sql`EXISTS (
 SELECT 1 FROM "UniversityProgramAdmissionRequirement" r JOIN "InternationalTest" t ON t.id=r."internationalTestId"
 JOIN "InternationalTestVersion" v ON v.id=COALESCE(r."testVersionId",t."currentPublishedVersionId") AND v."testId"=t.id
 WHERE r."academicProgramId"=p.id ${testExpression ? Prisma.sql`AND r."internationalTestId"=${testExpression}` : testId ? Prisma.sql`AND r."internationalTestId"=${testId}` : Prisma.empty}
 AND r.status='ACTIVE' AND t.status='PUBLISHED' AND t."isPubliclyVisible" AND v.status='PUBLISHED'
 AND (r."testVariantId" IS NULL OR EXISTS (SELECT 1 FROM "InternationalTestVariant" tv WHERE tv.id=r."testVariantId" AND tv."testId"=t.id AND tv."isActive"=true))
 AND (r."sectionScores" IS NULL OR r."sectionScores"='null'::jsonb OR r."sectionScores"='{}'::jsonb)
 AND (r."minimumScore" IS NULL OR (r."minimumScore">=0 AND (SELECT count(*) FROM "InternationalTestVersionScoreScale" ss WHERE ss."versionId"=v.id)=1 AND EXISTS (SELECT 1 FROM "InternationalTestVersionScoreScale" ss WHERE ss."versionId"=v.id AND r."minimumScore">=ss."overallMinimum" AND r."minimumScore"<=ss."overallMaximum"))))`;
}
