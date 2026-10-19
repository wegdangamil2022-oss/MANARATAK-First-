-- ABSHEER_MIGRATION_OWNER: majors
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- SOURCE ONLY, UNAPPLIED. Preserve owner reviews and import/publication history.
CREATE TABLE "MajorImportOwnerReview" (
 "id" TEXT PRIMARY KEY, "receiptId" TEXT NOT NULL UNIQUE, "requestHash" TEXT NOT NULL,
 "payload" JSONB NOT NULL, "preview" JSONB NOT NULL, "previewHash" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 "status" TEXT NOT NULL CHECK ("status" IN ('PREVIEWED','APPROVED','REJECTED','APPLIED')),
 "reviewer" TEXT, "reason" TEXT, "result" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CHECK ("status" NOT IN ('APPROVED','APPLIED') OR ("reviewer" IS NOT NULL AND "reason" IS NOT NULL AND LENGTH(BTRIM("reason"))>0))
);
CREATE INDEX "MajorImportOwnerReview_status_updatedAt_idx" ON "MajorImportOwnerReview"("status","updatedAt");
