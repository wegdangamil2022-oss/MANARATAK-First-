import { describe, expect, it, vi } from 'vitest';
import { AssignRoleUseCase } from '../../src/authorization/use-cases/AssignRoleUseCase';
import type { RoleAssignment } from '@manaratak/domain';

describe('role assignment audit boundary', () => {
  it('records grant and revocation through the atomic audit coordinator', async () => {
    const records = new Map<string, RoleAssignment>();
    const repository = {
      findById: async (id: string) => records.get(id) ?? null,
      findByIdentityId: async (identityId: string) => [...records.values()].filter(item => item.identityId === identityId),
      save: async (item: RoleAssignment) => { records.set(item.id, item); },
      delete: async (id: string) => { records.delete(id); },
      withTransaction: () => repository,
    };
    const definitions: Array<{ action: string; context?: { actorId: string }; auditMetadata?: Record<string, unknown> }> = [];
    const coordinator = { execute: vi.fn(async (definition, mutation) => {
      definitions.push(definition);
      return mutation({ boundaryId: 'role-transaction', transactionClient: {} });
    }) };
    const operation = new AssignRoleUseCase(repository as any, coordinator as any,
      { findById: async () => ({}) } as any, { findById: async () => ({}) } as any);
    const context = { actorId: 'operator-1', actorType: 'IDENTITY', source: 'admin-authorization-api' };
    await operation.execute({ id: 'assignment-1', identityId: 'account-1', roleId: 'universities-editor' }, context);
    expect(records.has('assignment-1')).toBe(true);
    await operation.revokeAssignment('assignment-1', context);
    expect(records.has('assignment-1')).toBe(false);
    expect(definitions.map(item => [item.action, item.context?.actorId])).toEqual([
      ['ROLE_ASSIGNED', 'operator-1'], ['ROLE_ASSIGNMENT_REVOKED', 'operator-1'],
    ]);
    expect(coordinator.execute).toHaveBeenCalledTimes(2);
    expect(definitions.map(item => item.auditMetadata)).toEqual([
      { identityId: 'account-1', roleId: 'universities-editor' },
      { identityId: 'account-1', roleId: 'universities-editor' },
    ]);
  });
});
