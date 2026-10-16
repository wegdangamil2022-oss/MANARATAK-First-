-- REVIEW DRAFT ONLY. NOT EXECUTED. Not placed in Prisma migrations.
-- Requires fresh successful per-constraint orphan/CHECK audits, schema reconciliation and owner review.
-- Evidence from this frozen empty rehearsal cannot authorize another DB or an upgrade dataset.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public."FinancePaymentRecord" VALIDATE CONSTRAINT "FinancePayment_positive_units";
ALTER TABLE public."FinanceRefundRecord" VALIDATE CONSTRAINT "FinanceRefund_positive_units";
ALTER TABLE public."FinanceTransferRecord" VALIDATE CONSTRAINT "FinanceTransfer_positive_units";
ALTER TABLE public."FinanceWalletHoldRecord" VALIDATE CONSTRAINT "FinanceWalletHold_positive_units";
ALTER TABLE public."FinancialLedgerEntryRecord" VALIDATE CONSTRAINT "FinanceLedger_positive_units";
ALTER TABLE public."ServiceCatalogRecord" VALIDATE CONSTRAINT "ServiceCatalogRecord_fulfillment_policy";
ALTER TABLE public."ServicePricingRecord" VALIDATE CONSTRAINT "ServicePricingRecord_bounded_money";
ALTER TABLE public."SettingAssignmentRecord" VALIDATE CONSTRAINT "SettingAssignmentRecord_id_currentVersionId_fkey";
ALTER TABLE public."StudentApplicationDocumentBinding" VALIDATE CONSTRAINT "StudentApplicationDocumentBinding_assetId_fkey";
COMMIT;
