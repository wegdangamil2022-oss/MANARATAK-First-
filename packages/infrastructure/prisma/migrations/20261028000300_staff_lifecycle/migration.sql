-- Additive lifecycle storage; never backfill identities, privileges, staff or credentials.
-- Apply only after the reviewed operator decision. Draft storage alone remains valid.
CREATE TABLE "StaffInvitationRecord" (
 "id" TEXT PRIMARY KEY,"membershipId" TEXT NOT NULL REFERENCES "StaffMembershipRecord"("id") ON DELETE RESTRICT,
 "memberVersion" INTEGER NOT NULL CHECK ("memberVersion">0),"identityId" TEXT REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,
 "email" TEXT NOT NULL,"tokenHash" TEXT NOT NULL UNIQUE CHECK ("tokenHash" ~ '^[a-f0-9]{64}$'),
 "issuedBy" TEXT NOT NULL REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,
 "commandHash" TEXT NOT NULL CHECK ("commandHash" ~ '^[a-f0-9]{64}$'),
 "expiresAt" TIMESTAMP(3) NOT NULL,"acceptedAt" TIMESTAMP(3),"acceptedBy" TEXT REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,
 "revokedAt" TIMESTAMP(3),"version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (("acceptedAt" IS NULL)=("acceptedBy" IS NULL)),CHECK ("expiresAt">"createdAt")
);
CREATE INDEX "StaffInvitation_membership_idx" ON "StaffInvitationRecord"("membershipId","createdAt","id");
CREATE TABLE "StaffChangeRequestRecord" (
 "id" TEXT PRIMARY KEY,"membershipId" TEXT NOT NULL REFERENCES "StaffMembershipRecord"("id") ON DELETE RESTRICT,
 "memberVersion" INTEGER NOT NULL CHECK ("memberVersion">0),"action" TEXT NOT NULL CHECK ("action" IN ('ACTIVATE','SUSPEND','RESUME','OFFBOARD','TRANSFER')),
 "payload" JSONB NOT NULL,"snapshotHash" TEXT NOT NULL CHECK ("snapshotHash" ~ '^[a-f0-9]{64}$'),"reason" TEXT NOT NULL CHECK(length(trim("reason"))>=3),
 "requestedBy" TEXT NOT NULL REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,"approvedBy" TEXT REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,
 "approvedAt" TIMESTAMP(3),"usedAt" TIMESTAMP(3),"expiresAt" TIMESTAMP(3) NOT NULL,"version" INTEGER NOT NULL DEFAULT 1 CHECK ("version">0),
 CHECK ("approvedBy" IS NULL OR "approvedBy"<>"requestedBy"),CHECK (("approvedAt" IS NULL)=("approvedBy" IS NULL)),CHECK ("usedAt" IS NULL OR "approvedAt" IS NOT NULL)
);
CREATE INDEX "StaffChange_requested_idx" ON "StaffChangeRequestRecord"("requestedBy","id");
CREATE INDEX "StaffChange_membership_idx" ON "StaffChangeRequestRecord"("membershipId","id");
CREATE TABLE "StaffAdminAccessRecord" (
 "identityId" TEXT PRIMARY KEY REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,
 "membershipId" TEXT NOT NULL REFERENCES "StaffMembershipRecord"("id") ON DELETE RESTRICT,
 "allowed" BOOLEAN NOT NULL,"version" INTEGER NOT NULL DEFAULT 1 CHECK("version">0),"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "StaffGrantSourceRecord" (
 -- Retain provenance after the canonical assignment is revoked; no FK to the deletable assignment.
 "assignmentId" TEXT PRIMARY KEY,"membershipId" TEXT NOT NULL REFERENCES "StaffMembershipRecord"("id") ON DELETE RESTRICT,
 "identityId" TEXT NOT NULL REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT,"roleId" TEXT NOT NULL,
 "assignedAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3)
);
CREATE INDEX "StaffGrant_membership_idx" ON "StaffGrantSourceRecord"("membershipId","revokedAt");
-- No permissions or account rows are changed. Deployment grants are a separate reviewed step.
