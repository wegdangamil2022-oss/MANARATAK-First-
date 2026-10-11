-- AlterTable
ALTER TABLE "FinancePaymentRecord" ADD COLUMN     "captureStartedAt" TIMESTAMP(3),
ADD COLUMN     "checkAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commandActorId" TEXT,
ADD COLUMN     "dispatchStartedAt" TIMESTAMP(3),
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "providerEvidence" JSONB;

-- AlterTable
ALTER TABLE "FinanceWalletHoldRecord" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "FinanceExchangeRateRecord" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "FinanceTransferRecord" ADD COLUMN     "checkAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "marginBasisPointsSnapshot" INTEGER,
ADD COLUMN     "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "providerEvidence" JSONB,
ADD COLUMN     "rateDenominatorSnapshot" TEXT,
ADD COLUMN     "rateNumeratorSnapshot" TEXT;

-- AlterTable
ALTER TABLE "FinanceApprovalRecord" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "FinanceRefundRecord" ADD COLUMN     "checkAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaseUntil" TIMESTAMP(3),
ADD COLUMN     "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "providerEvidence" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "FinanceCommandRecord" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceCommandRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReconciliationSnapshot" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "coverage" TEXT NOT NULL,
    "issues" JSONB NOT NULL,
    "cursor" JSONB,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceReconciliationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReconciliationIssueRecord" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceReconciliationIssueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceAdjustmentCaseRecord" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "supportingDocumentId" TEXT NOT NULL,
    "makerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceAdjustmentCaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceCommandRecord_targetId_operation_idx" ON "FinanceCommandRecord"("targetId", "operation");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssueRecord_scope_referenceId_idx" ON "FinanceReconciliationIssueRecord"("scope", "referenceId");

-- CreateIndex
CREATE INDEX "FinanceReconciliationIssueRecord_severity_id_idx" ON "FinanceReconciliationIssueRecord"("severity", "id");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAdjustmentCaseRecord_publicId_key" ON "FinanceAdjustmentCaseRecord"("publicId");

-- CreateIndex
CREATE INDEX "FinanceAdjustmentCaseRecord_makerId_status_idx" ON "FinanceAdjustmentCaseRecord"("makerId", "status");

-- CreateIndex
CREATE INDEX "FinancePaymentRecord_reconcile_due_idx" ON "FinancePaymentRecord"("status", "nextCheckAt", "id");

-- CreateIndex
CREATE INDEX "FinanceTransferRecord_reconcile_due_idx" ON "FinanceTransferRecord"("status", "nextCheckAt", "id");

-- CreateIndex
CREATE INDEX "FinanceRefundRecord_reconcile_due_idx" ON "FinanceRefundRecord"("status", "nextCheckAt", "id");


-- Source only. Requires reviewed disposable migration rehearsal and independent runtime approval.
-- Legacy unresolved provider attempts must never be re-dispatched using new provider keys.
UPDATE "FinancePaymentRecord" SET "dispatchStartedAt"="createdAt", "captureStartedAt"="createdAt"
WHERE status IN ('PENDING','AUTHORIZED');

-- NOT VALID preserves historic rows for approved remediation; new writes are constrained immediately.
ALTER TABLE "FinanceWalletHoldRecord" ADD CONSTRAINT "FinanceWalletHold_positive_units"
  CHECK ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$') NOT VALID;
ALTER TABLE "FinancePaymentRecord" ADD CONSTRAINT "FinancePayment_positive_units"
  CHECK ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$') NOT VALID;
ALTER TABLE "FinanceRefundRecord" ADD CONSTRAINT "FinanceRefund_positive_units"
  CHECK ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$') NOT VALID;
ALTER TABLE "FinancialLedgerEntryRecord" ADD CONSTRAINT "FinanceLedger_positive_units"
  CHECK ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$' AND direction IN ('DEBIT','CREDIT')) NOT VALID;
ALTER TABLE "FinanceTransferRecord" ADD CONSTRAINT "FinanceTransfer_positive_units"
  CHECK ("sourceAmountMinorUnits" ~ '^[1-9][0-9]{0,29}$') NOT VALID;
CREATE UNIQUE INDEX "FinanceWalletHold_active_obligation" ON "FinanceWalletHoldRecord"("businessReferenceId")
WHERE status='ACTIVE';
