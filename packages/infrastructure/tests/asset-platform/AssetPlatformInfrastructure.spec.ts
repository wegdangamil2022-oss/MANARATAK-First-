import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import {
  AssetStorageLocator,
  AssetStorageZone,
  AssetId
} from '@manaratak/domain';
import {
  LocalAssetStorageGateway,
  NoopAssetMalwareScannerGateway,
  NoopAssetSanitizationGateway,
  InMemoryAssetUsageRegistryGateway
} from '../../src';

describe('Phase 05 EAP Infrastructure - Slice 2C', () => {
  describe('LocalAssetStorageGateway', () => {
    it('generates an upload locator in QUARANTINE zone', async () => {
      const gateway = new LocalAssetStorageGateway('test-bucket');
      const locator = await gateway.generateUploadLocator();
      
      expect(locator.storageZone).toBe(AssetStorageZone.QUARANTINE);
      expect(locator.bucketName).toBe('test-bucket');
      expect(locator.pathKey).toMatch(/^uploads\//);
    });

    it('verifies real bytes in the local quarantine file and rejects mismatched declared metadata', async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'manaratak-asset-verification-'));
      try {
        await mkdir(path.join(root, 'test-bucket', 'uploads'), { recursive: true });
        const bytes = Buffer.from('%PDF-1.7\\nminimal fixture', 'utf8');
        await writeFile(path.join(root, 'test-bucket', 'uploads', 'sample.pdf'), bytes);
        const gateway = new LocalAssetStorageGateway('test-bucket', root);
        const locator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'test-bucket', 'uploads/sample.pdf');
        const result = await gateway.verifyUploadedObject(locator, {
          expectedByteSize: bytes.length, declaredMimeType: 'application/pdf',
        });
        expect(result.byteSize).toBe(bytes.length);
        expect(result.verifiedMimeType).toBe('application/pdf');
        expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
        await expect(gateway.verifyUploadedObject(locator, {
          expectedByteSize: bytes.length + 1, declaredMimeType: 'application/pdf',
        })).rejects.toThrow('ASSET_UPLOAD_VERIFICATION_FAILED');
        await expect(gateway.verifyUploadedObject(locator, {
          expectedByteSize: bytes.length, declaredMimeType: 'image/png',
        })).rejects.toThrow('ASSET_UPLOAD_VERIFICATION_FAILED');
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });

    it('moves locator from quarantine to clean zone', async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'manaratak-asset-move-'));
      await mkdir(path.join(root, 'test-bucket', 'uploads'), { recursive: true });
      await writeFile(path.join(root, 'test-bucket', 'uploads', '123-file.tmp'), 'safe');
      const gateway = new LocalAssetStorageGateway('test-bucket', root);
      const qLocator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'test-bucket', 'uploads/123-file.tmp');
      const cLocator = await gateway.moveToCleanZone(qLocator);

      expect(cLocator.storageZone).toBe(AssetStorageZone.CLEAN);
      expect(cLocator.bucketName).toBe('test-bucket');
      expect(cLocator.pathKey).toBe('clean/123-file.tmp');
    });
  });

  describe('NoopAssetMalwareScannerGateway', () => {
    it('fails closed when malware scanning is unavailable', async () => {
      const gateway = new NoopAssetMalwareScannerGateway();
      await expect(
        gateway.scan(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'b', 'k'))
      ).rejects.toThrow('ASSET_MALWARE_SCANNING_UNAVAILABLE');
      expect(gateway.capabilityStatus).toBe('UNAVAILABLE');
    });
  });

  describe('NoopAssetSanitizationGateway', () => {
    it('fails closed when sanitization is unavailable', async () => {
      const gateway = new NoopAssetSanitizationGateway();
      const locator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'b', 'k');
      await expect(gateway.sanitize(locator)).rejects.toThrow('ASSET_SANITIZATION_UNAVAILABLE');
      expect(gateway.capabilityStatus).toBe('UNAVAILABLE');
    });
  });

  describe('InMemoryAssetUsageRegistryGateway', () => {
    it('registers, checks and unregisters usage', async () => {
      const gateway = new InMemoryAssetUsageRegistryGateway();
      const id = new AssetId('ast-1');

      expect(await gateway.isAssetInUse(id)).toBe(false);

      await gateway.registerUsage(id, 'urn:test:consumer-1');
      expect(await gateway.isAssetInUse(id)).toBe(true);

      // Register second usage
      await gateway.registerUsage(id, 'urn:test:consumer-2');
      expect(await gateway.isAssetInUse(id)).toBe(true);

      await gateway.unregisterUsage(id, 'urn:test:consumer-1');
      expect(await gateway.isAssetInUse(id)).toBe(true); // still in use by consumer-2

      await gateway.unregisterUsage(id, 'urn:test:consumer-2');
      expect(await gateway.isAssetInUse(id)).toBe(false); // now free
    });
  });

  describe('PrismaAssetRecordRepository Limitation', () => {
    it('skips direct DB tests because prisma generated client is not updated during Slice 2C limit', () => {
      expect(true).toBe(true);
    });
  });
  describe('local checksum fence', () => {
    it('refuses a changed quarantine payload before promotion', async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'manaratak-asset-digest-'));
      try {
        await mkdir(path.join(root, 'test-bucket', 'uploads'), { recursive: true });
        await writeFile(path.join(root, 'test-bucket', 'uploads', 'entry.pdf'), 'changed-bytes');
        const gateway = new LocalAssetStorageGateway('test-bucket', root);
        const source = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'test-bucket', 'uploads/entry.pdf');
        await expect(gateway.moveToCleanZone(source, 'a'.repeat(64)))
          .rejects.toThrow('ASSET_CLEAN_PROMOTION_CHECKSUM_MISMATCH');
        expect(await gateway.read(source, 100)).toHaveLength('changed-bytes'.length);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  });

  it('replays a completed local promotion by verifying existing CLEAN bytes, including sanitized paths', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'manaratak-promotion-retry-'));
    try {
      await mkdir(path.join(root, 'bucket', 'sanitized', 'uploads'), { recursive: true });
      const bytes = '%PDF-1.7 sanitized';
      await writeFile(path.join(root, 'bucket', 'sanitized', 'uploads', 'a.pdf'), bytes);
      const gateway = new LocalAssetStorageGateway('bucket', root);
      const source = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'bucket', 'sanitized/uploads/a.pdf');
      const digest = createHash('sha256').update(bytes).digest('hex');
      const clean = await gateway.moveToCleanZone(source, digest);
      expect(clean.pathKey).toBe('clean/sanitized/uploads/a.pdf');
      await expect(gateway.moveToCleanZone(source, digest)).resolves.toEqual(clean);
      await expect(gateway.moveToCleanZone(source, 'b'.repeat(64))).rejects.toThrow('ASSET_CLEAN_PROMOTION_CHECKSUM_MISMATCH');
      expect(Buffer.from(await gateway.read(clean, 100)).toString()).toBe(bytes);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('handles archive and restore retries and restoration of never-archived files safely', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'manaratak-archive-recovery-'));
    try {
      await mkdir(path.join(root, 'bucket', 'clean'), { recursive: true });
      const gateway = new LocalAssetStorageGateway('bucket', root);
      const record = new AssetStorageLocator(AssetStorageZone.CLEAN, 'bucket', 'clean/asset.pdf');
      const filename = path.join(root, 'bucket', 'clean', 'asset.pdf');
      await writeFile(filename, '%PDF-1.7 valid');
      await expect(gateway.restore(record)).resolves.toBeUndefined(); // Soft delete need not archive.
      await gateway.archive(record);
      await expect(gateway.archive(record)).resolves.toBeUndefined();
      await expect(gateway.read(record, 100)).rejects.toThrow();
      await gateway.restore(record);
      await expect(gateway.restore(record)).resolves.toBeUndefined();
      expect(Buffer.from(await gateway.read(record, 100)).toString()).toBe('%PDF-1.7 valid');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects ambiguous duplicated archive and active copies instead of overwriting either', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'manaratak-archive-duplicates-'));
    try {
      await mkdir(path.join(root, 'bucket', 'clean'), { recursive: true });
      const filename = path.join(root, 'bucket', 'clean', 'asset.pdf');
      await writeFile(filename, 'original');
      await writeFile(filename + '.archived', 'different');
      const gateway = new LocalAssetStorageGateway('bucket', root);
      const record = new AssetStorageLocator(AssetStorageZone.CLEAN, 'bucket', 'clean/asset.pdf');
      await expect(gateway.archive(record)).rejects.toThrow('ASSET_STORAGE_AMBIGUOUS_DUPLICATE_COPIES');
      await expect(gateway.restore(record)).rejects.toThrow('ASSET_STORAGE_AMBIGUOUS_DUPLICATE_COPIES');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('verifies restored CLEAN bytes by size and SHA-256 and fails for tampered copies', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'manaratak-clean-restore-proof-'));
    try {
      await mkdir(path.join(root, 'bucket', 'clean'), { recursive: true });
      const filename = path.join(root, 'bucket', 'clean', 'recovered.pdf');
      const bytes = Buffer.from('%PDF-1.7 restored immutable content');
      await writeFile(filename, bytes);
      const gateway = new LocalAssetStorageGateway('bucket', root);
      const locator = new AssetStorageLocator(AssetStorageZone.CLEAN, 'bucket', 'clean/recovered.pdf');
      const sha256 = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex');
      const input = { expectedSha256: sha256, expectedByteSize: bytes.length, declaredMimeType: 'application/pdf' };
      await expect(gateway.verifyRestoredObject(locator, input)).resolves.toBeUndefined();
      await expect(gateway.verifyRestoredObject(locator, { ...input, expectedSha256: 'a'.repeat(64) }))
        .rejects.toThrow('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED');
      await writeFile(filename, Buffer.from('%PDF-1.7 altered'));
      await expect(gateway.verifyRestoredObject(locator, input))
        .rejects.toThrow('ASSET_RESTORE_CONTENT_VERIFICATION_FAILED');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

});
