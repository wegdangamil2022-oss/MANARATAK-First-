import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DurableBackgroundWorker, BackgroundWorkerRuntimeState } from '../../src/background-jobs/workers/DurableBackgroundWorker';
import { BackgroundJobHandlerRegistry } from '../../src/background-jobs/workers/BackgroundJobHandlerRegistry';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); });
const options = { workerId: 'worker-a', batchSize: 1, leaseDurationMs: 5000, heartbeatIntervalMs: 1000 };
function fixture(handle: (payload: unknown, context: any) => Promise<void>) {
  let owned = false;
  const claim = { jobReference: 'job-1', jobType: 'test', payload: {}, priority: 0, attempt: 1, maxAttempts: 3, backoffType: 'exponential', timeoutMs: 10000, workerId: 'worker-a', leaseToken: 'token-a', leaseUntil: new Date(Date.now() + 5000) };
  const queue = { capabilityStatus: 'PRODUCTION_CAPABLE' as const, persistenceClassification: 'DURABLE' as const,
    claimDue: vi.fn(async () => { if (owned) return []; owned = true; return [claim]; }),
    heartbeat: vi.fn(async () => true), complete: vi.fn(async () => true),
    fail: vi.fn(async () => ({ applied: true, exhausted: false })), getOperationalSnapshot: vi.fn() };
  const state = new BackgroundWorkerRuntimeState();
  const handlers = new BackgroundJobHandlerRegistry([{ jobType: 'test', handle }]);
  return { queue, state, handlers, worker: new DurableBackgroundWorker(queue, handlers, state) };
}
describe('B09 isolated queue lifecycle (adapter substitutes, no provider calls)', () => {
  it('renews a long task, prevents a second claimant, and drains before stopping', async () => {
    let release!: () => void;
    const handler = vi.fn(() => new Promise<void>(r => { release = r; }));
    const f = fixture(handler); const run = f.worker.runOnce(options);
    await vi.advanceTimersByTimeAsync(3000);
    expect(f.queue.heartbeat).toHaveBeenCalledTimes(3);
    const second = new DurableBackgroundWorker(f.queue, f.handlers, new BackgroundWorkerRuntimeState());
    await second.runOnce({ ...options, workerId: 'worker-b' }); expect(handler).toHaveBeenCalledOnce();
    let drained = false; const stop = f.worker.drain().then(() => { drained = true; });
    await Promise.resolve(); expect(drained).toBe(false);
    release(); await run; await stop;
    expect(f.state.snapshot().state).toBe('STOPPED');
    expect(f.queue.complete).toHaveBeenCalledWith(expect.objectContaining({ leaseToken: 'token-a', workerId: 'worker-a' }));
    await f.worker.runOnce(options); expect(f.queue.claimDue).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['lost', 'unavailable'])('aborts uncertain ownership (%s) without a terminal write', async mode => {
    const f = fixture(async (_p, ctx) => new Promise<void>((_resolve, reject) => ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason), { once: true })));
    if (mode === 'lost') f.queue.heartbeat.mockResolvedValue(false);
    else f.queue.heartbeat.mockRejectedValue(new Error('store unavailable'));
    const run = f.worker.runOnce(options); await vi.advanceTimersByTimeAsync(1000); await run;
    expect(f.queue.complete).not.toHaveBeenCalled(); expect(f.queue.fail).not.toHaveBeenCalled();
    expect(f.state.snapshot().leaseLostTotal).toBe(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('drain also waits for a pending claim request before resources close', async () => {
    const f = fixture(async () => {}); let release!: (claims: never[]) => void;
    f.queue.claimDue.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const run = f.worker.runOnce(options);
    let drained = false; const stop = f.worker.drain().then(() => { drained = true; });
    await Promise.resolve(); expect(drained).toBe(false);
    release([]); await run; await stop;
    expect(f.state.snapshot().state).toBe('STOPPED');
  });
  it('delegates retry timing and exhausted/DLQ transition to the fenced queue', async () => {
    const f = fixture(async () => { throw new Error('temporary'); });
    f.queue.fail.mockResolvedValue({ applied: true, exhausted: true });
    const now = Date.now(); await f.worker.runOnce(options);
    expect(f.queue.fail).toHaveBeenCalledWith(expect.objectContaining({ leaseToken: 'token-a', nextAvailableAt: new Date(now + 5000) }));
    expect(f.state.snapshot().lastErrorCode).toBe('BACKGROUND_JOB_DLQ');
    expect(f.queue.complete).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
