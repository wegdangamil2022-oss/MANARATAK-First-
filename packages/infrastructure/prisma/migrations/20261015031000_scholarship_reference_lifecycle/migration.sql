-- ABSHEER_MIGRATION_OWNER: scholarships
-- ABSHEER_MIGRATION_SCOPE: owner_only
-- ABSHEER_ARCH_DECISION: ADR-028
-- Source only; not applied. Retirement replaces physical deletion, preserving immutable owner identities.
BEGIN;
CREATE TABLE "ScholarshipReferenceTransition" (
 "id" TEXT PRIMARY KEY, "sourceOwnerId" TEXT NOT NULL, "sourcePublicId" TEXT NOT NULL, "sourceSlug" TEXT NOT NULL, "sourceRevision" INTEGER NOT NULL CHECK ("sourceRevision">0),
 "targetOwnerId" TEXT, "targetRevision" INTEGER, "changeType" TEXT NOT NULL CHECK ("changeType" IN ('MERGE','TOMBSTONE','RESTORE')),
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','SUPERSEDED')), "proposedBy" TEXT NOT NULL, "reviewedBy" TEXT, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewedAt" TIMESTAMP(3),
 CHECK (("changeType"='MERGE' AND "targetOwnerId" IS NOT NULL AND "targetRevision">0 AND "targetOwnerId"<>"sourceOwnerId") OR ("changeType"<>'MERGE' AND "targetOwnerId" IS NULL AND "targetRevision" IS NULL)),
 CHECK ("status"<>'APPROVED' OR ("reviewedBy" IS NOT NULL AND "reviewedBy"<>"proposedBy" AND "reviewedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "ScholarshipReference_source_revision_key" ON "ScholarshipReferenceTransition"("sourceOwnerId","sourceRevision");
CREATE INDEX "ScholarshipReference_source_revision_idx" ON "ScholarshipReferenceTransition"("sourceOwnerId","status","sourceRevision");
CREATE INDEX "ScholarshipReference_source_slug_idx" ON "ScholarshipReferenceTransition"("sourceSlug","status");
CREATE FUNCTION absheer_preserve_scholarship_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SCHOLARSHIP_IMMUTABLE_REFERENCE_ARCHIVE_REQUIRED' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER "scholarship_identity_no_delete" BEFORE DELETE ON "Scholarship" FOR EACH ROW EXECUTE FUNCTION absheer_preserve_scholarship_identity();
CREATE FUNCTION absheer_preserve_scholarship_reference_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."status"='APPROVED' THEN RAISE EXCEPTION 'SCHOLARSHIP_REFERENCE_HISTORY_IMMUTABLE' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "scholarship_reference_history_immutable" BEFORE UPDATE OR DELETE ON "ScholarshipReferenceTransition" FOR EACH ROW EXECUTE FUNCTION absheer_preserve_scholarship_reference_history();
COMMIT;
