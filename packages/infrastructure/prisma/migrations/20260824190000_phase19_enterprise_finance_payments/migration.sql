-- Phase 19 source migration. Apply only in Google Studio Runtime.
CREATE TABLE "FinanceInvoiceRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "invoiceNumber" TEXT NOT NULL UNIQUE,
  "correlationId" TEXT NOT NULL, "originDomain" TEXT NOT NULL, "originReferenceId" TEXT NOT NULL,
  "studentReferenceId" TEXT, "payerReferenceId" TEXT, "status" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "totalMinorUnits" TEXT NOT NULL,
  "dueMinorUnits" TEXT NOT NULL, "lineItems" JSONB NOT NULL, "dueDate" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3), "paidAt" TIMESTAMP(3), "voidedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "FinanceInvoiceRecord_status_dueDate_idx" ON "FinanceInvoiceRecord"("status", "dueDate");
CREATE INDEX "FinanceInvoiceRecord_studentReferenceId_createdAt_idx" ON "FinanceInvoiceRecord"("studentReferenceId", "createdAt");
CREATE INDEX "FinanceInvoiceRecord_originDomain_originReferenceId_idx" ON "FinanceInvoiceRecord"("originDomain", "originReferenceId");

CREATE TABLE "FinancePaymentRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "invoiceId" TEXT NOT NULL,
  "idempotencyKeyHash" TEXT NOT NULL UNIQUE, "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL,
  "amountMinorUnits" TEXT NOT NULL, "status" TEXT NOT NULL, "paymentMethod" TEXT NOT NULL,
  "gatewayProvider" TEXT, "gatewayReference" TEXT, "safeMaskedMetadata" JSONB, "failureReason" TEXT,
  "capturedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancePaymentRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FinanceInvoiceRecord"("id") ON DELETE RESTRICT
);
CREATE INDEX "FinancePaymentRecord_invoiceId_status_idx" ON "FinancePaymentRecord"("invoiceId", "status");
CREATE INDEX "FinancePaymentRecord_gatewayProvider_gatewayReference_idx" ON "FinancePaymentRecord"("gatewayProvider", "gatewayReference");
CREATE TABLE "FinancePaymentAttemptRecord" (
  "id" TEXT PRIMARY KEY, "paymentId" TEXT NOT NULL, "sequence" INTEGER NOT NULL, "status" TEXT NOT NULL,
  "gatewayReference" TEXT, "safeFailureCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancePaymentAttemptRecord_payment_sequence_key" UNIQUE("paymentId", "sequence"),
  CONSTRAINT "FinancePaymentAttemptRecord_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FinancePaymentRecord"("id") ON DELETE RESTRICT
);
CREATE INDEX "FinancePaymentAttemptRecord_paymentId_createdAt_idx" ON "FinancePaymentAttemptRecord"("paymentId", "createdAt");

CREATE TABLE "FinancialAccountRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "ownerReferenceId" TEXT NOT NULL, "type" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialAccountRecord_owner_type_currency_key" UNIQUE("ownerReferenceId", "type", "currencyCode")
);
CREATE TABLE "FinancialTransactionRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "correlationId" TEXT NOT NULL,
  "businessReferenceType" TEXT NOT NULL, "businessReferenceId" TEXT NOT NULL, "idempotencyKeyHash" TEXT NOT NULL UNIQUE,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "reversalOfId" TEXT, "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FinancialTransactionRecord_correlationId_idx" ON "FinancialTransactionRecord"("correlationId");
CREATE INDEX "FinancialTransactionRecord_businessReference_idx" ON "FinancialTransactionRecord"("businessReferenceType", "businessReferenceId");
CREATE TABLE "FinancialLedgerEntryRecord" (
  "id" TEXT PRIMARY KEY, "transactionId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "direction" TEXT NOT NULL,
  "amountMinorUnits" TEXT NOT NULL, "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "sequence" INTEGER NOT NULL,
  "memo" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialLedgerEntryRecord_transaction_sequence_key" UNIQUE("transactionId", "sequence"),
  CONSTRAINT "FinancialLedgerEntryRecord_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransactionRecord"("id") ON DELETE RESTRICT,
  CONSTRAINT "FinancialLedgerEntryRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccountRecord"("id") ON DELETE RESTRICT
);
CREATE INDEX "FinancialLedgerEntryRecord_accountId_createdAt_idx" ON "FinancialLedgerEntryRecord"("accountId", "createdAt");

CREATE TABLE "FinanceWalletRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "ownerReferenceId" TEXT NOT NULL, "accountId" TEXT NOT NULL UNIQUE,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "status" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "FinanceWalletRecord_ownerReferenceId_status_idx" ON "FinanceWalletRecord"("ownerReferenceId", "status");
CREATE TABLE "FinanceWalletHoldRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "walletId" TEXT NOT NULL, "amountMinorUnits" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "status" TEXT NOT NULL, "businessReferenceId" TEXT NOT NULL,
  "idempotencyKeyHash" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), CONSTRAINT "FinanceWalletHoldRecord_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "FinanceWalletRecord"("id") ON DELETE RESTRICT
);
CREATE INDEX "FinanceWalletHoldRecord_walletId_status_idx" ON "FinanceWalletHoldRecord"("walletId", "status");

CREATE TABLE "FinanceExchangeRateRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "sourceCurrencyCode" TEXT NOT NULL, "targetCurrencyCode" TEXT NOT NULL,
  "rateNumerator" TEXT NOT NULL, "rateDenominator" TEXT NOT NULL, "source" TEXT NOT NULL, "providerReference" TEXT,
  "approved" BOOLEAN NOT NULL DEFAULT FALSE, "effectiveFrom" TIMESTAMP(3) NOT NULL, "effectiveTo" TIMESTAMP(3),
  "marginBasisPoints" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FinanceExchangeRateRecord_pair_effective_idx" ON "FinanceExchangeRateRecord"("sourceCurrencyCode", "targetCurrencyCode", "approved", "effectiveFrom");

CREATE TABLE "FinanceTransferRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "sourceWalletId" TEXT NOT NULL, "destinationReferenceId" TEXT NOT NULL,
  "sourceCurrencyCode" TEXT NOT NULL, "sourceScale" INTEGER NOT NULL, "sourceAmountMinorUnits" TEXT NOT NULL,
  "targetCurrencyCode" TEXT, "targetScale" INTEGER, "targetAmountMinorUnits" TEXT, "rateId" TEXT, "feeAmountMinorUnits" TEXT,
  "status" TEXT NOT NULL, "makerId" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "idempotencyKeyHash" TEXT NOT NULL UNIQUE,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "FinanceTransferRecord_status_createdAt_idx" ON "FinanceTransferRecord"("status", "createdAt");

CREATE TABLE "FinanceApprovalRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "actionType" TEXT NOT NULL, "targetReferenceId" TEXT NOT NULL,
  "amountMinorUnits" TEXT, "currencyCode" TEXT, "scale" INTEGER, "makerId" TEXT NOT NULL, "requiredApprovals" INTEGER NOT NULL,
  "status" TEXT NOT NULL, "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "FinanceApprovalDecisionRecord" (
  "id" TEXT PRIMARY KEY, "approvalId" TEXT NOT NULL, "approverId" TEXT NOT NULL, "decision" TEXT NOT NULL,
  "reason" TEXT, "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceApprovalDecisionRecord_approval_checker_key" UNIQUE("approvalId", "approverId"),
  CONSTRAINT "FinanceApprovalDecisionRecord_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "FinanceApprovalRecord"("id") ON DELETE RESTRICT
);

CREATE TABLE "FinanceRefundRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "paymentId" TEXT NOT NULL, "amountMinorUnits" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "reason" TEXT NOT NULL, "status" TEXT NOT NULL,
  "makerId" TEXT NOT NULL, "approvalId" TEXT, "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FinanceRefundRecord_paymentId_status_idx" ON "FinanceRefundRecord"("paymentId", "status");
CREATE TABLE "FinanceDocumentRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "type" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
  "paymentId" TEXT, "amountMinorUnits" TEXT NOT NULL, "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL,
  "reason" TEXT, "issuedBy" TEXT NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "FinanceDocumentRecord_invoiceId_type_idx" ON "FinanceDocumentRecord"("invoiceId", "type");
CREATE TABLE "FinanceInstallmentPlanRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "invoiceId" TEXT NOT NULL UNIQUE, "totalMinorUnits" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "status" TEXT NOT NULL, "schedule" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "FinanceCommissionRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "recipientReferenceId" TEXT NOT NULL, "sourcePaymentId" TEXT NOT NULL,
  "amountMinorUnits" TEXT NOT NULL, "currencyCode" TEXT NOT NULL, "scale" INTEGER NOT NULL, "status" TEXT NOT NULL,
  "policyReference" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceCommissionRecord_source_recipient_policy_key" UNIQUE("sourcePaymentId", "recipientReferenceId", "policyReference")
);
CREATE TABLE "FinanceEstimateRecord" (
  "id" TEXT PRIMARY KEY, "publicId" TEXT NOT NULL UNIQUE, "subjectReferenceId" TEXT, "displayCurrencyCode" TEXT NOT NULL,
  "scale" INTEGER NOT NULL, "totalMinorUnits" TEXT NOT NULL, "lines" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
