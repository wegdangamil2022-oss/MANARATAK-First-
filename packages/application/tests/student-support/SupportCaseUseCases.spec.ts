import { describe, it, expect, vi } from 'vitest';
import { SupportCaseUseCases } from '../../src/student-support/SupportCaseUseCases';
import type { SupportCase, SupportAccess } from '@manaratak/domain';
const now = '2026-10-28T10:00:00.000Z',
  student: SupportAccess = {
    actorId: 'student',
    kind: 'STUDENT',
    teamIds: [],
    allTeams: false,
    internalNotes: false,
  },
  agent: SupportAccess = {
    actorId: 'agent',
    kind: 'AGENT',
    teamIds: [],
    allTeams: true,
    internalNotes: true,
  };
const ticket: SupportCase = {
  id: 'case',
  publicId: 'SUP-case',
  studentId: 'student',
  title: 'Need help',
  category: 'OTHER',
  status: 'OPEN',
  priority: 'NORMAL',
  origin: 'STUDENT_PORTAL',
  teamId: null,
  assigneeId: null,
  version: 1,
  lastStudentMessageAt: now,
  lastPublicReplyAt: null,
  firstPublicReplyAt: null,
  firstReplyDueAt: null,
  resolutionDueAt: null,
  slaPausedAt: null,
  slaRemainingMinutes: null,
  slaBreached: false,
  slaSnapshot: null,
  resolvedAt: null,
  closedAt: null,
  createdAt: now,
  updatedAt: now,
};
function setup() {
  const repository = {
    readiness: vi.fn(async () => ({ ready: true })),
    replayCommand: vi.fn(async () => null as SupportCase | null),
    get: vi.fn(async () => ({ ...ticket })),
    assertStudent: vi.fn(),
    policy: vi.fn(async () => null),
    create: vi.fn(),
    change: vi.fn(),
    assertAssignee: vi.fn(),
    linkDuplicate: vi.fn(),
    messages: vi.fn(),
    events: vi.fn(),
  };
  const atomic = {
    execute: vi.fn(async (_d: unknown, work: (tx: unknown) => unknown) =>
      work({ boundaryId: 'support-test' }),
    ),
  };
  return {
    repository,
    atomic,
    uc: new SupportCaseUseCases(repository as never, atomic as never, () => new Date(now)),
  };
}
const context = (actorId: string, key = 'support-command-one') => ({
  actorId,
  requestId: key,
  source: 'test',
});
describe('support owner commands', () => {
  it('keeps internal note separate from first public response and public notifications', async () => {
    const s = setup();
    const r = await s.uc.reply(
      'case',
      { body: 'staff-only', internal: true, expectedVersion: 1 },
      agent,
      context('agent'),
    );
    expect(r.record.firstPublicReplyAt).toBeNull();
    expect(s.atomic.execute.mock.calls[0][0]).toMatchObject({
      action: 'SUPPORT_INTERNAL_NOTE_ADDED',
      outbox: undefined,
    });
    expect(s.repository.change.mock.calls[0][5]).toMatchObject({
      body: 'staff-only',
      visibility: 'INTERNAL',
    });
    expect(JSON.stringify(s.atomic.execute.mock.calls[0][0])).not.toContain('staff-only');
  });
  it('blocks student notes even with a forged elevated access object', async () => {
    const s = setup();
    await expect(
      s.uc.reply(
        'case',
        { body: 'private', internal: true },
        { ...student, internalNotes: true },
        context('student'),
      ),
    ).rejects.toThrow('ACCESS_DENIED');
    expect(s.repository.change).not.toHaveBeenCalled();
  });
  it('rejects stale agent edits before writing messages', async () => {
    const s = setup();
    await expect(
      s.uc.reply('case', { body: 'reply', expectedVersion: 9 }, agent, context('agent')),
    ).rejects.toThrow('VERSION_CONFLICT');
    expect(s.repository.change).not.toHaveBeenCalled();
  });
  it('serializes student reply against the latest closed case and reopens once', async () => {
    const s = setup();
    s.repository.get.mockResolvedValue({
      ...ticket,
      version: 5,
      status: 'CLOSED',
      closedAt: now,
      resolvedAt: now,
    });
    const r = await s.uc.reply('case', { body: 'More information' }, student, context('student'));
    expect(r.record).toMatchObject({
      version: 6,
      status: 'REOPENED',
      resolvedAt: null,
      closedAt: null,
    });
    expect(s.repository.change).toHaveBeenCalledWith(
      expect.anything(),
      5,
      expect.objectContaining({ type: 'STUDENT_REPLY_REOPENED' }),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ visibility: 'PUBLIC' }),
    );
  });
  it('requires explicit follow-up outside the reopen window without losing a stored message', async () => {
    const s = setup();
    s.repository.get.mockResolvedValue({
      ...ticket,
      status: 'CLOSED',
      closedAt: '2026-09-01T00:00:00Z',
    });
    await expect(
      s.uc.reply('case', { body: 'followup' }, student, context('student')),
    ).rejects.toThrow('FOLLOWUP_REQUIRED');
    expect(s.repository.change).not.toHaveBeenCalled();
  });
  it('uses authenticated student ownership, ignoring caller-supplied owner', async () => {
    const s = setup();
    await s.uc.create(
      { title: 'Need help', body: 'Question', category: 'OTHER', studentId: 'victim' },
      student,
      context('student'),
    );
    expect(s.repository.assertStudent).toHaveBeenCalledWith('student', expect.anything());
    expect(s.repository.create.mock.calls[0][0]).toMatchObject({ studentId: 'student' });
  });
  it('returns durable replay without appending a second message', async () => {
    const s = setup();
    s.repository.replayCommand.mockResolvedValue(ticket);
    const r = await s.uc.reply(
      'case',
      { body: 'same', expectedVersion: 1 },
      agent,
      context('agent'),
    );
    expect(r.replayed).toBe(true);
    expect(s.repository.change).not.toHaveBeenCalled();
  });
  it('does not infer readiness from model generation', async () => {
    const s = setup();
    s.repository.readiness.mockResolvedValue({ ready: false });
    await expect(s.uc.get('case', agent)).rejects.toThrow('SCHEMA_NOT_READY');
    expect(s.repository.get).not.toHaveBeenCalled();
  });
  it('denies a forged student case detail and keeps events scoped at repository boundary', async () => {
    const s = setup();
    await expect(s.uc.get('case', { ...student, actorId: 'other' })).rejects.toThrow('NOT_FOUND');
    s.repository.events.mockResolvedValue({ items: [], nextCursor: null });
    await s.uc.events('case', agent);
    expect(s.repository.events).toHaveBeenCalledWith('case', agent, 50, undefined);
  });
  it('validates category and assignee before persisting', async () => {
    const s = setup();
    await expect(
      s.uc.create(
        { title: 'Need help', body: 'Question', category: 'forged' },
        student,
        context('student'),
      ),
    ).rejects.toThrow('CATEGORY_INVALID');
    s.repository.assertAssignee.mockRejectedValue(Error('SUPPORT_ASSIGNEE_INELIGIBLE'));
    await expect(
      s.uc.change(
        'case',
        { expectedVersion: 1, assigneeId: 'inactive', reason: 'Review assignment' },
        agent,
        context('agent'),
      ),
    ).rejects.toThrow('INELIGIBLE');
    expect(s.repository.change).not.toHaveBeenCalled();
  });
});
