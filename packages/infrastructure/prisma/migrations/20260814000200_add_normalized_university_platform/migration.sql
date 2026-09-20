ALTER TABLE "University"
  ADD COLUMN "countryReferenceId" TEXT,
  ADD COLUMN "regionReferenceId" TEXT,
  ADD COLUMN "cityReferenceId" TEXT,
  ADD COLUMN "institutionalOwnership" TEXT;

CREATE TABLE "UniversityCampus" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "sourceReferenceId" TEXT, "name" TEXT NOT NULL,
  "campusType" TEXT, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "address" TEXT,
  "countryReferenceId" TEXT, "regionReferenceId" TEXT, "cityReferenceId" TEXT,
  "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "coordinateSource" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityCampus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityOrganizationUnit" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "campusId" TEXT, "parentOrganizationUnitId" TEXT,
  "sourceReferenceId" TEXT, "unitType" TEXT NOT NULL, "name" TEXT NOT NULL, "normalizedName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE', "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityOrganizationUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityAcademicProgram" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "organizationUnitId" TEXT, "sourceReferenceId" TEXT,
  "sourceProgramName" TEXT NOT NULL, "normalizedName" TEXT NOT NULL, "degreeLevelId" TEXT,
  "majorId" TEXT, "majorMappingState" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT', "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityAcademicProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityProgramCampus" (
  "academicProgramId" TEXT NOT NULL, "campusId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UniversityProgramCampus_pkey" PRIMARY KEY ("academicProgramId", "campusId")
);

CREATE TABLE "UniversityProgramAdmissionRequirement" (
  "id" TEXT NOT NULL, "academicProgramId" TEXT NOT NULL, "internationalTestId" TEXT NOT NULL,
  "testVariantId" TEXT, "testVersionId" TEXT, "minimumScore" DOUBLE PRECISION,
  "sectionScores" JSONB, "validityMetadata" JSONB, "restrictionMetadata" JSONB,
  "status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityProgramAdmissionRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityTuitionProfile" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "profileType" TEXT NOT NULL,
  "organizationUnitName" TEXT, "amount" DECIMAL(18,2), "currencyCode" TEXT, "currencyReferenceId" TEXT, "officialSourceUrl" TEXT,
  "effectiveFrom" TIMESTAMP(3), "effectiveTo" TIMESTAMP(3), "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityTuitionProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityAccommodationProfile" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "accommodationAvailable" BOOLEAN,
  "internationalEligible" BOOLEAN, "typicalCost" DECIMAL(18,2), "currencyCode" TEXT,
  "currencyReferenceId" TEXT, "averageMonthlyLivingCost" DECIMAL(18,2), "livingCostCurrencyCode" TEXT,
  "livingCostCurrencyReferenceId" TEXT, "costVariationNote" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityAccommodationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityRanking" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "provider" TEXT NOT NULL, "rankingYear" INTEGER NOT NULL,
  "rank" TEXT NOT NULL, "scope" TEXT NOT NULL, "scopeLabel" TEXT, "note" TEXT,
  "officialSourceUrl" TEXT NOT NULL, "verifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityRanking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversitySourceRecord" (
  "id" TEXT NOT NULL, "universityId" TEXT NOT NULL, "importRecordId" TEXT, "stage" TEXT NOT NULL,
  "sourceArtifactId" TEXT NOT NULL, "sourceRowNumber" INTEGER, "sourceHash" TEXT NOT NULL,
  "sourceUri" TEXT, "importedAt" TIMESTAMP(3), "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UniversitySourceRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityImportChangeSet" (
  "id" TEXT NOT NULL, "importBatchId" TEXT, "sourceArtifactId" TEXT NOT NULL, "stage" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PLANNED', "approvedBy" TEXT, "appliedAt" TIMESTAMP(3), "rolledBackAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UniversityImportChangeSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UniversityImportChange" (
  "id" TEXT NOT NULL, "changeSetId" TEXT NOT NULL, "universityId" TEXT, "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL, "operation" TEXT NOT NULL, "beforeState" JSONB, "afterState" JSONB,
  "sequence" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UniversityImportChange_pkey" PRIMARY KEY ("id")
);

DROP INDEX "ImportRecord_batchId_sourceDedupKey_idx";
CREATE UNIQUE INDEX "ImportRecord_batchId_sourceDedupKey_key" ON "ImportRecord"("batchId", "sourceDedupKey");
CREATE INDEX "University_countryReferenceId_idx" ON "University"("countryReferenceId");
CREATE INDEX "University_regionReferenceId_idx" ON "University"("regionReferenceId");
CREATE INDEX "University_cityReferenceId_idx" ON "University"("cityReferenceId");
CREATE UNIQUE INDEX "UniversityCampus_universityId_sourceReferenceId_key" ON "UniversityCampus"("universityId", "sourceReferenceId");
CREATE INDEX "UniversityCampus_universityId_idx" ON "UniversityCampus"("universityId");
CREATE INDEX "UniversityCampus_countryReferenceId_idx" ON "UniversityCampus"("countryReferenceId");
CREATE INDEX "UniversityCampus_regionReferenceId_idx" ON "UniversityCampus"("regionReferenceId");
CREATE INDEX "UniversityCampus_cityReferenceId_idx" ON "UniversityCampus"("cityReferenceId");
CREATE UNIQUE INDEX "UniversityOrganizationUnit_identity_key" ON "UniversityOrganizationUnit"("universityId", "unitType", "normalizedName", "parentOrganizationUnitId");
CREATE INDEX "UniversityOrganizationUnit_universityId_idx" ON "UniversityOrganizationUnit"("universityId");
CREATE INDEX "UniversityOrganizationUnit_campusId_idx" ON "UniversityOrganizationUnit"("campusId");
CREATE INDEX "UniversityOrganizationUnit_parent_idx" ON "UniversityOrganizationUnit"("parentOrganizationUnitId");
CREATE UNIQUE INDEX "UniversityAcademicProgram_universityId_sourceReferenceId_key" ON "UniversityAcademicProgram"("universityId", "sourceReferenceId");
CREATE INDEX "UniversityAcademicProgram_universityId_idx" ON "UniversityAcademicProgram"("universityId");
CREATE INDEX "UniversityAcademicProgram_organizationUnitId_idx" ON "UniversityAcademicProgram"("organizationUnitId");
CREATE INDEX "UniversityAcademicProgram_degreeLevelId_idx" ON "UniversityAcademicProgram"("degreeLevelId");
CREATE INDEX "UniversityAcademicProgram_majorId_idx" ON "UniversityAcademicProgram"("majorId");
CREATE INDEX "UniversityAcademicProgram_majorMappingState_idx" ON "UniversityAcademicProgram"("majorMappingState");
CREATE INDEX "UniversityProgramCampus_campusId_idx" ON "UniversityProgramCampus"("campusId");
CREATE UNIQUE INDEX "UniversityProgramAdmissionRequirement_identity_key" ON "UniversityProgramAdmissionRequirement"("academicProgramId", "internationalTestId", "testVariantId", "testVersionId");
CREATE INDEX "UniversityProgramAdmissionRequirement_test_idx" ON "UniversityProgramAdmissionRequirement"("internationalTestId");
CREATE INDEX "UniversityProgramAdmissionRequirement_variant_idx" ON "UniversityProgramAdmissionRequirement"("testVariantId");
CREATE INDEX "UniversityProgramAdmissionRequirement_version_idx" ON "UniversityProgramAdmissionRequirement"("testVersionId");
CREATE INDEX "UniversityTuitionProfile_universityId_idx" ON "UniversityTuitionProfile"("universityId");
CREATE INDEX "UniversityTuitionProfile_profileType_idx" ON "UniversityTuitionProfile"("profileType");
CREATE INDEX "UniversityTuitionProfile_currencyReferenceId_idx" ON "UniversityTuitionProfile"("currencyReferenceId");
CREATE INDEX "UniversityAccommodationProfile_universityId_idx" ON "UniversityAccommodationProfile"("universityId");
CREATE INDEX "UniversityAccommodationProfile_currencyReferenceId_idx" ON "UniversityAccommodationProfile"("currencyReferenceId");
CREATE INDEX "UniversityAccommodationProfile_livingCostCurrencyReferenceId_idx" ON "UniversityAccommodationProfile"("livingCostCurrencyReferenceId");
CREATE UNIQUE INDEX "UniversityRanking_identity_key" ON "UniversityRanking"("universityId", "provider", "rankingYear", "scope");
CREATE INDEX "UniversityRanking_provider_year_scope_idx" ON "UniversityRanking"("provider", "rankingYear", "scope");
CREATE UNIQUE INDEX "UniversitySourceRecord_identity_key" ON "UniversitySourceRecord"("stage", "sourceArtifactId", "sourceRowNumber");
CREATE INDEX "UniversitySourceRecord_universityId_idx" ON "UniversitySourceRecord"("universityId");
CREATE INDEX "UniversitySourceRecord_sourceHash_idx" ON "UniversitySourceRecord"("sourceHash");
CREATE INDEX "UniversityImportChangeSet_state_idx" ON "UniversityImportChangeSet"("state");
CREATE INDEX "UniversityImportChangeSet_sourceArtifactId_idx" ON "UniversityImportChangeSet"("sourceArtifactId");
CREATE UNIQUE INDEX "UniversityImportChange_changeSetId_sequence_key" ON "UniversityImportChange"("changeSetId", "sequence");
CREATE INDEX "UniversityImportChange_universityId_idx" ON "UniversityImportChange"("universityId");
CREATE INDEX "UniversityImportChange_entity_idx" ON "UniversityImportChange"("entityType", "entityId");

ALTER TABLE "University" ADD CONSTRAINT "University_countryReferenceId_fkey" FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "University" ADD CONSTRAINT "University_regionReferenceId_fkey" FOREIGN KEY ("regionReferenceId") REFERENCES "AdministrativeRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "University" ADD CONSTRAINT "University_cityReferenceId_fkey" FOREIGN KEY ("cityReferenceId") REFERENCES "ReferenceCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityCampus" ADD CONSTRAINT "UniversityCampus_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityCampus" ADD CONSTRAINT "UniversityCampus_countryReferenceId_fkey" FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UniversityCampus" ADD CONSTRAINT "UniversityCampus_regionReferenceId_fkey" FOREIGN KEY ("regionReferenceId") REFERENCES "AdministrativeRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityCampus" ADD CONSTRAINT "UniversityCampus_cityReferenceId_fkey" FOREIGN KEY ("cityReferenceId") REFERENCES "ReferenceCity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityOrganizationUnit" ADD CONSTRAINT "UniversityOrganizationUnit_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityOrganizationUnit" ADD CONSTRAINT "UniversityOrganizationUnit_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "UniversityCampus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityOrganizationUnit" ADD CONSTRAINT "UniversityOrganizationUnit_parent_fkey" FOREIGN KEY ("parentOrganizationUnitId") REFERENCES "UniversityOrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityAcademicProgram" ADD CONSTRAINT "UniversityAcademicProgram_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityAcademicProgram" ADD CONSTRAINT "UniversityAcademicProgram_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "UniversityOrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityAcademicProgram" ADD CONSTRAINT "UniversityAcademicProgram_degreeLevelId_fkey" FOREIGN KEY ("degreeLevelId") REFERENCES "DegreeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityAcademicProgram" ADD CONSTRAINT "UniversityAcademicProgram_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityProgramCampus" ADD CONSTRAINT "UniversityProgramCampus_program_fkey" FOREIGN KEY ("academicProgramId") REFERENCES "UniversityAcademicProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityProgramCampus" ADD CONSTRAINT "UniversityProgramCampus_campus_fkey" FOREIGN KEY ("campusId") REFERENCES "UniversityCampus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityProgramAdmissionRequirement" ADD CONSTRAINT "UniversityProgramAdmissionRequirement_program_fkey" FOREIGN KEY ("academicProgramId") REFERENCES "UniversityAcademicProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityProgramAdmissionRequirement" ADD CONSTRAINT "UniversityProgramAdmissionRequirement_test_fkey" FOREIGN KEY ("internationalTestId") REFERENCES "InternationalTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UniversityProgramAdmissionRequirement" ADD CONSTRAINT "UniversityProgramAdmissionRequirement_variant_fkey" FOREIGN KEY ("testVariantId") REFERENCES "InternationalTestVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityProgramAdmissionRequirement" ADD CONSTRAINT "UniversityProgramAdmissionRequirement_version_fkey" FOREIGN KEY ("testVersionId") REFERENCES "InternationalTestVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityTuitionProfile" ADD CONSTRAINT "UniversityTuitionProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityTuitionProfile" ADD CONSTRAINT "UniversityTuitionProfile_currencyReferenceId_fkey" FOREIGN KEY ("currencyReferenceId") REFERENCES "ReferenceCurrency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityAccommodationProfile" ADD CONSTRAINT "UniversityAccommodationProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityAccommodationProfile" ADD CONSTRAINT "UniversityAccommodationProfile_currencyReferenceId_fkey" FOREIGN KEY ("currencyReferenceId") REFERENCES "ReferenceCurrency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityAccommodationProfile" ADD CONSTRAINT "UniversityAccommodationProfile_livingCostCurrencyReferenceId_fkey" FOREIGN KEY ("livingCostCurrencyReferenceId") REFERENCES "ReferenceCurrency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityRanking" ADD CONSTRAINT "UniversityRanking_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversitySourceRecord" ADD CONSTRAINT "UniversitySourceRecord_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityImportChange" ADD CONSTRAINT "UniversityImportChange_changeSetId_fkey" FOREIGN KEY ("changeSetId") REFERENCES "UniversityImportChangeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityImportChange" ADD CONSTRAINT "UniversityImportChange_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;
