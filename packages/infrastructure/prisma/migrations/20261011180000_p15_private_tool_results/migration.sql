-- MANARATAK_MIGRATION_OWNER: student
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY / UNAPPLIED: additive custody fields; no legacy plaintext backfill.
ALTER TABLE "StudentSavedItem" ADD COLUMN "privateResultEnvelope" JSONB;
ALTER TABLE "StudentSavedItem" ADD COLUMN "privateResultExpiresAt" TIMESTAMP(3);
CREATE INDEX "StudentSavedItem_privateResultExpiresAt_idx" ON "StudentSavedItem"("privateResultExpiresAt");
