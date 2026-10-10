import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';
import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';
import { PrismaAssetUsageRegistryGateway } from '../../src/asset-platform/PrismaAssetUsageRegistryGateway';
import { assertAssetReferenceIntegrityInstalled } from '../../src/asset-platform/AssetReferenceIntegrityReadiness';
import { destructiveDatabaseTestsEnabled } from '../courses/disposableDatabaseGuard';

const prefix = 'eap-reference-disposable-';
const permitted = process.env.EAP_EPHEMERAL_DB_TESTS === 'true' && destructiveDatabaseTestsEnabled();
const disposable = permitted ? describe : describe.skip;
function barrier() {
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  return { wait, release };
}
disposable('EAP canonical owner/lifecycle serialization on disposable PostgreSQL', () => {
  let prisma: PrismaClient;
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== 'postgresql://eap_ci:eap_ci_disposable_only@127.0.0.1:5432/manaratak_eap_ci_test?schema=public') throw new Error('EAP_DISPOSABLE_LOCAL_POSTGRES_REQUIRED');
    prisma = new PrismaClient(); await prisma.$connect();
    await assertAssetReferenceIntegrityInstalled(prisma);
  });
  beforeEach(async () => {
    await prisma.cmsPublishedContent.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.cmsContentNode.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.studentWorkspace.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.assetRecord.deleteMany({ where: { id: { startsWith: prefix } } });
  });
  afterAll(async () => { await prisma?.$disconnect(); });
  async function createAsset(state = 'ACTIVE') {
    const id = prefix + randomUUID();
    await prisma.assetRecord.create({ data: { id, reference: id, ownerId: prefix, ownerType: 'STUDENT',
      lifecycleState: state, securityClassification: 'INTERNAL', retentionCategory: 'PERMANENT',
      cleanStorageLocator: `clean://disposable/${id}.pdf`,
      metadata: { originalFilename: 'test.pdf', fileExtension: 'pdf', mimeType: 'application/pdf', byteSize: 64 },
    } });
    return id;
  }
  async function waitForBlocked(application: string) {
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      const rows = await prisma.$queryRaw<{ blocked: boolean }[]>`
        SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name = ${application}
          AND wait_event_type = 'Lock') AS blocked`;
      if (rows[0]?.blocked) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('EAP_TEST_EXPECTED_DATABASE_LOCK_NOT_OBSERVED');
  }
  const options = { timeout: 10000, maxWait: 3000 };
  it.each(['ARCHIVED', 'DELETED', 'PURGED', 'PHYSICAL_DELETE'])('owner-first transaction blocks %s until commit, then rejects lifecycle change', async state => {
    const id = await createAsset(); const ready = barrier(); const commit = barrier();
    const owner = prisma.$transaction(async tx => {
      await tx.studentWorkspace.create({ data: { id: prefix + randomUUID(), studentReferenceId: prefix + randomUUID(), status: 'ACTIVE', avatarAssetId: id } });
      ready.release(); await commit.wait;
    }, options);
    await Promise.race([ready.wait, owner]);
    const name = prefix + randomUUID();
    const lifecycle = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('application_name', ${name}, true)`;
      if (state === 'PHYSICAL_DELETE') await tx.assetRecord.delete({ where: { id } });
      else await tx.assetRecord.update({ where: { id }, data: { lifecycleState: state } });
    }, options).then(() => null, error => error);
    try { await waitForBlocked(name); } finally { commit.release(); }
    await owner;
    expect(String(await lifecycle)).toContain('ASSET_REFERENCE_IN_USE');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState).toBe('ACTIVE');
    expect(await prisma.studentWorkspace.count({ where: { avatarAssetId: id } })).toBe(1);
  }, 15000);
  it.each(['ARCHIVED', 'DELETED', 'PURGED', 'PHYSICAL_DELETE'])('lifecycle-first %s rejects a waiting owner write after commit', async state => {
    const id = await createAsset(); const ready = barrier(); const commit = barrier();
    const lifecycle = prisma.$transaction(async tx => {
      if (state === 'PHYSICAL_DELETE') await tx.assetRecord.delete({ where: { id } });
      else await tx.assetRecord.update({ where: { id }, data: { lifecycleState: state } });
      ready.release(); await commit.wait;
    }, options);
    await Promise.race([ready.wait, lifecycle]);
    const name = prefix + randomUUID();
    const owner = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('application_name', ${name}, true)`;
      await tx.studentWorkspace.create({ data: { id: prefix + randomUUID(), studentReferenceId: prefix + randomUUID(), status: 'ACTIVE', avatarAssetId: id } });
    }, options).then(() => null, error => error);
    try { await waitForBlocked(name); } finally { commit.release(); }
    await lifecycle;
    expect(String(await owner)).toContain('ASSET_REFERENCE_NOT_ACTIVE');
    expect(await prisma.studentWorkspace.count({ where: { avatarAssetId: id } })).toBe(0);
  }, 15000);
  it('blocks provider archive after an initially empty usage check loses the owner race', async () => {
    const id = await createAsset(); const ready = barrier(); const commit = barrier();
    const owner = prisma.$transaction(async tx => {
      await tx.studentWorkspace.create({ data: { id: prefix + randomUUID(), studentReferenceId: prefix + randomUUID(), status: 'ACTIVE', avatarAssetId: id } });
      ready.release(); await commit.wait;
    }, options);
    await Promise.race([ready.wait, owner]);
    const provider = { archive: vi.fn(), delete: vi.fn() };
    const repository = new PrismaAssetRecordRepository(prisma);
    const registry = new PrismaAssetUsageRegistryGateway(prisma);
    const checked = barrier();
    const findUsages = vi.fn(async assetId => {
      const usages = await registry.findUsages(assetId);
      expect(usages).toEqual([]); checked.release(); return usages;
    });
    const useCase = new ProcessAssetLifecycleUseCase(repository, provider as any, { findUsages } as any);
    const archive = useCase.archiveAsset({ assetId: id }).then(() => null, error => error);
    try { await checked.wait; } finally { commit.release(); }
    await owner;
    expect(String(await archive)).toContain('ASSET_REFERENCE_IN_USE');
    expect(provider.archive).not.toHaveBeenCalled(); expect(provider.delete).not.toHaveBeenCalled();
  });
  it('permits deletion after unlinking and rejects only newly added invalid references', async () => {
    const id = await createAsset();
    const workspace = await prisma.studentWorkspace.create({ data: { id: prefix + randomUUID(), studentReferenceId: prefix + randomUUID(), status: 'ACTIVE', avatarAssetId: id } });
    await prisma.studentWorkspace.update({ where: { id: workspace.id }, data: { avatarAssetId: null } });
    await prisma.assetRecord.update({ where: { id }, data: { lifecycleState: 'DELETED' } });
    await prisma.studentWorkspace.update({ where: { id: workspace.id }, data: { displayName: 'unchanged asset reference' } });
    await expect(prisma.studentWorkspace.update({ where: { id: workspace.id }, data: { avatarAssetId: id } })).rejects.toThrow('ASSET_REFERENCE_NOT_ACTIVE');
  });
  it('holds a JSON SEO reference lock until its owner commits', async () => {
    const id = await createAsset(); const ready = barrier(); const commit = barrier();
    const owner = prisma.$transaction(async tx => {
      await tx.cmsContentNode.create({ data: { id: prefix + randomUUID(), publicId: prefix + randomUUID(), slug: prefix + randomUUID(), contentType: 'PAGE', title: 'test', authorId: prefix, ownerId: prefix, seoMetadata: { openGraphAssetId: id } } });
      ready.release(); await commit.wait;
    }, options);
    await Promise.race([ready.wait, owner]);
    const name = prefix + randomUUID();
    const lifecycle = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('application_name', ${name}, true)`;
      await tx.assetRecord.update({ where: { id }, data: { lifecycleState: 'DELETED' } });
    }, options).then(() => null, error => error);
    try { await waitForBlocked(name); } finally { commit.release(); }
    await owner; expect(String(await lifecycle)).toContain('ASSET_REFERENCE_IN_USE');
  }, 15000);
  it('covers CMS published attachment arrays and prevents asset identity changes', async () => {
    const id = await createAsset();
    const node = await prisma.cmsContentNode.create({ data: { id: prefix + randomUUID(), publicId: prefix + randomUUID(), slug: prefix + randomUUID(), contentType: 'PAGE', title: 'test', authorId: prefix, ownerId: prefix } });
    const publication = await prisma.cmsPublishedContent.create({ data: { id: prefix + randomUUID(), contentId: node.id, publicId: prefix + randomUUID(), siteIdentifier: 'MANARATAK', locale: 'ar', slug: prefix + randomUUID(), canonicalUrl: '/test', contentType: 'PAGE', title: 'test', body: '', attachmentAssetIds: [id], tags: [], seoMetadata: {}, versionNumber: 1, publishedAt: new Date() } });
    await expect(prisma.assetRecord.update({ where: { id }, data: { lifecycleState: 'DELETED' } })).rejects.toThrow('ASSET_REFERENCE_IN_USE');
    await expect(prisma.assetRecord.update({ where: { id }, data: { id: prefix + randomUUID() } })).rejects.toThrow('ASSET_REFERENCE_IN_USE');
    await prisma.cmsPublishedContent.update({ where: { id: publication.id }, data: { attachmentAssetIds: [] } });
    await prisma.assetRecord.update({ where: { id }, data: { lifecycleState: 'DELETED' } });
    await expect(prisma.cmsPublishedContent.update({ where: { id: publication.id }, data: { attachmentAssetIds: [id] } })).rejects.toThrow('ASSET_REFERENCE_NOT_ACTIVE');
  });
  it.each([Prisma.TransactionIsolationLevel.RepeatableRead, Prisma.TransactionIsolationLevel.Serializable])('rejects destructive snapshot-isolation transactions (%s)', async isolationLevel => {
    const id = await createAsset();
    await expect(prisma.$transaction(tx => tx.assetRecord.update({ where: { id }, data: { lifecycleState: 'DELETED' } }), { isolationLevel }))
      .rejects.toThrow('ASSET_REFERENCE_ISOLATION_UNSUPPORTED');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState).toBe('ACTIVE');
  });
  it('usage facets cross empty keyset pages and compose with owner filters against actual owner data', async () => {
    const used = await createAsset(); const unused = await createAsset();
    await prisma.assetRecord.update({ where: { id: unused }, data: { createdAt: new Date('2026-10-09T02:00:00Z') } });
    await prisma.assetRecord.update({ where: { id: used }, data: { createdAt: new Date('2026-10-09T01:00:00Z') } });
    await prisma.studentWorkspace.create({ data: { id: prefix + randomUUID(), studentReferenceId: prefix + randomUUID(), status: 'ACTIVE', avatarAssetId: used } });
    const repo = new PrismaAssetRecordRepository(prisma);
    const first = await repo.queryAdmin({ ownerId: prefix, usageStatus: 'IN_USE', limit: 1 });
    expect(first.items).toEqual([]); expect(first.hasMore).toBe(true);
    const second = await repo.queryAdmin({ ownerId: prefix, usageStatus: 'IN_USE', limit: 1, cursor: first.nextCursor! });
    expect(second.items.map(row => row.id)).toEqual([used]); expect(second.hasMore).toBe(false);
    const notUsed = await repo.queryAdmin({ ownerId: prefix, usageStatus: 'UNUSED', limit: 100 });
    expect(notUsed.items.map(row => row.id)).toEqual([unused]);
  });
  it('batch usage detects JSON attachments and SEO references without a separate owner registry', async () => {
    const attachment = await createAsset(); const seo = await createAsset(); const unused = await createAsset();
    const node = await prisma.cmsContentNode.create({ data: { id: prefix + randomUUID(), publicId: prefix + randomUUID(), slug: prefix + randomUUID(), contentType: 'PAGE', title: 'test', authorId: prefix, ownerId: prefix, seoMetadata: { openGraphAssetId: seo } } });
    await prisma.cmsPublishedContent.create({ data: { id: prefix + randomUUID(), contentId: node.id, publicId: prefix + randomUUID(), siteIdentifier: 'MANARATAK', locale: 'ar', slug: prefix + randomUUID(), canonicalUrl: '/test', contentType: 'PAGE', title: 'test', body: '', attachmentAssetIds: [attachment], tags: [], seoMetadata: {}, versionNumber: 1, publishedAt: new Date() } });
    const repo = new PrismaAssetRecordRepository(prisma);
    const linked = await repo.queryAdmin({ ownerId: prefix, usageStatus: 'IN_USE' });
    expect(linked.items.map(row => row.id).sort()).toEqual([attachment, seo].sort());
    const unlinked = await repo.queryAdmin({ ownerId: prefix, usageStatus: 'UNUSED' });
    expect(unlinked.items.map(row => row.id)).toEqual([unused]);
  });

});
