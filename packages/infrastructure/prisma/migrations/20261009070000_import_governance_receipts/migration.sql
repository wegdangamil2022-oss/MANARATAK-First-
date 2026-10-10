-- MANARATAK_MIGRATION_OWNER: import
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY; UNAPPLIED. Screening receipts do not authorize canonical writes.
-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "invalidRecords" INTEGER,
ADD COLUMN     "receivedRecords" INTEGER,
ADD COLUMN     "skippedRecords" INTEGER,
ADD COLUMN     "stagingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImportScreeningReceipt" (
    "id" TEXT NOT NULL,
    "ownerDomain" TEXT NOT NULL,
    "handoffKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportScreeningReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMappingProfile" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "ownerDomain" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceRevision" TIMESTAMP(3) NOT NULL,
    "definition" JSONB NOT NULL,
    "definitionHash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportMappingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportReviewAssignment" (
    "recordId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "ownerDomain" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "claimedBy" TEXT,
    "claimUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportReviewAssignment_pkey" PRIMARY KEY ("recordId")
);

-- CreateTable
CREATE TABLE "ImportSourceObservation" (
    "sourceId" TEXT NOT NULL,
    "sourceRevision" TIMESTAMP(3) NOT NULL,
    "artifactId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "etag" TEXT,
    "lastModified" TEXT,
    "shapeHash" TEXT,
    "shape" JSONB,
    "pendingShapeHash" TEXT,
    "pendingShape" JSONB,
    "driftState" TEXT NOT NULL DEFAULT 'BASELINE',
    "decisionActorId" TEXT,
    "decisionReason" TEXT,
    "fallbackSourceId" TEXT,
    "fallbackSourceRevision" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportSourceObservation_pkey" PRIMARY KEY ("sourceId")
);

-- CreateTable
CREATE TABLE "ImportRateBudget" (
    "budgetKey" TEXT NOT NULL,
    "nextAvailableAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRateBudget_pkey" PRIMARY KEY ("budgetKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportScreeningReceipt_ownerDomain_handoffKey_key" ON "ImportScreeningReceipt"("ownerDomain", "handoffKey");

-- CreateIndex
CREATE INDEX "ImportMappingProfile_sourceId_ownerDomain_createdAt_idx" ON "ImportMappingProfile"("sourceId", "ownerDomain", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMappingProfile_sourceId_ownerDomain_version_key" ON "ImportMappingProfile"("sourceId", "ownerDomain", "version");

-- CreateIndex
CREATE INDEX "ImportReviewAssignment_assigneeId_state_dueAt_idx" ON "ImportReviewAssignment"("assigneeId", "state", "dueAt");

-- CreateIndex
CREATE INDEX "ImportReviewAssignment_batchId_state_idx" ON "ImportReviewAssignment"("batchId", "state");


ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_acquisition_counters_check"
 CHECK (("receivedRecords" IS NULL AND "skippedRecords" IS NULL AND "invalidRecords" IS NULL)
   OR ("receivedRecords" IS NOT NULL AND "skippedRecords" IS NOT NULL AND "invalidRecords" IS NOT NULL
     AND "receivedRecords" >= 0 AND "skippedRecords" >= 0 AND "invalidRecords" >= 0));
ALTER TABLE "ImportMappingProfile" ADD CONSTRAINT "ImportMappingProfile_version_check" CHECK ("version" > 0 AND "definitionHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "ImportReviewAssignment" ADD CONSTRAINT "ImportReviewAssignment_state_check"
 CHECK ("version" > 0 AND "state" IN ('ASSIGNED','CLAIMED','COMPLETED','CANCELLED')
   AND (("state" = 'CLAIMED' AND "claimedBy" IS NOT NULL AND "claimUntil" IS NOT NULL)
     OR ("state" <> 'CLAIMED' AND "claimedBy" IS NULL AND "claimUntil" IS NULL)));
ALTER TABLE "ImportSourceObservation" ADD CONSTRAINT "ImportSourceObservation_shape_check"
 CHECK ("byteSize" >= 0 AND "contentHash" ~ '^[a-f0-9]{64}$' AND "driftState" IN ('BASELINE','REVIEW_REQUIRED','ACCEPTED','REJECTED'));
ALTER TABLE "ImportScreeningReceipt" ADD CONSTRAINT "ImportScreeningReceipt_hash_check"
 CHECK ("requestHash" ~ '^[a-f0-9]{64}$' AND "handoffKey" ~ '^[a-f0-9]{64}$');
