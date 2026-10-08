import { describe, expect, it, vi } from 'vitest';
import {
  Identity,
  IdentityType,
  User,
  Profile,
  ContactRegistry,
  TechnicalMetadata,
  Role,
  PermissionReference,
  RoleAssignment,
} from '@manaratak/domain';
import { ListIdentitiesUseCase } from '@manaratak/application';
import { InMemoryIdentityRepository } from '../../src/identity/InMemoryIdentityRepository';
import { PrismaIdentityRepository } from '../../src/identity/PrismaIdentityRepository';
import { InMemoryRoleRepository } from '../../src/authorization/InMemoryRoleRepository';
import { InMemoryRoleAssignmentRepository } from '../../src/authorization/InMemoryRoleAssignmentRepository';
function identity(name: string) {
  return Identity.create(
    IdentityType.Human,
    new User({
      profile: new Profile({ displayName: name }),
      contactRegistry: new ContactRegistry({
        primaryEmail: `${name}@example.test`,
        isEmailVerified: true,
        isPhoneVerified: false,
      }),
    }),
    { storageQuotaBytes: 1, rateLimitMax: 1, rateLimitWindowMs: 1000 },
    TechnicalMetadata.create('fixture'),
  );
}
describe('staff directory canonical access projection', () => {
  it('filters by canonical role and assigned admin access before pagination, then reads roles from their owner', async () => {
    const roles = new InMemoryRoleRepository(),
      assignments = new InMemoryRoleAssignmentRepository(),
      identities = new InMemoryIdentityRepository(roles, assignments);
    const a = identity('staff'),
      b = identity('student');
    await identities.save(a);
    await identities.save(b);
    await roles.save(
      new Role({
        id: 'reviewer',
        name: 'Reviewer',
        description: 'Academic reviewer',
        permissions: [new PermissionReference('admin:universities:manage')],
        policyIds: [],
      }),
    );
    await assignments.save(
      new RoleAssignment({
        id: 'assign',
        identityId: a.id.toString(),
        roleId: 'reviewer',
        assignedAt: new Date(),
      }),
    );
    const useCase = new ListIdentitiesUseCase(identities, roles, assignments);
    const result = await useCase.execute({
      limit: 1,
      cursor: '',
      roleId: 'reviewer',
      adminAccess: true,
      includeAccess: true,
    });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().total).toBe(1);
    expect(result.getValue().items[0]).toMatchObject({
      id: a.id.toString(),
      assignedRoles: [{ id: 'reviewer', name: 'Reviewer' }],
      adminAccessAssigned: true,
    });
    const unassigned = await useCase.execute({ adminAccess: false, includeAccess: true });
    expect(unassigned.getValue().items.map((item) => item.id)).toEqual([b.id.toString()]);
  });
  it('cannot treat missing read capabilities as an empty staff result', async () => {
    const repo = new InMemoryIdentityRepository();
    await repo.save(identity('staff'));
    const result = await new ListIdentitiesUseCase(repo).execute({ roleId: 'reviewer' });
    expect(result.isSuccess).toBe(false);
  });
  it('uses a keyset predicate and bounded database query with the role/access filter', async () => {
    const delegate = { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) };
    const repo = new PrismaIdentityRepository({ identityRecord: delegate });
    await repo.findPaged({
      roleId: 'reviewer',
      adminAccess: false,
      cursor: 'identity-100',
      limit: 20,
      search: 'staff',
    });
    expect(delegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { gt: 'identity-100' },
          roleAssignments: { some: { roleId: 'reviewer' } },
          AND: expect.any(Array),
        }),
        take: 20,
        orderBy: [{ id: 'asc' }],
      }),
    );
    expect(delegate.count).toHaveBeenCalledWith({
      where: expect.not.objectContaining({ id: { gt: 'identity-100' } }),
    });
  });
});
