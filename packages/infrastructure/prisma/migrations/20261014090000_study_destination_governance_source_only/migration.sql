-- SOURCE-ONLY expand migration. No backfill of approval; legacy profiles require independent review.
ALTER TABLE "StudyDestinationProfile" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "governance" JSONB NOT NULL DEFAULT '{}', ADD COLUMN "cityReferenceIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "StudyDestinationProfile" ADD CONSTRAINT "StudyDestinationProfile_revision_positive" CHECK ("revision" > 0);
-- Recovery: retain the columns while old readers run. Dropping governance loses review provenance; restore backup only after reviewed export.
