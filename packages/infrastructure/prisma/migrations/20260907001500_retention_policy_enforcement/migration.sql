-- MANARATAK_MIGRATION_OWNER: platform-retention
-- MANARATAK_MIGRATION_SCOPE: cross_context_approved
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0081: canonical retention state, legal-hold metadata and immutable decision evidence.

ALTER TABLE "ImportRecord" ADD COLUMN "legalHoldUntil" TIMESTAMP(3), ADD COLUMN "retentionProcessedAt" TIMESTAMP(3), ADD COLUMN "retentionState" TEXT NOT NULL DEFAULT 'PENDING', ADD COLUMN "retentionClaimUntil" TIMESTAMP(3), ADD COLUMN "retentionClaimToken" TEXT;
ALTER TABLE "AuditRecord" ADD COLUMN "legalHoldUntil" TIMESTAMP(3), ADD COLUMN "retentionProcessedAt" TIMESTAMP(3), ADD COLUMN "retentionClaimUntil" TIMESTAMP(3), ADD COLUMN "retentionClaimToken" TEXT;
ALTER TABLE "AssetRecord" ADD COLUMN "legalHoldUntil" TIMESTAMP(3), ADD COLUMN "retentionProcessedAt" TIMESTAMP(3), ADD COLUMN "retentionClaimUntil" TIMESTAMP(3), ADD COLUMN "retentionClaimToken" TEXT;

CREATE INDEX "ImportRecord_retentionExpiresAt_retentionProcessedAt_idx" ON "ImportRecord"("retentionExpiresAt", "retentionProcessedAt");
CREATE INDEX "AuditRecord_retentionExpiresAt_retentionProcessedAt_idx" ON "AuditRecord"("retentionExpiresAt", "retentionProcessedAt");
CREATE INDEX "AssetRecord_retentionExpiresAt_retentionProcessedAt_idx" ON "AssetRecord"("retentionExpiresAt", "retentionProcessedAt");

CREATE TABLE "RetentionDecisionRecord" (
  "id" TEXT NOT NULL,
  "decisionKey" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "disposition" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "terminalKey" TEXT,
  "errorMessage" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetentionDecisionRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RetentionDecisionRecord_decisionKey_idx" ON "RetentionDecisionRecord"("decisionKey");
CREATE UNIQUE INDEX "RetentionDecisionRecord_terminalKey_key" ON "RetentionDecisionRecord"("terminalKey");
CREATE INDEX "RetentionDecisionRecord_owner_recordId_idx" ON "RetentionDecisionRecord"("owner", "recordId");
CREATE INDEX "RetentionDecisionRecord_result_decidedAt_idx" ON "RetentionDecisionRecord"("result", "decidedAt");
