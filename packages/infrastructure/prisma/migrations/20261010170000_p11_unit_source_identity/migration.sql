-- SOURCE ONLY: apply later through the approved greenfield DB migration procedure.
-- Before applying, review potential duplicate (universityId, sourceReferenceId) pairs.
CREATE UNIQUE INDEX IF NOT EXISTS "UniversityOrganizationUnit_universityId_sourceReferenceId_key"
  ON "UniversityOrganizationUnit" ("universityId", "sourceReferenceId");
