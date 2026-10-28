-- Apply as the owner of the four new staff tables after the staff draft migration.
-- This file intentionally changes privileges only on these new tables.
-- Reset broad default table grants before granting the minimum required access.
REVOKE ALL ON "StaffDepartmentRecord", "StaffJobTitleRecord", "StaffMembershipRecord", "StaffLifecycleEventRecord" FROM manaratak_app;
GRANT SELECT, INSERT, UPDATE ON "StaffDepartmentRecord", "StaffJobTitleRecord", "StaffMembershipRecord" TO manaratak_app;
GRANT SELECT, INSERT ON "StaffLifecycleEventRecord" TO manaratak_app;
