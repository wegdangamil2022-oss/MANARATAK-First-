-- WP-IC-02: External provider registry + imported-course schema contract.
-- Source migration only. Package authoring must not execute this migration or connect to Cloud SQL.

CREATE TABLE "ExternalCourseProvider" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "normalizedCanonicalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "providerType" TEXT,
    "status" TEXT NOT NULL,
    "officialWebsite" TEXT,
    "operatingScope" TEXT,
    "headquartersCountryReferenceId" TEXT,
    "sourceTrustLevel" TEXT NOT NULL,
    "importStrategy" TEXT NOT NULL,
    "connectorKey" TEXT,
    "connectorVersion" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalCourseProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalCourseProviderAlias" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "locale" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalCourseProviderAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalCourseProviderDomain" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "normalizedDomain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalCourseProviderDomain_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Course" ADD COLUMN "externalProviderId" TEXT,
ADD COLUMN "originalSourceTitle" TEXT,
ADD COLUMN "isStudyFree" BOOLEAN,
ADD COLUMN "isFreeCertificate" BOOLEAN,
ADD COLUMN "certificateType" TEXT,
ADD COLUMN "learningLanguageRaw" TEXT,
ADD COLUMN "studyLevelRaw" TEXT,
ADD COLUMN "studyDurationRaw" TEXT,
ADD COLUMN "shortCourseTopicsRaw" TEXT;

CREATE TABLE "CourseSourceIdentity" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "providerId" TEXT NOT NULL,
    "sourceNativeKey" TEXT NOT NULL,
    "identityStrategy" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "normalizedOriginalTitle" TEXT NOT NULL,
    "languageVersionKey" TEXT NOT NULL DEFAULT '',
    "currentUrl" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseSourceIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseSourceUrlHistory" (
    "id" TEXT NOT NULL,
    "courseSourceIdentityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationState" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "responseCode" INTEGER,
    "redirectTarget" TEXT,
    "checkedAt" TIMESTAMP(3),
    "changeImportRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseSourceUrlHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseImportAnalysis" (
    "id" TEXT NOT NULL,
    "importRecordId" TEXT NOT NULL,
    "providerCandidateId" TEXT,
    "resolvedProviderId" TEXT,
    "sourceNativeKey" TEXT,
    "normalizedPayload" JSONB NOT NULL,
    "eligibilityState" TEXT NOT NULL,
    "completenessState" TEXT NOT NULL,
    "matchState" TEXT NOT NULL,
    "matchedCourseId" TEXT,
    "changeState" TEXT NOT NULL,
    "fieldDiffs" JSONB,
    "relationshipProposals" JSONB,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseImportAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseFieldProvenance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "importRecordId" TEXT NOT NULL,
    "sourceArtifactHash" TEXT NOT NULL,
    "sourceRowNumber" INTEGER,
    "providerId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "valueHash" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseFieldProvenance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalCourseProvider_publicId_key" ON "ExternalCourseProvider"("publicId");
CREATE UNIQUE INDEX "ExternalCourseProvider_slug_key" ON "ExternalCourseProvider"("slug");
CREATE UNIQUE INDEX "ExternalCourseProvider_normalizedCanonicalName_key" ON "ExternalCourseProvider"("normalizedCanonicalName");
CREATE INDEX "ExternalCourseProvider_status_idx" ON "ExternalCourseProvider"("status");
CREATE INDEX "ExternalCourseProvider_headquartersCountryReferenceId_idx" ON "ExternalCourseProvider"("headquartersCountryReferenceId");
CREATE INDEX "ExternalCourseProvider_importStrategy_idx" ON "ExternalCourseProvider"("importStrategy");
CREATE UNIQUE INDEX "ExternalCourseProviderAlias_normalizedAlias_key" ON "ExternalCourseProviderAlias"("normalizedAlias");
CREATE INDEX "ExternalCourseProviderAlias_providerId_idx" ON "ExternalCourseProviderAlias"("providerId");
CREATE UNIQUE INDEX "ExternalCourseProviderDomain_providerId_normalizedDomain_key" ON "ExternalCourseProviderDomain"("providerId", "normalizedDomain");
CREATE INDEX "ExternalCourseProviderDomain_normalizedDomain_idx" ON "ExternalCourseProviderDomain"("normalizedDomain");
CREATE INDEX "Course_externalProviderId_idx" ON "Course"("externalProviderId");
CREATE UNIQUE INDEX "CourseSourceIdentity_providerId_sourceNativeKey_languageVersionKey_key" ON "CourseSourceIdentity"("providerId", "sourceNativeKey", "languageVersionKey");
CREATE INDEX "CourseSourceIdentity_courseId_idx" ON "CourseSourceIdentity"("courseId");
CREATE INDEX "CourseSourceIdentity_providerId_idx" ON "CourseSourceIdentity"("providerId");
CREATE INDEX "CourseSourceIdentity_status_idx" ON "CourseSourceIdentity"("status");
CREATE UNIQUE INDEX "CourseSourceUrlHistory_courseSourceIdentityId_normalizedUrl_key" ON "CourseSourceUrlHistory"("courseSourceIdentityId", "normalizedUrl");
CREATE INDEX "CourseSourceUrlHistory_isCurrent_idx" ON "CourseSourceUrlHistory"("isCurrent");
CREATE INDEX "CourseSourceUrlHistory_verificationState_idx" ON "CourseSourceUrlHistory"("verificationState");
CREATE UNIQUE INDEX "CourseImportAnalysis_importRecordId_key" ON "CourseImportAnalysis"("importRecordId");
CREATE INDEX "CourseImportAnalysis_resolvedProviderId_idx" ON "CourseImportAnalysis"("resolvedProviderId");
CREATE INDEX "CourseImportAnalysis_matchedCourseId_idx" ON "CourseImportAnalysis"("matchedCourseId");
CREATE INDEX "CourseImportAnalysis_changeState_idx" ON "CourseImportAnalysis"("changeState");
CREATE INDEX "CourseImportAnalysis_requiresReview_idx" ON "CourseImportAnalysis"("requiresReview");
CREATE UNIQUE INDEX "CourseFieldProvenance_courseId_fieldKey_importRecordId_key" ON "CourseFieldProvenance"("courseId", "fieldKey", "importRecordId");
CREATE INDEX "CourseFieldProvenance_providerId_idx" ON "CourseFieldProvenance"("providerId");
CREATE INDEX "CourseFieldProvenance_importRecordId_idx" ON "CourseFieldProvenance"("importRecordId");
CREATE INDEX "CourseFieldProvenance_reviewStatus_idx" ON "CourseFieldProvenance"("reviewStatus");

ALTER TABLE "ExternalCourseProvider" ADD CONSTRAINT "ExternalCourseProvider_headquartersCountryReferenceId_fkey"
FOREIGN KEY ("headquartersCountryReferenceId") REFERENCES "ReferenceCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalCourseProviderAlias" ADD CONSTRAINT "ExternalCourseProviderAlias_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "ExternalCourseProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalCourseProviderDomain" ADD CONSTRAINT "ExternalCourseProviderDomain_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "ExternalCourseProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_externalProviderId_fkey"
FOREIGN KEY ("externalProviderId") REFERENCES "ExternalCourseProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseSourceIdentity" ADD CONSTRAINT "CourseSourceIdentity_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseSourceIdentity" ADD CONSTRAINT "CourseSourceIdentity_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "ExternalCourseProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseSourceUrlHistory" ADD CONSTRAINT "CourseSourceUrlHistory_courseSourceIdentityId_fkey"
FOREIGN KEY ("courseSourceIdentityId") REFERENCES "CourseSourceIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseImportAnalysis" ADD CONSTRAINT "CourseImportAnalysis_providerCandidateId_fkey"
FOREIGN KEY ("providerCandidateId") REFERENCES "ExternalCourseProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseImportAnalysis" ADD CONSTRAINT "CourseImportAnalysis_resolvedProviderId_fkey"
FOREIGN KEY ("resolvedProviderId") REFERENCES "ExternalCourseProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseImportAnalysis" ADD CONSTRAINT "CourseImportAnalysis_matchedCourseId_fkey"
FOREIGN KEY ("matchedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseFieldProvenance" ADD CONSTRAINT "CourseFieldProvenance_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseFieldProvenance" ADD CONSTRAINT "CourseFieldProvenance_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "ExternalCourseProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
