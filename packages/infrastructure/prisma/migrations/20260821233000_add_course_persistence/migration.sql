-- WP-IC-01: Phase 13 core Course persistence only.
-- Source migration. Do not apply to production/Cloud SQL during package authoring.

CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "canonicalDedupKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "originType" TEXT NOT NULL,
    "directCourseUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completenessStatus" TEXT NOT NULL,
    "platformName" TEXT,
    "providerName" TEXT,
    "learningLanguage" TEXT,
    "studyDuration" TEXT,
    "certificateAvailable" BOOLEAN,
    "category" TEXT,
    "difficultyLevel" TEXT,
    "sourceUrl" TEXT,
    "officialSourceUrl" TEXT,
    "thumbnailAssetId" TEXT,
    "sourceImportRecordId" TEXT,
    "optionalFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_publicId_key" ON "Course"("publicId");
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE UNIQUE INDEX "Course_canonicalDedupKey_key" ON "Course"("canonicalDedupKey");
CREATE INDEX "Course_status_idx" ON "Course"("status");
CREATE INDEX "Course_completenessStatus_idx" ON "Course"("completenessStatus");
CREATE INDEX "Course_accessType_idx" ON "Course"("accessType");
CREATE INDEX "Course_originType_idx" ON "Course"("originType");
CREATE INDEX "Course_platformName_idx" ON "Course"("platformName");
CREATE INDEX "Course_sourceImportRecordId_idx" ON "Course"("sourceImportRecordId");
CREATE INDEX "Course_status_originType_idx" ON "Course"("status", "originType");
CREATE INDEX "Course_status_platformName_idx" ON "Course"("status", "platformName");
