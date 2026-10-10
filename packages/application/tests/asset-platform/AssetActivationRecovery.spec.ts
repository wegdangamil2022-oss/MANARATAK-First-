import { describe, expect, it, vi } from 'vitest';
import { AssetLifecycleState, AssetRecord, IAssetRecordRepository } from '@manaratak/domain';
import { RecoverAssetActivationsUseCase } from '../../src/asset-platform/use-cases/RecoverAssetActivationsUseCase';
import { BackgroundJobHandlerRegistry } from '../../src/background-jobs/workers/BackgroundJobHandlerRegistry';
import { DurableBackgroundWorker, BackgroundWorkerRuntimeState } from '../../src/background-jobs/workers/DurableBackgroundWorker';
import { AssetActivationRecoveryBackgroundJobHandler } from '../../src/background-jobs/handlers/AssetActivationRecoveryBackgroundJobHandler';

const operationId = '11111111-1111-4111-8111-111111111111';
function fixture() {
  const current = { state: AssetLifecycleState.SANITIZING, activationOperation: { phase: 'PREPARED', operationId } };
  const findById = vi.fn(async () => current as unknown as AssetRecord);
  const findPendingActivations = vi.fn(async () => [{ assetId: 'a', operationId }]);
  const activateAsset = vi.fn(async () => ({}));
  const save = vi.fn(async (_record: unknown) => undefined);
  const recovery = new RecoverAssetActivationsUseCase({ findById, findPendingActivations } as unknown as IAssetRecordRepository,
    { activateAsset } as any, { save });
  const input = { before: new Date('2026-01-01'), limit: 25, jobReference: 'isolated-job', signal: new AbortController().signal };
  return { current, findById, findPendingActivations, activateAsset, save, recovery, input };
}
describe('durable-worker activation recovery orchestration', () => {
  it('audits intent before invoking the existing owner lifecycle; records success with stable operation identity', async () => {
    const f = fixture();
    f.activateAsset.mockImplementation(async () => { expect(f.save).toHaveBeenCalledTimes(1); return {}; });
    expect(await f.recovery.execute(f.input)).toEqual({ attempted: 1, recovered: 1, skipped: 0, failed: 0 });
    expect(f.activateAsset).toHaveBeenCalledWith({ assetId: 'a' });
    const audit = f.save.mock.calls.map(([record]: any[]) => record);
    expect(audit[0].getContextMetadata().getData()).toMatchObject({ result: 'INTENT', operationId });
    expect(audit[1].getContextMetadata().getData()).toMatchObject({ result: 'SUCCESS', operationId });
    expect(audit[0].getActor().getActorId()).toBe('system:background-worker');
  });
  it('does not perform provider work when intent audit fails', async () => {
    const f = fixture(); f.save.mockRejectedValueOnce(new Error('isolated-audit-unavailable'));
    await expect(f.recovery.execute(f.input)).rejects.toThrow('isolated-audit-unavailable');
    expect(f.activateAsset).not.toHaveBeenCalled();
  });
  it('does not declare success when outcome audit fails after lifecycle succeeds', async () => {
    const f = fixture(); f.save.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('outcome-unavailable'));
    await expect(f.recovery.execute(f.input)).rejects.toThrow('outcome-unavailable');
    expect(f.activateAsset).toHaveBeenCalledTimes(1);
  });
  it.each(['ACTIVE', 'DELETED', 'QUARANTINED'])('never starts a new activation from %s', async state => {
    const f = fixture(); f.current.state = state as AssetLifecycleState;
    expect((await f.recovery.execute(f.input)).skipped).toBe(1);
    expect(f.activateAsset).not.toHaveBeenCalled(); expect(f.save).not.toHaveBeenCalled();
  });
  it('skips an operation whose identity changed after discovery', async () => {
    const f = fixture(); f.current.activationOperation.operationId = 'different';
    expect((await f.recovery.execute(f.input)).skipped).toBe(1); expect(f.activateAsset).not.toHaveBeenCalled();
  });
  it('keeps provider error details out of failure audits and returns failed count', async () => {
    const f = fixture(); f.activateAsset.mockRejectedValueOnce(new Error('private-provider-secret-location'));
    expect((await f.recovery.execute(f.input)).failed).toBe(1);
    expect(JSON.stringify((f.save.mock.calls[1][0] as any).getContextMetadata().getData())).not.toContain('private-provider');
  });
  it('checks cancellation before discovery', async () => {
    const f = fixture(); const controller = new AbortController(); controller.abort();
    await expect(f.recovery.execute({ ...f.input, signal: controller.signal })).rejects.toThrow('ASSET_ACTIVATION_RECOVERY_ABORTED');
    expect(f.findPendingActivations).not.toHaveBeenCalled();
  });
  it('rejects invalid limits before database access', async () => {
    const f = fixture(); await expect(f.recovery.execute({ ...f.input, limit: 101 })).rejects.toThrow('REQUEST_INVALID');
    expect(f.findPendingActivations).not.toHaveBeenCalled();
  });
  it('rejects unexpected handler payload and signals partial failures to the durable worker', async () => {
    const execute = vi.fn(async (_input: unknown) => ({ failed: 1 }));
    const handler = new AssetActivationRecoveryBackgroundJobHandler({ execute } as any, true);
    const context = { jobReference: 'job', attempt: 1, idempotencyKey: 'k', signal: new AbortController().signal };
    await expect(handler.handle({ assetId: 'arbitrary-new-asset' }, context)).rejects.toThrow('PAYLOAD_INVALID');
    expect(execute).not.toHaveBeenCalled();
    await expect(handler.handle({ limit: 5, minimumAgeSeconds: 60 }, context)).rejects.toThrow('PARTIAL_FAILURE');
    expect(execute.mock.calls[0][0]).toMatchObject({ limit: 5, jobReference: 'job' });
  });
  it('refuses already-persisted recovery jobs when the feature is disabled', async () => {
    const execute = vi.fn();
    const handler = new AssetActivationRecoveryBackgroundJobHandler({ execute } as any);
    await expect(handler.handle({}, { jobReference: 'old-job', attempt: 1, idempotencyKey: 'k', signal: new AbortController().signal })).rejects.toThrow('RECOVERY_DISABLED');
    expect(execute).not.toHaveBeenCalled();
  });

  it('dispatches an enabled recovery job through the real worker registry and owner use case', async () => {
    const f = fixture();
    const handler = new AssetActivationRecoveryBackgroundJobHandler(f.recovery, true);
    const complete = vi.fn(async () => true);
    const fail = vi.fn(async () => ({ applied: true, exhausted: false }));
    const state = new BackgroundWorkerRuntimeState();
    const worker = new DurableBackgroundWorker({
      claimDue: vi.fn(async () => [{ jobReference: 'dispatch-job', jobType: handler.jobType, payload: { limit: 5 },
        priority: 1, attempt: 1, maxAttempts: 3, backoffType: 'exponential', timeoutMs: 1000,
        workerId: 'worker-test', leaseToken: 'isolated-token', leaseUntil: new Date(Date.now() + 5000) }]),
      heartbeat: vi.fn(async () => true), complete, fail,
    } as any, new BackgroundJobHandlerRegistry([handler]), state);
    await worker.runOnce({ workerId: 'worker-test', batchSize: 1, leaseDurationMs: 5000, heartbeatIntervalMs: 1000 });
    expect(f.activateAsset).toHaveBeenCalledWith({ assetId: 'a' });
    expect(complete).toHaveBeenCalledTimes(1); expect(fail).not.toHaveBeenCalled();
    expect(state.snapshot().completedTotal).toBe(1);
  });

  it('sanitizes DB/audit discovery failures before they reach durable job diagnostics', async () => {
    const handler = new AssetActivationRecoveryBackgroundJobHandler({ execute: vi.fn(async () => { throw new Error('private-db-and-provider-detail'); }) } as any, true);
    await expect(handler.handle({}, { jobReference: 'job', attempt: 1, idempotencyKey: 'k', signal: new AbortController().signal }))
      .rejects.toThrow(/^ASSET_ACTIVATION_RECOVERY_FAILED$/);
  });

});
