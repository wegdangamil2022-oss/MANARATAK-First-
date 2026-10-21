-- Reviewed deployment gates remain required. This candidate is outside Prisma's
-- active migration tree; only explicitly authorized isolated laboratory applies.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public."UniversityProgramAdmissionRequirement" IN SHARE ROW EXCLUSIVE MODE;

DO $guard$
DECLARE
  original_index record;
BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 16 THEN
    RAISE EXCEPTION 'ADMISSION_NULL_IDENTITY_POSTGRES16_REQUIRED';
  END IF;
  SELECT i.indisunique, i.indisvalid, i.indisready, i.indnullsnotdistinct,
         i.indpred IS NULL AS unrestricted, i.indexprs IS NULL AS plain_columns,
         i.indnkeyatts, i.indnatts,
         ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum, position)
               JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
               ORDER BY k.position) AS columns
    INTO original_index
    FROM pg_index i
    WHERE i.indexrelid = to_regclass('public."UniversityProgramAdmissionRequirement_identity_key"')
      AND i.indrelid = 'public."UniversityProgramAdmissionRequirement"'::regclass;
  IF NOT FOUND OR NOT original_index.indisunique OR NOT original_index.indisvalid
     OR NOT original_index.indisready OR original_index.indnullsnotdistinct
     OR NOT original_index.unrestricted OR NOT original_index.plain_columns
     OR original_index.indnkeyatts <> 4 OR original_index.indnatts <> 4
     OR original_index.columns <> ARRAY['academicProgramId','internationalTestId','testVariantId','testVersionId'] THEN
    RAISE EXCEPTION 'ADMISSION_NULL_IDENTITY_EXISTING_INDEX_REVIEW_REQUIRED';
  END IF;
  -- The table lock closes the audit-to-DDL race for every writer, including SQL
  -- writers that do not cooperate with the application's owner advisory locks.
  IF EXISTS (
    SELECT 1 FROM public."UniversityProgramAdmissionRequirement"
    GROUP BY "academicProgramId", "internationalTestId", "testVariantId", "testVersionId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ADMISSION_NULL_IDENTITY_DUPLICATES_REQUIRE_REVIEW' USING ERRCODE = '23505';
  END IF;
END
$guard$;

-- Same logical identity, same Prisma-mapped index name, and all statuses remain
-- covered. A failure rolls back both DDL statements, preserving the old index.
DROP INDEX public."UniversityProgramAdmissionRequirement_identity_key";
SELECT 1/0;
CREATE UNIQUE INDEX "UniversityProgramAdmissionRequirement_identity_key"
ON public."UniversityProgramAdmissionRequirement"
("academicProgramId", "internationalTestId", "testVariantId", "testVersionId")
NULLS NOT DISTINCT;
COMMIT;
