-- Source-only migration. Apply and verify in Google Studio Runtime.
ALTER TABLE "UniversitySourceRecord"
  ADD COLUMN "sourceIdentityKey" TEXT;

UPDATE "UniversitySourceRecord"
SET "sourceIdentityKey" =
  "stage" || '|' || "sourceArtifactId" || '|' ||
  CASE
    WHEN "sourceRowNumber" IS NULL THEN 'hash:' || "sourceHash"
    ELSE 'row:' || "sourceRowNumber"::text
  END;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "UniversitySourceRecord"
    GROUP BY "sourceIdentityKey"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'University source identity collision; reconcile provenance before migration';
  END IF;
END $$;

ALTER TABLE "UniversitySourceRecord"
  ALTER COLUMN "sourceIdentityKey" SET NOT NULL;

DROP INDEX IF EXISTS "UniversitySourceRecord_stage_sourceArtifactId_sourceRowNumber_key";
CREATE UNIQUE INDEX "UniversitySourceRecord_sourceIdentityKey_key"
  ON "UniversitySourceRecord"("sourceIdentityKey");
CREATE INDEX "UniversitySourceRecord_stage_sourceArtifactId_sourceRowNumber_idx"
  ON "UniversitySourceRecord"("stage", "sourceArtifactId", "sourceRowNumber");
