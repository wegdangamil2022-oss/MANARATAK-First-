-- ABSHEER_MIGRATION_OWNER: cms
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- SOURCE ONLY. Apply only through separately approved post-28 migration rollout.
-- Prefer the real effective root editor recorded in the editorial ledger.
-- Primary-localization title/summary writes also modify root presentation.
-- Historical author is only the fallback when no qualifying editor is recorded.
ALTER TABLE "CmsContentNode" ADD COLUMN "lastModifiedBy" TEXT;
UPDATE "CmsContentNode" AS c
SET "lastModifiedBy" = COALESCE((
  SELECT l."actorId" FROM "CmsEditorialLedger" AS l
  WHERE l."contentId" = c."id"
    AND (l."action" IN ('CONTENT_UPDATED', 'DOMAIN_LINKS_REPLACED')
      OR (l."action" = 'LOCALIZATION_SAVED' AND l."payload"->>'locale' = c."primaryLocale"))
  ORDER BY l."occurredAt" DESC, l."id" DESC
  LIMIT 1
), c."authorId")
WHERE c."lastModifiedBy" IS NULL;
ALTER TABLE "CmsContentNode" ALTER COLUMN "lastModifiedBy" SET NOT NULL;
