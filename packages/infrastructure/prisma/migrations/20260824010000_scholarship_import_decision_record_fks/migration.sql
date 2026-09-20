-- Prepared only.  This migration is intentionally not executed by source-only closure.
ALTER TABLE "ScholarshipImportVerificationDecision"
  ADD CONSTRAINT "ScholarshipImportVerificationDecision_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "ImportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScholarshipImportCanonicalResolutionDecision"
  ADD CONSTRAINT "ScholarshipImportCanonicalResolutionDecision_recordId_fkey"
  FOREIGN KEY ("recordId") REFERENCES "ImportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
