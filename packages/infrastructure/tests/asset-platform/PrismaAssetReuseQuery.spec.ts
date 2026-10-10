import { describe, expect, it, vi } from 'vitest';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

describe('EAP safe reuse query', () => {
  it('enforces state, classification, CLEAN and evidence at database level', async () => {
    const findMany = vi.fn(async (_query: unknown) => []);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    await repo.queryAdmin({ reuseOnly: true, q: 'poster', limit: 10, securityClassification: 'CONFIDENTIAL' });
    const where = (findMany.mock.calls[0][0] as any).where;
    expect(where.lifecycleState).toBe('ACTIVE');
    expect(where.securityClassification.in).toEqual(['PUBLIC', 'INTERNAL']);
    expect(where.cleanStorageLocator).toEqual({ not: null });
    expect(where.AND).toEqual(expect.arrayContaining([
      { malwareScanStatus: { path: ['status'], equals: 'PASSED' } },
      { malwareScanStatus: { path: ['uploadVerification', 'signatureVerified'], equals: true } },
    ]));
    expect(where.AND.some((part: any) => part.OR?.some((entry: any) => entry.reference?.contains === 'poster')))
      .toBe(true);
  });
});

function trustedRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, reference: `ref-${id}`, ownerId: 'owner-1', ownerType: 'COURSE',
    lifecycleState: 'ACTIVE', securityClassification: 'PUBLIC',
    retentionCategory: 'PERMANENT', retentionExpiresAt: null,
    cleanStorageLocator: `clean://bucket/${id}.pdf`, quarantineStorageLocator: null,
    checksumAlgorithm: 'sha256', checksumHash: 'a'.repeat(64),
    metadata: { originalFilename: `${id}.pdf`, mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 42 },
    sanitizationMetadata: { exifStripped: true, sanitizedAt: '2026-01-01T00:00:00.000Z' },
    malwareScanStatus: { status: 'PASSED', locator: 'quarantine://bucket/upload.pdf',
      scannedAt: '2026-01-01T00:00:00.000Z', uploadVerification: {
        signatureVerified: true, locator: 'quarantine://bucket/upload.pdf', byteSize: 42,
        verifiedMimeType: 'application/pdf', checksumSha256: 'a'.repeat(64), verifiedAt: '2026-01-01T00:00:00.000Z',
      } },
    versionChain: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}
describe('EAP reuse results require complete Domain proof', () => {
  it.each([
    { sanitizationMetadata: null }, { malwareScanStatus: null },
    { checksumAlgorithm: 'md5' },
    { metadata: { originalFilename: 'changed.pdf', mimeType: 'application/pdf', fileExtension: 'pdf', byteSize: 43 } },
  ])('omits untrusted rows while preserving trusted candidates', async overrides => {
    const findMany = vi.fn(async () => [trustedRow('invalid', overrides), trustedRow('valid')]);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    const page = await repo.queryAdmin({ reuseOnly: true, limit: 10 });
    expect(page.items.map(item => item.id)).toEqual(['valid']);
    expect(page.hasMore).toBe(false);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
  it('advances a fully rejected page to its scanned boundary without N+1 queries', async () => {
    const findMany = vi.fn(async () => [trustedRow('invalid', { sanitizationMetadata: null }), trustedRow('later')]);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    const page = await repo.queryAdmin({ reuseOnly: true, limit: 1 });
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(true);
    expect(Buffer.from(page.nextCursor!, 'base64url').toString('utf8')).toBe('2026-01-01T00:00:00.000Z|invalid');
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
