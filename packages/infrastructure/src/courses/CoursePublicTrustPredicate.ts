import {Prisma} from '@prisma/client';
import {COURSE_SOURCE_FACT_KEYS} from '@manaratak/domain';
/** Alias c is fixed by owner queries. All identifiers below are compile-time allowlisted. */
export function courseSourceApprovalPredicate():Prisma.Sql {
 const equalFacts=Prisma.join(COURSE_SOURCE_FACT_KEYS.map(key=>Prisma.sql`COALESCE(to_jsonb(c.${Prisma.raw('"'+key+'"')}), 'null'::jsonb) = a."facts" -> ${key}`),' AND ');
 const changedHistory=Prisma.join(COURSE_SOURCE_FACT_KEYS.map(key=>Prisma.sql`COALESCE(v.snapshot->'course'->${key}, 'null'::jsonb) IS DISTINCT FROM a."facts"->${key}`),' OR ');
 return Prisma.sql`EXISTS (SELECT 1 FROM "ExternalCourseProvider" p WHERE p.id=c."externalProviderId" AND p.status='APPROVED'
  AND EXISTS (SELECT 1 FROM "ExternalCourseProviderDomain" d WHERE d."providerId"=p.id AND (lower(substring(c."directCourseUrl" FROM '^https://([^/:?#]+)'))=d."normalizedDomain" OR right(lower(substring(c."directCourseUrl" FROM '^https://([^/:?#]+)')),length(d."normalizedDomain")+1)='.'||d."normalizedDomain"))
  AND EXISTS (SELECT 1 FROM "CourseSourceApproval" a WHERE a."courseId"=c.id AND a."courseVersion"<=c.version AND a."providerId"=p.id AND a."providerRevision"=p."updatedAt" AND (a.facts->>'validUntil' IS NULL OR (a.facts->>'validUntil')::timestamptz>CURRENT_TIMESTAMP) AND ${equalFacts} AND NOT EXISTS(SELECT 1 FROM "CourseVersion" v WHERE v."courseId"=c.id AND v."versionNumber">a."courseVersion" AND v."versionNumber"<=c.version AND (${changedHistory})))
  AND EXISTS (SELECT 1 FROM "CourseSourceIdentity" si JOIN "CourseSourceUrlHistory" h ON h."courseSourceIdentityId"=si.id WHERE si."courseId"=c.id AND si."providerId"=p.id AND si.status NOT IN ('ARCHIVED','REJECTED','BLOCKED') AND si."currentUrl"=c."directCourseUrl" AND h."url"=c."directCourseUrl" AND h."isCurrent"=TRUE AND h."verificationState"='VERIFIED' AND h."checkedAt" IS NOT NULL)
 )`;
}

export function coursePublicTrustPredicate():Prisma.Sql {return Prisma.sql`(c."originType" <> 'EXTERNAL_LINKED_COURSE' OR (c."accessType"='FREE_STUDY_AND_CERTIFICATE' AND c."isStudyFree"=TRUE AND c."isFreeCertificate"=TRUE AND ${courseSourceApprovalPredicate()}))`;}
