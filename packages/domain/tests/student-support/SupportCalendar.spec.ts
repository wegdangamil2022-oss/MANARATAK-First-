import { describe, it, expect } from 'vitest';
import {
  supportBusinessDeadline,
  supportBusinessMinutesBetween,
  validateSupportCalendar,
} from '../../src/student-support/SupportCalendar';
import {
  assertSupportTransition,
  canReadSupportCase,
  supportNeedsReply,
} from '../../src/student-support/SupportCase';
const calendar = {
  timeZone: 'America/New_York',
  weekdays: [1, 2, 3, 4, 5],
  opensAtMinute: 540,
  closesAtMinute: 1020,
  holidays: [],
};
describe('support business calendar and access invariants', () => {
  it('crosses DST weekend using local business hours, not elapsed 24-hour days', () => {
    expect(supportBusinessDeadline(new Date('2026-03-06T21:00:00Z'), 120, calendar)).toBe(
      '2026-03-09T14:00:00.000Z',
    );
  });
  it('skips holidays and measures only remaining business minutes', () => {
    const policy = { ...calendar, holidays: ['2026-03-09'] };
    expect(supportBusinessDeadline(new Date('2026-03-06T21:00:00Z'), 120, policy)).toBe(
      '2026-03-10T14:00:00.000Z',
    );
    expect(
      supportBusinessMinutesBetween(
        new Date('2026-03-06T21:00:00Z'),
        new Date('2026-03-10T14:00:00Z'),
        policy,
      ),
    ).toBe(120);
  });
  it.each([
    { ...calendar, timeZone: 'invalid' },
    { ...calendar, weekdays: [] },
    { ...calendar, holidays: ['2026-99-99'] },
    { ...calendar, opensAtMinute: 1100 },
  ])('fails invalid calendar without guessed deadlines', (policy) => {
    expect(() => validateSupportCalendar(policy)).toThrow('CALENDAR_INVALID');
  });
  it('keeps zero remaining time at the pause instant and rejects silently truncated horizons', () => {
    const pause = new Date('2026-03-07T21:00:00Z');
    expect(supportBusinessDeadline(pause, 0, calendar)).toBe(pause.toISOString());
    expect(() => supportBusinessMinutesBetween(pause, new Date('2028-01-01Z'), calendar)).toThrow(
      'HORIZON_EXCEEDED',
    );
  });
  it('rejects invalid status shortcuts', () => {
    expect(() => assertSupportTransition('NEW', 'CLOSED')).toThrow('TRANSITION_INVALID');
    expect(() => assertSupportTransition('RESOLVED', 'REOPENED')).not.toThrow();
  });
  it('does not infer team scope from being a support agent', () => {
    const record = { studentId: 'student-a', teamId: 'team-a', assigneeId: 'agent-a' };
    expect(
      canReadSupportCase(record, {
        actorId: 'agent-b',
        kind: 'AGENT',
        allTeams: false,
        teamIds: [],
        internalNotes: false,
      }),
    ).toBe(false);
    expect(
      canReadSupportCase(record, {
        actorId: 'student-b',
        kind: 'STUDENT',
        allTeams: true,
        teamIds: ['team-a'],
        internalNotes: true,
      }),
    ).toBe(false);
  });
  it('does not count a resolved case as awaiting a reply', () => {
    expect(
      supportNeedsReply({
        lastStudentMessageAt: '2026-01-02',
        lastPublicReplyAt: null,
        status: 'RESOLVED',
      }),
    ).toBe(false);
  });
});
