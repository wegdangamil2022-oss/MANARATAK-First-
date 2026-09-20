-- Phase 15/16 source closure. This migration is intentionally source-only;
-- deployment is deferred to the controlled Google Studio runtime window.

CREATE TABLE "StudentRecentlyViewed" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entitySlug" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentRecentlyViewed_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentRecentlyViewed_studentReferenceId_entityType_entityId_key" ON "StudentRecentlyViewed"("studentReferenceId", "entityType", "entityId");
CREATE INDEX "StudentRecentlyViewed_studentReferenceId_viewedAt_idx" ON "StudentRecentlyViewed"("studentReferenceId", "viewedAt");
ALTER TABLE "StudentRecentlyViewed" ADD CONSTRAINT "StudentRecentlyViewed_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentLearningProjection" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progressPercentage" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sourceEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentLearningProjection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentLearningProjection_studentReferenceId_enrollmentId_key" ON "StudentLearningProjection"("studentReferenceId", "enrollmentId");
CREATE INDEX "StudentLearningProjection_studentReferenceId_status_lastAccessedAt_idx" ON "StudentLearningProjection"("studentReferenceId", "status", "lastAccessedAt");
CREATE INDEX "StudentLearningProjection_sourceEventId_idx" ON "StudentLearningProjection"("sourceEventId");
ALTER TABLE "StudentLearningProjection" ADD CONSTRAINT "StudentLearningProjection_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentCertificateReadProjection" (
    "id" TEXT NOT NULL,
    "studentReferenceId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "courseDisplayName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "certificatePdfAssetId" TEXT,
    "previewImageAssetId" TEXT,
    "sourceEventId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentCertificateReadProjection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentCertificateReadProjection_studentReferenceId_certificateId_key" ON "StudentCertificateReadProjection"("studentReferenceId", "certificateId");
CREATE INDEX "StudentCertificateReadProjection_studentReferenceId_status_issuedAt_idx" ON "StudentCertificateReadProjection"("studentReferenceId", "status", "issuedAt");
CREATE INDEX "StudentCertificateReadProjection_sourceEventId_idx" ON "StudentCertificateReadProjection"("sourceEventId");
ALTER TABLE "StudentCertificateReadProjection" ADD CONSTRAINT "StudentCertificateReadProjection_studentReferenceId_fkey" FOREIGN KEY ("studentReferenceId") REFERENCES "StudentWorkspace"("studentReferenceId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CmsLocalizedContent" ADD COLUMN "siteIdentifier" TEXT NOT NULL DEFAULT 'MANARATAK';
UPDATE "CmsLocalizedContent" AS localized
SET "siteIdentifier" = content."siteIdentifier"
FROM "CmsContentNode" AS content
WHERE localized."contentId" = content."id";
DROP INDEX "CmsContentNode_slug_key";
DROP INDEX "CmsLocalizedContent_locale_localizedSlug_key";
DROP INDEX "CmsPublishedContent_locale_slug_key";
CREATE UNIQUE INDEX "CmsContentNode_siteIdentifier_slug_key" ON "CmsContentNode"("siteIdentifier", "slug");
CREATE UNIQUE INDEX "CmsLocalizedContent_siteIdentifier_locale_localizedSlug_key" ON "CmsLocalizedContent"("siteIdentifier", "locale", "localizedSlug");
CREATE UNIQUE INDEX "CmsPublishedContent_siteIdentifier_locale_slug_key" ON "CmsPublishedContent"("siteIdentifier", "locale", "slug");

CREATE TABLE "CmsRedirect" (
    "id" TEXT NOT NULL, "siteIdentifier" TEXT NOT NULL, "locale" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL, "destinationPath" TEXT NOT NULL, "statusCode" INTEGER NOT NULL DEFAULT 301,
    "reason" TEXT NOT NULL, "contentId" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CmsRedirect_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsRedirect_siteIdentifier_locale_sourcePath_key" ON "CmsRedirect"("siteIdentifier", "locale", "sourcePath");
CREATE INDEX "CmsRedirect_siteIdentifier_locale_destinationPath_idx" ON "CmsRedirect"("siteIdentifier", "locale", "destinationPath");
CREATE INDEX "CmsRedirect_contentId_idx" ON "CmsRedirect"("contentId");

CREATE TABLE "CmsNavigationMenu" (
    "id" TEXT NOT NULL, "siteIdentifier" TEXT NOT NULL, "locale" TEXT NOT NULL, "locationKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1, "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsNavigationMenu_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsNavigationMenu_siteIdentifier_locale_locationKey_key" ON "CmsNavigationMenu"("siteIdentifier", "locale", "locationKey");
CREATE INDEX "CmsNavigationMenu_siteIdentifier_locale_status_idx" ON "CmsNavigationMenu"("siteIdentifier", "locale", "status");

CREATE TABLE "CmsNavigationNode" (
    "id" TEXT NOT NULL, "menuId" TEXT NOT NULL, "parentNodeId" TEXT, "displayText" TEXT NOT NULL,
    "targetType" TEXT NOT NULL, "targetValue" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "openInNewWindow" BOOLEAN NOT NULL DEFAULT false, "metadata" JSONB,
    CONSTRAINT "CmsNavigationNode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CmsNavigationNode_menuId_parentNodeId_sortOrder_idx" ON "CmsNavigationNode"("menuId", "parentNodeId", "sortOrder");
ALTER TABLE "CmsNavigationNode" ADD CONSTRAINT "CmsNavigationNode_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "CmsNavigationMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CmsBlockSchema" (
    "id" TEXT NOT NULL, "key" TEXT NOT NULL, "version" INTEGER NOT NULL, "nameAr" TEXT NOT NULL, "nameEn" TEXT NOT NULL,
    "fieldSchema" JSONB NOT NULL, "localizedFields" JSONB NOT NULL, "assetFields" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE', "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CmsBlockSchema_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsBlockSchema_key_version_key" ON "CmsBlockSchema"("key", "version");
CREATE INDEX "CmsBlockSchema_status_key_idx" ON "CmsBlockSchema"("status", "key");

CREATE TABLE "CmsContentBlock" (
    "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "siteIdentifier" TEXT NOT NULL, "locale" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1, "updatedBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CmsContentBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsContentBlock_publicId_key" ON "CmsContentBlock"("publicId");
CREATE INDEX "CmsContentBlock_siteIdentifier_locale_status_idx" ON "CmsContentBlock"("siteIdentifier", "locale", "status");
CREATE INDEX "CmsContentBlock_schemaId_idx" ON "CmsContentBlock"("schemaId");
ALTER TABLE "CmsContentBlock" ADD CONSTRAINT "CmsContentBlock_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "CmsBlockSchema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CmsAnnouncement" (
    "id" TEXT NOT NULL, "publicId" TEXT NOT NULL, "siteIdentifier" TEXT NOT NULL, "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL, "body" TEXT NOT NULL, "urgency" TEXT NOT NULL, "audience" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1, "createdBy" TEXT NOT NULL, "approvedBy" TEXT,
    "publishedAt" TIMESTAMP(3), "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CmsAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsAnnouncement_publicId_key" ON "CmsAnnouncement"("publicId");
CREATE INDEX "CmsAnnouncement_siteIdentifier_locale_status_startsAt_expiresAt_idx" ON "CmsAnnouncement"("siteIdentifier", "locale", "status", "startsAt", "expiresAt");

CREATE TABLE "CmsScheduledJob" (
    "id" TEXT NOT NULL, "localizedContentId" TEXT NOT NULL, "jobType" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL, "failureCode" TEXT, "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsScheduledJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsScheduledJob_idempotencyKey_key" ON "CmsScheduledJob"("idempotencyKey");
CREATE INDEX "CmsScheduledJob_status_scheduledAt_idx" ON "CmsScheduledJob"("status", "scheduledAt");
CREATE INDEX "CmsScheduledJob_localizedContentId_jobType_idx" ON "CmsScheduledJob"("localizedContentId", "jobType");
