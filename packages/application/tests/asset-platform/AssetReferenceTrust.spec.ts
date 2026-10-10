import { describe, expect, it, vi } from 'vitest';
import {
  AssetRecord, AssetId, AssetReference, AssetOwnerReference, AssetStorageLocator, AssetStorageZone,
  AssetMetadata, AssetChecksum, AssetSanitizationMetadata, AssetRetentionMetadata, AssetRetentionCategory,
  AssetLifecycleState, AssetSecurityClassification, IAssetRecordRepository,
} from '@manaratak/domain';
import { AssetReferencePolicy } from '../../src/asset-platform/AssetReferencePolicy';
import { AdminCourseUseCases } from '../../src/courses/use-cases/AdminCourseUseCases';

const digest = 'a'.repeat(64);
function trustedAsset(overrides: Partial<ConstructorParameters<typeof AssetRecord>[0]> = {}) {
  const proofLocator = 'quarantine://private/uploads/image.png';
  return new AssetRecord({
    id: new AssetId('trusted-image'), reference: new AssetReference('trusted-reference'),
    owner: new AssetOwnerReference('owner-a', 'STUDENT'), state: AssetLifecycleState.ACTIVE,
    classification: AssetSecurityClassification.PUBLIC,
    locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'private', 'clean/image.png'),
    metadata: new AssetMetadata('image.png', 'image/png', 'png', 64),
    retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
    checksum: new AssetChecksum('sha256', digest),
    sanitization: new AssetSanitizationMetadata(true, new Date('2026-01-01')),
    uploadVerification: { signatureVerified: true, locator: proofLocator, checksumSha256: digest,
      byteSize: 64, verifiedMimeType: 'image/png', verifiedAt: '2026-01-01T00:00:00.000Z' },
    malwareScan: { status: 'PASSED', locator: proofLocator, scannedAt: '2026-01-01T00:00:00.000Z' },
    ...overrides,
  });
}
function policy(asset: AssetRecord) {
  return new AssetReferencePolicy({ findById: vi.fn(async () => asset) } as unknown as IAssetRecordRepository);
}
describe('owner asset references require Domain delivery trust', () => {
  it('permits a verified clean asset while retaining owner/classification/MIME checks', async () => {
    const asset = trustedAsset();
    expect(await policy(asset).assertUsable('trusted-image', { purpose: 'AVATAR', expectedOwnerId: 'owner-a',
      allowedOwnerTypes: ['STUDENT'], allowedMimeTypePrefixes: ['image/'] })).toBe(asset);
    await expect(policy(asset).assertUsable('trusted-image', { purpose: 'AVATAR', expectedOwnerId: 'another-owner' })).rejects.toThrow('OWNER_MISMATCH');
  });
  it.each([
    { sanitization: undefined }, { malwareScan: undefined }, { uploadVerification: undefined },
    { checksum: new AssetChecksum('md5', digest) },
    { metadata: new AssetMetadata('image.png', 'image/png', 'png', 65) },
    { metadata: new AssetMetadata('image.png', 'application/pdf', 'pdf', 64) },
    { locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'private', 'image.png') },
    { sanitization: new AssetSanitizationMetadata(true, new Date('invalid')) },
  ])('rejects ACTIVE rows with missing or mismatched persisted proof', async overrides => {
    const asset = trustedAsset(overrides);
    expect(() => asset.assertCanDeliver()).toThrow('ASSET_DELIVERY_');
    await expect(policy(asset).assertUsable('trusted-image', { purpose: 'COURSE_THUMBNAIL' })).rejects.toThrow('COURSE_THUMBNAIL_ASSET_TRUST_EVIDENCE_REQUIRED');
  });
  it('rejects malformed proof timestamps and digest format', async () => {
    const baseline = trustedAsset();
    for (const uploadVerification of [
      { ...baseline.uploadVerification!, verifiedAt: 'invalid' },
      { ...baseline.uploadVerification!, checksumSha256: 'not-a-hash' },
    ]) {
      const asset = trustedAsset({ uploadVerification });
      await expect(policy(asset).assertUsable('trusted-image', { purpose: 'AVATAR' })).rejects.toThrow('TRUST_EVIDENCE_REQUIRED');
    }
  });
  it('does not let a lifecycle allowlist override authorize non-deliverable references', async () => {
    const asset = trustedAsset({ state: AssetLifecycleState.ARCHIVED });
    await expect(policy(asset).assertUsable('trusted-image', { purpose: 'CMS', allowedStates: [AssetLifecycleState.ARCHIVED] }))
      .rejects.toThrow('TRUST_EVIDENCE_REQUIRED');
  });
  it('blocks the real Course owner use case before repository update', async () => {
    const asset = trustedAsset({ sanitization: undefined });
    const update = vi.fn();
    const courses = new AdminCourseUseCases({ update, findById: vi.fn() } as any, undefined, policy(asset));
    await expect(courses.updateCourse('course-a', { thumbnailAssetId: 'trusted-image' }))
      .rejects.toThrow('COURSE_THUMBNAIL_ASSET_TRUST_EVIDENCE_REQUIRED');
    expect(update).not.toHaveBeenCalled();
  });
});
