ALTER TABLE "StudyDestinationProfile" ADD COLUMN "lastEditedBy" TEXT;
ALTER TABLE "StudyDestinationProfile" ADD COLUMN "sourceReviewProof" JSONB;
-- No verification backfill: legacy unproven records require real independent review.
