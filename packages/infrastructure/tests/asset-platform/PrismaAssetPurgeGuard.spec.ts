import { describe, expect, it, vi } from 'vitest';
import { AssetId } from '@manaratak/domain';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

const fixed = new Date('2026-10-09T00:00:00.000Z');
const earlier = new Date('2026-10-08T00:00:00.000Z');
const later = new Date('2026-10-10T00:00:00.000Z');

function fixture(overrides: Record<string, unknown> | null = {}) {
  const row = overrides === null ? null : {
    lifecycleState: 'DELETED',
    retentionExpiresAt: earlier,
    legalHoldUntil: null,
    retentionClaimUntil: null,
    ...overrides,
  };
  const findUnique = vi.fn(async (_query: unknown) => row);
  const repo = new PrismaAssetRecordRepository({ assetRecord: { findUnique } } as any);
  return { repo, findUnique };
}

describe('EAP irreversible purge retention and legal hold preflight', () => {
  it('permits only an explicitly expired, unclaimed, unheld soft-deleted record', async () => {
    const f = fixture();
    await expect(f.repo.assertPurgeAllowed(new AssetId('asset-1'), fixed)).resolves.toBeUndefined();
    expect(f.findUnique).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      select: {
        lifecycleState: true,
        retentionExpiresAt: true,
        legalHoldUntil: true,
        retentionClaimUntil: true,
      },
    });
  });

  it.each([
    [{ retentionExpiresAt: null }, 'ASSET_PURGE_RETENTION_NOT_EXPIRED'],
    [{ retentionExpiresAt: later }, 'ASSET_PURGE_RETENTION_NOT_EXPIRED'],
    [{ legalHoldUntil: later }, 'ASSET_PURGE_LEGAL_HOLD_ACTIVE'],
    [{ retentionClaimUntil: later }, 'ASSET_PURGE_RETENTION_CLAIM_ACTIVE'],
    [{ lifecycleState: 'ACTIVE' }, 'ASSET_PURGE_SOFT_DELETE_REQUIRED'],
  ])('rejects unsafe purge state: %j', async (override, code) => {
    const f = fixture(override);
    await expect(f.repo.assertPurgeAllowed(new AssetId('asset-1'), fixed)).rejects.toThrow(code);
  });

  it('fails closed for missing records or an invalid clock', async () => {
    await expect(fixture(null).repo.assertPurgeAllowed(new AssetId('missing'), fixed))
      .rejects.toThrow('ASSET_PURGE_NOT_FOUND');
    await expect(fixture().repo.assertPurgeAllowed(new AssetId('asset-1'), new Date('invalid')))
      .rejects.toThrow('ASSET_PURGE_CLOCK_INVALID');
  });
});
