import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { AssignRoleUseCase, StudentWorkspaceOutboxDeliveryGateway, RegisterUserUseCase } from '@manaratak/application';
import { InMemoryRoleAssignmentRepository, PrismaStudentWorkspaceRepository } from '@manaratak/infrastructure';
import { createStudentRoleGuard } from '../../apps/api/dist/presentation/security/StudentRoleGuard.js';
import { ControlledFirstAdminBootstrap } from '../../packages/infrastructure/dist/authorization/ControlledFirstAdminBootstrap.js';
import { validateFirstAdminRequest } from '../../scripts/first-admin-bootstrap.mjs';

for (const [role, expected] of [['student', 200], ['admin', 403], ['staff', 403], [null, 401]]) {
  test(`student guard: ${role ?? 'anonymous'}`, async () => {
    const app = express();
    app.use((req, _res, next) => { if (role) req.authUserId = 'principal'; next(); });
    app.use(createStudentRoleGuard({ findByIdentityId: async () => [{ roleId: role }] }));
    app.get('/', (_req, res) => res.sendStatus(200));
    assert.equal((await request(app).get('/')).status, expected);
  });
}

test('assignment validates owners, is idempotent, immutable and can be revoked', async () => {
  const assignments = new InMemoryRoleAssignmentRepository();
  const identities = { findById: async id => id === 'student' ? {} : null };
  const roles = { findById: async id => id === 'student' ? {} : null };
  const operation = new AssignRoleUseCase(assignments, undefined, identities, roles);
  await assert.rejects(operation.execute({ id: 'a', identityId: 'missing', roleId: 'student' }), /IDENTITY_NOT_FOUND/);
  await assert.rejects(operation.execute({ id: 'a', identityId: 'student', roleId: 'missing' }), /ROLE_NOT_FOUND/);
  await operation.execute({ id: 'a', identityId: 'student', roleId: 'student' });
  await operation.execute({ id: 'b', identityId: 'student', roleId: 'student' });
  assert.equal((await assignments.listAll()).length, 1);
  await operation.revokeAssignment('a');
  assert.equal((await assignments.listAll()).length, 0);
});

function workspaceHarness(role = 'student', status = 'ACTIVE') {
  let workspace; let creates = 0; const inbox = new Set();
  const noop = { create: async () => ({}) };
  const tx = {
    studentWorkspaceEventInbox: { findUnique: async ({ where }) => inbox.has(where.eventId) ? {} : null, create: async ({ data }) => { inbox.add(data.eventId); } },
    studentWorkspace: { findUnique: async () => workspace,
      create: async ({ data }) => { creates++; workspace = { id: 'workspace', version: 1, ...data }; return workspace; },
      update: async ({ data }) => { workspace = { ...workspace, ...data }; return workspace; } },
    studentSavedCollection: noop, studentPersonalStatistics: noop, auditRecord: noop, transactionalOutboxRecord: noop, studentTimelineEntry: noop,
  };
  const repository = new PrismaStudentWorkspaceRepository({ $transaction: async fn => fn(tx) });
  const gateway = new StudentWorkspaceOutboxDeliveryGateway({ consumeIntegrationEvent: event => repository.ingestIntegrationEvent(event) },
    { findByIdentityId: async () => role ? [{ roleId: role }] : [] }, { findById: async () => ({ type: 'Human', status }) });
  const entry = { id: 'event', domain: 'AUTHORIZATION', eventType: 'RoleAssignmentCreated',
    payload: { identityId: 'identity', roleId: role }, metadata: {}, createdAt: new Date() };
  return { gateway, entry, creates: () => creates, workspace: () => workspace };
}
test('student persona event provisions once across replay and different assignment events', async () => {
  const h = workspaceHarness();
  await h.gateway.deliver(h.entry, { idempotencyKey: 'event' });
  await h.gateway.deliver(h.entry, { idempotencyKey: 'event' });
  await h.gateway.deliver({ ...h.entry, id: 'event-2' }, { idempotencyKey: 'event-2' });
  assert.equal(h.creates(), 1);
});
for (const role of ['admin', 'staff', null]) test(`${role} has no accidental student workspace`, async () => {
  const h = workspaceHarness(role);
  await h.gateway.deliver(h.entry, { idempotencyKey: 'event' });
  await h.gateway.deliver({ ...h.entry, domain: 'IDENTITY', eventType: 'IdentityCreated.v1', payload: { identityId: 'identity', identityType: 'Human' } }, { idempotencyKey: 'event' });
  assert.equal(h.creates(), 0);
});
test('late persona creation preserves suspended owner state', async () => {
  const h = workspaceHarness('student', 'SUSPENDED');
  await h.gateway.deliver(h.entry, { idempotencyKey: 'event' });
  assert.equal(h.workspace().status, 'SUSPENDED');
});
test('stale suspension delivery cannot suspend a currently ACTIVE student', async () => {
  const h = workspaceHarness();
  await h.gateway.deliver(h.entry, { idempotencyKey: 'event' });
  await h.gateway.deliver({ ...h.entry, id: 'old-status', domain: 'IDENTITY', eventType: 'IdentityStatusChanged.v1',
    payload: { identityId: 'identity', identityType: 'Human', newStatus: 'SUSPENDED' } }, { idempotencyKey: 'old-status' });
  assert.equal(h.workspace().status, 'ACTIVE');
});
test('lifecycle delivery before persona is retryable and succeeds after persona', async () => {
  const h = workspaceHarness('student', 'SUSPENDED');
  const status = { ...h.entry, id: 'status', domain: 'IDENTITY', eventType: 'IdentityStatusChanged.v1', payload: { identityId: 'identity', identityType: 'Human', newStatus: 'SUSPENDED' } };
  await assert.rejects(h.gateway.deliver(status, { idempotencyKey: 'status' }), /STUDENT_WORKSPACE_NOT_FOUND/);
  await h.gateway.deliver(h.entry, { idempotencyKey: 'event' });
  await h.gateway.deliver(status, { idempotencyKey: 'status' });
  assert.equal(h.workspace().status, 'SUSPENDED');
});
test('registration persists server-controlled Student role and canonical outbox event together', async () => {
  const records = {};
  const create = key => ({ create: async ({ data }) => { records[key] = data; } });
  const useCase = new RegisterUserUseCase({ identityRepository: { findByEmail: async () => null },
    tokenRepository: {}, passwordHasher: { hash: async () => 'hashed-test-password' }, emailDeliveryGateway: { sendVerificationEmail: async () => {} },
    prismaClient: { $transaction: async fn => fn({ roleRecord: { findUnique: async () => ({ id: 'student' }) },
      identityRecord: create('identity'), credentialRecord: create('credential'), emailVerificationTokenRecord: create('token'),
      roleAssignmentRecord: create('assignment'), transactionalOutboxRecord: create('event') }) } });
  const output = await useCase.execute({ displayName: 'Student', primaryEmail: ' STUDENT@EXAMPLE.TEST ', password: 'Password123!' });
  assert.equal(records.assignment.roleId, 'student');
  assert.equal(records.event.eventType, 'RoleAssignmentCreated');
  assert.equal(records.event.payload.identityId, output.identityId);
  assert.equal(records.identity.user.create.primaryEmail, 'student@example.test');
});

test('first admin operator gate denies default/unapproved execution before client construction', () => {
  assert.throws(() => validateFirstAdminRequest({}), /DATABASE_MUTATION_BLOCKED/);
});
function bootstrapHarness({ existing = false, marker = false, verified = true } = {}) {
  const writes = [];
  const adapter = new ControlledFirstAdminBootstrap({ $transaction: async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return fn({ auditRecord: { findUnique: async () => marker ? {} : null, create: async ({ data }) => writes.push(data) },
      roleRecord: { findMany: async () => [{ id: 'admin', permissions: ['admin:authorization:manage'] }] },
      roleAssignmentRecord: { findFirst: async () => existing ? {} : null, create: async ({ data }) => writes.push(data) },
      identityRecord: { findUnique: async () => ({ status: 'ACTIVE', account: { accessState: 'Active' }, user: { isEmailVerified: verified }, credentials: [{ type: 'password', disabled: false }] }) } });
  } });
  return { adapter, writes, input: { identityId: 'verified-user', roleId: 'admin', actorId: 'operator', approverId: 'approver', changeId: 'CHANGE-123' } };
}
test('controlled first admin reuses verified identity and writes permanent one-time audit', async () => {
  const h = bootstrapHarness(); await h.adapter.execute(h.input);
  assert.equal(h.writes[0].identityId, 'verified-user');
  assert.equal(h.writes[1].reference, 'FIRST_ADMIN_BOOTSTRAP_ONCE');
});
for (const [name, options] of [['existing administrator', { existing: true }], ['already bootstrapped', { marker: true }], ['unverified identity', { verified: false }]]) {
  test(`first admin refuses ${name}`, async () => { const h = bootstrapHarness(options); await assert.rejects(h.adapter.execute(h.input)); assert.equal(h.writes.length, 0); });
}
