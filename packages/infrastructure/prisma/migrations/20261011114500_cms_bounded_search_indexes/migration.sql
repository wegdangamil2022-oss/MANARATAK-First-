-- MANARATAK_MIGRATION_OWNER: cms
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY: apply after backup and separately approved post-28 rollout.
-- pg_trgm extension/GIN indexes require DBA review, disk/time estimates and
-- realistic EXPLAIN validation. No statement has been executed in this review.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "CmsContentNode_site_status_updated_id" ON "CmsContentNode"("siteIdentifier", "status", "updatedAt", "id");
CREATE INDEX "CmsContentNode_title_trgm" ON "CmsContentNode" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "CmsContentNode_summary_trgm" ON "CmsContentNode" USING GIN ("summary" gin_trgm_ops);
CREATE INDEX "CmsContentNode_slug_trgm" ON "CmsContentNode" USING GIN ("slug" gin_trgm_ops);
CREATE INDEX "CmsContentNode_publicId_trgm" ON "CmsContentNode" USING GIN ("publicId" gin_trgm_ops);
CREATE INDEX "CmsLocalizedContent_title_trgm" ON "CmsLocalizedContent" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "CmsLocalizedContent_summary_trgm" ON "CmsLocalizedContent" USING GIN ("summary" gin_trgm_ops);
CREATE INDEX "CmsLocalizedContent_slug_trgm" ON "CmsLocalizedContent" USING GIN ("localizedSlug" gin_trgm_ops);
CREATE INDEX "CmsPublishedContent_title_trgm" ON "CmsPublishedContent" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "CmsPublishedContent_summary_trgm" ON "CmsPublishedContent" USING GIN ("summary" gin_trgm_ops);
CREATE INDEX "CmsPublishedContent_body_trgm" ON "CmsPublishedContent" USING GIN ("body" gin_trgm_ops);
