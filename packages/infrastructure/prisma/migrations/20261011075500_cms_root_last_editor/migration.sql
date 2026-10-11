-- SOURCE ONLY. Never apply automatically. Rollout requires backup, schema validation,
-- reviewer approval, and a gated staging migration before the new API binary.
-- Preserve historical author identity as the least-privilege fallback for
-- existing rows; new mutations record the actual root editor.
ALTER TABLE "CmsContentNode" ADD COLUMN "lastModifiedBy" TEXT;
UPDATE "CmsContentNode" SET "lastModifiedBy" = "authorId"
WHERE "lastModifiedBy" IS NULL;
ALTER TABLE "CmsContentNode" ALTER COLUMN "lastModifiedBy" SET NOT NULL;
