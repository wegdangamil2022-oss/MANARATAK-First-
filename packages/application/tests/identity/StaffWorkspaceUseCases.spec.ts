import { describe, it, expect, vi } from 'vitest';
import { StaffWorkspaceUseCases } from '../../src/identity/StaffWorkspaceUseCases';
const tx = { boundaryId: 'staff-boundary' };
function setup(ready = true) {
  const repository = {
    readiness: vi.fn(async () => ({
      ready,
      missingTables: ready ? [] : ['StaffMembershipRecord'],
    })),
    organization: vi.fn(async () => ({
      departments: [
        { id: 'd1', parentId: null, status: 'ACTIVE' },
        { id: 'd2', parentId: 'd1', status: 'ACTIVE' },
      ],
      titles: [{ id: 'title', departmentId: 'd2', status: 'ACTIVE' }],
    })),
    eligibleIdentity: vi.fn(async () => true),
    get: vi.fn(async () => ({ id: 'member', status: 'DRAFT' })),
    saveDraft: vi.fn(),
    recordEvent: vi.fn(),
    cancelDraft: vi.fn(async () => true),
    saveDepartment: vi.fn(),
    saveTitle: vi.fn(),
    list: vi.fn(),
    events: vi.fn(),
  };
  const atomic = { execute: vi.fn(async (_definition: any, work: any) => work(tx)) };
  return {
    repository,
    atomic,
    owner: new StaffWorkspaceUseCases(repository as any, atomic as any),
  };
}
const draft = {
  id: 'member',
  kind: 'EMPLOYEE' as const,
  displayName: 'Example',
  email: 'example@invalid.test',
  reason: 'Reviewed draft',
};
const context = { actorId: 'manager', correlationId: 'correlation' };
describe('Staff drafts and structure owner', () => {
  it('fails closed when real storage has not been initialized', async () => {
    const s = setup(false);
    await expect(s.owner.createDraft(draft, context)).rejects.toThrow('STAFF_SCHEMA_NOT_READY');
    expect(s.atomic.execute).not.toHaveBeenCalled();
    expect(s.repository.saveDraft).not.toHaveBeenCalled();
  });
  it('saves draft and lifecycle event on the same audited transaction without creating identity/access', async () => {
    const s = setup();
    await s.owner.createDraft(draft, context);
    expect(s.repository.saveDraft).toHaveBeenCalledWith(
      draft,
      expect.stringMatching(/^EMP-[A-F0-9]{12}$/),
      'manager',
      tx,
    );
    expect(s.repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'DRAFT_CREATED', membershipId: 'member' }),
      tx,
    );
    expect(JSON.stringify(s.atomic.execute.mock.calls[0][0])).not.toContain(draft.email);
  });
  it('does not duplicate canonical identity profile in a linked draft', async () => {
    const s = setup();
    await expect(
      s.owner.createDraft({ ...draft, identityId: 'existing' }, context),
    ).rejects.toThrow('STAFF_IDENTITY_SOURCE_REQUIRED');
    expect(s.repository.saveDraft).not.toHaveBeenCalled();
  });
  it('checks identity eligibility in the same transaction', async () => {
    const s = setup();
    s.repository.eligibleIdentity.mockResolvedValue(false);
    await expect(
      s.owner.createDraft(
        { id: 'member', identityId: 'existing', kind: 'EMPLOYEE', reason: 'Reviewed' },
        context,
      ),
    ).rejects.toThrow('STAFF_IDENTITY_NOT_ELIGIBLE');
    expect(s.repository.eligibleIdentity).toHaveBeenCalledWith('existing', tx);
    expect(s.repository.saveDraft).not.toHaveBeenCalled();
  });
  it('rejects a title from another department and invalid dates', async () => {
    const s = setup();
    await expect(
      s.owner.createDraft({ ...draft, departmentId: 'd1', jobTitleId: 'title' }, context),
    ).rejects.toThrow('STAFF_TITLE_DEPARTMENT_MISMATCH');
    await expect(
      s.owner.createDraft(
        { ...draft, startsAt: '2026-10-29T00:00:00Z', endsAt: '2026-10-28T00:00:00Z' },
        context,
      ),
    ).rejects.toThrow('STAFF_DATES_INVALID');
    expect(s.repository.saveDraft).not.toHaveBeenCalled();
  });
  it('rejects hierarchy cycles before a write', async () => {
    const s = setup();
    await expect(
      s.owner.department(
        { id: 'd1', name: 'One', parentId: 'd2', version: 1 },
        'Reviewed',
        context,
      ),
    ).rejects.toThrow('STAFF_DEPARTMENT_CYCLE');
    expect(s.repository.saveDepartment).not.toHaveBeenCalled();
  });
  it('rejects self management or a draft manager', async () => {
    const s = setup();
    await expect(s.owner.createDraft({ ...draft, managerId: 'member' }, context)).rejects.toThrow(
      'STAFF_MANAGER_INVALID',
    );
    expect(s.repository.saveDraft).not.toHaveBeenCalled();
  });
  it('cannot cancel an active, stale or already cancelled membership', async () => {
    const s = setup();
    s.repository.cancelDraft.mockResolvedValue(false);
    await expect(s.owner.cancelDraft('member', 1, 'Reviewed', context)).rejects.toThrow(
      'STAFF_STALE_OR_NOT_DRAFT',
    );
    expect(s.repository.recordEvent).not.toHaveBeenCalled();
  });
});
