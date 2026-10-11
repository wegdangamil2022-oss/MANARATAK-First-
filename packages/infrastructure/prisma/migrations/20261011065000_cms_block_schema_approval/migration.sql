-- Prepared only; never applied to a real database in Section 16 source review.
ALTER TABLE "CmsBlockSchema" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "CmsBlockSchema" ADD COLUMN "approvedAt" TIMESTAMP(3);
-- Previously ACTIVE schema definitions remain as legacy approved records; review
-- their provenance before accepting new blocks. All future creates are DRAFT.
