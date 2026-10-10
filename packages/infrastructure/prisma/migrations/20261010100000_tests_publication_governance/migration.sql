-- MANARATAK_MIGRATION_OWNER: tests
-- MANARATAK_MIGRATION_SCOPE: owner_only
-- MANARATAK_ARCH_DECISION: ADR-028
-- SOURCE ONLY: unapplied.
CREATE TABLE "InternationalTestGovernance" (
 "testId" TEXT PRIMARY KEY REFERENCES "InternationalTest"("id") ON DELETE RESTRICT,
 "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0), "approval" JSONB, "verification" JSONB
);
CREATE TABLE "InternationalTestPublicationSnapshot" (
 "id" TEXT PRIMARY KEY REFERENCES "InternationalTestVersion"("id") ON DELETE RESTRICT,
 "testId" TEXT NOT NULL REFERENCES "InternationalTest"("id") ON DELETE RESTRICT,
 "candidateHash" TEXT NOT NULL, "payload" JSONB NOT NULL, "reviewerId" TEXT NOT NULL,
 "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InternationalTestPublicationSnapshot_testId_publishedAt_idx" ON "InternationalTestPublicationSnapshot"("testId","publishedAt");
CREATE TABLE "InternationalTestEvidenceHistory" (
 "id" TEXT PRIMARY KEY, "testId" TEXT NOT NULL REFERENCES "InternationalTest"("id") ON DELETE RESTRICT,
 "payload" JSONB NOT NULL, "actorId" TEXT NOT NULL, "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "InternationalTestEvidenceHistory_testId_capturedAt_idx" ON "InternationalTestEvidenceHistory"("testId","capturedAt");
-- Publication/evidence history is insert-only; root visibility/pointer is independently mutable.
CREATE FUNCTION p9_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'P9_HISTORY_IMMUTABLE'; END $$;
CREATE TRIGGER p9_publication_immutable BEFORE UPDATE OR DELETE ON "InternationalTestPublicationSnapshot" FOR EACH ROW EXECUTE FUNCTION p9_history_immutable();
CREATE TRIGGER p9_evidence_immutable BEFORE UPDATE OR DELETE ON "InternationalTestEvidenceHistory" FOR EACH ROW EXECUTE FUNCTION p9_history_immutable();
