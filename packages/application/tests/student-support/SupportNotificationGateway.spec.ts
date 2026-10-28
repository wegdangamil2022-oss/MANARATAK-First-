import { describe, it, expect, vi } from 'vitest';
import { SupportNotificationGateway } from '../../src/student-support/SupportNotificationGateway';
import type { TransactionalOutboxEntry } from '@manaratak/domain';
const entry = {
  id: 'support-event',
  domain: 'STUDENT_SUPPORT',
  eventType: 'StudentSupportNotificationRequested',
  aggregate: { aggregateType: 'SUPPORT_CASE', aggregateId: 'case' },
  payload: { caseId: 'case', audience: 'STUDENT', publicEvent: 'REPLY' },
} as TransactionalOutboxEntry;
function setup() {
  let stored: unknown = null;
  const intents = { createIntent: vi.fn() },
    templates = {
      findById: vi.fn(async () => stored),
      save: vi.fn(async (value: unknown) => {
        stored = value;
      }),
    },
    recipients = vi.fn(async () => ['student']);
  return {
    intents,
    templates,
    recipients,
    gateway: new SupportNotificationGateway(intents as never, templates as never, recipients),
  };
}
describe('support in-app notification bridge', () => {
  it('uses stable per-recipient intent identity, a generic body and a protected destination', async () => {
    const s = setup();
    await s.gateway.deliver(
      { ...entry, payload: { ...entry.payload, body: 'private question' } },
      { idempotencyKey: entry.id },
    );
    await s.gateway.deliver(entry, { idempotencyKey: entry.id });
    expect(s.templates.save).toHaveBeenCalledTimes(1);
    expect(s.templates.save.mock.calls[0][0]).toMatchObject({ channels: [expect.anything()] });
    const first = s.intents.createIntent.mock.calls[0][0];
    expect(first).toEqual(s.intents.createIntent.mock.calls[1][0]);
    expect(first.variables.actionUrl).toBe('/student?tab=support&case=case');
    expect(JSON.stringify(first)).not.toContain('private question');
    expect(s.templates.save).toHaveBeenCalledWith(expect.anything(), { createOnly: true });
  });
  it('does not turn internal notes into public delivery', async () => {
    const s = setup();
    await s.gateway.deliver(
      { ...entry, eventType: 'SUPPORT_INTERNAL_NOTE_ADDED' },
      { idempotencyKey: entry.id },
    );
    expect(s.recipients).not.toHaveBeenCalled();
    expect(s.intents.createIntent).not.toHaveBeenCalled();
  });
  it('retains unassigned work as a retryable failure instead of claiming delivery', async () => {
    const s = setup();
    s.recipients.mockResolvedValue([]);
    await expect(s.gateway.deliver(entry, { idempotencyKey: entry.id })).rejects.toThrow(
      'RECIPIENT_UNASSIGNED',
    );
    expect(s.intents.createIntent).not.toHaveBeenCalled();
  });
  it('rejects mismatched owner envelopes and idempotency receipts', async () => {
    const s = setup();
    await expect(
      s.gateway.deliver(
        { ...entry, payload: { ...entry.payload, caseId: 'other' } },
        { idempotencyKey: entry.id },
      ),
    ).rejects.toThrow('ENVELOPE_INVALID');
    await expect(s.gateway.deliver(entry, { idempotencyKey: 'other' })).rejects.toThrow(
      'ENVELOPE_INVALID',
    );
  });
});
