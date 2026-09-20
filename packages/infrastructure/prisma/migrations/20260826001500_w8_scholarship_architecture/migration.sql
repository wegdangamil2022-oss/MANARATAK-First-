-- W8 source-only migration. DO NOT deploy outside the Google Studio remediation gate.

CREATE TABLE "ScholarshipVersion" (
  "id" TEXT NOT NULL,
  "scholarshipId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sourceImportRecordId" TEXT,
  "snapshot" JSONB NOT NULL,
  "changeSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "ScholarshipVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipSponsorContext" (
  "id" TEXT NOT NULL,
  "scholarshipId" TEXT NOT NULL,
  "sponsorType" TEXT NOT NULL DEFAULT 'CONTEXTUAL',
  "displayName" TEXT NOT NULL,
  "universityId" TEXT,
  "source" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScholarshipSponsorContext_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipApplicationCycle" (
  "id" TEXT NOT NULL,
  "scholarshipId" TEXT NOT NULL,
  "versionId" TEXT,
  "cycleKey" TEXT NOT NULL,
  "academicYear" TEXT,
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScholarshipApplicationCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipEligibilityRuleVersion" (
  "id" TEXT NOT NULL,
  "scholarshipVersionId" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "ruleVersionNumber" INTEGER NOT NULL,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipEligibilityRuleVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipAwardPackageVersion" (
  "id" TEXT NOT NULL,
  "scholarshipVersionId" TEXT NOT NULL,
  "packageKey" TEXT NOT NULL,
  "packageVersionNumber" INTEGER NOT NULL,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScholarshipAwardPackageVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScholarshipVersion_scholarshipId_versionNumber_key" ON "ScholarshipVersion"("scholarshipId", "versionNumber");
CREATE INDEX "ScholarshipVersion_scholarshipId_status_idx" ON "ScholarshipVersion"("scholarshipId", "status");
CREATE UNIQUE INDEX "ScholarshipSponsorContext_scholarshipId_key" ON "ScholarshipSponsorContext"("scholarshipId");
CREATE UNIQUE INDEX "ScholarshipApplicationCycle_scholarshipId_cycleKey_key" ON "ScholarshipApplicationCycle"("scholarshipId", "cycleKey");
CREATE INDEX "ScholarshipApplicationCycle_scholarshipId_status_idx" ON "ScholarshipApplicationCycle"("scholarshipId", "status");
CREATE UNIQUE INDEX "ScholarshipEligibilityRuleVersion_scholarshipVersionId_ruleKey_ruleVersionNumber_key" ON "ScholarshipEligibilityRuleVersion"("scholarshipVersionId", "ruleKey", "ruleVersionNumber");
CREATE UNIQUE INDEX "ScholarshipAwardPackageVersion_scholarshipVersionId_packageKey_packageVersionNumber_key" ON "ScholarshipAwardPackageVersion"("scholarshipVersionId", "packageKey", "packageVersionNumber");

ALTER TABLE "ScholarshipVersion" ADD CONSTRAINT "ScholarshipVersion_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipSponsorContext" ADD CONSTRAINT "ScholarshipSponsorContext_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipSponsorContext" ADD CONSTRAINT "ScholarshipSponsorContext_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipApplicationCycle" ADD CONSTRAINT "ScholarshipApplicationCycle_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipApplicationCycle" ADD CONSTRAINT "ScholarshipApplicationCycle_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ScholarshipVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipEligibilityRuleVersion" ADD CONSTRAINT "ScholarshipEligibilityRuleVersion_scholarshipVersionId_fkey" FOREIGN KEY ("scholarshipVersionId") REFERENCES "ScholarshipVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipAwardPackageVersion" ADD CONSTRAINT "ScholarshipAwardPackageVersion_scholarshipVersionId_fkey" FOREIGN KEY ("scholarshipVersionId") REFERENCES "ScholarshipVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing Scholarship rows intentionally remain without generated historical versions.
-- Backfill requires read-only collision/reconciliation analysis in Google Studio first.
