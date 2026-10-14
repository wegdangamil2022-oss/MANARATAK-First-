import { describe, it, expect, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';
import { RedisCmsDeliveryCache } from '../../src/cms/RedisCmsDeliveryCache';
function repository(tx: any, assets?: any) {
  return new PrismaCmsRepository(
    { $transaction: vi.fn((task: any) => task(tx)), ...tx } as any,
    assets,
  );
}
describe('Section 16 source gaps', () => {
  it('rejects schema substitution before an existing block can be written', async () => {
    const tx = {
      cmsBlockSchema: {
        findUnique: vi.fn().mockResolvedValue({
          status: 'ACTIVE',
          fieldSchema: { type: 'object', properties: {} },
          assetFields: [],
        }),
      },
      cmsContentBlock: {
        findUnique: vi.fn().mockResolvedValue({
          schemaId: 'original',
          version: 1,
          siteIdentifier: 'site',
          locale: 'ar',
        }),
        update: vi.fn(),
      },
    };
    const repo = repository(tx);
    await expect(
      repo.saveBlock({
        id: 'block',
        schemaId: 'other',
        payload: {},
        siteIdentifier: 'site',
        locale: 'ar',
        expectedVersion: 1,
      } as any),
    ).rejects.toThrow('CMS_BLOCK_SCHEMA_IMMUTABLE');
    expect(tx.cmsContentBlock.update).not.toHaveBeenCalled();
  });
  it('rejects a deliverable PUBLIC asset whose mandatory rights prohibit public use', async () => {
    const assets = {
      findById: vi.fn().mockResolvedValue({
        classification: 'PUBLIC',
        assertCanDeliver: vi.fn(),
        metadata: {
          extraMetadata: {
            rights: {
              rightsSource: 'Owner',
              attribution: 'Owner',
              usageScope: 'INTERNAL',
              publicationPolicy: 'MANDATORY',
            },
          },
        },
      }),
    };
    const repo = repository({}, assets);
    await expect(
      (repo as any).verifyAssetIds(['5f5a0e7a-50ae-4b5c-b7d9-b9f3b0e66325']),
    ).rejects.toThrow('CMS_PUBLIC_MEDIA_ASSET_TRUST_EVIDENCE_REQUIRED');
  });
  it('archives the live snapshot even when its current editor row is a draft', async () => {
    const draft = {
      id: 'notice',
      version: 2,
      status: 'DRAFT',
      siteIdentifier: 'site',
      locale: 'ar',
    };
    const tx = {
      cmsAnnouncement: {
        findUnique: vi.fn().mockResolvedValue(draft),
        update: vi.fn().mockResolvedValue({ ...draft, status: 'ARCHIVED' }),
      },
      cmsSitePublishedSnapshot: {
        findUnique: vi.fn().mockResolvedValue({ sourceId: 'notice' }),
        deleteMany: vi.fn(),
      },
    };
    const repo = repository(tx);
    (repo as any).appendStandaloneMutation = vi.fn();
    await repo.archiveAnnouncement('notice', 2, 'publisher', 'Retire the live announcement');
    expect(tx.cmsSitePublishedSnapshot.deleteMany).toHaveBeenCalledOnce();
    expect((repo as any).appendStandaloneMutation).toHaveBeenCalledWith(
      tx,
      'notice',
      'CmsAnnouncement',
      'ANNOUNCEMENT_ARCHIVED',
      'publisher',
      expect.objectContaining({ reason: 'Retire the live announcement' }),
    );
  });
  it('cancels a superseded scheduled job without claiming a new publication', async () => {
    const tx = {
      cmsScheduledJob: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'job',
            localizedContentId: 'locale',
            jobType: 'PUBLISH',
            idempotencyKey: 'publish:locale:4',
          },
        ]),
      },
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'job' }]),
      cmsLocalizedContent: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 'locale',
            contentId: 'content',
            locale: 'ar',
            version: 5,
            state: 'PUBLISHED',
          }),
      },
      cmsContentNode: { findUnique: vi.fn().mockResolvedValue({ siteIdentifier: 'site' }) },
    };
    const repo = repository(tx);
    const publish = vi.spyOn(repo, 'publish');
    (repo as any).appendMutation = vi.fn();
    const result = await repo.processDueSchedules('system:cms', new Date());
    expect(result.published).toBe(0);
    expect(publish).not.toHaveBeenCalled();
    expect(tx.cmsScheduledJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'job',
          status: 'PROCESSING',
          idempotencyKey: 'publish:locale:4',
        }),
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
  });
  it('reports invalidation failures without propagating secrets or failing a committed operation', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      isReady: true,
      buildKey: (x: string) => x,
      incr: vi.fn().mockRejectedValue(new Error('secret-token')),
      publish: vi.fn(),
    };
    await new RedisCmsDeliveryCache(client as any).invalidateSite('site', 'published');
    expect(warning).toHaveBeenCalledWith(
      'CMS_CACHE_INVALIDATION_FAILED',
      expect.objectContaining({ strategy: 'CANONICAL_OWNER_READ_WITH_TTL' }),
    );
    expect(JSON.stringify(warning.mock.calls)).not.toContain('secret-token');
    warning.mockRestore();
  });
});

describe('Section 16 owner publication and retirement boundaries', () => {
  it.each([
    {
      rightsSource: 'Owner',
      attribution: 'Owner',
      usageScope: 'INTERNAL',
      publicationPolicy: 'MANDATORY',
    },
    {
      rightsSource: 'Owner',
      attribution: 'Owner',
      usageScope: 'PUBLIC',
      publicationPolicy: 'MANDATORY',
      expiresAt: '2000-01-01T00:00:00Z',
    },
    { publicationPolicy: 'MANDATORY' },
  ])('refuses prohibited or invalid rights at the real publication boundary', async (rights) => {
    const assetId = '5f5a0e7a-50ae-4b5c-b7d9-b9f3b0e66325';
    const root = {
      id: 'content',
      authorId: 'editor',
      siteIdentifier: 'site',
      featuredAssetId: assetId,
    };
    const localized = {
      id: 'locale',
      contentId: 'content',
      version: 4,
      locale: 'ar',
      state: 'READY_TO_PUBLISH',
      lastModifiedBy: 'editor',
      tags: [],
      attachments: [],
    };
    const tx = {
      cmsContentNode: { findUnique: vi.fn().mockResolvedValue(root) },
      cmsLocalizedContent: { findUnique: vi.fn().mockResolvedValue(localized), update: vi.fn() },
      cmsWorkflowReview: {
        findFirst: vi.fn().mockResolvedValue({ reviewSnapshotHash: 'approved' }),
      },
      cmsPublishedContent: { upsert: vi.fn() },
      cmsScheduledJob: { updateMany: vi.fn() },
    };
    const repo = repository(tx, {
      findById: vi
        .fn()
        .mockResolvedValue({
          classification: 'PUBLIC',
          assertCanDeliver: vi.fn(),
          metadata: { extraMetadata: { rights } },
        }),
    });
    vi.spyOn(repo as any, 'editorialFingerprint').mockResolvedValue('approved');
    vi.spyOn(repo as any, 'readinessFromRows').mockResolvedValue({
      ready: true,
      missing: [],
      warnings: [],
    });
    await expect(
      repo.publish({
        contentId: 'content',
        locale: 'ar',
        actorId: 'publisher',
        expectedVersion: 4,
      }),
    ).rejects.toThrow('CMS_PUBLIC_MEDIA_ASSET_TRUST_EVIDENCE_REQUIRED');
    expect(tx.cmsPublishedContent.upsert).not.toHaveBeenCalled();
    expect(tx.cmsLocalizedContent.update).not.toHaveBeenCalled();
    expect(tx.cmsScheduledJob.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    {
      rightsSource: 'Owner',
      attribution: 'Owner',
      usageScope: 'PUBLIC',
      publicationPolicy: 'MANDATORY',
    },
    {
      rightsSource: 'Owner',
      attribution: 'Owner',
      usageScope: 'INTERNAL',
      publicationPolicy: 'ADVISORY',
    },
  ])(
    'preserves the canonical owner policy for permitted and unspecified rights',
    async (rights) => {
      const asset = {
        classification: 'PUBLIC',
        assertCanDeliver: vi.fn(),
        metadata: { extraMetadata: { rights } },
      };
      const repo = repository({}, { findById: vi.fn().mockResolvedValue(asset) });
      await expect(
        (repo as any).verifyAssetIds(['5f5a0e7a-50ae-4b5c-b7d9-b9f3b0e66325']),
      ).resolves.toBeUndefined();
      expect(asset.assertCanDeliver).toHaveBeenCalledOnce();
    },
  );

  it('identifies published snapshots separately from drafts and scopes both reads to the requested locale/site', async () => {
    const tx = {
      cmsAnnouncement: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'live-draft', status: 'DRAFT' },
          { id: 'draft-only', status: 'DRAFT' },
          { id: 'legacy', status: 'PUBLISHED' },
        ]),
      },
      cmsSitePublishedSnapshot: {
        findMany: vi.fn().mockResolvedValue([{ sourceId: 'live-draft' }]),
      },
    };
    const repo = repository(tx);
    expect(await repo.listAnnouncements('site', 'en')).toEqual([
      { id: 'live-draft', status: 'DRAFT', hasPublicSnapshot: true },
      { id: 'draft-only', status: 'DRAFT', hasPublicSnapshot: false },
      { id: 'legacy', status: 'PUBLISHED', hasPublicSnapshot: true },
    ]);
    expect(tx.cmsSitePublishedSnapshot.findMany).toHaveBeenCalledWith({
      where: { kind: 'ANNOUNCEMENT', siteIdentifier: 'site', locale: 'en' },
      select: { sourceId: true },
    });
    expect(tx.cmsAnnouncement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteIdentifier: 'site', locale: 'en' } }),
    );
  });

  it.each(['', 'short', 'x'.repeat(1001)])(
    'rejects an invalid archive reason before any transaction',
    async (reason) => {
      const repo = repository({});
      await expect(repo.archiveAnnouncement('notice', 2, 'publisher', reason)).rejects.toThrow(
        'CMS_ARCHIVE_REASON_REQUIRED',
      );
      expect((repo as any).db.$transaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    { version: 1, live: true, error: 'CMS_VERSION_CONFLICT' },
    { version: 2, live: false, error: 'CMS_ANNOUNCEMENT_PUBLISHED_REQUIRED' },
  ])('rejects stale archive or a draft with no publication', async ({ version, live, error }) => {
    const tx = {
      cmsAnnouncement: {
        findUnique: vi.fn().mockResolvedValue({ id: 'notice', version, status: 'DRAFT' }),
        update: vi.fn(),
      },
      cmsSitePublishedSnapshot: {
        findUnique: vi.fn().mockResolvedValue(live ? { sourceId: 'notice' } : null),
        deleteMany: vi.fn(),
      },
    };
    const repo = repository(tx);
    await expect(
      repo.archiveAnnouncement('notice', 2, 'publisher', 'Retire public notice'),
    ).rejects.toThrow(error);
    expect(tx.cmsAnnouncement.update).not.toHaveBeenCalled();
    expect(tx.cmsSitePublishedSnapshot.deleteMany).not.toHaveBeenCalled();
  });
});

function supersededJobFixture(mode: 'current' | 'lease-lost' | 'changed' = 'current') {
  const owner = { id: 'content', publicId: 'cms-content', siteIdentifier: 'site' };
  const localized = {
    id: 'locale',
    contentId: 'content',
    locale: 'ar',
    state: 'PUBLISHED',
    version: 5,
  };
  let reads = 0;
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'job' }]),
    cmsContentNode: { findUnique: vi.fn().mockResolvedValue(owner) },
    cmsLocalizedContent: {
      findUnique: vi.fn().mockImplementation(async () => {
        reads++;
        return mode === 'changed' && reads === 2 ? { ...localized, version: 6 } : localized;
      }),
    },
    cmsScheduledJob: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          {
            id: 'job',
            localizedContentId: 'locale',
            jobType: 'PUBLISH',
            idempotencyKey: 'publish:locale:4',
            attemptCount: 1,
          },
        ]),
      findUnique: vi.fn().mockResolvedValue({ status: 'PROCESSING' }),
      updateMany: vi
        .fn()
        .mockImplementation(async ({ data }) => ({
          count: mode === 'lease-lost' && data.status === 'CANCELLED' ? 0 : 1,
        })),
    },
    cmsEditorialLedger: { create: vi.fn() },
    auditRecord: { create: vi.fn() },
    transactionalOutboxRecord: { create: vi.fn() },
  };
  const repo = repository(tx);
  const publish = vi.spyOn(repo, 'publish');
  return { repo, tx, publish };
}

describe('Superseded scheduled publication fencing and audit', () => {
  it('cancels under current lease/version and records a SYSTEM decision without a publication event', async () => {
    const { repo, tx, publish } = supersededJobFixture();
    const context = { jobReference: 'sweep', attempt: 2, idempotencyKey: 'sweep-key' };
    const result = await repo.processDueSchedules(
      'system:background-worker',
      new Date(),
      50,
      context,
    );
    expect(result).toMatchObject({ processed: 1, published: 0, failed: 0 });
    expect(publish).not.toHaveBeenCalled();
    expect(tx.cmsScheduledJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'job',
          localizedContentId: 'locale',
          status: 'PROCESSING',
          idempotencyKey: 'publish:locale:4',
          claimedBy: expect.stringMatching(/^cms-scheduler:/),
          leaseExpiresAt: { gt: expect.any(Date) },
        }),
        data: expect.objectContaining({
          status: 'CANCELLED',
          completedAt: expect.any(Date),
          failureCode: 'CMS_SCHEDULE_SUPERSEDED_BY_PUBLICATION',
        }),
      }),
    );
    expect(tx.auditRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorType: 'SYSTEM',
          action: 'SCHEDULE_SUPERSEDED',
          contextMetadata: expect.objectContaining({
            jobId: 'job',
            version: 5,
            executionContext: context,
          }),
        }),
      }),
    );
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create.mock.calls[0][0].data.eventType).not.toBe(
      'CmsContentPublished',
    );
    expect((repo as any).db.$transaction).toHaveBeenCalledTimes(2);
  });
  it.each(['lease-lost', 'changed'] as const)(
    'does not claim successful cancellation when %s',
    async (mode) => {
      const { repo, tx, publish } = supersededJobFixture(mode);
      const result = await repo.processDueSchedules('system:cms', new Date());
      expect(result).toMatchObject({ processed: 1, published: 0, failed: 1 });
      expect(publish).not.toHaveBeenCalled();
      expect(tx.auditRecord.create).not.toHaveBeenCalled();
      expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
      expect(tx.cmsScheduledJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }),
      );
    },
  );
  it('reports unavailable Redis without leaking site, reason or secrets', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const client = { isReady: false, incr: vi.fn(), publish: vi.fn() };
      await new RedisCmsDeliveryCache(client as any).invalidateSite(
        'private-site',
        'private-reason',
      );
      expect(warning).toHaveBeenCalledWith('CMS_CACHE_INVALIDATION_UNAVAILABLE', {
        strategy: 'CANONICAL_OWNER_READ_WITH_TTL',
        ttlSeconds: 300,
      });
      expect(client.incr).not.toHaveBeenCalled();
      expect(JSON.stringify(warning.mock.calls)).not.toMatch(/private-site|private-reason/);
    } finally {
      warning.mockRestore();
    }
  });
});
