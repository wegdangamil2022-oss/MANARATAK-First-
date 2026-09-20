-- MANARATAK_MIGRATION_OWNER: career
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- MNT-AUD-0055: retained Phase 21 owner scope: career profile, applications/CV and alumni privacy.

CREATE TABLE "CareerProfileRecord" (
  "id" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "headline" TEXT,
  "summary" TEXT,
  "skills" JSONB NOT NULL,
  "resumeAssetId" TEXT,
  "visibility" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerProfileRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerProfileRecord_version_check" CHECK ("version" > 0),
  CONSTRAINT "CareerProfileRecord_visibility_check" CHECK ("visibility" IN ('PRIVATE','PLATFORM','PUBLIC'))
);
CREATE UNIQUE INDEX "CareerProfileRecord_studentReferenceId_key" ON "CareerProfileRecord"("studentReferenceId");
CREATE INDEX "CareerProfileRecord_visibility_updatedAt_idx" ON "CareerProfileRecord"("visibility", "updatedAt");
CREATE INDEX "CareerProfileRecord_resumeAssetId_idx" ON "CareerProfileRecord"("resumeAssetId");

CREATE TABLE "CareerApplicationRecord" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "cvAssetId" TEXT NOT NULL,
  "coverLetter" TEXT,
  "jobSnapshot" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMP(3),
  "decisionMetadata" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerApplicationRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerApplicationRecord_version_check" CHECK ("version" > 0),
  CONSTRAINT "CareerApplicationRecord_status_check" CHECK ("status" IN ('SUBMITTED','UNDER_REVIEW','SHORTLISTED','REJECTED','ACCEPTED','WITHDRAWN'))
);
CREATE UNIQUE INDEX "CareerApplicationRecord_publicId_key" ON "CareerApplicationRecord"("publicId");
CREATE UNIQUE INDEX "CareerApplicationRecord_jobId_studentReferenceId_key" ON "CareerApplicationRecord"("jobId", "studentReferenceId");
CREATE INDEX "CareerApplicationRecord_studentReferenceId_status_updatedAt_idx" ON "CareerApplicationRecord"("studentReferenceId", "status", "updatedAt");
CREATE INDEX "CareerApplicationRecord_jobId_status_updatedAt_idx" ON "CareerApplicationRecord"("jobId", "status", "updatedAt");
CREATE INDEX "CareerApplicationRecord_cvAssetId_idx" ON "CareerApplicationRecord"("cvAssetId");

CREATE TABLE "CareerAlumniProfileRecord" (
  "id" TEXT NOT NULL,
  "studentReferenceId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "graduationYear" INTEGER,
  "programReferenceId" TEXT,
  "employerName" TEXT,
  "visibility" TEXT NOT NULL,
  "consentGrantedAt" TIMESTAMP(3),
  "consentGrantedBy" TEXT,
  "consentSource" TEXT,
  "consentRevokedAt" TIMESTAMP(3),
  "consentRevokedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerAlumniProfileRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CareerAlumniProfileRecord_version_check" CHECK ("version" > 0),
  CONSTRAINT "CareerAlumniProfileRecord_visibility_check" CHECK ("visibility" IN ('PRIVATE','ALUMNI_ONLY','PUBLIC')),
  CONSTRAINT "CareerAlumniProfileRecord_public_consent_check" CHECK ("visibility" = 'PRIVATE' OR ("consentGrantedAt" IS NOT NULL AND "consentGrantedBy" IS NOT NULL AND "consentSource" IS NOT NULL AND "consentRevokedAt" IS NULL)),
  CONSTRAINT "CareerAlumniProfileRecord_graduation_year_check" CHECK ("graduationYear" IS NULL OR "graduationYear" BETWEEN 1900 AND 2200)
);
CREATE UNIQUE INDEX "CareerAlumniProfileRecord_studentReferenceId_key" ON "CareerAlumniProfileRecord"("studentReferenceId");
CREATE INDEX "CareerAlumniProfileRecord_visibility_updatedAt_idx" ON "CareerAlumniProfileRecord"("visibility", "updatedAt");
CREATE INDEX "CareerAlumniProfileRecord_programReferenceId_idx" ON "CareerAlumniProfileRecord"("programReferenceId");

ALTER TABLE "CareerApplicationRecord" ADD CONSTRAINT "CareerApplicationRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CareerJobPostingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
