-- PROPOSAL ONLY: outside Prisma migrations; do not execute before schema review
-- and R04/R05 gates. No cleanup or historical migration edits authorized.
-- First run the read-only duplicate audit; any result blocks this proposal.
-- Preserve current all-status identity semantics, including NULL keys.
-- PostgreSQL 16: https://www.postgresql.org/docs/16/ddl-constraints.html
CREATE UNIQUE INDEX "UniversityProgramAdmissionRequirement_null_identity_key"
ON "UniversityProgramAdmissionRequirement"
("academicProgramId", "internationalTestId", "testVariantId", "testVersionId")
NULLS NOT DISTINCT;
-- A reviewed migration must address Prisma 5.22 schema-diff compatibility
-- and replacement of the redundant old index. Neither is executed here.
