-- W3 source migration only. DO NOT APPLY before Google Studio duplicate inspection,
-- backup, schema snapshot, and recovery proof.
-- Existing rows remain NULL until the approved reconciliation/backfill assigns
-- canonical keys; all new/claimed rows are protected immediately after migration.
ALTER TABLE "ReferenceCity" ADD COLUMN "canonicalIdentityKey" TEXT;
CREATE UNIQUE INDEX "ReferenceCity_canonicalIdentityKey_key"
  ON "ReferenceCity"("canonicalIdentityKey");
