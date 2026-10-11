import { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

function fixture(completionCount = 1) {
  const localized = {
    id: 'localized-1', contentId: 'content-1', locale: 'ar',
    version: 4, state: 'SCHEDULED', scheduledAt: new Date(Date.now() - 60_000),
    lastModifiedBy: 'editor', localizedSlug: 'study-guide', title: 'دليل',
    summary: 'مقدمة', body: 'محتوى', seoMetadata: { title: 'دليل', description: 'ملخص' },
    tags: [], attachments: [], publishedAt: null,
  };
  const root = {
    id: 'content-1', authorId: 'editor', siteIdentifier: 'manaratak',
    contentType: 'STUDY_GUIDE', categorySlug: 'guide', publicId: 'CMS-001',
  };
  const tx = {
    cmsContentNode: { findUnique: vi.fn().mockResolvedValue(root) },
    cmsLocalizedContent: {
      findUnique: vi.fn().mockResolvedValue(localized),
      update: vi.fn().mockResolvedValue({ ...localized, state: 'PUBLISHED', version: 5 }),
    },
    cmsWorkflowReview: { findFirst: vi.fn().mockResolvedValue({
      id: 'review-1', status: 'APPROVED', reviewSnapshotHash: 'current-hash',
    }) },
    cmsScheduledJob: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'job-1', localizedContentId: 'localized-1',
        status: 'PROCESSING', claimedBy: 'worker-1',
        leaseExpiresAt: new Date(Date.now() + 60_000),
        idempotencyKey: 'publish:localized-1:4',
      }),
      updateMany: vi.fn().mockResolvedValue({ count: completionCount }),
    },
    cmsContentDomainLink: { findMany: vi.fn().mockResolvedValue([]) },
    university: { findFirst: vi.fn().mockResolvedValue(null) },
    cmsPublishedContent: { upsert: vi.fn().mockResolvedValue({}) },
    cmsRedirect: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
  const db = { $transaction: vi.fn((action: (client: typeof tx) => Promise<unknown>) => action(tx)) };
  const repository = new PrismaCmsRepository(db as unknown as PrismaClient);
  (repository as any).editorialFingerprint = vi.fn().mockResolvedValue('current-hash');
  (repository as any).readinessFromRows = vi.fn().mockResolvedValue({ ready: true, missing: [], warnings: [] });
  (repository as any).verifyPublishedAssets = vi.fn().mockResolvedValue(undefined);
  (repository as any).captureRevision = vi.fn().mockResolvedValue(undefined);
  (repository as any).syncRootLifecycle = vi.fn().mockResolvedValue(undefined);
  (repository as any).appendMutation = vi.fn().mockResolvedValue(undefined);
  const command = {
    contentId: 'content-1', locale: 'ar', actorId: 'system:cms-scheduler',
    expectedVersion: 4, scheduledJobId: 'job-1', scheduleLeaseOwner: 'worker-1',
  };
  return { repository, tx, db, command };
}

describe('CMS scheduled publication atomic closure', () => {
  it('completes the claimed lease in the same transaction as publication/outbox', async () => {
    const { repository, tx, db, command } = fixture();
    await repository.publish(command);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.cmsPublishedContent.upsert).toHaveBeenCalledTimes(1);
    expect(tx.cmsScheduledJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'job-1', localizedContentId: 'localized-1',
        status: 'PROCESSING', claimedBy: 'worker-1', idempotencyKey: 'publish:localized-1:4',
      }),
      data: expect.objectContaining({ status: 'COMPLETED', claimedBy: null }),
    }));
    expect((repository as any).appendMutation).toHaveBeenCalledWith(
      tx, expect.anything(), 'localized-1', 'CONTENT_PUBLISHED', 'system:cms-scheduler',
      expect.objectContaining({ scheduledJobId: 'job-1' }),
    );
  });

  it('revalidates an owner domain target at final publication and refuses a revoked record', async () => {
    const { repository, tx, command } = fixture();
    tx.cmsContentDomainLink.findMany.mockResolvedValue([
      { targetType: 'UNIVERSITY', targetId: 'a92ddc80-dede-475d-a062-7d836832737b' },
    ]);
    await expect(repository.publish(command)).rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    expect(tx.cmsPublishedContent.upsert).not.toHaveBeenCalled();
    expect(tx.cmsScheduledJob.updateMany).not.toHaveBeenCalled();
    expect((repository as any).appendMutation).not.toHaveBeenCalled();
  });

  it('aborts the publishing decision if the conditional lease completion fails', async () => {
    const { repository, tx, command } = fixture(0);
    await expect(repository.publish(command)).rejects.toThrow('CMS_SCHEDULE_LEASE_LOST');
    // A real serializable transaction rolls back the snapshot and revision.
    // This mocked boundary checks that the decisive outbox mutation is not
    // reached when the job CAS loses its lease.
    expect((repository as any).appendMutation).not.toHaveBeenCalled();
    expect(tx.cmsScheduledJob.updateMany).toHaveBeenCalledTimes(1);
  });
});
