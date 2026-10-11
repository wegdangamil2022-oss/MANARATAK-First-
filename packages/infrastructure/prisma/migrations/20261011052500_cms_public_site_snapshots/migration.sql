-- SOURCE-ONLY; never run against a real DB until Post-28 approval/backups.
-- Read path retains legacy published rows until each has a stored snapshot.
CREATE TABLE "CmsSitePublishedSnapshot" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "siteIdentifier" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsSitePublishedSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsSitePublishedSnapshot_kind_sourceId_key"
  ON "CmsSitePublishedSnapshot"("kind", "sourceId");
CREATE INDEX "CmsSitePublishedSnapshot_kind_siteIdentifier_locale_idx"
  ON "CmsSitePublishedSnapshot"("kind", "siteIdentifier", "locale");
