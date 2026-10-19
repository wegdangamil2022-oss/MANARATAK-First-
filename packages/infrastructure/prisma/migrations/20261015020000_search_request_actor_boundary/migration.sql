-- ABSHEER_MIGRATION_OWNER: foundation_control_plane
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- SOURCE ONLY: not applied by this change. Expand before deploying the new reader.
-- Historic search ownership cannot be inferred; existing NULL values stay private.
ALTER TABLE "ApiSearchRequestRecord" ADD COLUMN "actorReferenceId" TEXT;
CREATE INDEX "ApiSearchRequestRecord_actorReferenceId_reference_createdAt_idx"
  ON "ApiSearchRequestRecord"("actorReferenceId", "reference", "createdAt");
