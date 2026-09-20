ALTER TABLE "ImportBatch"
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "claimedBy" TEXT,
  ADD COLUMN "claimUntil" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

CREATE INDEX "ImportBatch_batchStatus_availableAt_idx" ON "ImportBatch"("batchStatus", "availableAt");
CREATE INDEX "ImportBatch_claimUntil_idx" ON "ImportBatch"("claimUntil");
