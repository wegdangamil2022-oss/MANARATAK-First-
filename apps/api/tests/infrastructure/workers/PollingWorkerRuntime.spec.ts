import { createContainer, asValue } from 'awilix';
import type { IConfigurationService } from '@manaratak/core';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { startPollingWorkers, stopPollingWorkers } from '../../../src/infrastructure/workers/PollingWorkerRuntime';

beforeEach(() => vi.useFakeTimers());
afterEach(async () => { await stopPollingWorkers(); vi.useRealTimers(); vi.restoreAllMocks(); });

function fixture(enabled = true) {
  const worker = { runSettingsOnce: vi.fn().mockResolvedValue(undefined), runCareerOnce: vi.fn().mockResolvedValue(undefined), runServicesOnce: vi.fn().mockResolvedValue(undefined) };
  const registry = { started: vi.fn(), success: vi.fn(), failure: vi.fn() };
  const container = createContainer();
  container.register({ ownerDomainOutboxWorker: asValue(worker), pollingWorkerRuntimeRegistry: asValue(registry), monitoringService: asValue({ getMetrics: () => ({ incrementCounter: vi.fn(), recordHistogram: vi.fn() }) }) });
  const config = { getOptional: (name: string) => name === 'OWNER_DOMAIN_OUTBOX_WORKER_ENABLED' ? enabled : name === 'OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS' ? 100 : undefined } as IConfigurationService;
  return { container, config, worker, registry };
}

describe('server-composed owner domain polling runtime, isolated adapters', () => {
  it('runs settings, career and service delivery in order, records success, and stops scheduling', async () => {
    const f = fixture(); const handle = await startPollingWorkers(f.container, f.config);
    await vi.advanceTimersByTimeAsync(0);
    const calls = [f.worker.runSettingsOnce, f.worker.runCareerOnce, f.worker.runServicesOnce];
    for (const call of calls) expect(call).toHaveBeenCalledOnce();
    expect(calls[0].mock.invocationCallOrder[0]).toBeLessThan(calls[1].mock.invocationCallOrder[0]);
    expect(calls[1].mock.invocationCallOrder[0]).toBeLessThan(calls[2].mock.invocationCallOrder[0]);
    expect(f.registry.success).toHaveBeenCalledWith('owner-domain-outbox');
    expect(await startPollingWorkers(f.container, f.config)).toBe(handle);
    await handle.stop(); await vi.advanceTimersByTimeAsync(1000);
    for (const call of calls) expect(call).toHaveBeenCalledOnce();
  });

  it('does not enable or resolve a worker when its flag is disabled', async () => {
    const f = fixture(false); const resolve = vi.spyOn(f.container, 'resolve');
    await startPollingWorkers(f.container, f.config); await vi.advanceTimersByTimeAsync(1000);
    expect(resolve.mock.calls.map(([key]) => key)).not.toContain('ownerDomainOutboxWorker');
    expect(f.worker.runSettingsOnce).not.toHaveBeenCalled(); expect(f.registry.started).not.toHaveBeenCalled();
  });

  it('does not overlap an in-flight iteration and drains it on stop', async () => {
    const f = fixture(); let release!: () => void;
    f.worker.runSettingsOnce.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    const handle = await startPollingWorkers(f.container, f.config); await vi.advanceTimersByTimeAsync(500);
    expect(f.worker.runSettingsOnce).toHaveBeenCalledOnce(); expect(f.worker.runCareerOnce).not.toHaveBeenCalled();
    let stopped = false; const stop = handle.stop().then(() => { stopped = true; });
    await Promise.resolve(); expect(stopped).toBe(false);
    release(); await stop; expect(f.worker.runServicesOnce).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000); expect(f.worker.runSettingsOnce).toHaveBeenCalledOnce();
  });

  it('reports a failed owner iteration and resumes on the next tick without false success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const f = fixture(); f.worker.runCareerOnce.mockRejectedValueOnce(new Error('Delivery unavailable'));
    await startPollingWorkers(f.container, f.config); await vi.advanceTimersByTimeAsync(0);
    expect(f.registry.failure).toHaveBeenCalledWith('owner-domain-outbox', expect.any(Error));
    expect(f.registry.success).not.toHaveBeenCalled(); expect(f.worker.runServicesOnce).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100); expect(f.registry.success).toHaveBeenCalledOnce(); expect(f.worker.runServicesOnce).toHaveBeenCalledOnce();
  });
});
