-- SOURCE-ONLY DRAFT. Do not apply until the MANARATAK runtime/database gate is opened.
-- Adds CMS-to-domain editorial references without copying or mutating canonical domain records.
CREATE TABLE "CmsContentDomainLink" (
  "id" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL DEFAULT 'RELATED',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CmsContentDomainLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CmsContentDomainLink_targetType_check" CHECK ("targetType" IN ('UNIVERSITY','ACADEMIC_PROGRAM','SCHOLARSHIP','MAJOR','INTERNATIONAL_TEST','COURSE','REFERENCE_COUNTRY')),
  CONSTRAINT "CmsContentDomainLink_relationType_check" CHECK ("relationType" IN ('RELATED','FEATURED','GUIDE','APPLICATION','REQUIREMENTS','ELIGIBILITY')),
  CONSTRAINT "CmsContentDomainLink_targetId_uuid_check" CHECK ("targetId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
);
CREATE UNIQUE INDEX "CmsContentDomainLink_contentId_targetType_targetId_relationType_key"
  ON "CmsContentDomainLink"("contentId", "targetType", "targetId", "relationType");
CREATE INDEX "CmsContentDomainLink_targetType_targetId_sortOrder_idx"
  ON "CmsContentDomainLink"("targetType", "targetId", "sortOrder");
CREATE INDEX "CmsContentDomainLink_contentId_sortOrder_idx"
  ON "CmsContentDomainLink"("contentId", "sortOrder");
ALTER TABLE "CmsContentDomainLink"
  ADD CONSTRAINT "CmsContentDomainLink_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "CmsContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
