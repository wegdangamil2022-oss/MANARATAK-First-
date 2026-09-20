-- Source-only migration. Apply/verify only through the Google Studio remediation runbook.
-- W13: immutable tool-version snapshots, execution->version provenance, encrypted transient result recovery.

ALTER TABLE "StudentToolVersionRecord"
  ADD COLUMN "snapshotHash" TEXT,
  ADD COLUMN "definitionSnapshot" JSONB;

UPDATE "StudentToolVersionRecord" AS v
SET "definitionSnapshot" = jsonb_build_object(
  'inputSchema', d."inputSchema",
  'outputSchema', d."outputSchema",
  'dependencies', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'phase', dep."phase",
        'type', dep."type",
        'required', dep."required",
        'capabilityKey', dep."capabilityKey",
        'description', dep."description"
      )
      ORDER BY dep."phase", dep."type", COALESCE(dep."capabilityKey", ''), dep."description"
    )
    FROM "StudentToolDependencyRecord" dep
    WHERE dep."definitionId" = d."id"
  ), '[]'::jsonb),
  'availability', d."availability",
  'rateLimitPolicy', d."rateLimitPolicy",
  'executionType', d."executionType",
  'aiCapabilityKey', d."aiCapabilityKey",
  'outputType', d."outputType",
  'supportedLocales', d."supportedLocales",
  'snapshotProvenance', 'LEGACY_RECONSTRUCTED_AT_W13_MIGRATION'
)
FROM "StudentToolDefinitionRecord" d
WHERE d."id" = v."definitionId";

UPDATE "StudentToolVersionRecord"
SET "snapshotHash" = 'legacy-md5:' || md5("definitionSnapshot"::text)
WHERE "snapshotHash" IS NULL;

ALTER TABLE "StudentToolVersionRecord"
  ALTER COLUMN "snapshotHash" SET NOT NULL,
  ALTER COLUMN "definitionSnapshot" SET NOT NULL;

ALTER TABLE "StudentToolExecutionRecord"
  ADD COLUMN "versionId" TEXT,
  ADD COLUMN "resultDigest" TEXT,
  ADD COLUMN "resultCiphertext" TEXT,
  ADD COLUMN "resultIv" TEXT,
  ADD COLUMN "resultAuthTag" TEXT,
  ADD COLUMN "resultKeyVersion" TEXT,
  ADD COLUMN "resultExpiresAt" TIMESTAMP(3);

UPDATE "StudentToolExecutionRecord" e
SET "versionId" = v."id"
FROM "StudentToolVersionRecord" v
WHERE v."definitionId" = e."definitionId"
  AND v."semanticVersion" = e."toolVersion";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "StudentToolExecutionRecord" WHERE "versionId" IS NULL) THEN
    RAISE EXCEPTION 'W13 cannot bind every historical StudentToolExecutionRecord to a version; reconcile before migration';
  END IF;
END $$;

ALTER TABLE "StudentToolExecutionRecord"
  ALTER COLUMN "versionId" SET NOT NULL;

ALTER TABLE "StudentToolExecutionRecord"
  ADD CONSTRAINT "StudentToolExecutionRecord_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "StudentToolVersionRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "StudentToolExecutionRecord_resultExpiresAt_idx"
  ON "StudentToolExecutionRecord"("resultExpiresAt");
