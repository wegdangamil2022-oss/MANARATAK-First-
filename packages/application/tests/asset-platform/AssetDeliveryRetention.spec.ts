import {afterEach, describe, expect, it, vi} from 'vitest';
import {createHash} from 'node:crypto';
import {
  AssetRecord, AssetId, AssetReference, AssetOwnerReference, AssetStorageLocator, AssetStorageZone,
  AssetMetadata, AssetChecksum, AssetSanitizationMetadata, AssetRetentionMetadata, AssetRetentionCategory,
  AssetLifecycleState, AssetSecurityClassification,
} from '@manaratak/domain';
import {ProcessAssetLifecycleUseCase} from '../../src/asset-platform/use-cases/ProcessAssetLifecycleUseCase';

const now = Date.parse('2026-10-21T06:00:00Z');
const bytes = Buffer.from('%PDF-1.4\nsynthetic\n%%EOF');
function asset(expiresAt: Date | null = new Date(now + 10_000), category = AssetRetentionCategory.TEMPORARY) {
  const digest = createHash('sha256').update(bytes).digest('hex');
  const quarantine = 'quarantine://private/uploads/document.pdf';
  return new AssetRecord({
    id: new AssetId('delivery-expiry'), reference: new AssetReference('delivery-expiry-reference'),
    owner: new AssetOwnerReference('student-a', 'STUDENT'), state: AssetLifecycleState.ACTIVE,
    classification: AssetSecurityClassification.CONFIDENTIAL,
    locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'private', 'clean/document.pdf'),
    metadata: new AssetMetadata('document.pdf', 'application/pdf', 'pdf', bytes.length),
    retention: new AssetRetentionMetadata(category, expiresAt),
    checksum: new AssetChecksum('sha256', digest),
    sanitization: new AssetSanitizationMetadata(true, new Date(now - 1_000)),
    uploadVerification: {signatureVerified: true, locator: quarantine, checksumSha256: digest,
      byteSize: bytes.length, verifiedMimeType: 'application/pdf', verifiedAt: new Date(now - 1_000).toISOString()},
    malwareScan: {status: 'PASSED', locator: quarantine, scannedAt: new Date(now - 1_000).toISOString()},
  });
}
function service(record: AssetRecord, generate: (ttl: number) => Promise<{url: string; headers: {}; expiresAt: Date}>) {
  const repository = {findById: vi.fn(async () => record)};
  const storage = {generateDeliveryGrant: vi.fn(async (_: unknown, ttl: number) => generate(ttl)), read: vi.fn(async () => bytes)};
  return {useCase: new ProcessAssetLifecycleUseCase(repository as never, storage as never, {} as never), storage};
}
const grant = (ttl: number) => ({url: 'https://storage.example.invalid/temporary', headers: {}, expiresAt: new Date(Date.now() + ttl * 1_000)});
afterEach(() => vi.restoreAllMocks());

describe('private asset delivery retention deadline', () => {
  for (const [name, expiry] of [['expired', new Date(now - 1)], ['invalid', new Date(NaN)], ['missing', null]] as const) {
    it('denies ' + name + ' temporary retention before granting or reading bytes', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(now);
      const f = service(asset(expiry), async ttl => grant(ttl));
      await expect(f.useCase.requestDeliveryGrant({assetId: 'delivery-expiry'})).rejects.toThrow('ASSET_DELIVERY_RETENTION_EXPIRED');
      await expect(f.useCase.readAuthenticatedDelivery('delivery-expiry')).rejects.toThrow('ASSET_DELIVERY_RETENTION_EXPIRED');
      expect(f.storage.generateDeliveryGrant).not.toHaveBeenCalled();
      expect(f.storage.read).not.toHaveBeenCalled();
    });
  }
  it('limits a private grant to remaining whole retention seconds', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = service(asset(new Date(now + 10_500)), async ttl => grant(ttl));
    const result = await f.useCase.requestDeliveryGrant({assetId: 'delivery-expiry', expiresInSeconds: 300});
    expect(Date.parse(result.expiresAt)).toBe(now + 10_000);
  });
  it('rejects a provider grant extending beyond the retention deadline', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = service(asset(), async () => grant(300));
    await expect(f.useCase.requestDeliveryGrant({assetId: 'delivery-expiry'})).rejects.toThrow('ASSET_DELIVERY_GRANT_EXCEEDS_DEADLINE');
  });
  it('rejects a grant when the asset expires during provider IO', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = service(asset(), async ttl => {clock.mockReturnValue(now + 11_000); return grant(ttl);});
    await expect(f.useCase.requestDeliveryGrant({assetId: 'delivery-expiry'})).rejects.toThrow('ASSET_DELIVERY_RETENTION_EXPIRED');
  });
  it('rejects a grant when the asset is withdrawn during provider IO', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const record = asset();
    const f = service(record, async ttl => {record.softDelete(); return grant(ttl);});
    await expect(f.useCase.requestDeliveryGrant({assetId: 'delivery-expiry'})).rejects.toThrow('ASSET_DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET');
  });
  it('rejects authenticated bytes if retention expires during the read', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = service(asset(), async ttl => grant(ttl));
    f.storage.read.mockImplementation(async () => {clock.mockReturnValue(now + 11_000); return bytes;});
    await expect(f.useCase.readAuthenticatedDelivery('delivery-expiry')).rejects.toThrow('ASSET_DELIVERY_RETENTION_EXPIRED');
  });
  it('keeps an explicitly permanent asset without expiry deliverable', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = service(asset(null, AssetRetentionCategory.PERMANENT), async ttl => grant(ttl));
    expect((await f.useCase.requestDeliveryGrant({assetId: 'delivery-expiry', expiresInSeconds: 60})).expiresAt).toBe(new Date(now + 60_000).toISOString());
  });
});
