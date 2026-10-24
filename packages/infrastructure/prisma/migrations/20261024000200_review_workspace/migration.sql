-- MANARATAK_MIGRATION_OWNER: foundation_control_plane
-- MANARATAK_MIGRATION_SCOPE: cross_context_approved
-- MANARATAK_ARCH_DECISION: ADR-028
-- Read-through owner projection and coordination metadata only. No owner writes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE TABLE "ReviewWorkCase" (
 "key" TEXT PRIMARY KEY, "domain" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "profileId" TEXT,
 "cycle" INTEGER NOT NULL DEFAULT 1 CHECK ("cycle">0), "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 "ownerRevision" TEXT NOT NULL, "reasons" JSONB NOT NULL CHECK (jsonb_typeof("reasons")='array'),
 "state" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("state" IN ('OPEN','WAITING_INFORMATION','REFERRED','COMPLETED')),
 "assigneeId" TEXT REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "teamId" TEXT REFERENCES "RoleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "priority" TEXT CHECK ("priority" IN ('critical','high','medium','low')),
 "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dueAt" TIMESTAMP(3), "policyId" TEXT,
 "closedAt" TIMESTAMP(3), "synchronizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("assigneeId" IS NULL OR "teamId" IS NULL),
 CHECK (("dueAt" IS NULL AND "policyId" IS NULL) OR ("dueAt">="enteredAt" AND "policyId" IS NOT NULL))
);
CREATE INDEX "ReviewWorkCase_domain_state_enteredAt_key_idx" ON "ReviewWorkCase"("domain","state","enteredAt","key");
CREATE INDEX "ReviewWorkCase_assigneeId_state_idx" ON "ReviewWorkCase"("assigneeId","state");
CREATE INDEX "ReviewWorkCase_teamId_state_idx" ON "ReviewWorkCase"("teamId","state");
CREATE INDEX "ReviewWorkCase_dueAt_state_idx" ON "ReviewWorkCase"("dueAt","state");
CREATE TABLE "ReviewWorkEvent" (
 "id" TEXT PRIMARY KEY, "caseKey" TEXT NOT NULL REFERENCES "ReviewWorkCase"("key") ON DELETE RESTRICT ON UPDATE CASCADE,
 "cycle" INTEGER NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "note" TEXT CHECK (length("note")<=2000), "payload" JSONB NOT NULL,
 "commandKey" TEXT UNIQUE, "commandHash" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ReviewWorkEvent_caseKey_createdAt_id_idx" ON "ReviewWorkEvent"("caseKey","createdAt","id");
CREATE INDEX "ReviewWorkEvent_action_createdAt_idx" ON "ReviewWorkEvent"("action","createdAt");
CREATE TABLE "ReviewSourceCheckpoint" ("domain" TEXT PRIMARY KEY,"synchronizedAt" TIMESTAMP(3),"observed" INTEGER,"errorCode" TEXT,"lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "ReviewWorkView" ("id" TEXT PRIMARY KEY,"actorId" TEXT NOT NULL REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"name" TEXT NOT NULL,"shared" BOOLEAN NOT NULL DEFAULT false,"filters" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "ReviewWorkView_actorId_shared_idx" ON "ReviewWorkView"("actorId","shared");
CREATE TABLE "ReviewSlaPolicy" ("domain" TEXT PRIMARY KEY,"version" INTEGER NOT NULL DEFAULT 1,"hours" INTEGER NOT NULL CHECK ("hours">0 AND "hours"<=8760),"warningHours" INTEGER NOT NULL CHECK ("warningHours">=0 AND "warningHours"<"hours"),"timezone" TEXT NOT NULL DEFAULT 'UTC' CHECK ("timezone"='UTC'),"approvedBy" TEXT NOT NULL REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"reason" TEXT NOT NULL);

-- Read-through projection, never a second copy of owner content. Only allowlisted
-- fields leave this view; student documents, service inputs and recruiter PII do not.
CREATE FUNCTION review_normalize(value TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
 SELECT lower(translate(regexp_replace(coalesce(value,''),'[ـًٌٍَُِّْٰ]','','g'),'أإآٱى','ااااي'))
$$;
CREATE VIEW "ReviewOwnerProjection" AS
WITH owners AS (
 SELECT 'scholarships'::text domain,s.id "ownerId",NULL::text "profileId",to_jsonb(s) j FROM "Scholarship" s
 UNION ALL SELECT 'universities',s.id,NULL,to_jsonb(s) FROM "University" s
 UNION ALL SELECT 'majors',s."majorId",s.id,to_jsonb(m)||to_jsonb(s)||jsonb_build_object('displayName',coalesce(s."displayName",m."displayName"),'localizedNameAr',coalesce(s."localizedNameAr",m."localizedNameAr"),'localizedNameEn',coalesce(s."localizedNameEn",m."localizedNameEn"),'id',s."majorId") FROM "MajorLevelProfile" s JOIN "Major" m ON m.id=s."majorId"
 UNION ALL SELECT 'majors',s.id,NULL,to_jsonb(s) FROM "Major" s WHERE NOT EXISTS(SELECT 1 FROM "MajorLevelProfile" p WHERE p."majorId"=s.id)
 UNION ALL SELECT 'courses',s.id,NULL,to_jsonb(s)||jsonb_build_object('reviewSourceVerified',
   EXISTS(SELECT 1 FROM "ExternalCourseProvider" provider JOIN "ExternalCourseProviderDomain" d ON d."providerId"=provider.id WHERE provider.id=s."externalProviderId" AND provider.status='APPROVED' AND (
    lower(substring(s."directCourseUrl" from '^https?://([^/:?#]+)'))=lower(coalesce(d."normalizedDomain",d.domain)) OR lower(substring(s."directCourseUrl" from '^https?://([^/:?#]+)')) LIKE '%.'||lower(coalesce(d."normalizedDomain",d.domain)))),
   'reviewLinkBroken',EXISTS(SELECT 1 FROM "CourseSourceIdentity" i JOIN "CourseSourceUrlHistory" h ON h."courseSourceIdentityId"=i.id WHERE i."courseId"=s.id AND h."isCurrent" AND h."verificationState"='BROKEN')) FROM "Course" s
 UNION ALL SELECT 'tests',s.id,NULL,to_jsonb(s) FROM "InternationalTest" s
 UNION ALL SELECT 'services',s.id,NULL,to_jsonb(s) FROM "ServiceCatalogRecord" s
 UNION ALL SELECT 'cms',s.id,NULL,to_jsonb(s) FROM "CmsContentNode" s
 UNION ALL SELECT 'careers',s.id,NULL,to_jsonb(s) FROM "CareerJobPostingRecord" s
 UNION ALL SELECT 'study-destinations',c.id,s.id,coalesce(to_jsonb(s),'{}'::jsonb)||jsonb_build_object('id',c.id,'displayName',coalesce(c."nameAr",c.name),'localizedNameEn',c.name,'iso2',c."iso2Code",'status',coalesce(s.status,'NO_PROFILE'),'updatedAt',greatest(c."updatedAt",s."updatedAt")) FROM "ReferenceCountry" c LEFT JOIN "StudyDestinationProfile" s ON s."countryReferenceId"=c.id WHERE c."isActive" AND c."lifecycleState"='ACTIVE'
), shaped AS (
 SELECT domain,"ownerId","profileId",j,
 array_remove(ARRAY[
 CASE WHEN j->>'status' IN ('READY_TO_REVIEW','NEEDS_REVIEW','IN_REVIEW') OR (domain='study-destinations' AND j->>'completenessStatus'='READY_FOR_REVIEW' AND j->>'status'='DRAFT') THEN 'workflow_review' END,
 CASE WHEN j->>'completenessStatus' IN ('INCOMPLETE','NEEDS_REVIEW') OR j->>'status'='NO_PROFILE' THEN 'incomplete' END,
 CASE WHEN j->>'status'='READY_TO_PUBLISH' OR (domain='study-destinations' AND j->>'status' IN ('DRAFT','IN_REVIEW') AND j->>'completenessStatus'='READY_TO_PUBLISH') THEN 'ready_to_publish' END,
 CASE WHEN j->>'status'='IMPORTED' THEN 'imported_unreviewed' END,
 CASE WHEN domain='scholarships' AND j->>'verificationStatus' IN ('PENDING','FAILED') THEN 'source_verification' END,
 CASE WHEN domain='scholarships' AND coalesce(j->'optionalFields'->'localizedNames'->>'en','')='' THEN 'needs_translation' END,
 CASE WHEN domain='courses' AND j->>'originType'='EXTERNAL_LINKED_COURSE' AND j->>'reviewSourceVerified'='false' THEN 'source_verification' END,
 CASE WHEN domain='courses' AND j->>'reviewLinkBroken'='true' THEN 'broken_link' END
 ],NULL)::text[] reasons
 FROM owners WHERE coalesce(j->>'status','') NOT IN ('ARCHIVED','REJECTED')
)
SELECT domain||':'||"ownerId"||':'||coalesce("profileId",'') "key",domain,"ownerId","profileId",
 coalesce(nullif(j->>'localizedNameAr',''),nullif(j->>'displayName',''),j->>'title',j->>'canonicalName',"ownerId") title,
 coalesce(j->>'localizedNameEn',j->>'canonicalName') "titleEn",
 coalesce(j->>'publicId',j->>'code',"ownerId") reference,
 coalesce(j->>'status','UNKNOWN') status,reasons,
 coalesce(j->>'updatedAt',j->>'createdAt')::timestamp "modifiedAt",
 md5(j::text) "ownerRevision",
 CASE WHEN j->>'sourceImportRecordId' IS NOT NULL OR j->>'status'='IMPORTED' OR j->>'originType'='EXTERNAL_LINKED_COURSE' THEN 'imported' WHEN domain='cms' THEN 'cms' ELSE 'unknown' END "sourceKind",
 coalesce(j->>'primaryLocale',j->>'sourceLocale') locale,
 coalesce(j->>'officialSourceUrl',j->>'sourceUrl',j->>'directCourseUrl') "sourceUrl",
 coalesce(j->>'verificationStatus',j->>'sourceVerificationStatus',j->'optionalFields'->>'verificationState','UNKNOWN') "verificationState",
 j->>'sourceImportRecordId' "importRecordId",NULL::text "batchId",NULL::integer "sourceRowNumber",
 CASE domain WHEN 'tests' THEN '/international-tests/' WHEN 'study-destinations' THEN '/study-destinations/' ELSE '/'||domain||'/' END || CASE WHEN domain='study-destinations' THEN j->>'iso2' ELSE "ownerId" END || CASE WHEN domain='majors' AND "profileId" IS NOT NULL THEN '?profileId='||"profileId" ELSE '' END href,
 domain NOT IN ('cms','services','careers') detail,
 CASE domain WHEN 'scholarships' THEN 'SCHOLARSHIP' WHEN 'universities' THEN 'UNIVERSITY' WHEN 'majors' THEN 'MAJOR' WHEN 'courses' THEN 'COURSE' WHEN 'tests' THEN 'INTERNATIONAL_TEST' WHEN 'cms' THEN 'CmsContent' WHEN 'study-destinations' THEN CASE WHEN "profileId" IS NOT NULL THEN 'COUNTRY_STUDY_PROFILE' END END "auditType",
 review_normalize(concat_ws(' ',j->>'localizedNameAr',j->>'localizedNameEn',j->>'displayName',j->>'title',j->>'canonicalName',j->>'publicId',j->>'code',j->'optionalFields'->'localizedNames'->>'en',j->'optionalFields'->'localizedNames'->>'ar',"ownerId",array_to_string(reasons,' '),
 CASE WHEN 'incomplete'=ANY(reasons) THEN 'بيانات ناقصة' END,CASE WHEN 'workflow_review'=ANY(reasons) THEN 'انتظار المراجعة' END,CASE WHEN 'source_verification'=ANY(reasons) THEN 'تحقق المصدر' END,CASE WHEN 'needs_translation'=ANY(reasons) THEN 'يحتاج ترجمة' END,CASE WHEN 'broken_link'=ANY(reasons) THEN 'رابط معطل' END,CASE WHEN 'ready_to_publish'=ANY(reasons) THEN 'جاهز للنشر' END,
 CASE WHEN domain='majors' THEN (SELECT string_agg(a.alias,' ') FROM "MajorAlias" a WHERE a."majorId"=shaped."ownerId") END,
 CASE WHEN domain='universities' THEN (SELECT string_agg(t.value,' ') FROM "UniversityLocalizedText" t WHERE t."universityId"=shaped."ownerId" AND t."fieldKey" IN ('displayName','name','title')) END)) search
FROM shaped WHERE cardinality(reasons)>0
UNION ALL
SELECT 'scholarships:'||r.id||':import','scholarships',r.id,'import',coalesce(r."rawPayload"->>'scholarshipName',r.id),NULL,r.id,r.status,
 ARRAY(SELECT jsonb_array_elements_text(c.reasons)),r."updatedAt",md5(to_jsonb(r)::text),'imported',NULL,
 NULL,NULL,r.id,r."batchId",r."sourceRowNumber",'/imports/scholarships?reviewBatch='||r."batchId",false,'SCHOLARSHIP_IMPORT_RECORD',
 review_normalize(concat_ws(' ',r."rawPayload"->>'scholarshipName',r.id,'import_review مراجعة الاستيراد'))
FROM "ImportRecord" r JOIN "ImportBatch" b ON b.id=r."batchId" JOIN "ReviewWorkCase" c ON c."key"='scholarships:'||r.id||':import'
WHERE b."dataType"='SCHOLARSHIPS' AND r."promotedEntityId" IS NULL AND c.state<>'COMPLETED' AND c."ownerRevision"=md5(to_jsonb(r)::text);
COMMIT;

