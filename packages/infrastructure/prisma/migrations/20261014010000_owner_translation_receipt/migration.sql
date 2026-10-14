-- Source definition only. No migration is applied by the source review.
CREATE TABLE "OwnerTranslationTransferReceipt" (
  "id" TEXT PRIMARY KEY,
  "ownerDomain" TEXT NOT NULL CHECK ("ownerDomain" IN ('UNIVERSITY','MAJOR')),
  "targetId" TEXT NOT NULL,
  "handoffId" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "outcome" TEXT NOT NULL CHECK ("outcome" IN ('APPLIED','NO_CHANGE')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "OwnerTranslationTransferReceipt_ownerDomain_targetId_handoffId_key" ON "OwnerTranslationTransferReceipt" ("ownerDomain","targetId","handoffId");
CREATE INDEX "OwnerTranslationTransferReceipt_approvalId_idx" ON "OwnerTranslationTransferReceipt" ("approvalId");
