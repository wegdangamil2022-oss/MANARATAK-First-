import { describe, expect, it, vi } from 'vitest';
import {
  Role,
  RoleAssignment,
  PermissionReference,
  AuthorizationEvaluatorService,
  Policy,
  Action,
  ResourceUrn,
} from '@manaratak/domain';
import { InMemoryRoleRepository } from '../../src/authorization/InMemoryRoleRepository';
import { InMemoryRoleAssignmentRepository } from '../../src/authorization/InMemoryRoleAssignmentRepository';
import { InMemoryPolicyRepository } from '../../src/authorization/InMemoryPolicyRepository';
import { InMemoryEmergencyAccessRepository } from '../../src/authorization/InMemoryEmergencyAccessRepository';
import { DefaultPolicyEvaluator } from '../../src/authorization/DefaultPolicyEvaluator';
import { PrismaRoleRepository } from '../../src/authorization/PrismaRoleRepository';
import { PrismaPolicyRepository } from '../../src/authorization/PrismaPolicyRepository';

describe('authorization bounded reads and trusted contexts', () => {
  it('pages roles with a stable ID cursor, including rows inserted after the previous cursor', async () => {
    const repo = new InMemoryRoleRepository();
    const role = (id: string) =>
      new Role({
        id,
        name: id,
        description: 'Role',
        permissions: [new PermissionReference('admin:universities:manage')],
        policyIds: [],
      });
    for (const id of ['a', 'b', 'd']) await repo.save(role(id));
    const first = await repo.queryPage({ limit: 2 });
    expect(first.items.map((item) => item.id)).toEqual(['a', 'b']);
    await repo.save(role('c'));
    const second = await repo.queryPage({ limit: 2, cursor: first.nextCursor! });
    expect(second.items.map((item) => item.id)).toEqual(['c', 'd']);
    expect(second.nextCursor).toBeNull();
  });
  it('never loads every assignment to evaluate one identity and cannot override its trusted identity/resource/action', async () => {
    const roles = new InMemoryRoleRepository(),
      assignments = new InMemoryRoleAssignmentRepository(),
      policies = new InMemoryPolicyRepository();
    await roles.save(
      new Role({
        id: 'role',
        name: 'Reviewer',
        description: 'Review',
        permissions: [new PermissionReference('admin:universities:manage')],
        policyIds: ['office'],
      }),
    );
    await policies.save(
      new Policy({
        id: 'office',
        name: 'Office',
        description: 'Office',
        ruleType: 'IP',
        ruleConfiguration: '127.0.0.1',
      }),
    );
    await assignments.save(
      new RoleAssignment({ id: 'a', identityId: 'staff', roleId: 'role', assignedAt: new Date() }),
    );
    const broad = vi.spyOn(assignments, 'findBy');
    const narrow = vi.spyOn(assignments, 'findByIdentityId');
    const policyEvaluator = {
      evaluate: vi.fn(async () => ({ isGranted: true, reasons: [] }) as any),
    };
    const evaluator = new AuthorizationEvaluatorService(
      roles,
      policies,
      assignments,
      policyEvaluator,
    );
    await evaluator.evaluateAccess(
      'staff',
      new ResourceUrn('admin:universities'),
      new Action('manage'),
      { identityId: 'owner', resourceUrn: 'admin:*', action: '*' },
    );
    expect(broad).not.toHaveBeenCalled();
    expect(narrow).toHaveBeenCalledWith('staff');
    expect(policyEvaluator.evaluate.mock.calls[0][1]).toMatchObject({
      identityId: 'staff',
      resourceUrn: expect.objectContaining({ value: 'admin:universities' }),
      action: expect.objectContaining({ value: 'manage' }),
    });
  });
  it('explains emergency role sources and loses access immediately after revocation', async () => {
    const roles = new InMemoryRoleRepository(),
      assignments = new InMemoryRoleAssignmentRepository(),
      policies = new InMemoryPolicyRepository(),
      emergency = new InMemoryEmergencyAccessRepository();
    await roles.save(
      new Role({
        id: 'emergency',
        name: 'Emergency reviewer',
        description: 'Review',
        permissions: [new PermissionReference('admin:universities:manage')],
        policyIds: [],
      }),
    );
    await emergency.grant({
      id: 'grant',
      principalId: 'staff',
      roleId: 'emergency',
      reason: 'Emergency investigation',
      changeTicket: 'CHANGE-123',
      requestedBy: 'actor',
      approvedBy: 'checker',
      startsAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 60000),
    });
    const evaluator = new AuthorizationEvaluatorService(
      roles,
      policies,
      assignments,
      new DefaultPolicyEvaluator(),
      emergency,
    );
    expect((await evaluator.describeIdentityAccess('staff'))[0].sources).toEqual(['EMERGENCY']);
    expect(
      (await evaluator.evaluatePermission('staff', 'admin:universities:manage')).isGranted,
    ).toBe(true);
    await emergency.revoke({ id: 'grant', revokedBy: 'actor', reason: 'Issue resolved' });
    expect(
      (await evaluator.evaluatePermission('staff', 'admin:universities:manage')).isGranted,
    ).toBe(false);
    expect(await evaluator.describeIdentityAccess('staff')).toEqual([]);
  });
  it('binds role list search and cursor to the database rather than client truncation', async () => {
    const findMany = vi.fn(async () => []);
    const repo = new PrismaRoleRepository({ roleRecord: { findMany } } as any);
    await repo.queryPage({ limit: 2, cursor: 'b', search: 'review' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: { id: 'asc' },
        where: expect.objectContaining({ id: { gt: 'b' }, OR: expect.any(Array) }),
      }),
    );
  });
  it('rejects stale policy writes without upserting over a newer policy', async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const repo = new PrismaPolicyRepository({ policyRecord: { updateMany } } as any);
    await expect(
      repo.updateIfCurrent(
        new Policy({
          id: 'p',
          name: 'Policy',
          description: 'Policy',
          ruleType: 'IP',
          ruleConfiguration: '127.0.0.1',
        }),
        '2026-01-01T00:00:00.000Z',
      ),
    ).rejects.toThrow('POLICY_REVISION_CONFLICT');
    expect(updateMany.mock.calls[0][0].where).toEqual({
      id: 'p',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  });
});

describe('shared policy owner transaction guards',()=>{
  it('locks policy references and rejects an unauthorized linked role before writing',async()=>{
    const tx={$queryRaw:vi.fn(async()=>[]),roleRecord:{findMany:vi.fn(async()=>[{id:'finance',permissions:['admin:finance:manage']}])}};
    const repo=new PrismaPolicyRepository(tx as any);
    await expect(repo.assertRoleUsageAuthority('office',['admin:universities:manage'])).rejects.toThrow('POLICY_PERMISSION_EXCEEDS_ACTOR');
    expect(tx.$queryRaw).toHaveBeenCalledOnce();expect(tx.roleRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{policyIds:{array_contains:['office']}},take:100}));
  });
  it('does not acquire a one-statement lock that would expire outside the mutation transaction',async()=>{
    const repo=new PrismaPolicyRepository({$transaction:vi.fn()} as any);
    await expect(repo.assertRoleUsageAuthority('office',[])).rejects.toThrow('POLICY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
  });
});
