-- Preserve the source value assessed by an administrator. This lets later
-- imports distinguish an alias-equivalent replay from a real language change.
ALTER TABLE "Course"
  ADD COLUMN "learningLanguageAdminReviewedRaw" TEXT;
