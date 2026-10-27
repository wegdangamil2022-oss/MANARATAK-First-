import { describe, it, expect, vi } from 'vitest';
import { PrismaGovernanceApprovalGateway } from '../../src/authorization/PrismaGovernanceApprovalGateway';
import { governanceApprovalDigest } from '@manaratak/application';
import { createHash } from 'node:crypto';
const revision = '2026-10-28T00:00:00.000Z';
function setup({ revoke = false } = {}) {
  const policy = {
    id: 'hours',
    ruleType: 'TIME',
    ruleConfiguration: '{}',
    updatedAt: new Date(revision),
  };
  const binding = {
    role: { id: 'role', revision },
    identity: {
      id: 'employee',
      version: 1,
      status: revoke ? 'SUSPENDED' : 'ACTIVE',
      verified: !revoke,
      accountState: revoke ? 'Suspended' : 'Active',
    },
    policies: [
      {
        id: 'hours',
        revision,
        digest: createHash('sha256')
          .update(JSON.stringify(['TIME', '{}']))
          .digest('hex'),
      },
    ],
    requiresActiveIdentity: !revoke,
    ...(revoke
      ? {
          assignment: {
            id: 'assignment',
            identityId: 'employee',
            roleId: 'role',
            assignedAt: revision,
          },
        }
      : {}),
  };
  const payload = {
    method: revoke ? 'DELETE' : 'POST',
    path: revoke ? '/assignments/assignment' : '/assignments',
    body: {},
    changeTicket: 'CHANGE-123',
    binding,
  };
  const approval = {
    id: 'approval',
    scope: 'AUTHORIZATION_CHANGE' as const,
    requestedBy: 'maker',
    approverId: 'checker',
    payload,
    digest: governanceApprovalDigest('AUTHORIZATION_CHANGE', payload),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    approvedAt: new Date().toISOString(),
    usedAt: null as string | null,
  };
  const role = { id: 'role', updatedAt: new Date(revision) },
    identity = {
      id: 'employee',
      version: 1,
      status: binding.identity.status,
      account: { accessState: binding.identity.accountState },
      user: { isEmailVerified: !revoke },
    },
    assignment = {
      id: 'assignment',
      identityId: 'employee',
      roleId: 'role',
      assignedAt: new Date(revision),
    };
  const db = {
    $queryRaw: vi.fn(async () => []),
    policyRecord: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === 'governance-approval:approval'
          ? {
              id: where.id,
              ruleType: 'GOVERNANCE_APPROVAL',
              ruleConfiguration: JSON.stringify(approval),
            }
          : policy,
      ),
      update: vi.fn(async ({ data }: { data: { ruleConfiguration: string } }) => {
        Object.assign(approval, JSON.parse(data.ruleConfiguration));
      }),
    },
    roleRecord: { findUnique: vi.fn(async () => role) },
    identityRecord: { findUnique: vi.fn(async () => identity) },
    roleAssignmentRecord: { findUnique: vi.fn(async () => assignment) },
  };
  const gateway = new PrismaGovernanceApprovalGateway(db as any),
    context = { boundaryId: 'same', transactionClient: db } as any;
  return {
    role,
    policy,
    identity,
    assignment,
    db,
    approval,
    consume: () =>
      gateway.consume('approval', 'AUTHORIZATION_CHANGE', payload, 'maker', 'checker', context),
  };
}
describe('approved target binding under transaction locks', () => {
  it('locks and rechecks role, policies and identity before consumption', async () => {
    const s = setup();
    await s.consume();
    expect(s.db.$queryRaw).toHaveBeenCalledTimes(5);
    expect(s.approval.usedAt).toBeTruthy();
    await expect(s.consume()).rejects.toThrow('GOVERNANCE_APPROVAL_REQUIRED');
  });
  it.each(['role', 'policy', 'identity'] as const)(
    'rejects changed %s after the HTTP precheck',
    async (kind) => {
      const s = setup();
      if (kind === 'role') s.role.updatedAt = new Date(Date.now());
      if (kind === 'policy') s.policy.ruleConfiguration = '{"changed":true}';
      if (kind === 'identity') s.identity.version = 2;
      await expect(s.consume()).rejects.toThrow('GOVERNANCE_APPROVAL_STALE');
      expect(s.db.policyRecord.update).not.toHaveBeenCalled();
    },
  );
  it('allows withdrawing access from an inactive identity when that exact state was approved', async () => {
    const s = setup({ revoke: true });
    await s.consume();
    expect(s.db.roleAssignmentRecord.findUnique).toHaveBeenCalled();
    expect(s.approval.usedAt).toBeTruthy();
  });
  it('cannot use an old revocation approval for a recreated assignment', async () => {
    const s = setup({ revoke: true });
    s.assignment.assignedAt = new Date(Date.now());
    await expect(s.consume()).rejects.toThrow('GOVERNANCE_APPROVAL_STALE');
    expect(s.db.policyRecord.update).not.toHaveBeenCalled();
  });
});
