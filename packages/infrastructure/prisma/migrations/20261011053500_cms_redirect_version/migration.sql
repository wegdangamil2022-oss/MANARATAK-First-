-- ABSHEER_MIGRATION_OWNER: cms
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- Source-only; do not apply before post-28 approved migration window.
ALTER TABLE "CmsRedirect" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CmsRedirect" ADD COLUMN "updatedBy" TEXT;
