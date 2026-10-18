-- DESIGN PROPOSAL ONLY. NOT A MIGRATION. NOT APPLIED.
-- Requires schema design review and R04/R05 gates. Do not backfill from study
-- country, nationality, university country or arbitrary sponsor metadata.
-- A reviewed implementation must add Prisma relations, owner source validation,
-- CAS/audit/outbox and API/import/public filters before acceptance.
ALTER TABLE "ScholarshipSponsorContext"
  ADD COLUMN "fundingCountryReferenceId" TEXT,
  ADD COLUMN "fundingCountryEvidenceKey" TEXT,
  ADD CONSTRAINT "ScholarshipSponsorContext_funding_country_fkey"
    FOREIGN KEY ("fundingCountryReferenceId") REFERENCES "ReferenceCountry"(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ScholarshipSponsorContext_funding_evidence_fkey"
    FOREIGN KEY ("scholarshipId", "fundingCountryEvidenceKey")
    REFERENCES "ScholarshipSourceEvidence"("scholarshipId", "evidenceKey")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ScholarshipSponsorContext_funding_country_evidence_pair"
    CHECK (("fundingCountryReferenceId" IS NULL) = ("fundingCountryEvidenceKey" IS NULL));
-- This FK proves same-owner provenance identity, not that evidence is official,
-- current or reviewed; those checks remain owner-command responsibilities.
