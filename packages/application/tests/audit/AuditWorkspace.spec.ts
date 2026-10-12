import { describe, it, expect, vi } from 'vitest';
import {
  AuditWorkspaceUseCases,
  validateAlertRule,
  type InvestigationCase,
} from '../../src/audit/workspace/AuditWorkspaceUseCases';
import { AuditAlertEvaluation } from '../../src/audit/workspace/AuditAlertEvaluation';
const context = { actorId: 'investigator', source: 'test' };
const baseRule = {
  name: 'Repeated failed authorization',
  enabled: true,
  category: 'AUTHORIZATION_MUTATION',
  outcome: 'FAILURE' as const,
  threshold: 3,
  windowMinutes: 5,
  cooldownMinutes: 15,
  recipientId: 'admin-a',
  templateId: 'audit-template',
};
function setup() {
  const gateway = {
      get: vi.fn(),
      list: vi.fn(),
      save: vi.fn(),
      assertReferences: vi.fn(),
      assertRecipient: vi.fn(),
    },
    atomic = {
      execute: vi.fn(async (_definition, operation) => operation({ boundaryId: 'test' })),
    };
  return { gateway, atomic, uc: new AuditWorkspaceUseCases(gateway as any, atomic as any) };
}
describe('separate audit investigation owner', () => {
  it('saves event references without rewriting original audit events', async () => {
    const s = setup();
    const row = await s.uc.createCase(
      { id: 'case1', title: 'Review request', references: ['AUD-1', 'AUD-1'] },
      context,
    );
    const data = row.data as InvestigationCase;
    expect(data.references).toEqual(['AUD-1']);
    expect(data.ownerId).toBe('investigator');
    expect(s.gateway.assertReferences).toHaveBeenCalledWith(['AUD-1'], { boundaryId: 'test' });
    expect(s.gateway.save).toHaveBeenCalledWith(row, 0, { boundaryId: 'test' });
  });
  it('cannot write when an original event reference does not exist', async () => {
    const s = setup();
    s.gateway.assertReferences.mockRejectedValue(new Error('AUDIT_CASE_REFERENCE_NOT_FOUND'));
    await expect(
      s.uc.createCase({ id: 'case1', title: 'Review', references: ['missing'] }, context),
    ).rejects.toThrow('REFERENCE_NOT_FOUND');
    expect(s.gateway.save).not.toHaveBeenCalled();
  });
  it('rejects stale case edits before any write', async () => {
    const s = setup();
    s.gateway.get.mockResolvedValue({ version: 2 });
    await expect(
      s.uc.updateCase('case1', { expectedVersion: 1, status: 'CLOSED' }, context),
    ).rejects.toThrow('VERSION_CONFLICT');
    expect(s.atomic.execute).not.toHaveBeenCalled();
  });
  it('appends immutable notes with the authenticated writer and preserves originals', async () => {
    const s = setup();
    const original = {
      id: 'note0',
      authorId: 'prior-author',
      at: '2026-01-01T00:00:00Z',
      text: 'Original note',
    };
    s.gateway.get.mockResolvedValue({
      id: 'case1',
      kind: 'CASE',
      version: 1,
      data: {
        title: 'Review',
        ownerId: 'owner',
        assigneeId: null,
        status: 'OPEN',
        references: [],
        notes: [original],
        history: [],
        legalHoldUntil: null,
      },
    });
    const row = await s.uc.updateCase(
      'case1',
      { expectedVersion: 1, note: { id: 'note1', text: 'Additional note' } },
      context,
    );
    expect((row.data as InvestigationCase).notes[0]).toEqual(original);
    expect((row.data as InvestigationCase).notes[1]).toMatchObject({
      id: 'note1',
      authorId: 'investigator',
      text: 'Additional note',
    });
    expect((row.data as InvestigationCase).history).toHaveLength(1);
  });
  it('rejects oversized reference inventories', async () => {
    const s = setup();
    await expect(
      s.uc.createCase(
        {
          id: 'case',
          title: 'Review',
          references: Array.from({ length: 101 }, (_, i) => String(i)),
        },
        context,
      ),
    ).rejects.toThrow('AUDIT_CASE_INVALID');
    expect(s.atomic.execute).not.toHaveBeenCalled();
  });
  it('saves explicit durations without applying existing-event backfills', async () => {
    const s = setup();
    await s.uc.retention({ AUTHENTICATION: 45 }, 0, context);
    expect(s.gateway.save.mock.calls[0][0].data).toEqual({ durations: { AUTHENTICATION: 45 } });
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid retention days %s', async (days) => {
    const s = setup();
    await expect(s.uc.retention({ AUTHENTICATION: days }, 0, context)).rejects.toThrow(
      'AUDIT_RETENTION_DURATION_INVALID',
    );
    expect(s.gateway.save).not.toHaveBeenCalled();
  });
});
describe('bounded saved alert rules and asynchronous isolation', () => {
  it.each([
    { threshold: 101 },
    { windowMinutes: 0 },
    { cooldownMinutes: 4 },
    { category: 'raw arbitrary query' },
    { severity: 'UNSUPPORTED' },
  ])('rejects invalid rule %j', (change) =>
    expect(() => validateAlertRule({ ...baseRule, ...change })).toThrow('AUDIT_ALERT_RULE_INVALID'),
  );
  it('does not save a rule for an ineligible notification recipient', async () => {
    const s = setup();
    s.gateway.assertRecipient.mockRejectedValue(new Error('NOTIFICATION_RECIPIENT_NOT_ELIGIBLE'));
    await expect(s.uc.saveRule('rule', baseRule, 0, context)).rejects.toThrow('NOT_ELIGIBLE');
    expect(s.atomic.execute).not.toHaveBeenCalled();
  });
  it('uses completed windows and stable cooldown buckets', async () => {
    const gateway = {
      rules: vi.fn(async () => ({
        items: [{ id: 'r', kind: 'ALERT_RULE', version: 1, data: baseRule }],
        nextCursor: null,
      })),
      count: vi.fn(async () => 3),
      deliver: vi.fn(async () => true),
    };
    const result = await new AuditAlertEvaluation(gateway as any).execute({
      limit: 25,
      now: new Date('2026-10-12T12:07:00Z'),
    });
    expect(gateway.count).toHaveBeenCalledWith(
      baseRule,
      new Date('2026-10-12T12:00:00Z'),
      new Date('2026-10-12T12:05:00Z'),
    );
    expect(gateway.deliver.mock.calls[0][1]).toEqual(new Date('2026-10-12T12:00:00Z'));
    expect(result.triggered).toBe(1);
  });
  it('isolates a notification failure and evaluates the next rule', async () => {
    const gateway = {
      rules: vi.fn(async () => ({
        items: [
          { id: 'bad', kind: 'ALERT_RULE', version: 1, data: baseRule },
          { id: 'good', kind: 'ALERT_RULE', version: 1, data: baseRule },
        ],
        nextCursor: null,
      })),
      count: vi.fn(async () => 3),
      deliver: vi
        .fn()
        .mockRejectedValueOnce(new Error('provider-secret'))
        .mockResolvedValueOnce(true),
    };
    const result = await new AuditAlertEvaluation(gateway as any).execute({ limit: 25 });
    expect(result).toMatchObject({ failed: 1, triggered: 1 });
    expect(gateway.deliver).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(result)).not.toContain('provider-secret');
  });
  it('does not create an intent below threshold or for disabled rules', async () => {
    const gateway = {
      rules: vi.fn(async () => ({
        items: [
          { id: 'r', kind: 'ALERT_RULE', version: 1, data: { ...baseRule, enabled: false } },
          { id: 'r2', kind: 'ALERT_RULE', version: 1, data: baseRule },
        ],
        nextCursor: null,
      })),
      count: vi.fn(async () => 2),
      deliver: vi.fn(),
    };
    await new AuditAlertEvaluation(gateway as any).execute({ limit: 25 });
    expect(gateway.count).toHaveBeenCalledTimes(1);
    expect(gateway.deliver).not.toHaveBeenCalled();
  });
});

describe('audit workspace owner namespaces', () => {
  it('cannot poison the retention setting through a case identifier', async () => {
    const s = setup();
    const row = await s.uc.createCase(
      { id: 'audit-retention-policy', title: 'Independent case', references: [] },
      context,
    );
    expect(row.id).toBe('audit-case:audit-retention-policy');
    expect(row.kind).toBe('CASE');
  });
  it('places saved alert identifiers in their own namespace', async () => {
    const s = setup();
    await s.uc.saveRule('audit-retention-policy', baseRule, 0, context);
    expect(s.gateway.save.mock.calls[0][0].id).toBe('audit-alert:audit-retention-policy');
  });
});
