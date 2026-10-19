import { createContainer, asValue } from '@absheer-vendor/awilix-core';
import type { IConfigurationService } from '@absheer/core';
import { describe, it, expect, vi } from 'vitest';
import { registerRecurringJobs } from '../../../src/infrastructure/workers/RegisterRecurringJobs';
import { WorkerHealthObservation } from '../../../src/infrastructure/runtime/WorkerHealthObservation';
import { freshWorkerEvidence } from '../../../src/presentation/monitoring/RuntimeHealthPolicy';

describe('B09 recurring registration and independent health evidence', () => {
  it('keeps all eleven stable job definitions and repeated registration deduplicates by stable reference', async () => {
    const jobs = new Map(); const ensureRecurringJob = vi.fn(async (job) => { jobs.set(job.stableReference, job); });
    const container = createContainer(); container.register({ manageBackgroundJobsUseCase: asValue({ ensureRecurringJob }) });
    const config = { getOptional: (key: string) => key.endsWith('_ENABLED') ? true : undefined, get: () => '*/5 * * * *' } as unknown as IConfigurationService;
    await registerRecurringJobs(container, config); await registerRecurringJobs(container, config);
    expect(ensureRecurringJob).toHaveBeenCalledTimes(22); expect(jobs.size).toBe(11);
    expect([...jobs.values()].every(j => j.maxAttempts === 5 && j.backoffType === 'exponential')).toBe(true);
    expect(jobs.get('system.notification.delivery').parameters.leaseMs).toBe(600000);
    expect(jobs.get('system.retention.sweep').cronExpression).toBe('15 2 * * *');
  });
  it('does not resolve a queue when durable workers are disabled', async () => {
    await registerRecurringJobs(createContainer(), { getOptional: () => false } as unknown as IConfigurationService);
  });
  it('HTTP health reads never fabricate worker observations and old evidence expires', async () => {
    const redis = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    const observations = new WorkerHealthObservation(redis, { environment: 'staging', apiOrigin: 'https://api.example.test', revision: 'b09' });
    expect((await observations.read('owner-domain-outbox')).state).toBe('NOT_STARTED');
    expect(redis.set).not.toHaveBeenCalled();
    const now = Date.now();
    expect(freshWorkerEvidence({ state: 'RUNNING', observedAt: new Date(now - 16000).toISOString() }, 15000, now)).toBe(false);
    expect(freshWorkerEvidence({ state: 'STOPPED', observedAt: new Date(now).toISOString() }, 15000, now)).toBe(false);
    expect(freshWorkerEvidence({ state: 'RUNNING', observedAt: new Date(now).toISOString() }, 15000, now)).toBe(true);
  });
});
