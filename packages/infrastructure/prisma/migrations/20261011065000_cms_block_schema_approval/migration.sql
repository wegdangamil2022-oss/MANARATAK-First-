-- ABSHEER_MIGRATION_OWNER: cms
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- Prepared only; never applied to a real database in Section 16 source review.
ALTER TABLE "CmsBlockSchema" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "CmsBlockSchema" ADD COLUMN "approvedAt" TIMESTAMP(3);
-- Previously ACTIVE schema definitions remain as legacy approved records; review
-- their provenance before accepting new blocks. All future creates are DRAFT.
