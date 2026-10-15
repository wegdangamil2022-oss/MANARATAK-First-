-- MANARATAK_MIGRATION_OWNER: student_tools
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- Source only: no migration was applied.
BEGIN;
-- CreateTable
CREATE TABLE "StudentToolTestDiscoveryLink" (
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

    CONSTRAINT "StudentToolTestDiscoveryLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentToolTestDiscoveryLink_testId_status_id_idx" ON "StudentToolTestDiscoveryLink"("testId", "status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentToolTestDiscoveryLink_ownerKey_testId_key" ON "StudentToolTestDiscoveryLink"("ownerKey", "testId");

ALTER TABLE "StudentToolTestDiscoveryLink" ADD CONSTRAINT "StudentToolTestDiscoveryLink_review_check" CHECK (
 "version">0 AND "status" IN ('PENDING','APPROVED','REVOKED') AND
 ("status"<>'APPROVED' OR ("reviewedBy" IS NOT NULL AND "reviewedBy"<>"proposedBy"))
);
COMMIT;
