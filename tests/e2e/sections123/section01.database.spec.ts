import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role, PermissionReference, AuthorizationEvaluatorService, Policy } from '@manaratak/domain';
import { AssignRoleUseCase, AtomicDomainMutationCoordinator, AtomicAuditedOutboxMutationExecutor } from '@manaratak/application';
import { PrismaRoleRepository } from '../../../packages/infrastructure/src/authorization/PrismaRoleRepository';
import { PrismaRoleAssignmentRepository } from '../../../packages/infrastructure/src/authorization/PrismaRoleAssignmentRepository';
import { PrismaIdentityRepository } from '../../../packages/infrastructure/src/identity/PrismaIdentityRepository';
import { PrismaAuditRecordRepository } from '../../../packages/infrastructure/src/audit/PrismaAuditRecordRepository';
import { PrismaAtomicPersistenceUnitOfWork } from '../../../packages/infrastructure/src/event-foundation/PrismaAtomicPersistenceUnitOfWork';
import { PrismaTransactionalOutboxStore } from '../../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore';
import { PrismaPolicyRepository } from '../../../packages/infrastructure/src/authorization/PrismaPolicyRepository';
import { PrismaEmergencyAccessRepository } from '../../../packages/infrastructure/src/authorization/PrismaEmergencyAccessRepository';
import { DefaultPolicyEvaluator } from '../../../packages/infrastructure/src/authorization/DefaultPolicyEvaluator';
import { disposableClient } from './disposable';

const db = disposableClient();
const prefix = 'review01-' + randomUUID();
const roles = new PrismaRoleRepository(db);
const audit = new PrismaAuditRecordRepository(db);
const outbox = new PrismaTransactionalOutboxStore(db);
const uow = new PrismaAtomicPersistenceUnitOfWork(db);
const coordinator = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(uow, audit, outbox));
const assignments = new AssignRoleUseCase(new PrismaRoleAssignmentRepository(db), coordinator, new PrismaIdentityRepository(db), roles);
function role(id: string, name: string) {
  return new Role({ id, name, description: 'isolated fixture', permissions: [new PermissionReference('admin:universities:manage')], policyIds: [] });
}

describe('01 isolated real PostgreSQL concurrency and atomicity', () => {
  beforeAll(() => db.$connect());
  afterAll(async () => {
    await db.roleAssignmentRecord.deleteMany({ where: { identityId: { startsWith: prefix } } });
    await db.adminEmergencyAccessRecord.deleteMany({ where: { principalId: { startsWith: prefix } } });
    await db.policyRecord.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.roleRecord.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.identityRecord.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.auditRecord.deleteMany({ where: { targetId: { startsWith: prefix } } });
    await db.transactionalOutboxRecord.deleteMany({ where: { aggregateId: { startsWith: prefix } } });
    await db.$disconnect();
  });

  it('serializes NFKC duplicate name claims in two actual transactions', async () => {
    const attempts = await Promise.allSettled([
      roles.createUnique(role(prefix + '-name-a', prefix + ' Ａcademic  Reviewer')),
      roles.createUnique(role(prefix + '-name-b', prefix + ' academic reviewer')),
    ]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(String((attempts.find(r => r.status === 'rejected') as PromiseRejectedResult).reason)).toContain('ROLE_NAME_ALREADY_EXISTS');
  });

  it('rejects one stale concurrent role edit without last-write-wins', async () => {
    const id = prefix + '-cas';
    await roles.createUnique(role(id, id));
    const a = (await roles.findById(id))!;
    const b = (await roles.findById(id))!;
    const attempts = await Promise.allSettled([roles.updateIfCurrent(a, a.revision!), roles.updateIfCurrent(b, b.revision!)]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(String((attempts.find(r => r.status === 'rejected') as PromiseRejectedResult).reason)).toContain('ROLE_REVISION_CONFLICT');
  });

  it('replays concurrent assignment without a second business audit or outbox event', async () => {
    const identityId = prefix + '-identity';
    const roleId = prefix + '-assignment-role';
    await db.identityRecord.create({ data: { id: identityId, type: 'Human', status: 'ACTIVE', createdBy: 'isolated-test', user: { create: { displayName: 'Isolated user', primaryEmail: identityId + '@example.invalid', isEmailVerified: true } }, account: { create: { accessState: 'Active', storageQuotaBytes: 0, rateLimitMax: 100, rateLimitWindowMs: 60000 } } } });
    await roles.createUnique(role(roleId, roleId));
    const ids = [prefix + '-grant-a', prefix + '-grant-b'];
    const results = await Promise.all(ids.map(id => assignments.execute({ id, identityId, roleId }, { actorId: 'isolated-operator', correlationId: prefix })));
    expect(results.map(r => r.replayed).sort()).toEqual([false, true]);
    expect(new Set(results.map(r => r.assignmentId)).size).toBe(1);
    expect(await db.roleAssignmentRecord.count({ where: { identityId, roleId } })).toBe(1);
    expect(await db.auditRecord.count({ where: { targetId: { in: ids }, action: 'ROLE_ASSIGNED' } })).toBe(1);
    expect(await db.transactionalOutboxRecord.count({ where: { aggregateId: { in: ids } } })).toBe(1);
    // The database FK still protects internal deletion of an assigned role.
    await expect(roles.deleteIfUnused(roleId, (await roles.findById(roleId))!.revision!)).rejects.toThrow('ROLE_HAS_ASSIGNMENTS');
  });

  it('never redirects an assignment ID when different pairs race', async () => {
    const identityId = prefix + '-immutable-identity';
    await db.identityRecord.create({ data: { id: identityId, type: 'Human', status: 'ACTIVE', createdBy: 'isolated-test', user: { create: { displayName: 'Isolated user', primaryEmail: identityId + '@example.invalid', isEmailVerified: true } }, account: { create: { accessState: 'Active' } } } });
    const roleIds = [prefix + '-immutable-role-a', prefix + '-immutable-role-b'];
    for (const id of roleIds) await roles.createUnique(role(id, id));
    const id = prefix + '-immutable-grant';
    const results = await Promise.allSettled(roleIds.map(roleId => assignments.execute({ id, identityId, roleId }, { actorId: 'isolated-operator' })));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(String((results.find(r => r.status === 'rejected') as PromiseRejectedResult).reason)).toContain('ROLE_ASSIGNMENT_IMMUTABLE');
    expect(await db.auditRecord.count({ where: { targetId: id } })).toBe(1);
    expect(await db.transactionalOutboxRecord.count({ where: { aggregateId: id } })).toBe(1);
  });

  it('reads policy authority beyond the first 100 linked roles in PostgreSQL', async () => {
    const policyId = prefix + '-usage-policy';
    await db.roleRecord.createMany({ data: Array.from({ length: 101 }, (_, i) => ({ id: prefix + '-policy-role-' + String(i).padStart(3, '0'), name: prefix + '-policy-name-' + i, description: '', permissions: [i === 100 ? 'admin:finance:manage' : 'admin:universities:manage'], policyIds: [policyId] })) });
    await expect(db.$transaction(tx => new PrismaPolicyRepository(tx as unknown as typeof db).assertRoleUsageAuthority(policyId, ['admin:universities:manage'])))
      .rejects.toThrow('POLICY_PERMISSION_EXCEEDS_ACTOR');
    expect(await db.policyRecord.count({ where: { id: policyId } })).toBe(0);
  });

  it('honors actual policy retirement/dangling references and emergency expiry/revocation without a cache', async () => {
    const identityId = prefix + '-emergency-identity';
    const roleId = prefix + '-emergency-role';
    const policyId = prefix + '-emergency-policy';
    const policies = new PrismaPolicyRepository(db);
    const emergencies = new PrismaEmergencyAccessRepository(db);
    await roles.createUnique(new Role({ id: roleId, name: roleId, description: '', permissions: [new PermissionReference('admin:universities:manage')], policyIds: [policyId] }));
    const evaluator = new AuthorizationEvaluatorService(roles, policies, new PrismaRoleAssignmentRepository(db), new DefaultPolicyEvaluator(), emergencies);
    const at = new Date();
    const grantId = prefix + '-emergency-grant';
    await emergencies.grant({ id: grantId, principalId: identityId, roleId, reason: 'Isolated recovery test', changeTicket: 'TEST-123', requestedBy: 'isolated-maker', approvedBy: 'isolated-checker', startsAt: new Date(at.getTime() - 1000), expiresAt: new Date(at.getTime() + 60000) });
    expect((await evaluator.evaluatePermission(identityId, 'admin:universities:manage', { ip: '127.0.0.1' })).isGranted).toBe(false);
    await policies.create(new Policy({ id: policyId, name: 'isolated-IP', description: '', ruleType: 'IP', ruleConfiguration: JSON.stringify({ allowedIps: ['127.0.0.1'] }) }));
    expect((await evaluator.evaluatePermission(identityId, 'admin:universities:manage', { ip: '127.0.0.1' })).isGranted).toBe(true);
    expect((await evaluator.evaluatePermission(identityId, 'admin:universities:manage', { ip: '192.0.2.1' })).isGranted).toBe(false);
    expect(await emergencies.listActiveRoleIds(identityId, new Date(at.getTime() + 60001))).toEqual([]);
    await policies.updateIfCurrent(new Policy({ id: policyId, name: 'isolated-IP', description: '', ruleType: 'RETIRED', ruleConfiguration: '{}' }), (await policies.findById(policyId))!.revision!);
    expect((await evaluator.evaluatePermission(identityId, 'admin:universities:manage', { ip: '127.0.0.1' })).isGranted).toBe(false);
    await emergencies.revoke({ id: grantId, revokedBy: 'isolated-maker', reason: 'test complete' });
    expect((await evaluator.evaluatePermission(identityId, 'admin:universities:manage', { ip: '127.0.0.1' })).isGranted).toBe(false);
  });

  for (const failure of ['audit', 'outbox'] as const) {
    it(`rolls back business/audit/outbox together after ${failure} failure`, async () => {
      const id = prefix + '-rollback-' + failure;
      const failingAudit = { saveInTransaction: async (...args: Parameters<typeof audit.saveInTransaction>) => {
        await audit.saveInTransaction(...args);
        if (failure === 'audit') throw new Error('INJECTED_AUDIT_FAILURE');
      } };
      const failingOutbox = { appendInTransaction: async (...args: Parameters<typeof outbox.appendInTransaction>) => {
        await outbox.appendInTransaction(...args);
        throw new Error('INJECTED_OUTBOX_FAILURE');
      } };
      const executor = new AtomicAuditedOutboxMutationExecutor(uow, failingAudit as typeof audit, failingOutbox as unknown as typeof outbox);
      const operation = new AtomicDomainMutationCoordinator(executor);
      await expect(operation.execute({ domain: 'AUTHORIZATION', aggregateType: 'ROLE', aggregateId: id, action: 'ROLE_CREATED', context: { actorId: 'isolated-operator', correlationId: id } }, tx => roles.withTransaction(tx).createUnique!(role(id, id))))
        .rejects.toThrow('INJECTED_' + failure.toUpperCase() + '_FAILURE');
      expect(await db.roleRecord.count({ where: { id } })).toBe(0);
      expect(await db.auditRecord.count({ where: { targetId: id } })).toBe(0);
      expect(await db.transactionalOutboxRecord.count({ where: { aggregateId: id } })).toBe(0);
    });
  }
});
