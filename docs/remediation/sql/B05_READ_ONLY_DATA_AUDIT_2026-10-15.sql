-- Review-only preflight. NOT executed by Codex and never part of Prisma migrations.
-- Run only against the intended reviewed environment after confirming all tables exist.
-- Counts and schema metadata only: no identity, document content, or credentials.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';

SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name;
SELECT conrelid::regclass::text AS child_table, conname, convalidated,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace
ORDER BY child_table, conname;
SELECT c.relname AS table_name, t.tgname AS trigger_name, t.tgenabled,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname='public'
  AND (t.tgname LIKE 'eap_%' OR t.tgname LIKE 'p9_%' OR t.tgname LIKE 'p10_%')
ORDER BY c.relname,t.tgname;

SELECT 'legacy_scholarship_currency_unmatched' AS metric, count(*) AS count
FROM "Scholarship" s LEFT JOIN "ReferenceCurrency" r ON r."isoCode"=s."amountCurrencyCode"
WHERE s."amountCurrencyCode" IS NOT NULL AND r.id IS NULL;
SELECT 'country_currency_orphans' AS metric,count(*) AS count
FROM "ReferenceCountry" c LEFT JOIN "ReferenceCurrency" r ON r."isoCode"=c."defaultCurrencyCode"
WHERE c."defaultCurrencyCode" IS NOT NULL AND r.id IS NULL;
SELECT 'country_language_orphans' AS metric,count(*) AS count
FROM "ReferenceCountry" c LEFT JOIN "ReferenceLanguage" r ON r."isoCode"=c."defaultLanguageCode"
WHERE c."defaultLanguageCode" IS NOT NULL AND r.id IS NULL;
SELECT 'provider_country_orphans' AS metric,count(*) AS count
FROM "ServiceProviderRecord" p LEFT JOIN "ReferenceCountry" r ON r.id=p."countryReferenceId"
WHERE p."countryReferenceId" IS NOT NULL AND r.id IS NULL;
SELECT 'document_asset_orphans' AS metric,count(*) AS count
FROM "StudentApplicationDocumentBinding" b LEFT JOIN "AssetRecord" a ON a.id=b."assetId" WHERE a.id IS NULL;
SELECT 'program_parent_mismatch' AS metric,count(*) AS count
FROM "ScholarshipUniversityLink" s JOIN "UniversityAcademicProgram" p ON p.id=s."academicProgramId"
WHERE s."universityId" IS NOT NULL AND s."universityId"<>p."universityId";
SELECT 'program_degree_profile_not_published' AS metric,count(*) AS count
FROM "UniversityAcademicProgram" p
WHERE p.status='ACTIVE' AND p."majorMappingState"='CANONICALLY_MAPPED'
AND NOT EXISTS (SELECT 1 FROM "MajorLevelProfile" lp WHERE lp."majorId"=p."majorId"
 AND lp."degreeLevelId"=p."degreeLevelId" AND lp.status='PUBLISHED' AND lp."currentPublishedVersionId" IS NOT NULL);
SELECT 'currency_duplicate_iso_groups' AS metric,count(*) AS count FROM
 (SELECT "isoCode" FROM "ReferenceCurrency" GROUP BY "isoCode" HAVING count(*)>1) d;
SELECT 'language_duplicate_iso_groups' AS metric,count(*) AS count FROM
 (SELECT "isoCode" FROM "ReferenceLanguage" GROUP BY "isoCode" HAVING count(*)>1) d;
SELECT 'retained_document_asset_not_active' AS metric,count(*) AS count
FROM "StudentApplicationDocumentBinding" b JOIN "AssetRecord" a ON a.id=b."assetId"
WHERE b."retentionUntil">CURRENT_TIMESTAMP AND a."lifecycleState"<>'ACTIVE';
-- B01 expand is nullable by design; NULL legacy history stays private and is never assigned by inference.
SELECT 'legacy_search_actor_unattributed' AS metric,count(*) AS count
FROM "ApiSearchRequestRecord" WHERE "actorReferenceId" IS NULL;
COMMIT;
