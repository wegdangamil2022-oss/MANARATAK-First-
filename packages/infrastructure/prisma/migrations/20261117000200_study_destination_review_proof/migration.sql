-- MANARATAK_MIGRATION_OWNER: reference
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Forward reconciliation of 20261013030000_study_destination_review_proof; source only, not executed.
ALTER TABLE "StudyDestinationProfile" ADD COLUMN "lastEditedBy" TEXT;
ALTER TABLE "StudyDestinationProfile" ADD COLUMN "sourceReviewProof" JSONB;
-- No verification backfill: legacy unproven records require real independent review.
