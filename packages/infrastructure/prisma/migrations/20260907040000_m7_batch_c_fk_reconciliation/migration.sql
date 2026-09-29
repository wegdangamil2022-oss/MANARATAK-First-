-- ============================================================================
-- Migration: 20260907040000_m7_batch_c_fk_reconciliation
-- Architecture Decision: ADR-028 (Database Schema Alignment & Migration Gate)
--
-- Description:
-- Final forward reconciliation of Foreign Key differences:
-- 1. Create RoleAssignmentRecord -> IdentityRecord(id) foreign key
-- 2. Create RoleAssignmentRecord -> RoleRecord(id) foreign key
-- 3. Drop stale historical InternationalTestDegreeRelationship(degreeLevelCode) foreign key
-- ============================================================================

-- SECTION 1: ADD FOREIGN KEYS (2 statements)
ALTER TABLE "RoleAssignmentRecord" ADD CONSTRAINT "RoleAssignmentRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoleAssignmentRecord" ADD CONSTRAINT "RoleAssignmentRecord_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SECTION 2: DROP STALE FOREIGN KEY CONSTRAINT (1 statement)
ALTER TABLE "InternationalTestDegreeRelationship" DROP CONSTRAINT "InternationalTestDegreeRelationship_degreeLevelCode_fkey";
