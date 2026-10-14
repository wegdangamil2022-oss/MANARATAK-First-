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
        findUnique: vi
          .fn()
          .mockResolvedValue({
            status: 'ACTIVE',
            fieldSchema: { type: 'object', properties: {} },
            assetFields: [],
          }),
      },
      cmsContentBlock: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
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
      findById: vi
        .fn()
        .mockResolvedValue({
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
      expect.anything(),
    );
  });
  it('cancels a superseded scheduled job without claiming a new publication', async () => {
    const tx = {
      cmsScheduledJob: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi
          .fn()
          .mockResolvedValue([
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
          .mockResolvedValue({ id: 'locale', contentId: 'content', state: 'PUBLISHED' }),
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
