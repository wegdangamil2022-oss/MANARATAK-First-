import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssetId, AssetRecord, AssetReference, AssetOwnerReference, AssetStorageLocator,
  AssetMetadata, AssetRetentionMetadata, AssetRetentionCategory,
  AssetSecurityClassification, AssetLifecycleState, AssetStorageZone,
} from '@manaratak/domain';
import { ProcessAssetLifecycleUseCase } from '@manaratak/application';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';
import { destructiveDatabaseTestsEnabled } from '../courses/disposableDatabaseGuard';

const DB_PREFIX = 'eap-pg-disposable-';
const permitted = process.env.EAP_EPHEMERAL_DB_TESTS === 'true' &&
  destructiveDatabaseTestsEnabled();
const describeDisposable = permitted ? describe : describe.skip;

describeDisposable('EAP real PostgreSQL revision CAS and purge cleanup on disposable localhost', () => {
  let prisma: PrismaClient;
  let repository: PrismaAssetRecordRepository;

  function newAsset(id: string, state: AssetLifecycleState = AssetLifecycleState.QUARANTINED) {
    return new AssetRecord({
      id: new AssetId(id),
      reference: new AssetReference('ref-' + id),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'isolated-bucket', 'uploads/' + id + '.pdf'),
      metadata: new AssetMetadata('test.pdf', 'application/pdf', 'pdf', 64),
      retention: new AssetRetentionMetadata(
        state === AssetLifecycleState.DELETED
          ? AssetRetentionCategory.SOFT_DELETED : AssetRetentionCategory.TEMPORARY,
        new Date(Date.now() - 60_000),
      ),
      owner: new AssetOwnerReference('db-test-user', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state,
    });
  }

  beforeAll(async () => {
    if (!permitted) throw new Error('EAP_DISPOSABLE_POSTGRES_REQUIRED');
    const url = process.env.DATABASE_URL;
    if (!url || !url.includes('127.0.0.1') || !url.includes('manaratak_eap_ci_test')) {
      throw new Error('EAP_DISPOSABLE_LOCAL_POSTGRES_URL_REQUIRED');
    }
    prisma = new PrismaClient();
    await prisma.$connect();
    repository = new PrismaAssetRecordRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.assetRecord.deleteMany({ where: { id: { startsWith: DB_PREFIX } } });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.assetRecord.deleteMany({ where: { id: { startsWith: DB_PREFIX } } });
    await prisma.$disconnect();
  });

  it('rejects one of two concurrent writes against the same DB revision', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id));
    const first = (await repository.findById(new AssetId(id)))!;
    const second = (await repository.findById(new AssetId(id)))!;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    first.softDelete();
    second.softDelete();
    const attempts = await Promise.allSettled([
      repository.save(first), repository.save(second),
    ]);
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = attempts.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(String(failure.reason)).toContain('ASSET_RECORD_CONCURRENT_MODIFICATION');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.DELETED);
  });

  it('enforces actual DB retention, legal hold, and worker lease ownership before purge', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id, AssetLifecycleState.DELETED));
    const assetId = new AssetId(id);
    const at = new Date();
    await repository.assertPurgeAllowed(assetId, at);
    await prisma.assetRecord.update({
      where: { id },
      data: { legalHoldUntil: new Date(at.getTime() + 86_400_000) },
    });
    await expect(repository.assertPurgeAllowed(assetId, at))
      .rejects.toThrow('ASSET_PURGE_LEGAL_HOLD_ACTIVE');
    const token = randomUUID();
    await prisma.assetRecord.update({
      where: { id },
      data: {
        legalHoldUntil: null, retentionClaimToken: token,
        retentionClaimUntil: new Date(at.getTime() + 86_400_000),
      },
    });
    await expect(repository.assertPurgeAllowed(assetId, at))
      .rejects.toThrow('ASSET_PURGE_RETENTION_CLAIM_ACTIVE');
    await expect(repository.assertPurgeAllowed(assetId, at, token))
      .resolves.toBeUndefined();
  });

  it('persists inaccessible PURGED before provider delete and safely retries failed cleanup', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id, AssetLifecycleState.DELETED));
    const deleteBlob = vi.fn()
      .mockRejectedValueOnce(new Error('ASSET_PROVIDER_DISCONNECTED'))
      .mockResolvedValue(undefined);
    const useCase = new ProcessAssetLifecycleUseCase(
      repository, { delete: deleteBlob } as any,
      { findUsages: async () => [] } as any,
    );
    await expect(useCase.purgeAsset({ assetId: id }))
      .rejects.toThrow('ASSET_PROVIDER_DISCONNECTED');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.PURGED);
    expect(deleteBlob).toHaveBeenCalledTimes(1);
    await expect(useCase.purgeAsset({ assetId: id }))
      .rejects.toThrow('ASSET_PURGE_CLEANUP_LEASE_REQUIRED');
    const token = randomUUID();
    await prisma.assetRecord.update({
      where: { id },
      data: {
        retentionClaimToken: token,
        retentionClaimUntil: new Date(Date.now() + 86_400_000),
      },
    });
    await useCase.purgeAsset({ assetId: id, retentionClaimToken: token });
    expect(deleteBlob).toHaveBeenCalledTimes(2);
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.PURGED);
  });
  it('stores ARCHIVED in PostgreSQL before provider archival and recovers by retry', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id, AssetLifecycleState.ACTIVE));
    const archiveProvider = vi.fn()
      .mockRejectedValueOnce(new Error('ASSET_PROVIDER_ARCHIVE_UNAVAILABLE'))
      .mockResolvedValue(undefined);
    const useCase = new ProcessAssetLifecycleUseCase(
      repository, { archive: archiveProvider } as any,
      { findUsages: async () => [] } as any,
    );
    await expect(useCase.archiveAsset({ assetId: id }))
      .rejects.toThrow('ASSET_PROVIDER_ARCHIVE_UNAVAILABLE');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.ARCHIVED);
    await useCase.archiveAsset({ assetId: id });
    expect(archiveProvider).toHaveBeenCalledTimes(2);
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.ARCHIVED);
  });

  it('fences concurrent same-state metadata saves even when updates occur within one millisecond', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id));
    const first = (await repository.findById(new AssetId(id)))!;
    const second = (await repository.findById(new AssetId(id)))!;
    expect(first.state).toBe(AssetLifecycleState.QUARANTINED);
    expect(second.state).toBe(AssetLifecycleState.QUARANTINED);
    // Deliberately keep both aggregate states unchanged to exercise only updatedAt CAS.
    const results = await Promise.allSettled([
      repository.save(first),
      repository.save(second),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(String(failure.reason)).toContain('ASSET_RECORD_CONCURRENT_MODIFICATION');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.QUARANTINED);
  });

  it('persists INITIATED before any object exists, then QUARANTINED only with signed verification evidence', async () => {
    const id = DB_PREFIX + randomUUID();
    const initial = newAsset(id, AssetLifecycleState.INITIATED);
    initial.assignQuarantineLocator(initial.locator);
    await repository.save(initial);
    const issued = await prisma.assetRecord.findUnique({ where: { id } });
    expect(issued?.lifecycleState).toBe(AssetLifecycleState.INITIATED);
    expect(issued?.checksumHash).toBeNull();
    const pending = (await repository.findById(new AssetId(id)))!;
    pending.confirmUploadedObject({
      locator: pending.locator.value,
      byteSize: pending.metadata.byteSize,
      verifiedMimeType: pending.metadata.mimeType,
      checksumSha256: 'a'.repeat(64),
      verifiedAt: new Date().toISOString(),
      signatureVerified: true,
    });
    await repository.save(pending);
    const confirmed = await prisma.assetRecord.findUnique({ where: { id } });
    expect(confirmed?.lifecycleState).toBe(AssetLifecycleState.QUARANTINED);
    expect(confirmed?.checksumHash).toBe('a'.repeat(64));
    const rehydrated = (await repository.findById(new AssetId(id)))!;
    expect(rehydrated.uploadVerification?.signatureVerified).toBe(true);
    expect(rehydrated.state).toBe(AssetLifecycleState.QUARANTINED);
  });

});
