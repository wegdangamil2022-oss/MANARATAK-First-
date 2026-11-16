CREATE TABLE "StudyDestinationRevision" ("id" TEXT PRIMARY KEY,"profileId" TEXT NOT NULL REFERENCES "StudyDestinationProfile"(id) ON DELETE RESTRICT,"actorId" TEXT NOT NULL,"action" TEXT NOT NULL,"reason" TEXT NOT NULL,"diff" JSONB NOT NULL,"proof" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "StudyDestinationRevision_profileId_createdAt_id_idx" ON "StudyDestinationRevision"("profileId","createdAt","id");
CREATE TABLE "StudyDestinationReviewPolicy" ("id" TEXT PRIMARY KEY,"maxEvidenceAgeDays" INTEGER CHECK ("maxEvidenceAgeDays" IS NULL OR "maxEvidenceAgeDays">0),"updatedAt" TIMESTAMP(3) NOT NULL);
-- No invented review history, freshness duration or retention/backfill.
