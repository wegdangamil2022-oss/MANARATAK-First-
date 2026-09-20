-- WP12-2 expand-only Scholarship normalization.
-- SOURCE DRAFT ONLY: do not apply to preserved Cloud SQL during packet execution.

ALTER TABLE "Scholarship" ADD COLUMN "academicYear" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "cycleName" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "countryReferenceId" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "countrySourceLabel" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "countryScope" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "fundingTypeCode" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "deadlineType" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "applicationMethod" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "applicationUrl" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "officialSourceUrl" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "sourceImportRecordId" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "sourceLocale" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);

CREATE TABLE "ScholarshipBenefit" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "benefitKey" TEXT NOT NULL,
    "benefitTypeCode" TEXT NOT NULL,
    "coverageTypeCode" TEXT,
    "amount" DECIMAL(18,2),
    "currencyReferenceId" TEXT,
    "valueText" TEXT,
    "durationText" TEXT,
    "frequencyCode" TEXT,
    "isCovered" BOOLEAN NOT NULL DEFAULT true,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipBenefit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipDegreeTarget" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "degreeLevelId" TEXT,
    "sourceLabel" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipDegreeTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipMajorTarget" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "targetKey" TEXT NOT NULL,
    "majorId" TEXT,
    "sourceLabel" TEXT,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipMajorTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipEligibilityItem" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemTypeCode" TEXT NOT NULL,
    "operatorCode" TEXT,
    "valueText" TEXT,
    "minimumValue" DECIMAL(18,4),
    "maximumValue" DECIMAL(18,4),
    "countryReferenceId" TEXT,
    "degreeLevelId" TEXT,
    "majorId" TEXT,
    "internationalTestId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "priorityOrder" INTEGER NOT NULL DEFAULT 0,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipEligibilityItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipRequiredDocument" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL,
    "documentTypeCode" TEXT,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipRequiredDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipSourceEvidence" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "evidenceKey" TEXT NOT NULL,
    "sourceTypeCode" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceHash" TEXT,
    "trustLevel" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "importRecordId" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipSourceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipUniversityLink" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "linkKey" TEXT NOT NULL,
    "universityId" TEXT,
    "academicProgramId" TEXT,
    "sourceLabel" TEXT,
    "relationshipTypeCode" TEXT NOT NULL DEFAULT 'TARGET',
    "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScholarshipUniversityLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Scholarship_countryReferenceId_idx" ON "Scholarship"("countryReferenceId");
CREATE INDEX "Scholarship_academicYear_idx" ON "Scholarship"("academicYear");
CREATE INDEX "Scholarship_applicationDeadline_idx" ON "Scholarship"("applicationDeadline");
CREATE INDEX "Scholarship_status_completenessStatus_idx" ON "Scholarship"("status", "completenessStatus");

CREATE UNIQUE INDEX "ScholarshipBenefit_scholarshipId_benefitKey_key" ON "ScholarshipBenefit"("scholarshipId", "benefitKey");
CREATE INDEX "ScholarshipBenefit_scholarshipId_idx" ON "ScholarshipBenefit"("scholarshipId");
CREATE INDEX "ScholarshipBenefit_benefitTypeCode_idx" ON "ScholarshipBenefit"("benefitTypeCode");
CREATE INDEX "ScholarshipBenefit_currencyReferenceId_idx" ON "ScholarshipBenefit"("currencyReferenceId");

CREATE UNIQUE INDEX "ScholarshipDegreeTarget_scholarshipId_targetKey_key" ON "ScholarshipDegreeTarget"("scholarshipId", "targetKey");
CREATE INDEX "ScholarshipDegreeTarget_scholarshipId_idx" ON "ScholarshipDegreeTarget"("scholarshipId");
CREATE INDEX "ScholarshipDegreeTarget_degreeLevelId_idx" ON "ScholarshipDegreeTarget"("degreeLevelId");
CREATE INDEX "ScholarshipDegreeTarget_resolutionStatus_idx" ON "ScholarshipDegreeTarget"("resolutionStatus");

CREATE UNIQUE INDEX "ScholarshipMajorTarget_scholarshipId_targetKey_key" ON "ScholarshipMajorTarget"("scholarshipId", "targetKey");
CREATE INDEX "ScholarshipMajorTarget_scholarshipId_idx" ON "ScholarshipMajorTarget"("scholarshipId");
CREATE INDEX "ScholarshipMajorTarget_majorId_idx" ON "ScholarshipMajorTarget"("majorId");
CREATE INDEX "ScholarshipMajorTarget_resolutionStatus_idx" ON "ScholarshipMajorTarget"("resolutionStatus");

CREATE UNIQUE INDEX "ScholarshipEligibilityItem_scholarshipId_itemKey_key" ON "ScholarshipEligibilityItem"("scholarshipId", "itemKey");
CREATE INDEX "ScholarshipEligibilityItem_scholarshipId_idx" ON "ScholarshipEligibilityItem"("scholarshipId");
CREATE INDEX "ScholarshipEligibilityItem_itemTypeCode_idx" ON "ScholarshipEligibilityItem"("itemTypeCode");
CREATE INDEX "ScholarshipEligibilityItem_countryReferenceId_idx" ON "ScholarshipEligibilityItem"("countryReferenceId");
CREATE INDEX "ScholarshipEligibilityItem_degreeLevelId_idx" ON "ScholarshipEligibilityItem"("degreeLevelId");
CREATE INDEX "ScholarshipEligibilityItem_majorId_idx" ON "ScholarshipEligibilityItem"("majorId");
CREATE INDEX "ScholarshipEligibilityItem_internationalTestId_idx" ON "ScholarshipEligibilityItem"("internationalTestId");
CREATE INDEX "ScholarshipEligibilityItem_resolutionStatus_idx" ON "ScholarshipEligibilityItem"("resolutionStatus");

CREATE UNIQUE INDEX "ScholarshipRequiredDocument_scholarshipId_documentKey_key" ON "ScholarshipRequiredDocument"("scholarshipId", "documentKey");
CREATE INDEX "ScholarshipRequiredDocument_scholarshipId_idx" ON "ScholarshipRequiredDocument"("scholarshipId");
CREATE INDEX "ScholarshipRequiredDocument_documentTypeCode_idx" ON "ScholarshipRequiredDocument"("documentTypeCode");

CREATE UNIQUE INDEX "ScholarshipSourceEvidence_scholarshipId_evidenceKey_key" ON "ScholarshipSourceEvidence"("scholarshipId", "evidenceKey");
CREATE INDEX "ScholarshipSourceEvidence_scholarshipId_idx" ON "ScholarshipSourceEvidence"("scholarshipId");
CREATE INDEX "ScholarshipSourceEvidence_sourceHash_idx" ON "ScholarshipSourceEvidence"("sourceHash");
CREATE INDEX "ScholarshipSourceEvidence_sourceTypeCode_idx" ON "ScholarshipSourceEvidence"("sourceTypeCode");
CREATE INDEX "ScholarshipSourceEvidence_isOfficial_idx" ON "ScholarshipSourceEvidence"("isOfficial");

CREATE UNIQUE INDEX "ScholarshipUniversityLink_scholarshipId_linkKey_key" ON "ScholarshipUniversityLink"("scholarshipId", "linkKey");
CREATE INDEX "ScholarshipUniversityLink_scholarshipId_idx" ON "ScholarshipUniversityLink"("scholarshipId");
CREATE INDEX "ScholarshipUniversityLink_universityId_idx" ON "ScholarshipUniversityLink"("universityId");
CREATE INDEX "ScholarshipUniversityLink_academicProgramId_idx" ON "ScholarshipUniversityLink"("academicProgramId");
CREATE INDEX "ScholarshipUniversityLink_resolutionStatus_idx" ON "ScholarshipUniversityLink"("resolutionStatus");

ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_countryReferenceId_fkey"
  FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipBenefit" ADD CONSTRAINT "ScholarshipBenefit_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipBenefit" ADD CONSTRAINT "ScholarshipBenefit_currencyReferenceId_fkey"
  FOREIGN KEY ("currencyReferenceId") REFERENCES "ReferenceCurrency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipDegreeTarget" ADD CONSTRAINT "ScholarshipDegreeTarget_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipDegreeTarget" ADD CONSTRAINT "ScholarshipDegreeTarget_degreeLevelId_fkey"
  FOREIGN KEY ("degreeLevelId") REFERENCES "DegreeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipMajorTarget" ADD CONSTRAINT "ScholarshipMajorTarget_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipMajorTarget" ADD CONSTRAINT "ScholarshipMajorTarget_majorId_fkey"
  FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipEligibilityItem" ADD CONSTRAINT "ScholarshipEligibilityItem_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipEligibilityItem" ADD CONSTRAINT "ScholarshipEligibilityItem_countryReferenceId_fkey"
  FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipEligibilityItem" ADD CONSTRAINT "ScholarshipEligibilityItem_degreeLevelId_fkey"
  FOREIGN KEY ("degreeLevelId") REFERENCES "DegreeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipEligibilityItem" ADD CONSTRAINT "ScholarshipEligibilityItem_majorId_fkey"
  FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipEligibilityItem" ADD CONSTRAINT "ScholarshipEligibilityItem_internationalTestId_fkey"
  FOREIGN KEY ("internationalTestId") REFERENCES "InternationalTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipRequiredDocument" ADD CONSTRAINT "ScholarshipRequiredDocument_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipSourceEvidence" ADD CONSTRAINT "ScholarshipSourceEvidence_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipUniversityLink" ADD CONSTRAINT "ScholarshipUniversityLink_scholarshipId_fkey"
  FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipUniversityLink" ADD CONSTRAINT "ScholarshipUniversityLink_universityId_fkey"
  FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipUniversityLink" ADD CONSTRAINT "ScholarshipUniversityLink_academicProgramId_fkey"
  FOREIGN KEY ("academicProgramId") REFERENCES "UniversityAcademicProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
