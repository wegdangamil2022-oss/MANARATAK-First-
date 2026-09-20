-- W4 Finance Safety Core source migration.
-- PENDING_GOOGLE_STUDIO: DO NOT APPLY TO ANY LIVE DATABASE UNTIL THE APPROVED
-- remediation database identity, backup, schema snapshot, migration status and
-- recovery proof gates have completed.

ALTER TABLE "FinanceInvoiceRecord"
  ADD COLUMN "idempotencyKeyHash" TEXT,
  ADD COLUMN "requestFingerprint" TEXT;
CREATE UNIQUE INDEX "FinanceInvoiceRecord_idempotencyKeyHash_key"
  ON "FinanceInvoiceRecord"("idempotencyKeyHash");

DROP INDEX IF EXISTS "FinancePaymentRecord_gatewayProvider_gatewayReference_idx";
CREATE UNIQUE INDEX "FinancePaymentRecord_gatewayProvider_gatewayReference_key"
  ON "FinancePaymentRecord"("gatewayProvider", "gatewayReference")
  WHERE "gatewayProvider" IS NOT NULL AND "gatewayReference" IS NOT NULL;

ALTER TABLE "FinancialAccountRecord"
  ADD COLUMN "systemManaged" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX "FinancialTransactionRecord_reversalOfId_key"
  ON "FinancialTransactionRecord"("reversalOfId")
  WHERE "reversalOfId" IS NOT NULL;
ALTER TABLE "FinancialTransactionRecord"
  ADD CONSTRAINT "FinancialTransactionRecord_reversalOfId_fkey"
  FOREIGN KEY ("reversalOfId") REFERENCES "FinancialTransactionRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceWalletRecord"
  ADD CONSTRAINT "FinanceWalletRecord_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "FinancialAccountRecord"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinanceExchangeRateRecord"
  ADD COLUMN "makerId" TEXT,
  ADD COLUMN "approvalId" TEXT;
CREATE UNIQUE INDEX "FinanceExchangeRateRecord_approvalId_key"
  ON "FinanceExchangeRateRecord"("approvalId") WHERE "approvalId" IS NOT NULL;
ALTER TABLE "FinanceExchangeRateRecord"
  ADD CONSTRAINT "FinanceExchangeRateRecord_positive_rate_check"
  CHECK (("rateNumerator")::numeric > 0 AND ("rateDenominator")::numeric > 0),
  ADD CONSTRAINT "FinanceExchangeRateRecord_effective_window_check"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom");

ALTER TABLE "FinanceTransferRecord"
  ADD COLUMN "destinationCurrencyCode" TEXT,
  ADD COLUMN "feePolicyReference" TEXT,
  ADD COLUMN "bankProvider" TEXT,
  ADD COLUMN "bankProviderReference" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "providerFailureCode" TEXT,
  ADD COLUMN "settlementTransactionId" TEXT,
  ADD COLUMN "reversalTransactionId" TEXT;
CREATE UNIQUE INDEX "FinanceTransferRecord_bankProviderReference_key"
  ON "FinanceTransferRecord"("bankProviderReference") WHERE "bankProviderReference" IS NOT NULL;
CREATE UNIQUE INDEX "FinanceTransferRecord_settlementTransactionId_key"
  ON "FinanceTransferRecord"("settlementTransactionId") WHERE "settlementTransactionId" IS NOT NULL;
CREATE UNIQUE INDEX "FinanceTransferRecord_reversalTransactionId_key"
  ON "FinanceTransferRecord"("reversalTransactionId") WHERE "reversalTransactionId" IS NOT NULL;

ALTER TABLE "FinanceApprovalRecord"
  ADD COLUMN "payloadHash" TEXT,
  ADD COLUMN "policyReference" TEXT,
  ADD COLUMN "consumedAt" TIMESTAMP(3);
CREATE INDEX "FinanceApprovalRecord_binding_idx"
  ON "FinanceApprovalRecord"("actionType", "targetReferenceId", "status", "consumedAt");

ALTER TABLE "FinanceRefundRecord"
  ADD COLUMN "gatewayProvider" TEXT,
  ADD COLUMN "gatewayReference" TEXT,
  ADD COLUMN "failureCode" TEXT;

ALTER TABLE "FinanceCommissionRecord"
  ADD COLUMN "calculationBasisPoints" INTEGER;

-- Existing rows require controlled backfill/reconciliation before these new
-- W4 columns become NOT NULL. That operation is intentionally deferred to
-- Google Studio and must not be executed by this source-remediation wave.
