import { describe, expect, it } from 'vitest';
import { ManageRolesUseCase } from '@manaratak/application';
import { InMemoryRoleRepository } from '@manaratak/infrastructure';
import { PermissionReference, Role } from '@manaratak/domain';

const input = {
  id: 'custom-1',
  name: 'Catalog reviewers',
  description: 'Review academic catalog',
  permissions: ['admin:universities:manage'],
  policyIds: [],
};

describe('custom role lifecycle invariants', () => {
  it('rejects concurrent normalized-name claims', async () => {
    const repository = new InMemoryRoleRepository();
    const useCase = new ManageRolesUseCase(repository);
    const results = await Promise.allSettled([
      useCase.createRole(input),
      useCase.createRole({ ...input, id: 'custom-2', name: '  CATALOG   REVIEWERS  ' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await repository.listAll()).toHaveLength(1);
  });

  it('accepts one update and rejects a repeated stale revision', async () => {
    const repository = new InMemoryRoleRepository();
    const useCase = new ManageRolesUseCase(repository);
    await useCase.createRole(input);
    const expectedRevision = (await repository.findById(input.id))!.revision!;
    await useCase.updateRole({ ...input, description: 'Updated description', expectedRevision });
    await expect(
      useCase.updateRole({ ...input, description: 'Stale update', expectedRevision }),
    ).rejects.toThrow('ROLE_REVISION_CONFLICT');
    expect((await repository.findById(input.id))!.description).toBe('Updated description');
  });

  it('retires permissions while preserving the role identity for historical assignments', async () => {
    const repository = new InMemoryRoleRepository();
    const useCase = new ManageRolesUseCase(repository);
    await useCase.createRole(input);
    const expectedRevision = (await repository.findById(input.id))!.revision!;
    await useCase.retireRole(input.id, expectedRevision);
    const retired = (await repository.findById(input.id))!;
    expect(retired.id).toBe(input.id);
    expect(retired.permissions).toEqual([]);
    await expect(useCase.retireRole(input.id, expectedRevision)).rejects.toThrow(
      'ROLE_REVISION_CONFLICT',
    );
  });

  it.each(['student', 'administrator', 'system:service', 'canonical:staff'])(
    'protects canonical role %s from editing and retirement',
    async (id) => {
      const repository = new InMemoryRoleRepository();
      const useCase = new ManageRolesUseCase(repository);
      await repository.save(
        new Role({
          ...input,
          id,
          permissions: [new PermissionReference('admin:universities:manage')],
        }),
      );
      const expectedRevision = (await repository.findById(id))!.revision!;
      await expect(useCase.updateRole({ ...input, id, expectedRevision })).rejects.toThrow(
        'SYSTEM_ROLE_PROTECTED',
      );
      await expect(useCase.retireRole(id, expectedRevision)).rejects.toThrow(
        'SYSTEM_ROLE_PROTECTED',
      );
    },
  );
});
