-- ============================================================================
-- Migration: 20260907033000_m7_batch_b_index_reconciliation
-- Architecture Decision: ADR-028 (Database Schema Alignment & Migration Gate)
--
-- Description:
-- Forward reconciliation of structural index differences:
-- 1. Create 4 true missing unique indexes
-- 2. Replace 6 historical partial unique indexes with standard Prisma-aligned unique indexes
-- 3. Create 19 regular performance/query indexes
-- 4. Drop 1 stale historical unique index (UniversitySourceRecord_identity_key)
--
-- Protected historical indexes preserved untouched:
-- - ReferenceCountry_lifecycleState_idx
-- - ReferenceCurrency_lifecycleState_idx
-- - ReferenceLanguage_lifecycleState_idx
-- - ReferenceCity_lifecycleState_idx
-- - TransactionalOutboxRecord_claimedBy_claimToken_idx
-- - FinanceApprovalRecord_binding_idx
-- ============================================================================

-- SECTION 1: B_TRUE_MISSING_UNIQUES (4 statements)
CREATE UNIQUE INDEX "CertificateTemplate_currentVersionId_key" ON "CertificateTemplate"("currentVersionId");
CREATE UNIQUE INDEX "CredentialRecord_identityId_type_key" ON "CredentialRecord"("identityId", "type");
CREATE UNIQUE INDEX "RoleAssignmentRecord_identityId_roleId_key" ON "RoleAssignmentRecord"("identityId", "roleId");
CREATE UNIQUE INDEX "UserRecord_primaryEmail_key" ON "UserRecord"("primaryEmail");

-- SECTION 2: B_FINANCE_PARTIAL_UNIQUE_REPLACEMENTS (6 DROPs + 6 CREATEs)
DROP INDEX IF EXISTS "FinancePaymentRecord_gatewayProvider_gatewayReference_key";
CREATE UNIQUE INDEX "FinancePaymentRecord_gatewayProvider_gatewayReference_key" ON "FinancePaymentRecord"("gatewayProvider", "gatewayReference");

DROP INDEX IF EXISTS "FinancialTransactionRecord_reversalOfId_key";
CREATE UNIQUE INDEX "FinancialTransactionRecord_reversalOfId_key" ON "FinancialTransactionRecord"("reversalOfId");

DROP INDEX IF EXISTS "FinanceExchangeRateRecord_approvalId_key";
CREATE UNIQUE INDEX "FinanceExchangeRateRecord_approvalId_key" ON "FinanceExchangeRateRecord"("approvalId");

DROP INDEX IF EXISTS "FinanceTransferRecord_bankProviderReference_key";
CREATE UNIQUE INDEX "FinanceTransferRecord_bankProviderReference_key" ON "FinanceTransferRecord"("bankProviderReference");

DROP INDEX IF EXISTS "FinanceTransferRecord_settlementTransactionId_key";
CREATE UNIQUE INDEX "FinanceTransferRecord_settlementTransactionId_key" ON "FinanceTransferRecord"("settlementTransactionId");

DROP INDEX IF EXISTS "FinanceTransferRecord_reversalTransactionId_key";
CREATE UNIQUE INDEX "FinanceTransferRecord_reversalTransactionId_key" ON "FinanceTransferRecord"("reversalTransactionId");

-- SECTION 3: B_REGULAR_INDEX_CREATES (19 statements)
CREATE INDEX "CareerEmployerRecord_verificationStatus_employerType_idx" ON "CareerEmployerRecord"("verificationStatus", "employerType");
CREATE INDEX "CareerEmployerRecord_cityReferenceId_idx" ON "CareerEmployerRecord"("cityReferenceId");
CREATE INDEX "Certificate_learningPathId_studentReferenceId_idx" ON "Certificate"("learningPathId", "studentReferenceId");
CREATE INDEX "Certificate_templateVersionId_idx" ON "Certificate"("templateVersionId");
CREATE INDEX "Certificate_issuerId_idx" ON "Certificate"("issuerId");
CREATE INDEX "CertificateIssuanceInbox_eventType_processedAt_idx" ON "CertificateIssuanceInbox"("eventType", "processedAt");
CREATE INDEX "CertificateIssuer_status_idx" ON "CertificateIssuer"("status");
CREATE INDEX "CertificateIssuer_universityId_idx" ON "CertificateIssuer"("universityId");
CREATE INDEX "CertificateTemplate_issuerId_idx" ON "CertificateTemplate"("issuerId");
CREATE INDEX "CertificateTemplateVersion_templateId_createdAt_idx" ON "CertificateTemplateVersion"("templateId", "createdAt");
CREATE INDEX "CertificateTemplateVersion_issuerId_idx" ON "CertificateTemplateVersion"("issuerId");
CREATE INDEX "CertificateTemplateVersion_status_idx" ON "CertificateTemplateVersion"("status");
CREATE INDEX "CourseImportAnalysis_providerCandidateId_idx" ON "CourseImportAnalysis"("providerCandidateId");
CREATE INDEX "FinanceApprovalRecord_status_createdAt_idx" ON "FinanceApprovalRecord"("status", "createdAt");
CREATE INDEX "FinanceApprovalRecord_targetReferenceId_idx" ON "FinanceApprovalRecord"("targetReferenceId");
CREATE INDEX "FinanceCommissionRecord_recipientReferenceId_status_idx" ON "FinanceCommissionRecord"("recipientReferenceId", "status");
CREATE INDEX "FinanceEstimateRecord_subjectReferenceId_generatedAt_idx" ON "FinanceEstimateRecord"("subjectReferenceId", "generatedAt");
CREATE INDEX "FinanceTransferRecord_sourceWalletId_createdAt_idx" ON "FinanceTransferRecord"("sourceWalletId", "createdAt");
CREATE INDEX "ServiceCatalogRecord_fulfillmentType_serviceAvailabilitySta_idx" ON "ServiceCatalogRecord"("fulfillmentType", "serviceAvailabilityStatus");

-- SECTION 4: B_STALE_UNIQUE_DROP (1 statement)
DROP INDEX IF EXISTS "UniversitySourceRecord_identity_key";
