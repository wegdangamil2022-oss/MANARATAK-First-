import { describe, it, expect, vi } from 'vitest';
import { PrismaDutyGuard } from '../../src/authorization/PrismaDutyGuard';
import { PrismaRoleAssignmentRepository } from '../../src/authorization/PrismaRoleAssignmentRepository';
import { PrismaRoleRepository } from '../../src/authorization/PrismaRoleRepository';
import { PrismaEmergencyAccessRepository } from '../../src/authorization/PrismaEmergencyAccessRepository';
import { RoleAssignment, Role, PermissionReference } from '@absheer/domain';
const pair = {
  id: 'pair',
  first: 'admin:finance:invoice:manage',
  second: 'admin:finance:approval:decide',
  description: 'Independent duties',
};
function setup() {
  const db = {
    $queryRaw: vi.fn(async () => []),
    policyRecord: {
      findUnique: vi.fn(async () => ({
        ruleType: 'SEPARATION_OF_DUTIES',
        updatedAt: new Date('2026-01-01'),
        ruleConfiguration: JSON.stringify({ pairs: [pair] }),
      })),
      findMany: vi.fn(async () => []),
    },
    roleAssignmentRecord: {
      findMany: vi.fn(async () => [{ id: 'a', identityId: 'p', roleId: 'bill' }]),
      create: vi.fn(),
      findUnique: vi.fn(async () => null),
    },
    adminEmergencyAccessRecord: { findMany: vi.fn(async () => []), create: vi.fn() },
    roleRecord: {
      findMany: vi.fn(async () => [
        { id: 'bill', permissions: [pair.first] },
        { id: 'approve', permissions: [pair.second] },
      ]),
      updateMany: vi.fn(),
    },
  };
  return { db, guard: new PrismaDutyGuard(db as any) };
}
describe('SoD is enforced in the actual Prisma command paths', () => {
  it('rejects direct role assignment before persistence', async () => {
    const s = setup();
    await expect(
      new PrismaRoleAssignmentRepository(s.db as any).saveIfUnassigned(
        new RoleAssignment({
          id: 'new',
          identityId: 'p',
          roleId: 'approve',
          assignedAt: new Date(),
        }),
      ),
    ).rejects.toThrow('AUTHORIZATION_DUTY_CONFLICT');
    expect(s.db.roleAssignmentRecord.create).not.toHaveBeenCalled();
  });
  it('includes emergency grants in permission union', async () => {
    const s = setup();
    s.db.adminEmergencyAccessRecord.findMany.mockResolvedValue([{ roleId: 'approve' }] as any);
    await expect(s.guard.assertPrincipal('p')).rejects.toThrow('AUTHORIZATION_DUTY_CONFLICT');
  });
  it('rejects a direct emergency grant before persistence', async () => {
    const s = setup();
    await expect(
      new PrismaEmergencyAccessRepository(s.db as any)
        .withTransaction({ boundaryId: 'test', transactionClient: s.db } as any)
        .grant({
          id: 'g',
          principalId: 'p',
          roleId: 'approve',
          requestedBy: 'maker',
          approvedBy: 'checker',
          reason: 'Temporary operational grant',
          changeTicket: 'CHG-123',
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 600000),
        }),
    ).rejects.toThrow('AUTHORIZATION_DUTY_CONFLICT');
    expect(s.db.adminEmergencyAccessRecord.create).not.toHaveBeenCalled();
  });
  it('reevaluates members before a role permission update', async () => {
    const s = setup();
    s.db.roleAssignmentRecord.findMany.mockImplementation(async (args: any) =>
      args.where.roleId
        ? [{ id: 'a', identityId: 'p', roleId: 'approve' }]
        : [
            { id: 'a', identityId: 'p', roleId: 'bill' },
            { id: 'b', identityId: 'p', roleId: 'approve' },
          ],
    );
    await expect(
      new PrismaRoleRepository(s.db as any).updateIfCurrent(
        new Role({
          id: 'approve',
          name: 'Approver',
          description: 'Review invoices',
          permissions: [new PermissionReference(pair.second)],
          policyIds: [],
        }),
        new Date('2026-01-01').toISOString(),
      ),
    ).rejects.toThrow('AUTHORIZATION_DUTY_CONFLICT');
    expect(s.db.roleRecord.updateMany).not.toHaveBeenCalled();
  });
  it('fails closed on malformed persisted policy', async () => {
    const s = setup();
    s.db.policyRecord.findUnique.mockResolvedValue({
      ruleType: 'SEPARATION_OF_DUTIES',
      updatedAt: new Date(),
      ruleConfiguration: 'malformed',
    });
    expect(await s.guard.isAllowed('p')).toBe(false);
  });
  it('allows only active independently-approved revision-bound exceptions', async () => {
    const s = setup();
    s.db.$queryRaw.mockResolvedValue([
      {
        ruleConfiguration: JSON.stringify({
          id: 'e',
          principalId: 'p',
          pairIds: ['pair'],
          policyRevision: new Date('2026-01-01').toISOString(),
          startsAt: new Date(Date.now() - 1000).toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          requestedBy: 'maker',
          approvedBy: 'checker',
          reason: 'Independently reviewed exception',
          changeTicket: 'CHG-123',
        }),
      },
    ] as any);
    expect(await s.guard.isAllowed('p')).toBe(true);
    s.db.$queryRaw.mockResolvedValue([
      { ruleConfiguration: JSON.stringify({ expiresAt: new Date(Date.now() - 1).toISOString() }) },
    ] as any);
    expect(await s.guard.isAllowed('p')).toBe(false);
  });
});
