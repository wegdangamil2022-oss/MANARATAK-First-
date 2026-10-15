-- MANARATAK_MIGRATION_OWNER: services
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Source only: no migration was applied.
BEGIN;
-- CreateTable
CREATE TABLE "ServiceTestDiscoveryLink" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "ownerRevision" TEXT NOT NULL,
    "testRevision" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "proposedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTestDiscoveryLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceTestDiscoveryLink_testId_status_id_idx" ON "ServiceTestDiscoveryLink"("testId", "status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTestDiscoveryLink_ownerKey_testId_key" ON "ServiceTestDiscoveryLink"("ownerKey", "testId");

ALTER TABLE "ServiceTestDiscoveryLink" ADD CONSTRAINT "ServiceTestDiscoveryLink_review_check" CHECK (
 "version">0 AND "status" IN ('PENDING','APPROVED','REVOKED') AND
 ("status"<>'APPROVED' OR ("reviewedBy" IS NOT NULL AND "reviewedBy"<>"proposedBy"))
);
COMMIT;
