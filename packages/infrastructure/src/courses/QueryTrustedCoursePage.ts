import {Prisma,PrismaClient} from '@prisma/client';
import type {CourseRelationshipPublicFilters} from '@manaratak/domain';
import {boundedCursorLimit,decodeStableCursor,encodeStableCursor} from '../api-foundation/StableCursor';
import {coursePublicTrustPredicate} from './CoursePublicTrustPredicate';
export async function queryTrustedCoursePage<T>(prisma:PrismaClient,filters:CourseRelationshipPublicFilters,hydrate:(tx:Prisma.TransactionClient,ids:string[])=>Promise<T[]>) {
 const predicates:Prisma.Sql[]=[Prisma.sql`c.status='PUBLISHED' AND c."completenessStatus"='COMPLETE'`,coursePublicTrustPredicate()];
 const scalar=[['accessType',filters.accessType],['originType',filters.originType],['category',filters.category],['learningLanguage',filters.learningLanguage],['learningLanguageReferenceId',filters.learningLanguageReferenceId]] as const;
 for(const [column,value]of scalar)if(value)predicates.push(Prisma.sql`c.${Prisma.raw('"'+column+'"')}=${value}`);
 if(filters.platformName)predicates.push(Prisma.sql`c."platformName" ILIKE ${'%'+filters.platformName.replace(/[\\%_]/g,'\\$&')+'%'}`);
 const search=(filters as CourseRelationshipPublicFilters & {search?:string}).search;
 if(search){const q='%'+search.replace(/[\\%_]/g,'\\$&')+'%';predicates.push(Prisma.sql`(c."displayName" ILIKE ${q} OR c."canonicalName" ILIKE ${q} OR c."publicId" ILIKE ${q})`);}
 if(filters.majorId)predicates.push(Prisma.sql`EXISTS(SELECT 1 FROM "CourseMajorProjection" r JOIN "Major" m ON m.id=r."majorId" WHERE r."courseId"=c.id AND r."majorId"=${filters.majorId} AND r."projectionState"='APPROVED' AND m.status='PUBLISHED')`);
 if(filters.taxonomyNodeId)predicates.push(Prisma.sql`EXISTS(SELECT 1 FROM "CourseAcademicTaxonomyLink" r WHERE r."courseId"=c.id AND r."taxonomyNodeId"=${filters.taxonomyNodeId} AND r."reviewState"='APPROVED')`);
 if(filters.internationalTestId)predicates.push(Prisma.sql`EXISTS(SELECT 1 FROM "CourseInternationalTestRelationship" r JOIN "InternationalTest" t ON t.id=r."internationalTestId" WHERE r."courseId"=c.id AND r."internationalTestId"=${filters.internationalTestId} AND r."reviewState"='APPROVED' AND t.status='PUBLISHED' AND t."isPubliclyVisible"=TRUE)`);
 if(filters.providerHeadquartersCountryReferenceId)predicates.push(Prisma.sql`EXISTS(SELECT 1 FROM "ExternalCourseProvider" p WHERE p.id=c."externalProviderId" AND p."headquartersCountryReferenceId"=${filters.providerHeadquartersCountryReferenceId})`);
 const limit=boundedCursorLimit(filters.limit);const cursor=decodeStableCursor(filters.cursor);const where=Prisma.join(predicates,' AND ');
 const work=async(tx:Prisma.TransactionClient)=>{
  const rows=await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`SELECT c.id FROM "Course" c WHERE ${where} ${cursor?Prisma.sql`AND c.id>${cursor}`:Prisma.empty} ORDER BY c.id ASC LIMIT ${limit+1}`);
  const totals=await tx.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT count(*) AS total FROM "Course" c WHERE ${where}`);
  const hasMore=rows.length>limit;const ids=rows.slice(0,limit).map(row=>row.id);const data=await hydrate(tx,ids);const total=Number(totals[0]?.total??0);
  return {data,total,page:1,pageSize:limit,totalPages:Math.ceil(total/limit),hasMore,nextCursor:hasMore&&ids.length?encodeStableCursor(ids[ids.length-1]):null};
 };
 return typeof prisma.$transaction==='function'?prisma.$transaction(work,{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead}):work(prisma);
}
