import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { Role, PermissionReference } from '@manaratak/domain';
import { PrismaRoleRepository } from '../../src/authorization/PrismaRoleRepository';

describe('role persistence compare-and-swap', () => {
  it('binds the write to the expected revision and advances the revision even within one millisecond', async () => {
    const expectedRevision = new Date(Date.now() + 10_000).toISOString();
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      roleRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const client = {
      $transaction: vi.fn((callback: (transaction: unknown) => Promise<unknown>) => callback(tx)),
    };
    const repository = new PrismaRoleRepository(client as unknown as PrismaClient);
    const role = new Role({
      id: 'custom',
      name: 'Academic reviewer',
      description: 'Review',
      permissions: [new PermissionReference('admin:universities:manage')],
      policyIds: [],
    });
    await repository.updateIfCurrent(role, expectedRevision);
    const write = tx.roleRecord.updateMany.mock.calls[0][0];
    expect(write.where).toEqual({ id: 'custom', updatedAt: new Date(expectedRevision) });
    expect(write.data.updatedAt.getTime()).toBe(new Date(expectedRevision).getTime() + 1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    tx.roleRecord.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateIfCurrent(role, expectedRevision)).rejects.toThrow(
      'ROLE_REVISION_CONFLICT',
    );
  });
});
