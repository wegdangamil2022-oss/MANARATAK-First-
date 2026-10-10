-- MANARATAK_MIGRATION_OWNER: academic_taxonomy
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY, UNAPPLIED: owner preview/review/apply receipt, not generic P6 promotion.
CREATE TABLE "AcademicTaxonomyImportReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "receiptId" TEXT NOT NULL UNIQUE,
  "sourceHash" TEXT NOT NULL,
  "record" JSONB NOT NULL,
  "preview" JSONB NOT NULL,
  "previewHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PREVIEWED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "reviewedBy" TEXT,
  "reason" TEXT,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicTaxonomyImportReview_approval_check" CHECK ("status" NOT IN ('APPROVED', 'APPLIED') OR ("reviewedBy" IS NOT NULL AND "reason" IS NOT NULL AND LENGTH(BTRIM("reason")) > 0)),
  CONSTRAINT "AcademicTaxonomyImportReview_version_check" CHECK ("version" > 0),
  CONSTRAINT "AcademicTaxonomyImportReview_state_check" CHECK ("status" IN ('PREVIEWED', 'APPROVED', 'REJECTED', 'APPLIED'))
);
CREATE INDEX "AcademicTaxonomyImportReview_status_updatedAt_idx" ON "AcademicTaxonomyImportReview"("status", "updatedAt");
-- Apply only after diagnostics/reconciliation confirms no multiple-primary history.
CREATE UNIQUE INDEX "AcademicTaxonomyEdge_one_primary_parent" ON "AcademicTaxonomyEdge"("childNodeId") WHERE "isPrimary" = TRUE;
