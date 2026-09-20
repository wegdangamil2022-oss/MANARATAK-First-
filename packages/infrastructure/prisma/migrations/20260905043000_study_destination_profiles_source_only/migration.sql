-- Study Destination profiles are owned above Phase 7 Reference Data.
-- ReferenceCountry remains canonical identity only. This migration is source-only and was NOT applied.
CREATE TABLE "StudyDestinationProfile" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "countryReferenceId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "completenessStatus" TEXT NOT NULL DEFAULT 'INCOMPLETE',
  "overviewAr" TEXT,
  "overviewEn" TEXT,
  "studySystemSummaryAr" TEXT,
  "studySystemSummaryEn" TEXT,
  "admissionHighlightsAr" JSONB,
  "admissionHighlightsEn" JSONB,
  "visaSummaryAr" TEXT,
  "visaSummaryEn" TEXT,
  "visaRequirementsAr" JSONB,
  "visaRequirementsEn" JSONB,
  "visaOfficialUrl" TEXT,
  "livingCostTier" TEXT,
  "averageMonthlyLivingCostMin" DECIMAL(18,2),
  "averageMonthlyLivingCostMax" DECIMAL(18,2),
  "livingCostCurrencyReferenceId" TEXT,
  "costHighlightsAr" JSONB,
  "costHighlightsEn" JSONB,
  "studentLifeHighlightsAr" JSONB,
  "studentLifeHighlightsEn" JSONB,
  "officialLinks" JSONB,
  "sourceVerificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "sourceAuditDate" TIMESTAMP(3),
  "evidenceSources" JSONB,
  "imageAssetId" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyDestinationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyDestinationStudyLanguage" (
  "profileId" TEXT NOT NULL,
  "languageReferenceId" TEXT NOT NULL,
  CONSTRAINT "StudyDestinationStudyLanguage_pkey" PRIMARY KEY ("profileId", "languageReferenceId")
);

CREATE UNIQUE INDEX "StudyDestinationProfile_publicId_key" ON "StudyDestinationProfile"("publicId");
CREATE UNIQUE INDEX "StudyDestinationProfile_slug_key" ON "StudyDestinationProfile"("slug");
CREATE UNIQUE INDEX "StudyDestinationProfile_countryReferenceId_key" ON "StudyDestinationProfile"("countryReferenceId");
CREATE INDEX "StudyDestinationProfile_status_completenessStatus_idx" ON "StudyDestinationProfile"("status", "completenessStatus");
CREATE INDEX "StudyDestinationProfile_isFeatured_status_idx" ON "StudyDestinationProfile"("isFeatured", "status");
CREATE INDEX "StudyDestinationProfile_livingCostCurrencyReferenceId_idx" ON "StudyDestinationProfile"("livingCostCurrencyReferenceId");
CREATE INDEX "StudyDestinationStudyLanguage_languageReferenceId_idx" ON "StudyDestinationStudyLanguage"("languageReferenceId");

ALTER TABLE "StudyDestinationProfile" ADD CONSTRAINT "StudyDestinationProfile_countryReferenceId_fkey"
  FOREIGN KEY ("countryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyDestinationProfile" ADD CONSTRAINT "StudyDestinationProfile_livingCostCurrencyReferenceId_fkey"
  FOREIGN KEY ("livingCostCurrencyReferenceId") REFERENCES "ReferenceCurrency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudyDestinationStudyLanguage" ADD CONSTRAINT "StudyDestinationStudyLanguage_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "StudyDestinationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyDestinationStudyLanguage" ADD CONSTRAINT "StudyDestinationStudyLanguage_languageReferenceId_fkey"
  FOREIGN KEY ("languageReferenceId") REFERENCES "ReferenceLanguage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
