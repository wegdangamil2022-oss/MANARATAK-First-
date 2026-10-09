import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AssetId, AssetRecord, AssetReference, AssetOwnerReference, AssetStorageLocator,
  AssetMetadata, AssetChecksum, AssetSanitizationMetadata, AssetRetentionMetadata, AssetRetentionCategory,
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

  function deletedCleanAsset(id: string): AssetRecord {
    const quarantine = new AssetStorageLocator(
      AssetStorageZone.QUARANTINE, 'isolated-bucket', 'uploads/' + id + '.pdf',
    );
    return new AssetRecord({
      id: new AssetId(id),
      reference: new AssetReference('ref-' + id),
      owner: new AssetOwnerReference('db-test-user', 'STUDENT'),
      locator: new AssetStorageLocator(
        AssetStorageZone.CLEAN, 'isolated-bucket', 'clean/' + id + '.pdf',
      ),
      metadata: new AssetMetadata('test.pdf', 'application/pdf', 'pdf', 64),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.DELETED,
      retentionBeforeLifecycle: { category: AssetRetentionCategory.PERMANENT, expiresAt: null },
      checksum: new AssetChecksum('sha256', 'a'.repeat(64)),
      sanitization: new AssetSanitizationMetadata(true, new Date(), 'verified sanitized bytes'),
      malwareScan: {
        status: 'PASSED', scannedAt: new Date().toISOString(), locator: quarantine.value,
      },
      uploadVerification: {
        locator: quarantine.value, byteSize: 64,
        verifiedMimeType: 'application/pdf', checksumSha256: 'a'.repeat(64),
        verifiedAt: new Date().toISOString(), signatureVerified: true,
      },
    });
  }

  it('durably rehydrates PREPARED promotion after post-move persistence failure, then completes the same operation', async () => {
    const id = DB_PREFIX + randomUUID();
    const quarantine = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'isolated-bucket', 'uploads/' + id + '.pdf');
    const record = new AssetRecord({
      id: new AssetId(id), reference: new AssetReference('ref-' + id),
      owner: new AssetOwnerReference('db-test-user', 'STUDENT'), locator: quarantine,
      metadata: new AssetMetadata('test.pdf', 'application/pdf', 'pdf', 64),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      classification: AssetSecurityClassification.INTERNAL, state: AssetLifecycleState.SANITIZING,
      checksum: new AssetChecksum('sha256', 'a'.repeat(64)),
      sanitization: new AssetSanitizationMetadata(true, new Date()),
      malwareScan: { status: 'PASSED', scannedAt: new Date().toISOString(), locator: quarantine.value },
      uploadVerification: { locator: quarantine.value, byteSize: 64, verifiedMimeType: 'application/pdf',
        checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(), signatureVerified: true },
    });
    await repository.save(record);
    const originalSave = repository.save.bind(repository);
    let writes = 0;
    const save = vi.spyOn(repository, 'save').mockImplementation(async value => {
      if (++writes === 2) throw new Error('SIMULATED_POST_MOVE_WRITE_FAILURE');
      await originalSave(value);
    });
    const verifyUploadedObject = vi.fn(async () => ({ byteSize: 64, verifiedMimeType: 'application/pdf',
      checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(), signatureVerified: true }));
    const moveToCleanZone = vi.fn(async () => {
      const row = (await prisma.assetRecord.findUnique({ where: { id } }))!;
      expect(row.lifecycleState).toBe(AssetLifecycleState.SANITIZING);
      expect((row.malwareScanStatus as any).activationOperation.phase).toBe('PREPARED');
      return new AssetStorageLocator(AssetStorageZone.CLEAN, 'isolated-bucket', 'clean/' + id + '.pdf');
    });
    const useCase = new ProcessAssetLifecycleUseCase(repository, { verifyUploadedObject, moveToCleanZone } as any, {} as any);
    try {
      await expect(useCase.activateAsset({ assetId: id })).rejects.toThrow('SIMULATED_POST_MOVE_WRITE_FAILURE');
      const pending = (await repository.findById(new AssetId(id)))!;
      expect(pending.activationOperation?.phase).toBe('PREPARED');
      expect(() => pending.softDelete()).toThrow('ASSET_ACTIVATION_RECOVERY_PENDING');
      await useCase.activateAsset({ assetId: id });
      const done = (await repository.findById(new AssetId(id)))!;
      expect(done.state).toBe(AssetLifecycleState.ACTIVE);
      expect(done.activationOperation?.phase).toBe('COMPLETED');
      expect(done.activationOperation?.operationId).toBe(pending.activationOperation?.operationId);
      expect(verifyUploadedObject).toHaveBeenCalledTimes(1);
      expect(moveToCleanZone.mock.calls[1]).toEqual(moveToCleanZone.mock.calls[0]);
    } finally { save.mockRestore(); }
  });

  it('does not commit ACTIVE before provider has proven restored CLEAN bytes', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(deletedCleanAsset(id));
    const restore = vi.fn(async () => undefined);
    const verifyRestoredObject = vi.fn(async () => {
      expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
        .toBe(AssetLifecycleState.DELETED);
    });
    const archive = vi.fn(async () => undefined);
    const useCase = new ProcessAssetLifecycleUseCase(repository, {
      restore, archive, verifyRestoredObject,
    } as any, {} as any);
    await useCase.restoreAsset({ assetId: id });
    expect(restore).toHaveBeenCalledOnce();
    expect(verifyRestoredObject).toHaveBeenCalledOnce();
    expect(archive).not.toHaveBeenCalled();
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.ACTIVE);
  });

  it('retains DELETED and compensates if a concurrent transaction invalidates restore CAS', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(deletedCleanAsset(id));
    const restore = vi.fn(async () => undefined);
    const archive = vi.fn(async () => undefined);
    const verifyRestoredObject = vi.fn(async () => {
      const current = (await prisma.assetRecord.findUnique({ where: { id } }))!;
      expect(current.lifecycleState).toBe(AssetLifecycleState.DELETED);
      await prisma.assetRecord.update({
        where: { id },
        data: { updatedAt: new Date(current.updatedAt.getTime() + 1_000) },
      });
    });
    const useCase = new ProcessAssetLifecycleUseCase(repository, {
      restore, archive, verifyRestoredObject,
    } as any, {} as any);
    await expect(useCase.restoreAsset({ assetId: id }))
      .rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
    expect(restore).toHaveBeenCalledOnce();
    expect(verifyRestoredObject).toHaveBeenCalledOnce();
    expect(archive).toHaveBeenCalledOnce();
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.DELETED);
  });

  it('restore claim blocks an already-hydrated purge and any new retention purge', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(deletedCleanAsset(id));
    await prisma.assetRecord.update({
      where: { id },
      data: { retentionExpiresAt: new Date(Date.now() - 60_000) },
    });
    const stalePurge = (await repository.findById(new AssetId(id)))!;
    const restorer = (await repository.findById(new AssetId(id)))!;
    restorer.restore();
    await repository.acquireRestoreLease(restorer);
    const claimed = await prisma.assetRecord.findUnique({ where: { id } });
    expect(claimed?.retentionClaimToken).toMatch(/^[0-9a-f-]{36}$/);
    expect(claimed?.lifecycleState).toBe(AssetLifecycleState.DELETED);
    await expect(repository.assertPurgeAllowed(new AssetId(id), new Date()))
      .rejects.toThrow('ASSET_PURGE_RETENTION_CLAIM_ACTIVE');
    stalePurge.purge();
    await expect(repository.save(stalePurge))
      .rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
    const another = (await repository.findById(new AssetId(id)))!;
    another.restore();
    await expect(repository.acquireRestoreLease(another))
      .rejects.toThrow('ASSET_RESTORE_LEASE_CONFLICT');
    await repository.save(restorer);
    const active = await prisma.assetRecord.findUnique({ where: { id } });
    expect(active?.lifecycleState).toBe(AssetLifecycleState.ACTIVE);
    expect(active?.retentionClaimToken).toBeNull();
    expect(active?.retentionClaimUntil).toBeNull();
  });

  it('restore cannot publish ACTIVE when its lease expires or is replaced', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(deletedCleanAsset(id));
    const restorer = (await repository.findById(new AssetId(id)))!;
    restorer.restore();
    await repository.acquireRestoreLease(restorer);
    await prisma.assetRecord.update({
      where: { id },
      data: { retentionClaimUntil: new Date(Date.now() - 1_000) },
    });
    await expect(repository.save(restorer))
      .rejects.toThrow('ASSET_RECORD_CONCURRENT_MODIFICATION');
    expect((await prisma.assetRecord.findUnique({ where: { id } }))?.lifecycleState)
      .toBe(AssetLifecycleState.DELETED);
    await repository.releaseRestoreLease(restorer);
    const unlocked = await prisma.assetRecord.findUnique({ where: { id } });
    expect(unlocked?.retentionClaimToken).toBeNull();
    expect(unlocked?.retentionClaimUntil).toBeNull();
  });

  it('preserves persisted version history during a real-DB lifecycle transition', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id));
    const versions = { versions: [{ versionNumber: 1, createdAt: '2026-10-01T00:00:00.000Z',
      storageLocator: { storageZone: 'CLEAN', bucketName: 'isolated-old', pathKey: 'v1.pdf' },
      checksum: { algorithm: 'sha256', hash: 'a'.repeat(64) } }] };
    await prisma.assetRecord.update({ where: { id }, data: { versionChain: versions } });
    const asset = (await repository.findById(new AssetId(id)))!;
    expect(asset.versionChain?.allVersions[0].storageLocator.value).toBe('clean://isolated-old/v1.pdf');
    asset.softDelete();
    await repository.save(asset);
    const persisted = await prisma.assetRecord.findUnique({ where: { id } });
    expect(persisted?.versionChain).toEqual(versions);
    expect(persisted?.deletedAt).toBeInstanceOf(Date);
  });

  it('composes workspace JSON facets with canonical cursor and family predicates in PostgreSQL', async () => {
    const id = DB_PREFIX + randomUUID();
    await repository.save(newAsset(id, AssetLifecycleState.SANITIZING));
    await prisma.assetRecord.update({ where: { id }, data: {
      malwareScanStatus: { status: 'PASSED', activationOperation: { phase: 'PREPARED' } },
    } });
    const matches = await repository.queryAdmin({ q: id, fileFamily: 'PDF', malwareStatus: 'PASSED', processingQueue: 'ACTIVATION_RECOVERY' });
    expect(matches.items.map(item => item.id)).toEqual([id]);
    expect((await repository.queryAdmin({ q: id, fileFamily: 'IMAGE', processingQueue: 'ACTIVATION_RECOVERY' })).items).toEqual([]);
    const cursor = Buffer.from(new Date('2099-01-01').toISOString() + '|zzzz').toString('base64url');
    expect((await repository.queryAdmin({ q: id, fileFamily: 'PDF', cursor, malwareStatus: 'PASSED' })).items.map(item => item.id)).toEqual([id]);
  });

});
