import { describe, it, expect, vi } from 'vitest';
import { AssignRoleUseCase } from '../../src/authorization/use-cases/AssignRoleUseCase';
import { RoleAssignment } from '@manaratak/domain';
function setup(existing = false, replayed = false) {
  const input = {
      id: 'grant',
      identityId: 'employee',
      roleId: 'work-role',
      staffMembershipId: 'membership',
    },
    tx = { boundaryId: 'same-atomic-owner-tx' },
    recordGrant = vi.fn();
  const row = new RoleAssignment({
    id: 'old',
    identityId: 'employee',
    roleId: 'work-role',
    assignedAt: new Date(),
  });
  const writer = { saveIfUnassigned: vi.fn(async () => ({ assignmentId: 'grant', replayed })) };
  const repository = {
    findById: async () => null,
    findByIdentityId: async () => (existing ? [row] : []),
    withTransaction: vi.fn(() => writer),
  };
  const atomic = {
    execute: async (_definition: unknown, work: (t: unknown) => Promise<unknown>) => work(tx),
  };
  const owner = new AssignRoleUseCase(
    repository as never,
    atomic as never,
    { findById: async () => ({}) } as never,
    { findById: async () => ({}) } as never,
    { recordGrant } as never,
  );
  return { owner, input, recordGrant, repository, writer, tx };
}
describe('staff role grant provenance', () => {
  it('records a new grant with the exact role transaction context', async () => {
    const s = setup();
    await s.owner.execute(s.input);
    expect(s.repository.withTransaction).toHaveBeenCalledWith(s.tx);
    expect(s.recordGrant).toHaveBeenCalledWith('grant', 'membership', s.tx);
  });
  it('never adopts an existing student or unrelated role assignment as staff-owned', async () => {
    const s = setup(true);
    await expect(s.owner.execute(s.input)).rejects.toThrow('STAFF_GRANT_ALREADY_EXISTS');
    expect(s.writer.saveIfUnassigned).not.toHaveBeenCalled();
    expect(s.recordGrant).not.toHaveBeenCalled();
  });
  it('fails concurrent replay instead of reporting a staff provenance that was never saved', async () => {
    const s = setup(false, true);
    await expect(s.owner.execute(s.input)).rejects.toThrow('STAFF_GRANT_ALREADY_EXISTS');
    expect(s.recordGrant).not.toHaveBeenCalled();
  });
  it('propagates provenance failure through the atomic boundary', async () => {
    const s = setup();
    s.recordGrant.mockRejectedValueOnce(Error('STAFF_GRANT_SOURCE_DENIED'));
    await expect(s.owner.execute(s.input)).rejects.toThrow('STAFF_GRANT_SOURCE_DENIED');
  });
});
