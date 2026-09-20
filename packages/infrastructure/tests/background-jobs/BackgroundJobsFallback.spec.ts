import { describe, it, expect } from 'vitest';
import {
  BackgroundJob,
  BackgroundJobId,
  JobReference,
  JobDefinition,
  JobParameters,
  JobMetadata,
  BackgroundJobSpecification,
  BackgroundJobStatus
} from '@manaratak/domain';
import {
  InMemoryBackgroundJobRepository,
  InMemoryBackgroundJobExecutionGateway
} from '../../src';

describe('BackgroundJobs Fallback', () => {
  const createTestJob = (refVal: string) => {
    return BackgroundJob.create(
      new BackgroundJobId('job-id-123'),
      new JobReference(refVal),
      JobDefinition.create('test-job', 'test-category'),
      new JobParameters({ file: 'import.csv' }),
      new JobMetadata({ user: 'admin' })
    );
  };

  describe('InMemoryBackgroundJobRepository', () => {
    it('saves and finds jobs using specifications', async () => {
      const repository = new InMemoryBackgroundJobRepository();
      const job = createTestJob('ref-1');

      await repository.save(job);

      const spec = BackgroundJobSpecification.byReference(new JobReference('ref-1'));
      const foundJobs = await repository.findBy(spec);

      expect(foundJobs).toHaveLength(1);
      expect(foundJobs[0].getReference().getValue()).toBe('ref-1');
      expect(foundJobs[0].getStatus()).toBe(BackgroundJobStatus.CREATED);
    });

    it('returns empty array when specification is not satisfied', async () => {
      const repository = new InMemoryBackgroundJobRepository();
      const job = createTestJob('ref-2');
      await repository.save(job);

      const spec = BackgroundJobSpecification.byReference(new JobReference('non-existent'));
      const foundJobs = await repository.findBy(spec);

      expect(foundJobs).toHaveLength(0);
    });
  });

  describe('InMemoryBackgroundJobExecutionGateway', () => {
    it('handles synchronous enqueuing, scheduling, and cancellation in-memory', async () => {
      const gateway = new InMemoryBackgroundJobExecutionGateway();

      await gateway.enqueue('job-ref-enqueued', { some: 'payload' }, 1);
      expect(gateway.getEnqueued()).toHaveLength(1);
      expect(gateway.getEnqueued()[0].jobReference).toBe('job-ref-enqueued');

      const runAt = new Date(Date.now() + 10000);
      await gateway.schedule('job-ref-scheduled', runAt);
      expect(gateway.getScheduled().get('job-ref-scheduled')).toBe(runAt);

      await gateway.cancel('job-ref-enqueued');
      expect(gateway.getEnqueued()).toHaveLength(0);

      await gateway.cancel('job-ref-scheduled');
      expect(gateway.getScheduled().has('job-ref-scheduled')).toBe(false);
    });
  });
});
