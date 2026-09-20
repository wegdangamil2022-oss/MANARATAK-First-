-- W14 source-only migration. Apply only through the Google Studio remediation gate.
-- Adds immutable publish evidence and scheduler lease fields; no data-destructive changes.

ALTER TABLE "CmsNavigationMenu"
  ADD COLUMN IF NOT EXISTS "publishedContentHash" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "CmsAnnouncement"
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedContentHash" TEXT;

-- Existing rows predate immutable maker-checker evidence. Preserve them as legacy;
-- do not synthesize reviewed hashes. Any subsequent edit resets publication proof.
UPDATE "CmsAnnouncement"
SET "updatedBy" = "createdBy"
WHERE "updatedBy" IS NULL;

ALTER TABLE "CmsAnnouncement"
  ALTER COLUMN "updatedBy" SET NOT NULL;

ALTER TABLE "CmsScheduledJob"
  ADD COLUMN IF NOT EXISTS "claimedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CmsScheduledJob_status_leaseExpiresAt_idx"
  ON "CmsScheduledJob"("status", "leaseExpiresAt");
