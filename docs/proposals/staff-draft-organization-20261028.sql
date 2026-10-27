-- PROPOSAL ONLY. Not applied to the original database. Review and approve separately.
-- This proposal supports drafts/organization only. It is insufficient for invitations,
-- activation, role-grant provenance or an admin-only offboarding access fence.
BEGIN;
-- CreateTable
CREATE TABLE "StaffDepartmentRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffDepartmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffJobTitleRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "departmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffJobTitleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMembershipRecord" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "identityId" TEXT,
    "draftName" TEXT,
    "draftEmail" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "departmentId" TEXT,
    "jobTitleId" TEXT,
    "managerId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMembershipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLifecycleEventRecord" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffLifecycleEventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffDepartmentRecord_status_name_id_idx" ON "StaffDepartmentRecord"("status", "name", "id");

-- CreateIndex
CREATE INDEX "StaffJobTitleRecord_departmentId_status_id_idx" ON "StaffJobTitleRecord"("departmentId", "status", "id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMembershipRecord_publicId_key" ON "StaffMembershipRecord"("publicId");

-- CreateIndex
CREATE INDEX "StaffMembershipRecord_status_departmentId_id_idx" ON "StaffMembershipRecord"("status", "departmentId", "id");

-- CreateIndex
CREATE INDEX "StaffMembershipRecord_identityId_status_idx" ON "StaffMembershipRecord"("identityId", "status");

-- CreateIndex
CREATE INDEX "StaffMembershipRecord_endsAt_status_idx" ON "StaffMembershipRecord"("endsAt", "status");

-- CreateIndex
CREATE INDEX "StaffLifecycleEventRecord_membershipId_createdAt_id_idx" ON "StaffLifecycleEventRecord"("membershipId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "StaffDepartmentRecord" ADD CONSTRAINT "StaffDepartmentRecord_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StaffDepartmentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffJobTitleRecord" ADD CONSTRAINT "StaffJobTitleRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "StaffDepartmentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembershipRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembershipRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "StaffDepartmentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembershipRecord_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "StaffJobTitleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembershipRecord_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "StaffMembershipRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLifecycleEventRecord" ADD CONSTRAINT "StaffLifecycleEventRecord_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "StaffMembershipRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One open employment relationship per linked identity. Old/unknown role assignments
-- are never guessed, adopted, deleted or backfilled by this proposal.
CREATE UNIQUE INDEX "StaffMembership_open_identity_key" ON "StaffMembershipRecord"("identityId")
WHERE "identityId" IS NOT NULL AND "status" NOT IN ('CANCELLED','ENDED');
CREATE UNIQUE INDEX "StaffMembership_open_draft_email_key" ON "StaffMembershipRecord"(lower("draftEmail"))
WHERE "identityId" IS NULL AND "status"='DRAFT';
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembership_draft_source_check" CHECK
 (("identityId" IS NOT NULL AND "draftName" IS NULL AND "draftEmail" IS NULL)
 OR ("identityId" IS NULL AND "draftName" IS NOT NULL AND "draftEmail" IS NOT NULL AND length(trim("draftName"))>0 AND length(trim("draftEmail"))>0));
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembership_dates_check" CHECK
 ("endsAt" IS NULL OR ("startsAt" IS NOT NULL AND "endsAt">"startsAt"));
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembership_manager_check" CHECK ("managerId" IS NULL OR "managerId"<>"id");
ALTER TABLE "StaffMembershipRecord" ADD CONSTRAINT "StaffMembership_kind_check" CHECK ("kind" IN ('EMPLOYEE','CONTRACTOR','VOLUNTEER','SERVICE'));
ALTER TABLE "StaffDepartmentRecord" ADD CONSTRAINT "StaffDepartment_parent_check" CHECK ("parentId" IS NULL OR "parentId"<>"id");
-- Proposed least-privilege grants for this project's existing application role.
-- Review the role name before separately approving this entire proposal.
GRANT SELECT, INSERT, UPDATE ON "StaffDepartmentRecord","StaffJobTitleRecord","StaffMembershipRecord" TO manaratak_app;
GRANT SELECT, INSERT ON "StaffLifecycleEventRecord" TO manaratak_app;
-- No DDL, TRUNCATE, DELETE or lifecycle-event UPDATE is granted to the application.
COMMIT;
