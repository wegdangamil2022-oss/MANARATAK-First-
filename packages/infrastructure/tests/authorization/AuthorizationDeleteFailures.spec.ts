import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaRoleRepository } from '../../src/authorization/PrismaRoleRepository';
import { PrismaPolicyRepository } from '../../src/authorization/PrismaPolicyRepository';

describe.each([
  ['role', PrismaRoleRepository, 'roleRecord'],
  ['policy', PrismaPolicyRepository, 'policyRecord'],
] as const)('%s deletion error contract', (_kind, Repository, delegate) => {
  it('treats missing-record deletion as idempotent', async () => {
    const client = { [delegate]: { delete: vi.fn().mockRejectedValue({ code: 'P2025' }) } };
    await expect(
      new Repository(client as unknown as PrismaClient).delete('missing'),
    ).resolves.toBeUndefined();
  });
  it.each(['P2003', 'P2034', 'P1001', undefined])(
    'propagates FK, transaction and unexpected failures (%s)',
    async (code) => {
      const failure = Object.assign(new Error('test-only database failure'), { code });
      const client = { [delegate]: { delete: vi.fn().mockRejectedValue(failure) } };
      await expect(
        new Repository(client as unknown as PrismaClient).delete('role-or-policy'),
      ).rejects.toBe(failure);
    },
  );
});
