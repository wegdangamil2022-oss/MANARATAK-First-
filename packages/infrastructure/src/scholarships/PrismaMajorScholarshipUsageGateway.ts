import { Prisma, PrismaClient } from '@prisma/client';
import type { IMajorConsumerReadGateway, MajorConsumerPage, MajorConsumerQuery } from '@absheer/domain';
/** P12-owned read model of explicit targets and eligibility. Unresolved labels are never inferred matches. */
export class PrismaMajorScholarshipUsageGateway implements IMajorConsumerReadGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async usage(majorId:string,query:MajorConsumerQuery):Promise<MajorConsumerPage> {
    const page=query.page??1;if(!Number.isSafeInteger(page)||page<1||page>1000)throw new Error('MAJOR_USAGE_PAGE_INVALID');
    const rows=Prisma.sql`WITH links AS (
      SELECT t.id,t."scholarshipId",'TARGET'::text AS kind,t."sourceLabel" AS label,t."resolutionStatus" AS status,NULL::text AS "degreeLevelId" FROM "ScholarshipMajorTarget" t WHERE t."majorId"=${majorId}
      UNION ALL SELECT e.id,e."scholarshipId",'ELIGIBILITY',e."valueText",e."resolutionStatus",e."degreeLevelId" FROM "ScholarshipEligibilityItem" e WHERE e."majorId"=${majorId}
    ), filtered AS (SELECT l.id,s.id AS "ownerId",s."displayName" AS "ownerName",COALESCE(l.label,s."displayName") AS label,s.status AS "ownerStatus",l.status,l.kind,l."degreeLevelId",s."countryReferenceId"
      FROM links l JOIN "Scholarship" s ON s.id=l."scholarshipId"
      WHERE (${query.countryReferenceId??null}::text IS NULL OR s."countryReferenceId"=${query.countryReferenceId??null})
        AND (${query.degreeLevelId??null}::text IS NULL OR l."degreeLevelId"=${query.degreeLevelId??null} OR (l.kind='TARGET' AND EXISTS(SELECT 1 FROM "ScholarshipDegreeTarget" d WHERE d."scholarshipId"=s.id AND d."degreeLevelId"=${query.degreeLevelId??null} AND d."resolutionStatus"='RESOLVED')))
        ${query.scope==='PUBLISHED'?Prisma.sql`AND s.status='PUBLISHED' AND s."publicationStatus"='PUBLISHED' AND s."verificationStatus"='VERIFIED' AND l.status='RESOLVED'`:Prisma.empty})`;
    const [data,counts]=await Promise.all([
      this.prisma.$queryRaw<MajorConsumerPage['data']>(Prisma.sql`${rows} SELECT * FROM filtered ORDER BY kind,id LIMIT 25 OFFSET ${(page-1)*25}`),
      this.prisma.$queryRaw<Array<{total:bigint}>>(Prisma.sql`${rows} SELECT COUNT(*) AS total FROM filtered`),
    ]);
    return {data,total:Number(counts[0]?.total??0),page,pageSize:25,owner:'SCHOLARSHIPS',scope:query.scope??'ALL',unresolvedCoverage:'unknown',countUnit:'RELATIONSHIPS'};
  }
}
