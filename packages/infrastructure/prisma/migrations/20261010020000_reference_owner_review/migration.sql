-- MANARATAK_MIGRATION_OWNER: reference
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY: not applied in this review.
CREATE TABLE "ReferenceOwnerImportReview" (
 "id" TEXT PRIMARY KEY, "receiptId" TEXT NOT NULL UNIQUE, "sourceHash" TEXT NOT NULL,
 "entityType" TEXT NOT NULL CHECK ("entityType" IN ('COUNTRY','CURRENCY','LANGUAGE','CITY')),
 "payload" JSONB NOT NULL, "preview" JSONB NOT NULL, "previewHash" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 "status" TEXT NOT NULL DEFAULT 'PREVIEWED' CHECK ("status" IN ('PREVIEWED','APPROVED','REJECTED','APPLIED')),
 "reviewer" TEXT, "reason" TEXT, "result" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CHECK ("status" NOT IN ('APPROVED','APPLIED') OR ("reviewer" IS NOT NULL AND "reason" IS NOT NULL AND LENGTH(BTRIM("reason"))>=3))
);
CREATE INDEX "ReferenceOwnerImportReview_status_updatedAt_idx" ON "ReferenceOwnerImportReview" ("status","updatedAt");
CREATE TABLE "ReferenceStandardSnapshot" (
 "id" TEXT PRIMARY KEY, "family" TEXT NOT NULL CHECK ("family" IN ('ISO_3166','ISO_4217','ISO_639','UN_M49','IANA_TZ','CLDR')),
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','REVIEWED','REJECTED','SUPERSEDED')),
 "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0), "record" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "ReferenceStandardSnapshot_family_status_idx" ON "ReferenceStandardSnapshot" ("family","status");
CREATE UNIQUE INDEX "ReferenceStandardSnapshot_one_reviewed_family" ON "ReferenceStandardSnapshot" ("family") WHERE "status"='REVIEWED';
