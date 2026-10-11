import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

function fakeOwner(approvalHash: string | null = 'current-hash') {
  const tx = {
    cmsScheduledJob: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'job-1', localizedContentId: 'localized-1', status: 'FAILED',
        attemptCount: 5, jobType: 'PUBLISH', failureCode: 'CMS_SCHEDULE_FAILED',
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    cmsLocalizedContent: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'localized-1', contentId: 'content-1', locale: 'ar',
        state: 'SCHEDULED', scheduledAt: new Date(Date.now() - 10000),
      }),
    },
    cmsContentNode: { findUnique: vi.fn().mockResolvedValue({ id: 'content-1', siteIdentifier: 'manaratak' }) },
    cmsWorkflowReview: { findFirst: vi.fn().mockResolvedValue({ status: 'APPROVED', reviewSnapshotHash: approvalHash }) },
  };
  const db = { $transaction: vi.fn(async (fn: (tx: typeof tx) => Promise<unknown>) => fn(tx)) };
  const owner = new PrismaCmsRepository(db as unknown as PrismaClient);
  (owner as any).editorialFingerprint = vi.fn().mockResolvedValue('current-hash');
  (owner as any).appendMutation = vi.fn().mockResolvedValue(undefined);
  return { owner, tx };
}

describe('CMS failed scheduling repair owner contract', () => {
  it('only requeues a failed job whose approval still matches the immutable draft', async () => {
    const { owner, tx } = fakeOwner();
    const result = await owner.retryFailedSchedule('job-1', 5, 'operator-1', 'Reviewed root cause');
    expect(result).toEqual({ id: 'job-1', status: 'PENDING', attemptCount: 5 });
    expect(tx.cmsScheduledJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'job-1', status: 'FAILED', attemptCount: 5 },
      data: expect.objectContaining({ status: 'PENDING', failureCode: null }),
    }));
  });

  it('refuses stale approval and does not requeue or clear its failure', async () => {
    const { owner, tx } = fakeOwner('outdated-hash');
    await expect(owner.retryFailedSchedule('job-1', 5, 'operator-1', 'Investigated'))
      .rejects.toThrow('CMS_APPROVAL_STALE');
    expect(tx.cmsScheduledJob.updateMany).not.toHaveBeenCalled();
  });

  it('refuses stale attempt counters instead of replaying a new failed event', async () => {
    const { owner, tx } = fakeOwner();
    await expect(owner.retryFailedSchedule('job-1', 4, 'operator-1', 'Investigated'))
      .rejects.toThrow('CMS_VERSION_CONFLICT');
    expect(tx.cmsScheduledJob.updateMany).not.toHaveBeenCalled();
  });
});
