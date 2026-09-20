CREATE TABLE "CertificateTemplate" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL, "nameEn" TEXT NOT NULL, "templateVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "issuerName" TEXT NOT NULL, "issuerReferenceId" TEXT,
  "language" TEXT NOT NULL DEFAULT 'BILINGUAL', "layout" TEXT NOT NULL DEFAULT 'LANDSCAPE',
  "accentColor" TEXT NOT NULL DEFAULT '#075E45', "secondaryColor" TEXT NOT NULL DEFAULT '#C9A227',
  "titleAr" TEXT NOT NULL, "titleEn" TEXT NOT NULL, "bodyAr" TEXT NOT NULL, "bodyEn" TEXT NOT NULL,
  "signatoryNameAr" TEXT, "signatoryNameEn" TEXT, "signatoryTitleAr" TEXT, "signatoryTitleEn" TEXT,
  "logoAssetId" TEXT, "sealAssetId" TEXT, "signatureAssetId" TEXT, "designAssetId" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CertificateTemplate_publicId_key" ON "CertificateTemplate"("publicId");
CREATE UNIQUE INDEX "CertificateTemplate_code_key" ON "CertificateTemplate"("code");
CREATE INDEX "CertificateTemplate_status_idx" ON "CertificateTemplate"("status");
CREATE INDEX "CertificateTemplate_issuerReferenceId_idx" ON "CertificateTemplate"("issuerReferenceId");

CREATE TABLE "Certificate" (
  "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "serialNumber" TEXT NOT NULL, "verificationCode" TEXT NOT NULL,
  "verificationHash" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "certificateType" TEXT NOT NULL DEFAULT 'COURSE',
  "studentReferenceId" TEXT NOT NULL, "recipientDisplayName" TEXT, "courseId" TEXT NOT NULL, "courseDisplayName" TEXT NOT NULL,
  "courseCompletionId" TEXT NOT NULL, "courseCompletedAt" TIMESTAMP(3) NOT NULL, "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3), "validityPolicy" TEXT NOT NULL DEFAULT 'PERMANENT', "templateId" TEXT, "templateVersion" TEXT,
  "certificatePdfAssetId" TEXT, "previewImageAssetId" TEXT, "verificationQrAssetId" TEXT, "signatureAssetId" TEXT,
  "digitalSignature" TEXT, "signingKeyReference" TEXT, "issuerName" TEXT, "issuerReferenceId" TEXT, "grade" TEXT, "score" DOUBLE PRECISION,
  "skills" JSONB NOT NULL, "competencies" JSONB NOT NULL, "revokedAt" TIMESTAMP(3), "revocationReason" TEXT, "revokedBy" TEXT,
  "replacesCertificateId" TEXT, "replacedByCertificateId" TEXT, "archivedAt" TIMESTAMP(3), "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Certificate_publicId_key" ON "Certificate"("publicId");
CREATE UNIQUE INDEX "Certificate_serialNumber_key" ON "Certificate"("serialNumber");
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");
CREATE UNIQUE INDEX "Certificate_verificationHash_key" ON "Certificate"("verificationHash");
CREATE UNIQUE INDEX "Certificate_courseCompletionId_key" ON "Certificate"("courseCompletionId");
CREATE INDEX "Certificate_studentReferenceId_status_idx" ON "Certificate"("studentReferenceId", "status");
CREATE INDEX "Certificate_courseId_studentReferenceId_idx" ON "Certificate"("courseId", "studentReferenceId");
CREATE INDEX "Certificate_templateId_idx" ON "Certificate"("templateId");
CREATE INDEX "Certificate_issuedAt_idx" ON "Certificate"("issuedAt");
CREATE INDEX "Certificate_expiresAt_idx" ON "Certificate"("expiresAt");

CREATE TABLE "CertificateLedgerEntry" (
  "id" TEXT NOT NULL, "certificateId" TEXT NOT NULL, "action" TEXT NOT NULL, "actorId" TEXT NOT NULL,
  "reason" TEXT, "payload" JSONB, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateLedgerEntry_certificateId_occurredAt_idx" ON "CertificateLedgerEntry"("certificateId", "occurredAt");
CREATE INDEX "CertificateLedgerEntry_action_idx" ON "CertificateLedgerEntry"("action");

CREATE TABLE "CertificateVerificationLog" (
  "id" TEXT NOT NULL, "certificateId" TEXT, "result" TEXT NOT NULL, "channel" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateVerificationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateVerificationLog_certificateId_occurredAt_idx" ON "CertificateVerificationLog"("certificateId", "occurredAt");
CREATE INDEX "CertificateVerificationLog_result_occurredAt_idx" ON "CertificateVerificationLog"("result", "occurredAt");
