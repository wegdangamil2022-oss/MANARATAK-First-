import { describe, expect, it } from 'vitest';
import { Policy, ResourceUrn, Action } from '@manaratak/domain';
import { DefaultPolicyEvaluator } from '../../src/authorization/DefaultPolicyEvaluator';

const context = (extra: Record<string, unknown> = {}) => ({
  identityId: 'identity-1',
  resourceUrn: new ResourceUrn('admin:settings'),
  action: new Action('manage'),
  ...extra,
});

const policy = (ruleType: string, ruleConfiguration: string) => new Policy({
  id: `policy-${ruleType}`,
  name: ruleType,
  description: 'test policy',
  ruleType,
  ruleConfiguration,
});

describe('DefaultPolicyEvaluator', () => {
  const evaluator = new DefaultPolicyEvaluator();

  it('evaluates TIME rules deterministically and denies outside the window', async () => {
    await expect(evaluator.evaluate(policy('TIME', '09:00-17:00'), context({ requestTime: new Date('2026-08-25T10:00:00Z') })))
      .resolves.toMatchObject({ isGranted: true });
    await expect(evaluator.evaluate(policy('TIME', '09:00-17:00'), context({ requestTime: new Date('2026-08-25T18:00:00Z') })))
      .resolves.toMatchObject({ isGranted: false });
  });

  it('supports timezone/day constrained TIME rules', async () => {
    const rule = JSON.stringify({ start: '09:00', end: '17:00', timezone: 'Asia/Riyadh', daysOfWeek: [2] });
    const decision = await evaluator.evaluate(policy('TIME', rule), context({ requestTime: new Date('2026-08-25T09:00:00Z') }));
    expect(decision.isGranted).toBe(true); // Tuesday, 12:00 in Riyadh
  });

  it('evaluates IP allowlists using server-derived request context', async () => {
    expect((await evaluator.evaluate(policy('IP', '203.0.113.10,203.0.113.11'), context({ ip: '203.0.113.10' }))).isGranted).toBe(true);
    expect((await evaluator.evaluate(policy('IP', '203.0.113.10,203.0.113.11'), context({ ip: '203.0.113.99' }))).isGranted).toBe(false);
  });

  it('fails closed for unknown, malformed, or context-less rules', async () => {
    expect((await evaluator.evaluate(policy('UNKNOWN', '{}'), context())).isGranted).toBe(false);
    expect((await evaluator.evaluate(policy('TIME', '{}'), context())).isGranted).toBe(false);
    expect((await evaluator.evaluate(policy('IP', 'not-an-ip'), context({ ip: '203.0.113.10' }))).isGranted).toBe(false);
    expect((await evaluator.evaluate(policy('IP', '203.0.113.10'), context())).isGranted).toBe(false);
  });
});
