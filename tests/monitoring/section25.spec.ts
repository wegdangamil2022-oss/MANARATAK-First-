import { parseHistory } from '../../apps/admin/src/features/health/HealthHistoryContract';
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { HealthStatus } from '@manaratak/core';
import { operationalProbeIds } from '@manaratak/config';
import { MonitoringService } from '../../packages/infrastructure/src/monitoring/MonitoringService';
import { OtlpHttpMonitoringProvider } from '../../packages/infrastructure/src/monitoring/OtlpHttpMonitoringProvider';
import { SignedProviderHttpClient } from '../../packages/infrastructure/src/provider-http/SignedProviderHttpClient';
import { MonitoringRouter } from '../../apps/api/src/presentation/api/router/MonitoringRouter';
import { sanitizeDiagnostic } from '../../apps/api/src/presentation/monitoring/DiagnosticSanitizer';
import {
  freshWorkerEvidence,
  successfulPublicWebStatus,
} from '../../apps/api/src/presentation/monitoring/RuntimeHealthPolicy';
import { HealthObservationHistory } from '../../apps/api/src/presentation/monitoring/HealthObservationHistory';
import { WorkerHealthObservation } from '../../apps/api/src/infrastructure/runtime/WorkerHealthObservation';
import { parseHealthOverview } from '../../apps/admin/src/features/health/HealthOverviewContract';
const now = () => new Date().toISOString();
const report = () => ({
  ready: true,
  blockerCount: 0,
  warningCount: 0,
  checkedAt: now(),
  findings: [],
});
function serviceGraph(
  evidence: 'READ_ONLY_OPERATION' | 'CONFIGURATION_ONLY' = 'READ_ONLY_OPERATION',
) {
  const service = new MonitoringService(undefined, { cacheMs: 0 });
  for (const name of operationalProbeIds)
    service.registerIndicator({
      name,
      evidenceKind: evidence,
      checkHealth: async () => ({
        status: HealthStatus.UP,
        timestamp: now(),
        details: { capabilityStatus: 'OBSERVED' },
      }),
    });
  return service;
}
function app(service: MonitoringService, runtimeMode = 'production', diagnosticsEnabled = true) {
  const app = express();
  app.use(
    MonitoringRouter.create({
      monitoringService: service,
      runtimeMode,
      diagnosticsEnabled,
      productionReadinessReport: report(),
    }),
  );
  return app;
}
describe('section 25 required readiness and security', () => {
  for (const optional of [true, false])
    for (const status of Object.values(HealthStatus)) {
      it(`${optional ? 'optional' : 'required'} ${status} is reduced consistently`, async () => {
        const service = new MonitoringService();
        service.registerIndicator({
          name: 'owner',
          isOptional: optional,
          checkHealth: async () => ({ status, timestamp: now() }),
        });
        const readiness = await service.getReadiness();
        expect(readiness.status).toBe(
          optional || status === HealthStatus.UP ? HealthStatus.UP : HealthStatus.DOWN,
        );
        expect((readiness.details!.owner as any).optional).toBe(optional);
        expect((await request(app(service)).get('/health/readiness')).status).toBe(
          optional || status === HealthStatus.UP ? 200 : 503,
        );
      });
    }
  it('fails closed for malformed and stale probes', async () => {
    for (const result of [
      null,
      {},
      { status: 'HEALTHY', timestamp: now() },
      { status: 'UP', timestamp: '2000-01-01' },
    ]) {
      const service = new MonitoringService();
      service.registerIndicator({ name: 'invalid', checkHealth: async () => result as any });
      expect((await service.getReadiness()).status).toBe('DOWN');
    }
  });
  it('bounds hanging probes, keeps unrelated probes and prevents overlapping pending attempts', async () => {
    const hung = vi.fn(() => new Promise<any>(() => {}));
    const service = new MonitoringService(undefined, {
      probeTimeoutMs: 10,
      totalTimeoutMs: 30,
      cacheMs: 0,
    });
    service.registerIndicator({ name: 'hung', checkHealth: hung });
    service.registerIndicator({
      name: 'healthy',
      checkHealth: async () => ({ status: HealthStatus.UP, timestamp: now() }),
    });
    const first = await service.getReadiness(),
      second = await service.getReadiness();
    expect(first.status).toBe('DOWN');
    expect((first.details!.healthy as any).status).toBe('UP');
    expect((second.details!.hung as any).error).toBe('HEALTH_PROBE_PREVIOUS_ATTEMPT_PENDING');
    expect(hung).toHaveBeenCalledTimes(1);
  });
  it('single-flights concurrent polls and collects overview once', async () => {
    const check = vi.fn(async () => ({ status: HealthStatus.UP, timestamp: now() }));
    const service = new MonitoringService();
    service.registerIndicator({ name: 'database', checkHealth: check });
    await Promise.all([service.getReadiness(), service.getReadiness(), service.getReadiness()]);
    expect(check).toHaveBeenCalledTimes(1);
    const read = vi.spyOn(service, 'getReadiness');
    await request(app(service)).get('/overview');
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('rejects duplicate registration', () => {
    const service = serviceGraph();
    expect(() => service.registerIndicator({ name: 'database', checkHealth: vi.fn() })).toThrow();
  });
  it('public endpoints never expose provider, error, identity or nested diagnostics', async () => {
    const service = new MonitoringService();
    service.registerIndicator({
      name: 'internal-secret-name',
      checkHealth: async () => ({
        status: HealthStatus.DOWN,
        timestamp: now(),
        error: 'Bearer synthetic-secret',
        details: {
          nested: { token: 'synthetic-secret', email: 'student@example.test', queue: 'internal' },
        },
      }),
    });
    for (const path of ['/health', '/health/readiness', '/health/liveness']) {
      const response = await request(app(service, 'production', false)).get(path);
      expect(Object.keys(response.body).sort()).toEqual([
        'code',
        'protocolVersion',
        'status',
        'timestamp',
      ]);
      expect(JSON.stringify(response.body)).not.toMatch(/secret|student|queue|internal/);
    }
    expect((await request(app(service, 'production', false)).get('/overview')).status).toBe(404);
    expect((await request(app(service, 'production', false)).get('/history')).status).toBe(404);
  });
  it('recursively sanitizes arrays, URLs, contact details, cycles and bounded payloads', () => {
    const data: any = {
      safe: 10,
      nested: {
        credentials: 'synthetic-secret',
        message: 'Bearer synthetic-secret https://provider.test/path?q=secret student@example.test',
      },
      array: [{ token: 'synthetic-secret', safe: 'ok' }],
    };
    data.self = data;
    const sanitized = JSON.stringify(sanitizeDiagnostic(data));
    expect(sanitized).not.toMatch(/synthetic-secret|provider\.test|student@example/);
    expect(sanitized).toContain('CIRCULAR');
    expect(sanitized).toContain('ok');
    expect(
      JSON.stringify(sanitizeDiagnostic({ huge: Array.from({ length: 10_000 }, () => data) }))
        .length,
    ).toBeLessThan(20_000);
  });
  for (const environment of ['development', 'test', 'staging', 'preview'])
    it(`does not approve production release in ${environment}`, async () => {
      const res = await request(app(serviceGraph(), environment)).get('/overview');
      expect(res.body.releaseReady).toBe(false);
      expect(res.body.releaseGate.environmentEligible).toBe(false);
    });
  it('accepts fresh owner evidence, counts extra probes and parses the complete v2 response', async () => {
    const service = serviceGraph();
    service.registerIndicator({
      name: 'extra-owner',
      isOptional: true,
      checkHealth: async () => ({ status: HealthStatus.UP, timestamp: now() }),
    });
    const res = await request(app(service)).get('/overview');
    expect(res.body.releaseReady).toBe(true);
    expect(res.body.coverage.matchedCount).toBe(operationalProbeIds.length);
    expect(res.body.coverage.extraCount).toBe(1);
    expect(parseHealthOverview(res.body).protocolVersion).toBe(2);
    for (const bad of [
      null,
      { ...res.body, protocolVersion: 1 },
      { ...res.body, components: null },
      { ...res.body, releaseGate: null },
      { ...res.body, productionReadiness: null },
    ])
      expect(() => parseHealthOverview(bad)).toThrow('SCHEMA_MISMATCH');
  });
  it('configured names without operational evidence cannot approve release', async () => {
    const res = await request(app(serviceGraph('CONFIGURATION_ONLY'))).get('/overview');
    expect(res.body.releaseReady).toBe(false);
    expect(res.body.coverage.requiredUnverified).toHaveLength(operationalProbeIds.length);
  });
});
describe('section 25 non-mutating provider and worker evidence', () => {
  for (const status of [200, 204, 301, 302, 401, 403, 404, 429, 500])
    it(`public-web ${status} uses exact success policy`, () =>
      expect(successfulPublicWebStatus(status)).toBe([200, 204].includes(status)));
  it('provider handshakes are authenticated GETs and require scoped fresh authorization', async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            protocolVersion: 1,
            checkedAt: now(),
            capabilities: { 'asset-storage': { ready: true, authorized: true } },
          }),
          { status: 200 },
        ),
    );
    const client = new SignedProviderHttpClient({
      baseUrl: 'https://provider.test',
      apiKey: 'synthetic-test-key',
      signingSecret: 'x'.repeat(32),
      fetchImpl,
    });
    expect((await client.checkReadiness('asset-storage')).status).toBe('UP');
    expect(fetchImpl.mock.calls[0][1].method).toBe('GET');
    expect(fetchImpl.mock.calls[0][1].body).toBeUndefined();
    expect((await client.checkReadiness('malware-scanner')).status).toBe('DOWN');
  });
  for (const status of [401, 403, 404, 500])
    it(`provider ${status} does not become ready`, async () => {
      const client = new SignedProviderHttpClient({
        baseUrl: 'https://provider.test',
        apiKey: 'synthetic',
        signingSecret: 'x'.repeat(32),
        fetchImpl: async () => new Response('{}', { status }),
      });
      expect((await client.checkReadiness('asset-storage')).status).toBe('DOWN');
    });
  it('telemetry needs a successful export and expires old evidence', async () => {
    const provider = new OtlpHttpMonitoringProvider({
      endpoint: 'https://telemetry.test',
      serviceName: 'test',
      environment: 'test',
      periodicExport: false,
    });
    expect((await provider.getReadiness()).status).toBe('DEGRADED');
    await provider.forceFlush();
    expect((await provider.getReadiness()).status).toBe('DEGRADED');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    try {
      provider.incrementCounter('actual.test.observation');
      await provider.forceFlush();
      expect((await provider.getReadiness()).status).toBe('UP');
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
      expect((await provider.getReadiness()).status).toBe('DEGRADED');
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
  it('worker health rejects not-started, stale and failed observations while allowing a fresh empty-queue poll', () => {
    expect(freshWorkerEvidence({ state: 'IDLE' }, 30_000)).toBe(false);
    expect(
      freshWorkerEvidence(
        { state: 'RUNNING', observedAt: new Date(Date.now() - 60_000).toISOString() },
        30_000,
      ),
    ).toBe(false);
    expect(freshWorkerEvidence({ state: 'IDLE', lastPollAt: now() }, 30_000)).toBe(true);
    expect(freshWorkerEvidence({ state: 'STOPPED', observedAt: now() }, 30_000)).toBe(false);
  });
  it('cluster observations are isolated by deployment and readable on another API pod', async () => {
    const values = new Map<string, string>();
    const redis = {
      set: async (key: string, value: string) => values.set(key, value),
      get: async (key: string) => values.get(key),
    };
    const scope = {
      environment: 'production',
      apiOrigin: 'https://api.test',
      revision: 'release-a',
    };
    const worker = new WorkerHealthObservation(redis, scope),
      api = new WorkerHealthObservation(redis, scope);
    await worker.publish('owner-domain-outbox', { state: 'RUNNING', lastSuccessAt: now() });
    expect(freshWorkerEvidence(await api.read('owner-domain-outbox'), 30_000)).toBe(true);
    expect(
      (
        await new WorkerHealthObservation(redis, { ...scope, revision: 'release-b' }).read(
          'owner-domain-outbox',
        )
      ).state,
    ).toBe('NOT_STARTED');
    expect((await new WorkerHealthObservation(redis, {}).read('owner-domain-outbox')).state).toBe(
      'UNAVAILABLE',
    );
  });
  it('history records real status transitions, exposes partial coverage and never raw details', () => {
    const history = new HealthObservationHistory();
    expect(history.read('1h').availability).toBe('UNAVAILABLE');
    const at = Date.now() - 120_000;
    for (const [index, status] of [HealthStatus.UP, HealthStatus.DOWN, HealthStatus.UP].entries())
      history.record({
        checkedAt: new Date(at + index * 31_000).toISOString(),
        components: [{ id: 'database', status }],
      });
    const result = history.read('1h');
    expect(result.samples).toHaveLength(3);
    expect(result.continuousCoverage).toBe(false);
    expect(result.samples.map((s) => s.components[0].status)).toEqual(['UP', 'DOWN', 'UP']);
  });
});


describe('section 25 follow-up evidence consistency', () => {
  it('does not accept a green release contrary to its report or coverage', async () => {
    const response = await request(app(serviceGraph())).get('/overview');
    for (const edit of [
      (x: any) => { x.productionReadiness.ready = false; },
      (x: any) => { x.productionReadiness.blockerCount = 1; },
      (x: any) => { x.coverage.missingCount = 1; },
      (x: any) => { x.coverage.requiredUnverified = ['database']; },
      (x: any) => { x.coverage.matchedCount -= 1; },
    ]) {
      const value = structuredClone(response.body); edit(value);
      expect(() => parseHealthOverview(value)).toThrow('SCHEMA_MISMATCH');
    }
  });
  it('returns detached history samples so consumers cannot rewrite previous evidence', () => {
    const history = new HealthObservationHistory();
    history.record({ checkedAt: now(), components: [{ id: 'database', status: HealthStatus.DOWN }] });
    const first = history.read('1h'); first.samples[0].components[0].status = HealthStatus.UP;
    first.samples[0].checkedAt = 'invalid';
    expect(history.read('1h').samples[0].components[0].status).toBe(HealthStatus.DOWN);
    expect(history.read('1h').samples[0].checkedAt).not.toBe('invalid');
  });
  it('rejects invalid or future history instead of suppressing later genuine observations', () => {
    const history = new HealthObservationHistory();
    for (const checkedAt of ['invalid', new Date(Date.now() + 86400000).toISOString()])
      expect(() => history.record({ checkedAt, components: [] })).toThrow('HEALTH_HISTORY_SAMPLE_INVALID');
    history.record({ checkedAt: now(), components: [{ id: 'database', status: HealthStatus.UP }] });
    expect(history.read('1h').samples).toHaveLength(1);
  });
  it('rejects repeated component identities in a historical snapshot', () => {
    const history = new HealthObservationHistory();
    expect(() => history.record({ checkedAt: now(), components: [{ id: 'database', status: HealthStatus.UP }, { id: 'database', status: HealthStatus.DOWN }] })).toThrow('HEALTH_HISTORY_SAMPLE_INVALID');
    expect(history.read('1h').availability).toBe('UNAVAILABLE');
  });
  const page = () => ({ protocolVersion: 2, availability: 'PARTIAL_OBSERVATIONS', scope: 'PROCESS_LOCAL_SESSION', window: '1h', total: 1, nextCursor: null, samples: [{ checkedAt: now(), components: [{ id: 'database', status: 'DOWN' }] }] });
  it('accepts a bounded history page for the selected window', () => expect(parseHistory(page(), '1h').total).toBe(1));
  it('rejects a history response from another requested window', () => expect(() => parseHistory(page(), '7d')).toThrow('SCHEMA_MISMATCH'));
  it('rejects malformed history totals, cursor and availability', () => {
    for (const patch of [{ total: NaN }, { total: 10001 }, { total: 0 }, { nextCursor: 'invalid' }, { availability: 'UNKNOWN' }, { availability: 'UNAVAILABLE' }])
      expect(() => parseHistory({ ...page(), ...patch })).toThrow('SCHEMA_MISMATCH');
  });
});

it('rejects coverage counters and identities inconsistent with actual components', async () => {
  const response = await request(app(serviceGraph())).get('/overview');
  for (const edit of [
    (x: any) => { x.coverage.expectedCount += 1; },
    (x: any) => { x.coverage.monitored.push(x.coverage.monitored[0]); },
    (x: any) => { x.coverage.extraProbes.push('invented'); },
    (x: any) => { x.coverage.operationalCount = 0.5; },
    (x: any) => { x.summary.monitoredComponents += 1; },
  ]) { const value = structuredClone(response.body); value.releaseReady = false; edit(value); expect(() => parseHealthOverview(value)).toThrow('SCHEMA_MISMATCH'); }
});
