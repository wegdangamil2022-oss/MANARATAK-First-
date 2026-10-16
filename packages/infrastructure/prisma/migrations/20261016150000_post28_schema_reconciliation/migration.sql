-- MANARATAK_MIGRATION_OWNER: cross_context
-- MANARATAK_MIGRATION_SCOPE: cross_context_approved
-- MANARATAK_ARCH_DECISION: ADR-028
-- Review: docs/remediation/POST28_R04_SCHEMA_RECONCILIATION_2026-10-16.md
-- Existing owner constraints retained. No row repair, index/FK/trigger replacement.
-- Shared/upgrade targets require separate review, backup and authorization.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public."CmsBlockSchema" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."FinancePaymentRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$') INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED FinancePayment_positive_units violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT FinancePayment_positive_units violations=%', violations;
END $audit$;
ALTER TABLE public."FinancePaymentRecord" VALIDATE CONSTRAINT "FinancePayment_positive_units";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."FinanceRefundRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$') INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED FinanceRefund_positive_units violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT FinanceRefund_positive_units violations=%', violations;
END $audit$;
ALTER TABLE public."FinanceRefundRecord" VALIDATE CONSTRAINT "FinanceRefund_positive_units";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."FinanceTransferRecord" WHERE NOT ("sourceAmountMinorUnits" ~ '^[1-9][0-9]{0,29}$') INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED FinanceTransfer_positive_units violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT FinanceTransfer_positive_units violations=%', violations;
END $audit$;
ALTER TABLE public."FinanceTransferRecord" VALIDATE CONSTRAINT "FinanceTransfer_positive_units";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."FinanceWalletHoldRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$') INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED FinanceWalletHold_positive_units violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT FinanceWalletHold_positive_units violations=%', violations;
END $audit$;
ALTER TABLE public."FinanceWalletHoldRecord" VALIDATE CONSTRAINT "FinanceWalletHold_positive_units";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."FinancialLedgerEntryRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$' AND direction IN ('DEBIT','CREDIT')) INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED FinanceLedger_positive_units violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT FinanceLedger_positive_units violations=%', violations;
END $audit$;
ALTER TABLE public."FinancialLedgerEntryRecord" VALIDATE CONSTRAINT "FinanceLedger_positive_units";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."ServiceCatalogRecord" WHERE NOT ("fulfillmentPolicy" IN ('FREE','CHARGEABLE','QUOTE_REQUIRED')) INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED ServiceCatalogRecord_fulfillment_policy violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT ServiceCatalogRecord_fulfillment_policy violations=%', violations;
END $audit$;
ALTER TABLE public."ServiceCatalogRecord" VALIDATE CONSTRAINT "ServiceCatalogRecord_fulfillment_policy";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."ServicePricingRecord" WHERE NOT ("amountMinorUnits" ~ '^(0|[1-9][0-9]{0,29})$' AND "scale" BETWEEN 0 AND 6) INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED ServicePricingRecord_bounded_money violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT ServicePricingRecord_bounded_money violations=%', violations;
END $audit$;
ALTER TABLE public."ServicePricingRecord" VALIDATE CONSTRAINT "ServicePricingRecord_bounded_money";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."SettingAssignmentRecord" s WHERE s."currentVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public."SettingVersionRecord" r WHERE r."assignmentId"=s."id" AND r."id"=s."currentVersionId") INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED SettingAssignmentRecord_id_currentVersionId_fkey violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT SettingAssignmentRecord_id_currentVersionId_fkey violations=%', violations;
END $audit$;
ALTER TABLE public."SettingAssignmentRecord" VALIDATE CONSTRAINT "SettingAssignmentRecord_id_currentVersionId_fkey";
DO $audit$ DECLARE violations bigint; BEGIN
  SELECT count(*) FROM public."StudentApplicationDocumentBinding" s WHERE s."assetId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public."AssetRecord" r WHERE r."id"=s."assetId") INTO violations;
  IF violations <> 0 THEN RAISE EXCEPTION 'POST28_AUDIT_FAILED StudentApplicationDocumentBinding_assetId_fkey violations=%', violations; END IF;
  RAISE NOTICE 'POST28_AUDIT StudentApplicationDocumentBinding_assetId_fkey violations=%', violations;
END $audit$;
ALTER TABLE public."StudentApplicationDocumentBinding" VALIDATE CONSTRAINT "StudentApplicationDocumentBinding_assetId_fkey";
COMMIT;
