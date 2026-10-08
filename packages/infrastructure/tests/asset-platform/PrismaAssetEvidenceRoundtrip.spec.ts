import { describe, expect, it, vi } from 'vitest';
import {
  AssetRecord, AssetId, AssetReference, AssetOwnerReference, AssetStorageLocator,
  AssetMetadata, AssetRetentionMetadata, AssetRetentionCategory,
  AssetSecurityClassification, AssetLifecycleState, AssetStorageZone, AssetSanitizationMetadata,
} from '@manaratak/domain';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

describe('EAP persisted upload and malware evidence', () => {
  it('round-trips observed upload evidence and scanner result through existing Prisma JSON column', async () => {
    let stored: any = null;
    const create = vi.fn(async (args: any) => {
      stored = { ...args.data, updatedAt: new Date('2026-10-09T00:00:00.000Z') };
      return stored;
    });
    const findUnique = vi.fn(async () => stored);
    const repository = new PrismaAssetRecordRepository({
      assetRecord: { create, findUnique },
    } as any);
    const record = new AssetRecord({
      id: new AssetId('asset-evidence-1'),
      reference: new AssetReference('ref-evidence-1'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'private', 'uploaded.pdf'),
      metadata: new AssetMetadata('uploaded.pdf', 'application/pdf', 'pdf', 42),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner-1', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.QUARANTINED,
    });
    record.confirmUploadedObject({
      locator: record.locator.value, byteSize: 42, verifiedMimeType: 'application/pdf',
      checksumSha256: 'b'.repeat(64), verifiedAt: new Date().toISOString(), signatureVerified: true,
    });
    record.startValidation();
    record.passMalwareScan();
    record.startSanitizing();
    record.completeSanitization(new AssetSanitizationMetadata(true, new Date(), 'sanitized'));
    record.confirmSanitizedObject({
      locator: record.locator.value, byteSize: 42, verifiedMimeType: 'application/pdf',
      checksumSha256: 'b'.repeat(64), verifiedAt: new Date().toISOString(), signatureVerified: true,
    });
    record.passSanitizedMalwareScan();
    await repository.save(record);
    expect(stored.malwareScanStatus).toMatchObject({
      status: 'PASSED', uploadVerification: { checksumSha256: 'b'.repeat(64), byteSize: 42 },
    });

    const restored = await repository.findById(new AssetId('asset-evidence-1'));
    expect(restored?.uploadVerification?.verifiedMimeType).toBe('application/pdf');
    expect(restored?.malwareScan?.status).toBe('PASSED');
    expect(() => restored?.assertCanActivate()).not.toThrow();
  });
});
