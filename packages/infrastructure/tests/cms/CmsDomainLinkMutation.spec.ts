import { PrismaClient } from '@prisma/client';
import { CmsDomainRelationType, CmsDomainTargetType } from '@manaratak/domain';
import { describe, expect, it, vi } from 'vitest';
import { PrismaCmsRepository } from '../../src/cms/PrismaCmsRepository';

const link = {
  targetType: CmsDomainTargetType.UNIVERSITY,
  targetId: '683a90d4-abab-4f77-9f32-5a44d8288928',
  relationType: CmsDomainRelationType.RELATED_TO,
};

function fixture(options: { reviewed?: boolean; ownerPublic?: boolean; versionCAS?: boolean } = {}) {
  const tx = {
    cmsContentNode: {
      findUnique: vi.fn().mockResolvedValue({ id: 'node-1', version: 3, siteIdentifier: 'manaratak' }),
      updateMany: vi.fn().mockResolvedValue({ count: options.versionCAS === false ? 0 : 1 }),
    },
    cmsLocalizedContent: { findFirst: vi.fn().mockResolvedValue(options.reviewed ? { id: 'reviewed' } : null) },
    cmsPublishedContent: { findFirst: vi.fn().mockResolvedValue(null) },
    cmsWorkflowReview: { findFirst: vi.fn().mockResolvedValue(null) },
    cmsContentDomainLink: {
      findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    university: {
      findFirst: vi.fn().mockResolvedValue(options.ownerPublic === false ? null : { id: link.targetId }),
    },
  };
  const client = {
    $transaction: vi.fn((task: (tx: typeof tx) => Promise<unknown>) => task(tx)),
  };
  const repository = new PrismaCmsRepository(client as unknown as PrismaClient);
  (repository as any).appendMutation = vi.fn().mockResolvedValue(undefined);
  return { repository, tx };
}

describe('CMS transaction-bound domain-link mutations', () => {
  it('accepts canonical published targets with version CAS and old/new audit facts', async () => {
    const { repository, tx } = fixture();
    await repository.replaceDomainLinks('node-1', [link], 'editor', 3);
    expect(tx.university.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: link.targetId, status: 'PUBLISHED' },
    }));
    expect(tx.cmsContentNode.updateMany).toHaveBeenCalledWith({
      where: { id: 'node-1', version: 3 }, data: { version: { increment: 1 } },
    });
    expect(tx.cmsContentDomainLink.createMany).toHaveBeenCalledTimes(1);
    expect((repository as any).appendMutation).toHaveBeenCalledWith(
      tx, expect.anything(), null, 'DOMAIN_LINKS_REPLACED', 'editor',
      expect.objectContaining({ fromVersion: 3, toVersion: 4, previous: [], next: [expect.objectContaining(link)] }),
    );
  });

  it('rejects unpublished owner records without touching CMS relations', async () => {
    const { repository, tx } = fixture({ ownerPublic: false });
    await expect(repository.replaceDomainLinks('node-1', [link], 'editor', 3))
      .rejects.toThrow('CMS_DOMAIN_OWNER_TARGET_NOT_PUBLIC');
    expect(tx.cmsContentDomainLink.deleteMany).not.toHaveBeenCalled();
    expect(tx.cmsContentNode.updateMany).not.toHaveBeenCalled();
  });

  it('never changes review-protected relationship facts', async () => {
    const { repository, tx } = fixture({ reviewed: true });
    await expect(repository.replaceDomainLinks('node-1', [link], 'editor', 3))
      .rejects.toThrow('CMS_ROOT_REVIEW_REQUIRED');
    expect(tx.university.findFirst).not.toHaveBeenCalled();
    expect(tx.cmsContentDomainLink.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses stale expectedVersion without mutating or auditing', async () => {
    const { repository, tx } = fixture({ versionCAS: false });
    await expect(repository.replaceDomainLinks('node-1', [link], 'editor', 3))
      .rejects.toThrow('CMS_VERSION_CONFLICT');
    expect(tx.cmsContentDomainLink.deleteMany).not.toHaveBeenCalled();
    expect((repository as any).appendMutation).not.toHaveBeenCalled();
  });
});
