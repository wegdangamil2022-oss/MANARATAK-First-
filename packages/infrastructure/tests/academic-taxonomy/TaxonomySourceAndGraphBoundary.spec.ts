import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaAcademicTaxonomyImportGateway } from '../../src/academic-taxonomy/PrismaAcademicTaxonomyImportGateway';
import { PrismaAcademicTaxonomyRepository } from '../../src/academic-taxonomy/PrismaAcademicTaxonomyRepository';
import { PrismaAssetRecordRepository } from '../../src/asset-platform/PrismaAssetRecordRepository';

afterEach(() => vi.restoreAllMocks());
describe('Taxonomy source and graph boundaries', () => {
  it('requires the coordinator transaction for source checks', async () => {
    await expect(new PrismaAcademicTaxonomyImportGateway({} as any).verifyArtifact('asset', 'a'.repeat(64))).rejects.toThrow('TRANSACTION_REQUIRED');
  });
  it.each(['missing', 'hash', 'quarantined'])('blocks %s sources under an asset row lock', async kind => {
    const db: any = { $queryRaw: vi.fn(async () => []) };
    const assertCanDeliver = vi.fn(() => { if (kind === 'quarantined') throw new Error('QUARANTINED'); });
    const find = vi.spyOn(PrismaAssetRecordRepository.prototype, 'findById').mockResolvedValue(kind === 'missing' ? null : {
      checksum: { algorithm: 'sha256', hash: 'b'.repeat(64) }, assertCanDeliver,
    } as any);
    await expect(new PrismaAcademicTaxonomyImportGateway(db, true).verifyArtifact('asset', 'a'.repeat(64))).rejects.toThrow(
      kind === 'missing' ? 'SOURCE_ARTIFACT_UNAVAILABLE' : kind === 'hash' ? 'SOURCE_HASH_CONFLICT' : 'QUARANTINED',
    );
    expect(db.$queryRaw.mock.calls[0][0].join('')).toContain('FOR SHARE');
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(find.mock.invocationCallOrder[0]);
  });
  it('accepts a deliverable artifact with the exact SHA256 after locking it', async () => {
    const db: any = { $queryRaw: vi.fn(async () => []) };
    const assertCanDeliver = vi.fn();
    vi.spyOn(PrismaAssetRecordRepository.prototype, 'findById').mockResolvedValue({ checksum: { algorithm: 'SHA256', hash: 'A'.repeat(64) }, assertCanDeliver } as any);
    await new PrismaAcademicTaxonomyImportGateway(db, true).verifyArtifact('asset', 'a'.repeat(64));
    expect(assertCanDeliver).toHaveBeenCalledOnce();
  });
  it('rejects oversized node/edge snapshots rather than validating a truncated graph', async () => {
    const db: any = { academicTaxonomyNode: { findMany: vi.fn(async () => Array(5001).fill({})) }, academicTaxonomyEdge: { findMany: vi.fn(async () => Array(20001).fill({})) } };
    const repo = new PrismaAcademicTaxonomyRepository(db);
    await expect(repo.listNodes()).rejects.toThrow('GRAPH_SCOPE_TOO_LARGE');
    await expect(repo.listEdges()).rejects.toThrow('GRAPH_SCOPE_TOO_LARGE');
    expect(db.academicTaxonomyNode.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5001 }));
    expect(db.academicTaxonomyEdge.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20001 }));
  });
  it('retains bounded paged discovery for catalogs larger than the mutation limit', async () => {
    const findMany = vi.fn(async () => []);
    await new PrismaAcademicTaxonomyRepository({ academicTaxonomyNode: { findMany } } as any).listNodes({ page: 60, pageSize: 100 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, skip: 5900 }));
  });
});
