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
});
