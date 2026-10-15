-- MANARATAK_MIGRATION_OWNER: student
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Source-only; not applied.
BEGIN;
ALTER TABLE "StudentApplicationDocumentBinding" ADD COLUMN "reviewConsentGrantedAt" TIMESTAMP(3), ADD COLUMN "reviewConsentUntil" TIMESTAMP(3), ADD COLUMN "attestation" JSONB;
CREATE INDEX "StudentApplicationDocumentBinding_reviewConsentUntil_id_idx" ON "StudentApplicationDocumentBinding"("reviewConsentUntil","id");
ALTER TABLE "StudentApplicationDocumentBinding" ADD CONSTRAINT "StudentDocument_review_consent_window" CHECK (("reviewConsentGrantedAt" IS NULL AND "reviewConsentUntil" IS NULL) OR ("reviewConsentGrantedAt" IS NOT NULL AND "reviewConsentUntil">"reviewConsentGrantedAt" AND "reviewConsentUntil"<="retentionUntil"));
COMMIT;
