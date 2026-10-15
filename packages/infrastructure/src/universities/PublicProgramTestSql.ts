import {publishedAdmissionScoresSql} from '../international-tests/AdmissionScoreSql';
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
 AND (r."testVariantId" IS NULL OR EXISTS (SELECT 1 FROM "InternationalTestVariant" tv WHERE tv.id=r."testVariantId" AND tv."testId"=t.id AND tv."isActive"=true) AND ((v.metadata->'publishedVariantIds') ? r."testVariantId" OR EXISTS(SELECT 1 FROM "InternationalTestVersionScoreScale" scoped WHERE scoped."versionId"=v.id AND scoped.metadata->'admissionScoreScope'->>'variantId'=r."testVariantId")))
 AND ${publishedAdmissionScoresSql()})`;
}
