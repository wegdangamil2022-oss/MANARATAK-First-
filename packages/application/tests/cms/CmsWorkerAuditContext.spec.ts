import { describe, expect, it, vi } from 'vitest';
import { AdminCmsUseCases } from '../../src/cms/use-cases/CmsUseCases';
import { CmsScheduledPublishingBackgroundJobHandler } from '../../src/background-jobs/handlers/CmsScheduledPublishingBackgroundJobHandler';
describe('CMS background sweep audit provenance', () => {
  it('preserves the system actor, actual durable job reference and attempt at the owner boundary', async () => {
    const processDueSchedules = vi.fn().mockResolvedValue({ processed: 0 });
    const handler = new CmsScheduledPublishingBackgroundJobHandler({
      processDueSchedules,
    } as unknown as AdminCmsUseCases);
    await handler.handle(
      { limit: 12 },
      {
        jobReference: 'background-job-1',
        attempt: 2,
        idempotencyKey: 'run-2',
        signal: new AbortController().signal,
      },
    );
    expect(processDueSchedules).toHaveBeenCalledWith(
      'system:background-worker',
      expect.any(Date),
      12,
      { jobReference: 'background-job-1', attempt: 2, idempotencyKey: 'run-2' },
    );
  });
});
