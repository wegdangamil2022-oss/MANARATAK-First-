import { createContainer, asValue } from '@absheer-vendor/awilix-core';
import type { IConfigurationService } from '@absheer/core';
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

describe('server-composed P15 polling routes', () => {
  function studentFixture() {
    const f=fixture(false);
    const names=['runIdentityOnce','runRoleOnce','runCatchupOnce','runLearningOnce','runCertificatesOnce','runReplayOnce','runRemindersOnce','runTrackerOwnersOnce'];
    const student=Object.fromEntries(names.map(name=>[name,vi.fn().mockResolvedValue(undefined)]));
    f.container.register({studentWorkspaceOutboxWorker:asValue(student)});
    const config={getOptional:(name:string)=>name==='STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED'?true:name==='STUDENT_WORKSPACE_OUTBOX_WORKER_INTERVAL_MS'?100:undefined} as IConfigurationService;
    return {...f,student,names,config};
  }
  it('starts every P15 delivery/recovery path from the runtime actually imported by server',async()=>{
    const f=studentFixture();
    const handle=await startPollingWorkers(f.container,f.config);
    await vi.advanceTimersByTimeAsync(0);
    for(let i=0;i<f.names.length;i++) {
      const call=f.student[f.names[i]];
      expect(call).toHaveBeenCalledOnce();
      if(i)expect(f.student[f.names[i-1]].mock.invocationCallOrder[0]).toBeLessThan(call.mock.invocationCallOrder[0]);
    }
    await handle.stop();await vi.advanceTimersByTimeAsync(300);
    for(const name of f.names)expect(f.student[name]).toHaveBeenCalledOnce();
  });
  it('drains a pending catchup without overlapping another cycle',async()=>{
    const f=studentFixture();let release!:()=>void;
    f.student.runCatchupOnce.mockImplementation(()=>new Promise<void>(resolve=>{release=resolve;}));
    const handle=await startPollingWorkers(f.container,f.config);
    await vi.advanceTimersByTimeAsync(300);
    expect(f.student.runCatchupOnce).toHaveBeenCalledOnce();
    expect(f.student.runCertificatesOnce).not.toHaveBeenCalled();
    let drained=false;const stop=handle.stop().then(()=>{drained=true;});
    await Promise.resolve();expect(drained).toBe(false);
    release();await stop;expect(f.student.runCertificatesOnce).toHaveBeenCalledOnce();
  });
});

describe('B09 atomic startup and shutdown ownership', () => {
  it('rejects an invalid later route before starting any earlier worker', async () => {
    const f = fixture();
    const certificate = { runOnce: vi.fn().mockResolvedValue(undefined) };
    f.container.register({ certificateCompletionOutboxWorker: asValue(certificate) });
    const config = { getOptional: (key: string) => ({ CERTIFICATE_COMPLETION_WORKER_ENABLED: true, OWNER_DOMAIN_OUTBOX_WORKER_ENABLED: true, OWNER_DOMAIN_OUTBOX_WORKER_INTERVAL_MS: 0 } as Record<string, unknown>)[key] } as IConfigurationService;
    await expect(startPollingWorkers(f.container, config)).rejects.toThrow('POLLING_INTERVAL_INVALID');
    await vi.advanceTimersByTimeAsync(10000);
    expect(certificate.runOnce).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps the active handle through drain and an old stop cannot stop its replacement', async () => {
    const f = fixture(); let release!: () => void;
    f.worker.runSettingsOnce.mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const first = await startPollingWorkers(f.container, f.config);
    await vi.advanceTimersByTimeAsync(0);
    const stop = first.stop();
    expect(await startPollingWorkers(f.container, f.config)).toBe(first);
    release(); await stop;
    const next = await startPollingWorkers(f.container, f.config);
    expect(next).not.toBe(first);
    await first.stop();
    expect(await startPollingWorkers(f.container, f.config)).toBe(next);
  });
  it('marks every registered route stopped after draining, including durable jobs', async () => {
    const f = fixture(); const stopped = vi.fn(); const runOnce = vi.fn().mockResolvedValue(undefined);
    f.container.register({ durableBackgroundWorker: asValue({ runOnce }), pollingWorkerRuntimeRegistry: asValue({ ...f.registry, stopped }) });
    const config = { getOptional: (key: string) => key === 'BACKGROUND_WORKER_ENABLED' ? true : undefined } as IConfigurationService;
    const handle = await startPollingWorkers(f.container, config);
    await vi.advanceTimersByTimeAsync(0);
    expect(f.registry.success).toHaveBeenCalledWith('durable-background-jobs');
    await handle.stop(); expect(stopped).toHaveBeenCalledWith('durable-background-jobs');
    await vi.advanceTimersByTimeAsync(10000); expect(runOnce).toHaveBeenCalledOnce();
  });
});
