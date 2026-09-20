CREATE TABLE "CmsContentNode" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "siteIdentifier" TEXT NOT NULL DEFAULT 'MANARATAK',
    "primaryLocale" TEXT NOT NULL DEFAULT 'ar',
    "contentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "categoryId" TEXT,
    "categorySlug" TEXT,
    "authorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "featuredAssetId" TEXT,
    "seoMetadata" JSONB,
    "editorialMetadata" JSONB,
    "metadata" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsContentNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsLocalizedContent" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "localizedSlug" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "readingTimeMinutes" INTEGER,
    "featuredAssetId" TEXT,
    "seoMetadata" JSONB,
    "metadata" JSONB,
    "lastModifiedBy" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsLocalizedContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "parentCategoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsTag" (
    "id" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsContentTag" (
    "localizedContentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "CmsContentTag_pkey" PRIMARY KEY ("localizedContentId", "tagId")
);

CREATE TABLE "CmsContentAttachment" (
    "id" TEXT NOT NULL,
    "localizedContentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ATTACHMENT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    CONSTRAINT "CmsContentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsWorkflowReview" (
    "id" TEXT NOT NULL,
    "localizedContentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "comments" TEXT,
    CONSTRAINT "CmsWorkflowReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsContentRevision" (
    "id" TEXT NOT NULL,
    "localizedContentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "capturedBy" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CmsContentRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsPublishedContent" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "siteIdentifier" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "categorySlug" TEXT,
    "featuredAssetId" TEXT,
    "attachmentAssetIds" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "seoMetadata" JSONB NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsPublishedContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsEditorialLedger" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "localizedContentId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CmsEditorialLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CmsContentNode_publicId_key" ON "CmsContentNode"("publicId");
CREATE UNIQUE INDEX "CmsContentNode_slug_key" ON "CmsContentNode"("slug");
CREATE INDEX "CmsContentNode_status_updatedAt_idx" ON "CmsContentNode"("status", "updatedAt");
CREATE INDEX "CmsContentNode_contentType_status_idx" ON "CmsContentNode"("contentType", "status");
CREATE INDEX "CmsContentNode_categoryId_status_idx" ON "CmsContentNode"("categoryId", "status");
CREATE INDEX "CmsContentNode_siteIdentifier_status_idx" ON "CmsContentNode"("siteIdentifier", "status");
CREATE INDEX "CmsContentNode_authorId_idx" ON "CmsContentNode"("authorId");
CREATE INDEX "CmsContentNode_ownerId_idx" ON "CmsContentNode"("ownerId");
CREATE UNIQUE INDEX "CmsLocalizedContent_contentId_locale_key" ON "CmsLocalizedContent"("contentId", "locale");
CREATE UNIQUE INDEX "CmsLocalizedContent_locale_localizedSlug_key" ON "CmsLocalizedContent"("locale", "localizedSlug");
CREATE INDEX "CmsLocalizedContent_state_scheduledAt_idx" ON "CmsLocalizedContent"("state", "scheduledAt");
CREATE INDEX "CmsLocalizedContent_contentId_state_idx" ON "CmsLocalizedContent"("contentId", "state");
CREATE UNIQUE INDEX "CmsCategory_slug_key" ON "CmsCategory"("slug");
CREATE INDEX "CmsCategory_status_idx" ON "CmsCategory"("status");
CREATE INDEX "CmsCategory_parentCategoryId_idx" ON "CmsCategory"("parentCategoryId");
CREATE UNIQUE INDEX "CmsTag_normalizedValue_key" ON "CmsTag"("normalizedValue");
CREATE INDEX "CmsContentTag_tagId_idx" ON "CmsContentTag"("tagId");
CREATE UNIQUE INDEX "CmsContentAttachment_localizedContentId_assetId_role_key" ON "CmsContentAttachment"("localizedContentId", "assetId", "role");
CREATE INDEX "CmsContentAttachment_assetId_idx" ON "CmsContentAttachment"("assetId");
CREATE INDEX "CmsWorkflowReview_localizedContentId_status_idx" ON "CmsWorkflowReview"("localizedContentId", "status");
CREATE INDEX "CmsWorkflowReview_status_requestedAt_idx" ON "CmsWorkflowReview"("status", "requestedAt");
CREATE UNIQUE INDEX "CmsContentRevision_localizedContentId_versionNumber_key" ON "CmsContentRevision"("localizedContentId", "versionNumber");
CREATE INDEX "CmsContentRevision_localizedContentId_capturedAt_idx" ON "CmsContentRevision"("localizedContentId", "capturedAt");
CREATE UNIQUE INDEX "CmsPublishedContent_contentId_locale_key" ON "CmsPublishedContent"("contentId", "locale");
CREATE UNIQUE INDEX "CmsPublishedContent_locale_slug_key" ON "CmsPublishedContent"("locale", "slug");
CREATE INDEX "CmsPublishedContent_siteIdentifier_locale_status_publishedAt_idx" ON "CmsPublishedContent"("siteIdentifier", "locale", "status", "publishedAt");
CREATE INDEX "CmsPublishedContent_contentType_locale_status_idx" ON "CmsPublishedContent"("contentType", "locale", "status");
CREATE INDEX "CmsPublishedContent_categorySlug_locale_status_idx" ON "CmsPublishedContent"("categorySlug", "locale", "status");
CREATE INDEX "CmsEditorialLedger_contentId_occurredAt_idx" ON "CmsEditorialLedger"("contentId", "occurredAt");
CREATE INDEX "CmsEditorialLedger_localizedContentId_occurredAt_idx" ON "CmsEditorialLedger"("localizedContentId", "occurredAt");
CREATE INDEX "CmsEditorialLedger_action_occurredAt_idx" ON "CmsEditorialLedger"("action", "occurredAt");

ALTER TABLE "CmsContentNode" ADD CONSTRAINT "CmsContentNode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CmsCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsLocalizedContent" ADD CONSTRAINT "CmsLocalizedContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CmsContentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsCategory" ADD CONSTRAINT "CmsCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "CmsCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CmsContentTag" ADD CONSTRAINT "CmsContentTag_localizedContentId_fkey" FOREIGN KEY ("localizedContentId") REFERENCES "CmsLocalizedContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsContentTag" ADD CONSTRAINT "CmsContentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CmsTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsContentAttachment" ADD CONSTRAINT "CmsContentAttachment_localizedContentId_fkey" FOREIGN KEY ("localizedContentId") REFERENCES "CmsLocalizedContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsWorkflowReview" ADD CONSTRAINT "CmsWorkflowReview_localizedContentId_fkey" FOREIGN KEY ("localizedContentId") REFERENCES "CmsLocalizedContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsContentRevision" ADD CONSTRAINT "CmsContentRevision_localizedContentId_fkey" FOREIGN KEY ("localizedContentId") REFERENCES "CmsLocalizedContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsPublishedContent" ADD CONSTRAINT "CmsPublishedContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CmsContentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsEditorialLedger" ADD CONSTRAINT "CmsEditorialLedger_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "CmsContentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
