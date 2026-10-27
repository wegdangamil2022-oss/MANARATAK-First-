import { describe, expect, it } from 'vitest';
import { healthSnapshot } from './healthFixtures';
import {
  healthFreshness,
  healthIssues,
  healthView,
  serviceGroup,
  sortServices,
  mergeHealthHistory,
  healthExport,
} from '../../src/features/health/healthPresentation';
describe('Health evidence and navigation decisions', () => {
  it('expires at the observation boundary and rejects a future clock', () => {
    const at = '2026-10-27T12:00:00.000Z',
      now = Date.parse(at);
    expect(healthFreshness(at, now + 30_000)).toBe('FRESH');
    expect(healthFreshness(at, now + 30_001)).toBe('STALE');
    expect(healthFreshness(at, now - 1001)).toBe('UNAVAILABLE');
    expect(healthFreshness(at, now, true)).toBe('STALE');
  });
  it('keeps optional deterioration visible without changing the source release decision', () => {
    const snapshot = healthSnapshot();
    snapshot.components[0] = {
      ...snapshot.components[0],
      optional: true,
      status: 'DOWN',
      operational: false,
    };
    expect(healthIssues(snapshot)[0]).toMatchObject({
      severity: 'WARNING',
      componentId: 'database',
      source: 'component',
    });
    expect(snapshot.releaseReady).toBe(true);
    expect(snapshot.runtimeStatus).toBe('UP');
  });
  it('does not collapse different sources or invent a component for a missing probe', () => {
    const snapshot = healthSnapshot();
    snapshot.components[0].status = 'DOWN';
    snapshot.coverage.missingProbes = ['redis'];
    snapshot.coverage.requiredUnverified = ['database'];
    snapshot.productionReadiness.findings = [
      {
        id: 'database',
        severity: 'BLOCKER',
        area: 'Unknown',
        message: 'Owner finding',
        recommendation: 'Consult owner',
      },
    ];
    const issues = healthIssues(snapshot);
    expect(new Set(issues.map((i) => i.key)).size).toBe(4);
    expect(issues.find((i) => i.id === 'missing:redis')?.componentId).toBe('redis');
    expect(issues.find((i) => i.source === 'production')?.componentId).toBeUndefined();
  });
  it('allows only known destinations and keeps legacy incident links honest', () => {
    expect(healthView('incidents')).toBe('issues');
    expect(healthView('COVERAGE')).toBe('reports');
    expect(healthView('evil')).toBe('overview');
    expect(serviceGroup('new-probe')).toBe('other');
  });
  it('sorts required outages ahead of optional outages and healthy services', () => {
    const c = healthSnapshot().components[0];
    expect(
      sortServices([
        { ...c, id: 'up' },
        { ...c, id: 'optional', status: 'DOWN', optional: true },
        { ...c, id: 'down', status: 'DOWN' },
      ]).map((i) => i.id),
    ).toEqual(['down', 'optional', 'up']);
  });
});
describe('Partial health history provenance', () => {
  const page = (startedAt?: string) => ({
    protocolVersion: 2 as const,
    availability: 'PARTIAL_OBSERVATIONS',
    scope: 'PROCESS_LOCAL_SESSION',
    window: '7d',
    nextCursor: null,
    total: 2,
    startedAt,
    samples: [
      { checkedAt: '2026-10-27T11:00:00.000Z', components: [{ id: 'database', status: 'UP' }] },
    ],
  });
  it('replaces pages from an unknown or different process instead of claiming a distributed history', () => {
    expect(mergeHealthHistory(page('a'), page('b'), true).reset).toBe(true);
    expect(mergeHealthHistory(page(), page(), true).history.samples).toHaveLength(1);
  });
  it('deduplicates same-session pages and bounds accumulated browser data', () => {
    expect(mergeHealthHistory(page('a'), page('a'), true).history.samples).toHaveLength(1);
  });
});
it('exports only the approved diagnostic envelope and preserves observation time', () => {
  const snapshot = { ...healthSnapshot(), secretExtra: 'do-not-export' };
  const exported = healthExport(snapshot, 'STALE', Date.parse('2026-10-27T12:01:00Z'));
  expect(JSON.stringify(exported)).not.toContain('do-not-export');
  expect(exported.checkedAt).toBe(snapshot.checkedAt);
  expect(exported.observationStale).toBe(true);
  expect(exported.exportedAt).toBe('2026-10-27T12:01:00.000Z');
});
