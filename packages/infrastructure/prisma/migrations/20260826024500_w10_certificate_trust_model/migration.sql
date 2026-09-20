-- W10 source-only migration. DO NOT APPLY outside the approved Google Studio runtime gate.
-- Before apply: backup, inspect legacy certificate/template rows, resolve issuer identity,
-- and prove there are no orphan Certificate/Template/Ledger/Verification references.

CREATE TABLE "CertificateIssuer" (
  "id" TEXT PRIMARY KEY,
  "publicId" TEXT NOT NULL UNIQUE,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "issuerType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "organizationId" TEXT,
  "universityId" TEXT,
  "issuerLogoAssetId" TEXT NOT NULL,
  "signingKeyReference" TEXT NOT NULL,
  "accreditationAuthority" TEXT,
  "accreditationReference" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CertificateTemplateVersion" (
  "id" TEXT PRIMARY KEY,
  "publicId" TEXT NOT NULL UNIQUE,
  "templateId" TEXT NOT NULL,
  "issuerId" TEXT NOT NULL,
  "versionNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "language" TEXT NOT NULL DEFAULT 'BILINGUAL',
  "layout" TEXT NOT NULL DEFAULT 'LANDSCAPE',
  "accentColor" TEXT NOT NULL DEFAULT '#075E45',
  "secondaryColor" TEXT NOT NULL DEFAULT '#C9A227',
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "bodyAr" TEXT NOT NULL,
  "bodyEn" TEXT NOT NULL,
  "signatoryNameAr" TEXT,
  "signatoryNameEn" TEXT,
  "signatoryTitleAr" TEXT,
  "signatoryTitleEn" TEXT,
  "logoAssetId" TEXT,
  "sealAssetId" TEXT,
  "signatureAssetId" TEXT,
  "designAssetId" TEXT,
  "validityPolicy" TEXT NOT NULL DEFAULT 'PERMANENT',
  "validityDurationDays" INTEGER,
  "renewalPeriodDays" INTEGER,
  "renewalPolicy" TEXT,
  "requiresRevalidation" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT,
  CONSTRAINT "CertificateTemplateVersion_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "CertificateIssuer"("id") ON DELETE RESTRICT,
  CONSTRAINT "CertificateTemplateVersion_templateId_versionNumber_key" UNIQUE ("templateId", "versionNumber")
);

-- Runtime reconciliation must create/resolve the canonical MANARATAK issuer and one
-- template-version row per legacy template before the following NOT NULL/FK promotion.
ALTER TABLE "CertificateTemplate" ADD COLUMN "issuerId" TEXT;
ALTER TABLE "CertificateTemplate" ADD COLUMN "currentVersionId" TEXT;

ALTER TABLE "Certificate" ADD COLUMN "verificationUrl" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "achievementType" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "achievementId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "achievementDisplayName" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "sourceCompletionId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Certificate" ADD COLUMN "sourceEventId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "sourceEventType" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "sourceEventVersion" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "sourceEventPayloadHash" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "learningPathId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "learningPathDisplayName" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "learningPathCompletionId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "renewalPolicy" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "requiresRevalidation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Certificate" ADD COLUMN "templateVersionId" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "issuerId" TEXT;

UPDATE "Certificate"
SET "achievementType"='COURSE',
    "achievementId"="courseId",
    "achievementDisplayName"="courseDisplayName",
    "sourceCompletionId"="courseCompletionId",
    "completedAt"="courseCompletedAt",
    "sourceEventId"='legacy-course:' || "courseCompletionId",
    "sourceEventType"='CourseCompleted',
    "sourceEventVersion"='legacy-v1',
    "sourceEventPayloadHash"="verificationHash",
    "verificationUrl"='/api/v1/public/certificates/verify/' || "verificationCode"
WHERE "sourceCompletionId" IS NULL;

CREATE INDEX "Certificate_achievementType_sourceCompletionId_idx" ON "Certificate"("achievementType", "sourceCompletionId");
CREATE UNIQUE INDEX "Certificate_sourceEventId_key" ON "Certificate"("sourceEventId");
DROP INDEX IF EXISTS "Certificate_courseCompletionId_key";
CREATE INDEX "Certificate_courseCompletionId_idx" ON "Certificate"("courseCompletionId");
CREATE INDEX "Certificate_learningPathCompletionId_idx" ON "Certificate"("learningPathCompletionId");

CREATE TABLE "CertificateIssuanceInbox" (
  "eventId" TEXT PRIMARY KEY,
  "eventType" TEXT NOT NULL,
  "eventVersion" TEXT NOT NULL,
  "sourceDomain" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "certificateId" TEXT NOT NULL UNIQUE,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateIssuanceInbox_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT
);

-- FAIL CLOSED before adding constraints if unresolved rows remain. These statements are
-- intentionally deferred to the controlled runtime reconciliation after source review:
-- ALTER TABLE "CertificateTemplate" ALTER COLUMN "issuerId" SET NOT NULL;
-- ALTER TABLE "CertificateTemplate" ALTER COLUMN "currentVersionId" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "verificationUrl" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "achievementType" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "achievementId" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "achievementDisplayName" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "sourceCompletionId" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "completedAt" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "sourceEventId" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "sourceEventType" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "sourceEventVersion" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "sourceEventPayloadHash" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "templateVersionId" SET NOT NULL;
-- ALTER TABLE "Certificate" ALTER COLUMN "issuerId" SET NOT NULL;
-- plus restrictive FKs for Certificate.templateId/templateVersionId/issuerId,
-- CertificateLedgerEntry.certificateId and CertificateVerificationLog.certificateId.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Certificate" c LEFT JOIN "CertificateTemplate" t ON t."id"=c."templateId" WHERE c."templateId" IS NOT NULL AND t."id" IS NULL) THEN
    RAISE EXCEPTION 'W10 orphan Certificate.templateId rows must be reconciled before FK activation';
  END IF;
  IF EXISTS (SELECT 1 FROM "CertificateLedgerEntry" l LEFT JOIN "Certificate" c ON c."id"=l."certificateId" WHERE c."id" IS NULL) THEN
    RAISE EXCEPTION 'W10 orphan CertificateLedgerEntry rows must be reconciled before FK activation';
  END IF;
  IF EXISTS (SELECT 1 FROM "CertificateVerificationLog" v LEFT JOIN "Certificate" c ON c."id"=v."certificateId" WHERE v."certificateId" IS NOT NULL AND c."id" IS NULL) THEN
    RAISE EXCEPTION 'W10 orphan CertificateVerificationLog rows must be reconciled before FK activation';
  END IF;
END $$;

ALTER TABLE "CertificateTemplate"
  ADD CONSTRAINT "CertificateTemplate_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "CertificateIssuer"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "CertificateTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "CertificateTemplateVersion"("id") ON DELETE RESTRICT;
ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "Certificate_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "CertificateTemplateVersion"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "Certificate_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "CertificateIssuer"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "Certificate_replacesCertificateId_fkey" FOREIGN KEY ("replacesCertificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "Certificate_replacedByCertificateId_fkey" FOREIGN KEY ("replacedByCertificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT;
ALTER TABLE "CertificateLedgerEntry"
  ADD CONSTRAINT "CertificateLedgerEntry_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT;
ALTER TABLE "CertificateVerificationLog"
  ADD CONSTRAINT "CertificateVerificationLog_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT;
