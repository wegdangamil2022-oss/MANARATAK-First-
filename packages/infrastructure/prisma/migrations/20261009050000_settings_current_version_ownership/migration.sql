-- SOURCE-ONLY PLAN. Do not execute against a target DB in this remediation round.
-- Prisma cannot represent deferred FK timing: never replace this with generated
-- immediate-FK DDL. The writer inserts the assignment before its first version.
-- No data repair, delete, pointer rewrite, seed, reset or validation is performed.
CREATE UNIQUE INDEX "SettingAssignmentRecord_id_currentVersionId_key"
  ON "SettingAssignmentRecord"("id", "currentVersionId");
CREATE UNIQUE INDEX "SettingVersionRecord_assignmentId_id_key"
  ON "SettingVersionRecord"("assignmentId", "id");
ALTER TABLE "SettingAssignmentRecord"
  ADD CONSTRAINT "SettingAssignmentRecord_id_currentVersionId_fkey"
  FOREIGN KEY ("id", "currentVersionId")
  REFERENCES "SettingVersionRecord"("assignmentId", "id")
  ON DELETE NO ACTION ON UPDATE NO ACTION
  DEFERRABLE INITIALLY DEFERRED NOT VALID;
-- NOT VALID preserves the explicit legacy-data verification dependency.
-- It still enforces new/changed FK values at commit after both rows exist.
-- VALIDATE CONSTRAINT is deliberately absent; assess existing anomalies first.
