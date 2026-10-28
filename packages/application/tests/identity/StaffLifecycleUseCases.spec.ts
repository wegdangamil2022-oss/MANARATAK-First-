import { describe, it, expect, vi } from 'vitest';
import { StaffLifecycleUseCases } from '../../src/identity/StaffLifecycleUseCases';
import type { StaffChangeRequest, StaffLifecycleSnapshot } from '@manaratak/domain';
const now = '2026-10-28T10:00:00.000Z';
function setup() {
  const snapshot: StaffLifecycleSnapshot = {
    member: {
      id: 'member',
      publicId: 'EMP-1',
      identityId: 'employee',
      displayName: 'Employee',
      email: 'employee@example.test',
      kind: 'EMPLOYEE',
      status: 'DRAFT',
      departmentId: null,
      jobTitleId: null,
      managerId: null,
      startsAt: null,
      endsAt: null,
      version: 1,
      identityStatus: 'ACTIVE',
      emailVerified: true,
    },
    identityEligible: true,
    mfaEnrolled: true,
    accepted: true,
    ownedGrants: 0,
    otherGrants: 1,
    pending: { review: 0 },
    hash: 'snapshot',
  };
  let row: StaffChangeRequest | null = null;
  const repo = {
    readiness: vi.fn(async () => ({ ready: true, missingTables: [], missingPrivileges: [] })),
    lock: vi.fn(),
    assertActor: vi.fn(),
    snapshot: vi.fn(async () => snapshot),
    invitation: vi.fn(async () => null),
    issue: vi.fn(),
    accept: vi.fn(),
    revoke: vi.fn(),
    request: vi.fn(async () => row),
    saveRequest: vi.fn(async (r: StaffChangeRequest) => {
      row = r;
    }),
    approve: vi.fn(),
    apply: vi.fn(),
    assertRecoveryAdmin: vi.fn(),
  };
  const atomic = {
    execute: vi.fn(async (_d: unknown, work: (tx: unknown) => unknown) =>
      work({ boundaryId: 'staff-lifecycle-test' }),
    ),
  };
  return {
    repo,
    atomic,
    snapshot,
    owner: new StaffLifecycleUseCases(
      repo as never,
      atomic as never,
      'isolated-test-key-that-is-at-least-32-characters',
      () => new Date(now),
    ),
    setRequest: (r: StaffChangeRequest) => {
      row = r;
    },
  };
}
const context = { actorId: 'requester' },
  input = {
    id: 'request',
    membershipId: 'member',
    version: 1,
    action: 'ACTIVATE' as const,
    payload: {},
    reason: 'Reviewed activation',
  };
describe('Staff lifecycle security and state ownership', () => {
  it('never issues invitations when lifecycle storage is absent', async () => {
    const s = setup();
    s.repo.readiness.mockResolvedValue({
      ready: false,
      missingTables: ['StaffInvitationRecord'],
      missingPrivileges: [],
    });
    await expect(
      s.owner.invite(
        { id: 'invite', membershipId: 'member', version: 1, reason: 'Reviewed invite' },
        context,
      ),
    ).rejects.toThrow('NOT_READY');
    expect(s.atomic.execute).not.toHaveBeenCalled();
  });
  it('stores only a hash and keeps tokens/emails out of audit and outbox definitions', async () => {
    const s = setup(),
      result = await s.owner.invite(
        { id: 'invite', membershipId: 'member', version: 1, reason: 'Reviewed invite' },
        context,
      );
    const row = s.repo.issue.mock.calls[0][0] as { tokenHash: string };
    expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(s.atomic.execute.mock.calls[0][0])).not.toContain(result.token);
    expect(JSON.stringify(s.atomic.execute.mock.calls[0][0])).not.toContain(
      s.snapshot.member.email,
    );
    expect(result.delivery).toBe('MANUAL_SECURE_HANDOFF');
  });
  it('rejects self invitation and never impersonates account acceptance', async () => {
    const s = setup();
    await expect(
      s.owner.invite(
        { id: 'invite', membershipId: 'member', version: 1, reason: 'Reviewed invite' },
        { actorId: 'employee' },
      ),
    ).rejects.toThrow('CONFLICT');
    expect(s.repo.issue).not.toHaveBeenCalled();
  });
  it.each(['accepted', 'identityEligible', 'mfaEnrolled'] as const)(
    'requires real %s before activation',
    async (field) => {
      const s = setup();
      s.snapshot[field] = false;
      await expect(s.owner.request(input, context)).rejects.toThrow('PREREQUISITES');
      expect(s.repo.saveRequest).not.toHaveBeenCalled();
    },
  );
  it('separates accepted invitation from activation and assigns no role', async () => {
    const s = setup();
    expect(
      await s.owner.accept(
        { id: 'invite', token: 'x'.repeat(43), confirm: true },
        { actorId: 'employee' },
      ),
    ).toEqual({ accepted: true, activated: false });
    expect(s.repo.apply).not.toHaveBeenCalled();
  });
  it('forbids self approval and approval on behalf of another account', async () => {
    const s = setup();
    await s.owner.request(input, context);
    await expect(s.owner.approve('request', 1, context)).rejects.toThrow('APPROVAL_DENIED');
    expect(s.repo.approve).not.toHaveBeenCalled();
  });
  it('invalidates a saved approval after membership, roles or handover snapshot changed', async () => {
    const s = setup(),
      r = await s.owner.request(input, context);
    s.setRequest({ ...r, approvedBy: 'reviewer', approvedAt: now, version: 2 });
    s.snapshot.hash = 'changed';
    await expect(s.owner.apply('request', 2, context)).rejects.toThrow('CHANGE_CONFLICT');
    expect(s.repo.apply).not.toHaveBeenCalled();
  });
  it('revalidates both current actors and commits approved change atomically', async () => {
    const s = setup(),
      r = await s.owner.request(input, context);
    s.setRequest({ ...r, approvedBy: 'reviewer', approvedAt: now, version: 2 });
    await s.owner.apply('request', 2, context);
    expect(s.repo.assertActor).toHaveBeenCalledWith(
      'reviewer',
      expect.objectContaining({ boundaryId: 'staff-lifecycle-test' }),
    );
    expect(s.repo.apply).toHaveBeenCalledOnce();
  });
  it('blocks offboarding until pending owner tasks are handed over', async () => {
    const s = setup();
    s.snapshot.member.status = 'ACTIVE';
    s.snapshot.pending.review = 1;
    await expect(s.owner.request({ ...input, action: 'OFFBOARD' }, context)).rejects.toThrow(
      'HANDOVER_REQUIRED',
    );
  });
  it('protects the remaining recovery administrator before offboarding', async () => {
    const s = setup();
    s.snapshot.member.status = 'ACTIVE';
    const r = await s.owner.request({ ...input, action: 'OFFBOARD' }, context);
    s.setRequest({ ...r, approvedBy: 'reviewer', approvedAt: now, version: 2 });
    s.repo.assertRecoveryAdmin.mockRejectedValue(Error('STAFF_LAST_RECOVERY_ADMIN'));
    await expect(s.owner.apply('request', 2, context)).rejects.toThrow('LAST_RECOVERY_ADMIN');
    expect(s.repo.apply).not.toHaveBeenCalled();
  });
  it('rejects expired, used or changed-version approvals', async () => {
    const s = setup(),
      r = await s.owner.request(input, context);
    for (const patch of [{ usedAt: now }, { expiresAt: '2026-10-28T09:00:00Z' }, { version: 3 }]) {
      s.setRequest({ ...r, approvedBy: 'reviewer', approvedAt: now, version: 2, ...patch });
      await expect(s.owner.apply('request', 2, context)).rejects.toThrow('APPROVAL_REQUIRED');
    }
    expect(s.repo.apply).not.toHaveBeenCalled();
  });
});
