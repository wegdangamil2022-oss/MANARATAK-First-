import { describe, expect, it, vi } from 'vitest';
import { AssetRetentionCategory } from '@manaratak/domain';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

describe('EAP Admin pagination and filter integrity', () => {
  it('combines the search predicate and keyset cursor with AND', async () => {
    const findMany = vi.fn(async (_args?: unknown) => []);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    const cursor = Buffer.from('2026-10-01T00:00:00.000Z|asset-99', 'utf8').toString('base64url');
    await repo.queryAdmin({ q: 'scholarship', cursor, limit: 10 });
    const query = findMany.mock.calls[0]?.[0] as any;
    expect(query.where.AND).toHaveLength(2);
    expect(query.where.AND[0].OR).toEqual(expect.arrayContaining([
      { reference: { contains: 'scholarship', mode: 'insensitive' } },
    ]));
    expect(query.where.AND[1].OR).toEqual(expect.arrayContaining([
      { createdAt: new Date('2026-10-01T00:00:00.000Z'), id: { lt: 'asset-99' } },
    ]));
  });

  it('rejects malformed or noncanonical cursors before querying the database', async () => {
    const findMany = vi.fn(async (_args?: unknown) => []);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    await expect(repo.queryAdmin({ cursor: '!not-base64!' })).rejects.toThrow('ASSET_CURSOR_INVALID');
    await expect(repo.queryAdmin({ cursor: Buffer.from('junk|asset-id').toString('base64url') }))
      .rejects.toThrow('ASSET_CURSOR_INVALID');
    expect(findMany).not.toHaveBeenCalled();
  });
  it.each(['PRESENT', 'MISSING'] as const)('keeps %s checksum and retention facets alongside search and cursor', async (checksumPresence) => {
    const findMany = vi.fn(async (_args?: unknown) => []);
    const repo = new PrismaAssetRecordRepository({ assetRecord: { findMany } } as any);
    await repo.queryAdmin({
      retentionCategory: AssetRetentionCategory.TEMPORARY, checksumPresence,
      q: 'pdf', mimeTypePrefix: 'application/',
      cursor: Buffer.from('2026-10-01T00:00:00.000Z|asset-99').toString('base64url'),
    });
    const query = findMany.mock.calls[0][0] as any;
    expect(query.where.metadata).toEqual({ path: ['mimeType'], string_starts_with: 'application/' });
    expect(query.where.AND).toHaveLength(4);
    expect(query.where.AND[0]).toEqual({ retentionCategory: 'TEMPORARY' });
    expect(query.where.AND[1]).toEqual(checksumPresence === 'PRESENT' ? { AND: [
      { checksumAlgorithm: { not: null } }, { checksumAlgorithm: { not: '' } },
      { checksumHash: { not: null } }, { checksumHash: { not: '' } },
    ] } : { OR: [
      { checksumAlgorithm: null }, { checksumAlgorithm: '' },
      { checksumHash: null }, { checksumHash: '' },
    ] });
    expect(query.where.AND[2].OR).toBeDefined();
    expect(query.where.AND[3].OR).toBeDefined();
  });

});
