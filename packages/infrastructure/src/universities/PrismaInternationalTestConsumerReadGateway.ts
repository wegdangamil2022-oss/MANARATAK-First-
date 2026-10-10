import { Prisma, PrismaClient } from '@prisma/client';
/** University-owned, bounded admission projection. No admission rules are written by P9. */
export class PrismaInternationalTestConsumerReadGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async usage(testId:string,page=1,publishedOnly=false) {
    const offset=(Math.min(1000,Math.max(1,page))-1)*25;
    const where = Prisma.sql`r."internationalTestId"=${testId} ${publishedOnly ? Prisma.sql`AND p."status"='PUBLISHED' AND u."status"='PUBLISHED' AND r."status"='APPROVED'` : Prisma.empty}`;
    const from = Prisma.sql`FROM "UniversityProgramAdmissionRequirement" r JOIN "UniversityAcademicProgram" p ON p."id"=r."academicProgramId" JOIN "University" u ON u."id"=p."universityId" WHERE ${where}`;
    const [data,count]=await Promise.all([this.prisma.$queryRaw<Array<{id:string;programId:string;programName:string;universityId:string;slug:string;name:string;status:string;minimumScore:number|null}>>(Prisma.sql`SELECT r."id",p."id" AS "programId",p."normalizedName" AS "programName",u."id" AS "universityId",u."slug",u."displayName" AS "name",r."status",r."minimumScore" ${from} ORDER BY r."id" LIMIT 25 OFFSET ${offset}`),this.prisma.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT COUNT(*) AS total ${from}`)]);
    return {data,total:Number(count[0]?.total??0),page,pageSize:25,scaleChangeRequiresReview:Number(count[0]?.total??0)>0};
  }
}
