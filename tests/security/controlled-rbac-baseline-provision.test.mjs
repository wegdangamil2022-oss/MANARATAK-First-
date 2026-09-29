import test from "node:test";
import assert from "node:assert/strict";
import { validateRbacBaselineRequest } from "../../scripts/rbac-baseline-provision.mjs";
import {
  ControlledRbacBaselineProvisioner,
  CANONICAL_STUDENT_ROLE,
  CANONICAL_ADMINISTRATOR_ROLE,
  RBAC_BASELINE_AUDIT_REFERENCE,
} from "../../packages/infrastructure/dist/authorization/ControlledRbacBaselineProvisioner.js";

test("A. mutation gate blocks execution before DB client construction", () => {
  assert.throws(
    () => validateRbacBaselineRequest({}),
    /DATABASE_MUTATION_BLOCKED/
  );
});

test("J. actorId == approverId is rejected", () => {
  const env = {
    DATABASE_PROVISIONING_GATE: "APPROVED",
    ALLOW_DATABASE_MUTATIONS: "YES",
    DATABASE_MUTATION_ENVIRONMENT: "development",
    NODE_ENV: "development",
    DATABASE_MUTATION_PURPOSE: "provision",
    DATABASE_URL: "postgresql://postgres:pass@localhost:5432/test_db",
    DATABASE_MUTATION_TARGET: "localhost:5432/test_db",
    RBAC_BASELINE_CONFIRM: "PROVISION_CANONICAL_RBAC_BASELINE",
    RBAC_BASELINE_ACTOR_ID: "operator-1",
    RBAC_BASELINE_APPROVER_ID: "operator-1",
    RBAC_BASELINE_CHANGE_ID: "CHANGE-12345",
  };
  assert.throws(
    () => validateRbacBaselineRequest(env),
    /RBAC_BASELINE_APPROVAL_REQUIRED.*distinct/
  );
});

test("K. missing explicit confirmation is rejected", () => {
  const env = {
    DATABASE_PROVISIONING_GATE: "APPROVED",
    ALLOW_DATABASE_MUTATIONS: "YES",
    DATABASE_MUTATION_ENVIRONMENT: "development",
    NODE_ENV: "development",
    DATABASE_MUTATION_PURPOSE: "provision",
    DATABASE_URL: "postgresql://postgres:pass@localhost:5432/test_db",
    DATABASE_MUTATION_TARGET: "localhost:5432/test_db",
    RBAC_BASELINE_CONFIRM: "WRONG_CONFIRMATION",
    RBAC_BASELINE_ACTOR_ID: "operator-1",
    RBAC_BASELINE_APPROVER_ID: "operator-2",
    RBAC_BASELINE_CHANGE_ID: "CHANGE-12345",
  };
  assert.throws(
    () => validateRbacBaselineRequest(env),
    /RBAC_BASELINE_EXPLICIT_CONFIRMATION_REQUIRED/
  );
});

test("L. production mutation gate requires production change ID and approval", () => {
  const env = {
    DATABASE_PROVISIONING_GATE: "APPROVED",
    ALLOW_DATABASE_MUTATIONS: "YES",
    DATABASE_MUTATION_ENVIRONMENT: "production",
    NODE_ENV: "production",
    DATABASE_MUTATION_PURPOSE: "provision",
    DATABASE_URL: "postgresql://postgres:pass@db.prod.internal:5432/prod_db",
    DATABASE_MUTATION_TARGET: "db.prod.internal:5432/prod_db",
    RBAC_BASELINE_CONFIRM: "PROVISION_CANONICAL_RBAC_BASELINE",
    RBAC_BASELINE_ACTOR_ID: "operator-1",
    RBAC_BASELINE_APPROVER_ID: "operator-2",
    RBAC_BASELINE_CHANGE_ID: "CHANGE-12345",
  };
  assert.throws(
    () => validateRbacBaselineRequest(env),
    /DATABASE_MUTATION_BLOCKED.*ALLOW_PRODUCTION_DATABASE_MUTATIONS/
  );
});

function createMockPrisma({ existingRoles = [], existingAudit = null } = {}) {
  const createdRoles = [];
  const createdAudits = [];
  const otherCreations = { identities: [], users: [], credentials: [], accounts: [], roleAssignments: [] };
  let isolationUsed = null;

  const tx = {
    roleRecord: {
      findMany: async () => existingRoles,
      create: async ({ data }) => {
        createdRoles.push(data);
        return data;
      },
    },
    auditRecord: {
      findUnique: async () => existingAudit,
      create: async ({ data }) => {
        createdAudits.push(data);
        return data;
      },
    },
    identityRecord: {
      create: async ({ data }) => otherCreations.identities.push(data),
    },
    userRecord: {
      create: async ({ data }) => otherCreations.users.push(data),
    },
    credentialRecord: {
      create: async ({ data }) => otherCreations.credentials.push(data),
    },
    accountRecord: {
      create: async ({ data }) => otherCreations.accounts.push(data),
    },
    roleAssignmentRecord: {
      create: async ({ data }) => otherCreations.roleAssignments.push(data),
    },
  };

  const mockPrisma = {
    $transaction: async (fn, options) => {
      isolationUsed = options?.isolationLevel;
      return await fn(tx);
    },
  };

  return {
    mockPrisma,
    createdRoles,
    createdAudits,
    otherCreations,
    getIsolationUsed: () => isolationUsed,
  };
}

test("B, C, G, H, I. student + administrator roles created with Serializable isolation, audit recorded, no identities/assignments", async () => {
  const harness = createMockPrisma({ existingRoles: [] });
  const provisioner = new ControlledRbacBaselineProvisioner(harness.mockPrisma);

  const result = await provisioner.execute({
    actorId: "operator-1",
    approverId: "approver-1",
    changeId: "CHG-998877",
  });

  assert.deepEqual(result.provisionedRoleIds, ["student", "administrator"]);
  assert.equal(harness.createdRoles.length, 2);
  assert.equal(harness.createdRoles[0].id, "student");
  assert.deepEqual(harness.createdRoles[0].permissions, []);
  assert.equal(harness.createdRoles[1].id, "administrator");
  assert.deepEqual(harness.createdRoles[1].permissions, ["admin:*"]);

  assert.equal(harness.getIsolationUsed(), "Serializable");

  assert.equal(harness.otherCreations.identities.length, 0);
  assert.equal(harness.otherCreations.users.length, 0);
  assert.equal(harness.otherCreations.credentials.length, 0);
  assert.equal(harness.otherCreations.accounts.length, 0);
  assert.equal(harness.otherCreations.roleAssignments.length, 0);

  assert.equal(harness.createdAudits.length, 1);
  assert.equal(harness.createdAudits[0].reference, RBAC_BASELINE_AUDIT_REFERENCE);
  assert.equal(harness.createdAudits[0].category, "AUTHORIZATION");
  assert.equal(harness.createdAudits[0].severity, "CRITICAL");
});

test("D. exact canonical existing roles produce safe idempotent no-op", async () => {
  const existingRoles = [
    { ...CANONICAL_STUDENT_ROLE },
    { ...CANONICAL_ADMINISTRATOR_ROLE },
  ];
  const harness = createMockPrisma({ existingRoles, existingAudit: { reference: RBAC_BASELINE_AUDIT_REFERENCE } });
  const provisioner = new ControlledRbacBaselineProvisioner(harness.mockPrisma);

  const result = await provisioner.execute({
    actorId: "operator-1",
    approverId: "approver-1",
    changeId: "CHG-998877",
  });

  assert.deepEqual(result.provisionedRoleIds, []);
  assert.deepEqual(result.existingRoleIds, ["student", "administrator"]);
  assert.equal(harness.createdRoles.length, 0);
  assert.equal(harness.createdAudits.length, 0);
  assert.equal(result.auditRecorded, false);
});

test("E. existing student role with conflicting configuration fails closed", async () => {
  const conflictingStudent = {
    id: "student",
    name: "Different Student Name",
    description: "Modified description",
    permissions: ["some:permission"],
    policyIds: [],
  };
  const harness = createMockPrisma({ existingRoles: [conflictingStudent] });
  const provisioner = new ControlledRbacBaselineProvisioner(harness.mockPrisma);

  await assert.rejects(
    provisioner.execute({
      actorId: "operator-1",
      approverId: "approver-1",
      changeId: "CHG-998877",
    }),
    /RBAC_BASELINE_CONFLICT.*student/
  );
  assert.equal(harness.createdRoles.length, 0);
});

test("F. existing administrator role with conflicting permissions fails closed", async () => {
  const conflictingAdmin = {
    id: "administrator",
    name: "Administrator",
    description: "Full administrative authority",
    permissions: ["admin:courses:read"],
    policyIds: [],
  };
  const harness = createMockPrisma({ existingRoles: [conflictingAdmin] });
  const provisioner = new ControlledRbacBaselineProvisioner(harness.mockPrisma);

  await assert.rejects(
    provisioner.execute({
      actorId: "operator-1",
      approverId: "approver-1",
      changeId: "CHG-998877",
    }),
    /RBAC_BASELINE_CONFLICT.*administrator/
  );
  assert.equal(harness.createdRoles.length, 0);
});

test("M. solo owner authorization accepted in validateRbacBaselineRequest", () => {
  const env = {
    DATABASE_PROVISIONING_GATE: "APPROVED",
    ALLOW_DATABASE_MUTATIONS: "YES",
    DATABASE_MUTATION_ENVIRONMENT: "development",
    NODE_ENV: "development",
    DATABASE_MUTATION_PURPOSE: "provision",
    DATABASE_URL: "postgresql://postgres:pass@localhost:5432/test_db",
    DATABASE_MUTATION_TARGET: "localhost:5432/test_db",
    RBAC_BASELINE_CONFIRM: "PROVISION_CANONICAL_RBAC_BASELINE",
    PROJECT_OWNER_POLICY: "SOLO_OWNER",
    RBAC_BASELINE_OWNER_ID: "owner-real-id",
    RBAC_BASELINE_CHANGE_ID: "CHANGE-12345",
  };
  const validated = validateRbacBaselineRequest(env);
  assert.equal(validated.approvalPolicy, "SOLO_OWNER");
  assert.equal(validated.ownerId, "owner-real-id");
  assert.equal(validated.actorId, "owner-real-id");
  assert.equal(validated.approverId, "owner-real-id");
});

test("N. missing owner in solo owner policy is rejected", () => {
  const env = {
    DATABASE_PROVISIONING_GATE: "APPROVED",
    ALLOW_DATABASE_MUTATIONS: "YES",
    DATABASE_MUTATION_ENVIRONMENT: "development",
    NODE_ENV: "development",
    DATABASE_MUTATION_PURPOSE: "provision",
    DATABASE_URL: "postgresql://postgres:pass@localhost:5432/test_db",
    DATABASE_MUTATION_TARGET: "localhost:5432/test_db",
    RBAC_BASELINE_CONFIRM: "PROVISION_CANONICAL_RBAC_BASELINE",
    PROJECT_OWNER_POLICY: "SOLO_OWNER",
    RBAC_BASELINE_OWNER_ID: "",
    RBAC_BASELINE_ACTOR_ID: "",
    RBAC_BASELINE_CHANGE_ID: "CHANGE-12345",
  };
  assert.throws(
    () => validateRbacBaselineRequest(env),
    /RBAC_BASELINE_APPROVAL_REQUIRED.*solo owner/
  );
});

test("O. provisioner executes under solo owner policy and records PROJECT_OWNER audit", async () => {
  const harness = createMockPrisma();
  const provisioner = new ControlledRbacBaselineProvisioner(harness.mockPrisma);

  const result = await provisioner.execute({
    ownerId: "sole-proprietor-owner",
    changeId: "CHANGE-SOLO-001",
    approvalPolicy: "SOLO_OWNER",
  });

  assert.deepEqual(result.provisionedRoleIds, ["student", "administrator"]);
  assert.equal(result.auditRecorded, true);
  assert.equal(harness.createdAudits.length, 1);
  assert.equal(harness.createdAudits[0].actorType, "PROJECT_OWNER");
  assert.equal(harness.createdAudits[0].actorId, "sole-proprietor-owner");
  assert.equal(harness.createdAudits[0].contextMetadata.approvalPolicy, "SOLO_OWNER");
  assert.equal(harness.createdAudits[0].contextMetadata.ownerId, "sole-proprietor-owner");
});

