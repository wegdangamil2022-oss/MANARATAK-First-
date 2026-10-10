-- MANARATAK_MIGRATION_OWNER: majors
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY: not applied; historical publications require separate reviewed activation.
CREATE TABLE "NewMajorCandidateDecision" (
 "id" TEXT PRIMARY KEY, "candidateKey" TEXT NOT NULL, "sourceDigest" TEXT NOT NULL,
 "decision" TEXT NOT NULL CHECK ("decision" IN ('APPROVED','LINKED','REJECTED')),
 "actorId" TEXT NOT NULL, "reason" TEXT NOT NULL CHECK (length(btrim("reason"))>0),
 "majorId" TEXT REFERENCES "Major"("id") ON DELETE RESTRICT, "evidence" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "NewMajorCandidateDecision_candidateKey_sourceDigest_idx" ON "NewMajorCandidateDecision"("candidateKey","sourceDigest");
CREATE TABLE "MajorPublicationSnapshot" (
 "versionId" TEXT PRIMARY KEY REFERENCES "MajorVersion"("id") ON DELETE RESTRICT,
 "majorId" TEXT NOT NULL REFERENCES "Major"("id") ON DELETE RESTRICT,
 "profileId" TEXT NOT NULL REFERENCES "MajorLevelProfile"("id") ON DELETE RESTRICT,
 "payload" JSONB NOT NULL, "reviewerId" TEXT NOT NULL, "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "MajorPublicationSnapshot_majorId_profileId_idx" ON "MajorPublicationSnapshot"("majorId","profileId");
CREATE FUNCTION p10_review_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'P10_REVIEW_HISTORY_IMMUTABLE'; END $$;
CREATE TRIGGER p10_candidate_decision_immutable BEFORE UPDATE OR DELETE ON "NewMajorCandidateDecision" FOR EACH ROW EXECUTE FUNCTION p10_review_history_immutable();
CREATE TRIGGER p10_publication_immutable BEFORE UPDATE OR DELETE ON "MajorPublicationSnapshot" FOR EACH ROW EXECUTE FUNCTION p10_review_history_immutable();
