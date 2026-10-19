import { Prisma, PrismaClient } from '@prisma/client';
import type { IMajorConsumerReadGateway, MajorConsumerPage, MajorConsumerQuery } from '@absheer/domain';
/** P11 owns this read model. P10 cannot modify programs or infer admissions decisions. */
export class PrismaMajorProgramUsageGateway implements IMajorConsumerReadGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async usage(majorId: string, query: MajorConsumerQuery): Promise<MajorConsumerPage> {
    const page=query.page ?? 1;
    if (!Number.isSafeInteger(page)||page<1||page>1000) throw new Error('MAJOR_USAGE_PAGE_INVALID');
    const from=Prisma.sql`FROM "UniversityAcademicProgram" p JOIN "University" u ON u.id=p."universityId" WHERE p."majorId"=${majorId}
      AND (${query.countryReferenceId ?? null}::text IS NULL OR u."countryReferenceId"=${query.countryReferenceId ?? null})
      AND (${query.degreeLevelId ?? null}::text IS NULL OR p."degreeLevelId"=${query.degreeLevelId ?? null})
      ${query.scope==='PUBLISHED'?Prisma.sql`AND p.status='PUBLISHED' AND u.status='PUBLISHED'`:Prisma.empty}`;
    const [data,counts]=await Promise.all([
      this.prisma.$queryRaw<MajorConsumerPage['data']>(Prisma.sql`SELECT p.id,u.id AS "ownerId",u."displayName" AS "ownerName",p."sourceProgramName" AS label,u.status AS "ownerStatus",p.status,'PROGRAM'::text AS kind,p."degreeLevelId",u."countryReferenceId" ${from} ORDER BY p.id LIMIT 25 OFFSET ${(page-1)*25}`),
      this.prisma.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT COUNT(*) AS total ${from}`),
    ]);
    return {data,total:Number(counts[0]?.total??0),page,pageSize:25,owner:'UNIVERSITIES',scope:query.scope??'ALL',unresolvedCoverage:'unknown',countUnit:'RELATIONSHIPS'};
  }
}
