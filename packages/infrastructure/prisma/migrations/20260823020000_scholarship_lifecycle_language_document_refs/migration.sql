-- WP12-1/WP12-2 expand-only closure. SOURCE ONLY: do not execute during Codex review.
-- Existing records retain their identity and receive safe lifecycle defaults.

ALTER TABLE "Scholarship" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Scholarship" ADD COLUMN "publicationStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Scholarship" ADD COLUMN "studyLanguageReferenceId" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "studyLanguageSourceLabel" TEXT;
ALTER TABLE "Scholarship" ADD COLUMN "studyLanguageResolutionStatus" TEXT;

ALTER TABLE "ScholarshipRequiredDocument" ADD COLUMN "internationalTestId" TEXT;
ALTER TABLE "ScholarshipRequiredDocument" ADD COLUMN "sourceLabel" TEXT;
ALTER TABLE "ScholarshipRequiredDocument" ADD COLUMN "resolutionStatus" TEXT NOT NULL DEFAULT 'PENDING';

CREATE INDEX "Scholarship_publicationStatus_idx" ON "Scholarship"("publicationStatus");
CREATE INDEX "Scholarship_verificationStatus_idx" ON "Scholarship"("verificationStatus");
CREATE INDEX "Scholarship_studyLanguageReferenceId_idx" ON "Scholarship"("studyLanguageReferenceId");
CREATE INDEX "ScholarshipRequiredDocument_internationalTestId_idx" ON "ScholarshipRequiredDocument"("internationalTestId");
CREATE INDEX "ScholarshipRequiredDocument_resolutionStatus_idx" ON "ScholarshipRequiredDocument"("resolutionStatus");

ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_studyLanguageReferenceId_fkey"
  FOREIGN KEY ("studyLanguageReferenceId") REFERENCES "ReferenceLanguage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScholarshipRequiredDocument" ADD CONSTRAINT "ScholarshipRequiredDocument_internationalTestId_fkey"
  FOREIGN KEY ("internationalTestId") REFERENCES "InternationalTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
