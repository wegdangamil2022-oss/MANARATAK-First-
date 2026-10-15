BEGIN;
-- Source only. Legacy trackers retain history and cannot be adopted into a new cycle implicitly.
ALTER TABLE "StudentApplicationTracker" ADD COLUMN "cycleReferenceId" TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "StudentApplicationTracker" ADD COLUMN "ownerSnapshot" JSONB;
UPDATE "StudentApplicationTracker" SET "ownerSnapshot"=jsonb_build_object('ownerId',"scholarshipId",'cycleId',NULL,'cycleKey','LEGACY','deadlineAt',"deadlineAt",'scholarshipSlug',"scholarshipSlug",'capturedAt',CURRENT_TIMESTAMP,'provenance','LEGACY_STORED_FACTS');
DROP INDEX "StudentApplicationTracker_studentReferenceId_scholarshipId_key";
CREATE UNIQUE INDEX "StudentTracker_student_scholarship_cycle_key" ON "StudentApplicationTracker"("studentReferenceId", "scholarshipId", "cycleReferenceId");

CREATE TABLE "StudentApplicationDocumentBinding" (
 "id" TEXT NOT NULL PRIMARY KEY, "trackerId" TEXT NOT NULL, "requirementId" TEXT NOT NULL,
 "assetId" TEXT NOT NULL, "ownerVersionId" TEXT NOT NULL, "requirementSnapshot" JSONB NOT NULL,
 "consentGrantedAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3), "retentionUntil" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StudentApplicationDocumentBinding_trackerId_fkey" FOREIGN KEY("trackerId") REFERENCES "StudentApplicationTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StudentApplicationDocumentBinding_trackerId_requirementId_key" ON "StudentApplicationDocumentBinding"("trackerId","requirementId");
CREATE INDEX "StudentApplicationDocumentBinding_retentionUntil_idx" ON "StudentApplicationDocumentBinding"("retentionUntil");

COMMIT;
