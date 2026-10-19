import { describe, it, expect, vi } from 'vitest';
import {
  AssetRecord,
  AssetId,
  AssetReference,
  AssetOwnerReference,
  AssetStorageLocator,
  AssetStorageZone,
  AssetMetadata,
  AssetChecksum,
  AssetSanitizationMetadata,
  AssetRetentionMetadata,
  AssetRetentionCategory,
  AssetLifecycleState,
  AssetSecurityClassification,
  assertAssetPublicRights,
  assetRightsStatus,
} from '@absheer/domain';
import { AssetGovernanceUseCases } from '../../src/asset-platform/use-cases/AssetGovernanceUseCases';
import {
  RecoverAssetLifecycleUseCase,
  assertLifecycleProof,
} from '../../src/asset-platform/use-cases/RecoverAssetLifecycleUseCase';
const hash = 'a'.repeat(64),
  childHash = 'b'.repeat(64),
  rights = {
    rightsSource: 'Owner permission',
    attribution: 'Photographer',
    usageScope: 'PUBLIC' as const,
    publicationPolicy: 'MANDATORY' as const,
    expiresAt: '2026-01-01T00:00:00Z',
  };
function asset(id = 'parent', digest = hash) {
  const proof = 'quarantine://private/' + id;
  return new AssetRecord({
    id: new AssetId(id),
    reference: new AssetReference('ref-' + id),
    owner: new AssetOwnerReference('owner', 'UNIVERSITY'),
    state: AssetLifecycleState.ACTIVE,
    classification: AssetSecurityClassification.PUBLIC,
    locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'private', id),
    metadata: new AssetMetadata('image.png', 'image/png', 'png', 64, 32, 32),
    retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
    checksum: new AssetChecksum('sha256', digest),
    sanitization: new AssetSanitizationMetadata(true, new Date('2026-01-01')),
    uploadVerification: {
      signatureVerified: true,
      locator: proof,
      checksumSha256: digest,
      byteSize: 64,
      verifiedMimeType: 'image/png',
      verifiedAt: '2026-01-01T00:00:00Z',
    },
    malwareScan: { status: 'PASSED', locator: proof, scannedAt: '2026-01-01T00:00:00Z' },
  });
}
function setup() {
  const parent = asset(),
    child = asset('child', childHash),
    evidence = {
      sourceSha256: hash,
      checksumSha256: childHash,
      byteSize: 64,
      mimeType: 'image/png',
      width: 32,
      height: 32,
      verifiedAt: new Date().toISOString(),
    },
    gateway = {
      load: vi.fn(async (id: string) => ({
        asset: id === 'parent' ? parent : child,
        revision: '2026-01-01T00:00:00Z',
      })),
      rights: vi.fn(),
      renditions: vi.fn(async () => []),
      saveRendition: vi.fn(),
    },
    storage = {
      verifyRenditionRelation: vi.fn(async () => evidence),
      generateDeliveryGrant: vi.fn(),
    },
    atomic = {
      execute: vi.fn(async (_definition, operation) => operation({ boundaryId: 'test' })),
    };
  return {
    parent,
    child,
    evidence,
    gateway,
    storage,
    atomic,
    uc: new AssetGovernanceUseCases(gateway as any, storage as any, atomic as any),
  };
}
describe('structured asset rights', () => {
  it('reports unspecified without assuming a license', () => {
    expect(assetRightsStatus(undefined)).toBe('UNSPECIFIED');
    expect(() => assertAssetPublicRights(undefined)).not.toThrow();
  });
  it('blocks expired mandatory public publication', () =>
    expect(() => assertAssetPublicRights(rights, new Date('2026-10-12'))).toThrow(
      'ASSET_PUBLIC_RIGHTS_REQUIRED',
    ));
  it('permits expired advisory rights for reviewer consideration', () =>
    expect(() =>
      assertAssetPublicRights({ ...rights, publicationPolicy: 'ADVISORY' }, new Date('2026-10-12')),
    ).not.toThrow());
  it('does not change internal delivery trust into a public license requirement', () => {
    const value = asset();
    value.setRights({ ...rights, usageScope: 'INTERNAL' }, 'actor', 'Record internal permission');
    expect(() => value.assertCanDeliver()).not.toThrow();
    expect(() => assertAssetPublicRights(value.metadata.extraMetadata?.rights)).toThrow();
  });
  it('records attribution and immutable history entries', () => {
    const value = asset();
    value.setRights({ ...rights, expiresAt: undefined }, 'actor', 'Record first license');
    value.setRights(
      { ...rights, attribution: 'Updated credit' },
      'second',
      'Update rights attribution',
    );
    const history = value.metadata.extraMetadata?.rightsHistory as any[];
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ actorId: 'actor', rights: { attribution: 'Photographer' } });
    expect(history[1].actorId).toBe('second');
  });
});
describe('rendition readiness is backed by actual provider evidence', () => {
  it('records missing without contacting a transform provider', async () => {
    const s = setup();
    const row = await s.uc.saveRendition(
      'parent',
      'thumbnail',
      { expectedVersion: 0, status: 'MISSING' },
      { actorId: 'actor' },
    );
    expect(row.evidence).toBeNull();
    expect(row.generatedAssetId).toBeNull();
    expect(s.storage.verifyRenditionRelation).not.toHaveBeenCalled();
  });
  it('records verified dimensions/bytes/MIME/hash and omits storage coordinates', async () => {
    const s = setup();
    const row = await s.uc.saveRendition(
      'parent',
      'thumbnail',
      { expectedVersion: 0, status: 'READY', generatedAssetId: 'child' },
      { actorId: 'actor' },
    );
    expect(row.evidence).toEqual(s.evidence);
    expect(JSON.stringify(row)).not.toContain('clean://');
    expect(s.gateway.saveRendition).toHaveBeenCalledWith(row, 0, { boundaryId: 'test' });
  });
  it.each([
    { byteSize: 65 },
    { mimeType: 'application/pdf' },
    { width: 0 },
    { height: 33 },
    { sourceSha256: childHash },
    { checksumSha256: hash },
    { verifiedAt: 'invalid' },
  ])('rejects mismatched provider observations %j', async (change) => {
    const s = setup();
    s.storage.verifyRenditionRelation.mockResolvedValue({ ...s.evidence, ...change });
    await expect(
      s.uc.saveRendition(
        'parent',
        'thumbnail',
        { expectedVersion: 0, status: 'READY', generatedAssetId: 'child' },
        { actorId: 'actor' },
      ),
    ).rejects.toThrow('ASSET_RENDITION_EVIDENCE_INVALID');
    expect(s.gateway.saveRendition).not.toHaveBeenCalled();
  });
  it('fails gracefully when a provider cannot verify derivation', async () => {
    const s = setup();
    s.storage.verifyRenditionRelation = undefined as any;
    await expect(
      s.uc.saveRendition(
        'parent',
        'thumbnail',
        { expectedVersion: 0, status: 'READY', generatedAssetId: 'child' },
        { actorId: 'actor' },
      ),
    ).rejects.toThrow('NOT_CONFIGURED');
    expect(s.gateway.saveRendition).not.toHaveBeenCalled();
  });
  it('does not generate preview grants for a missing variant', async () => {
    const s = setup();
    await expect(s.uc.renditionDelivery('parent', 'missing')).rejects.toThrow('NOT_READY');
    expect(s.storage.generateDeliveryGrant).not.toHaveBeenCalled();
  });
});
describe('authoritative lifecycle reconciliation', () => {
  const candidate = { assetId: 'parent', operationId: 'operation-1', kind: 'RESTORE' as const };
  const proof = () => ({
    operationId: 'operation-1',
    kind: 'RESTORE' as const,
    status: 'RESTORED' as const,
    fenced: true as const,
    fenceToken: 'provider-fence',
    observedAt: new Date().toISOString(),
  });
  it.each([
    { operationId: 'other' },
    { kind: 'ARCHIVE' },
    { fenced: false },
    { status: 'ARCHIVED' },
    { observedAt: 'invalid' },
    { fenceToken: '' },
  ])('rejects an unbound or nonterminal fence %j', (change) =>
    expect(() => assertLifecycleProof(candidate, { ...proof(), ...change } as any)).toThrow(
      'PROOF_INVALID',
    ),
  );
  it('does not clear a hold while the provider reports pending', async () => {
    const gateway = {
        pending: vi.fn(async () => [candidate]),
        load: vi.fn(async () => ({ asset: asset(), revision: 'revision' })),
        complete: vi.fn(),
      },
      storage = { reconcileLifecycleOperation: vi.fn(async () => null) },
      atomic = { execute: vi.fn() };
    const result = await new RecoverAssetLifecycleUseCase(
      gateway as any,
      storage as any,
      atomic as any,
    ).execute({ before: new Date(), limit: 1, jobReference: 'job' });
    expect(result).toEqual({ completed: 0, pending: 1, failed: 0 });
    expect(gateway.complete).not.toHaveBeenCalled();
  });
  it('requires verified clean bytes before restoring ACTIVE', async () => {
    const gateway = {
        pending: vi.fn(async () => [candidate]),
        load: vi.fn(async () => ({ asset: asset(), revision: 'revision' })),
        complete: vi.fn(),
      },
      storage = {
        reconcileLifecycleOperation: vi.fn(async () => proof()),
        verifyRestoredObject: vi.fn().mockRejectedValue(new Error('CHECKSUM_MISMATCH')),
      },
      atomic = { execute: vi.fn() };
    const result = await new RecoverAssetLifecycleUseCase(
      gateway as any,
      storage as any,
      atomic as any,
    ).execute({ before: new Date(), limit: 1, jobReference: 'job' });
    expect(result.failed).toBe(1);
    expect(atomic.execute).not.toHaveBeenCalled();
    expect(gateway.complete).not.toHaveBeenCalled();
  });
  it('records only the fence digest in atomic audit metadata', async () => {
    const gateway = {
        pending: vi.fn(async () => [candidate]),
        load: vi.fn(async () => ({ asset: asset(), revision: 'revision' })),
        complete: vi.fn(),
      },
      storage = {
        reconcileLifecycleOperation: vi.fn(async () => proof()),
        verifyRestoredObject: vi.fn(),
      },
      atomic = {
        execute: vi.fn(async (_definition, operation) => operation({ boundaryId: 'test' })),
      };
    const result = await new RecoverAssetLifecycleUseCase(
      gateway as any,
      storage as any,
      atomic as any,
    ).execute({ before: new Date(), limit: 1, jobReference: 'job' });
    expect(result.completed).toBe(1);
    expect(JSON.stringify(atomic.execute.mock.calls[0][0])).not.toContain('provider-fence');
    expect(gateway.complete).toHaveBeenCalledWith(
      candidate,
      'revision',
      expect.objectContaining({ fenced: true }),
      { boundaryId: 'test' },
    );
  });
});
