import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaMajorRepository } from '../../src/majors/PrismaMajorRepository';
import { PrismaInternationalTestRepository } from '../../src/international-tests/PrismaInternationalTestRepository';

const input = { taxonomyNodeId: 'node', relationshipType: 'PRIMARY' as const, reason: 'Source checked', evidenceReference: 'review-1' };
function fixture() {
  const prisma = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    major: { findUnique: vi.fn().mockResolvedValue({ id: 'major', status: 'READY_TO_REVIEW' }), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    majorLevelProfile: { findUnique: vi.fn().mockResolvedValue({ majorId: 'major', status: 'READY_TO_REVIEW' }) },
    academicTaxonomyNode: { findUnique: vi.fn().mockResolvedValue({ id: 'node', status: 'ACTIVE', standardType: 'ISCED', standardCode: '061' }) },
    majorClassificationMapping: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => ({ id: 'mapping', ...data })) },
  };
  const base = new PrismaMajorRepository(prisma as unknown as PrismaClient);
  const bound = base.withTransaction({ boundaryId: 'boundary', transactionClient: prisma } as never);
  return { prisma, base, bound };
}
describe('M10-10 reviewed Major graph persistence', () => {
  it.each([undefined, 'profile'])('locks canonical owner and node, then derives standard metadata; owner scope %s', async profileId => {
    const f = fixture();
    const result = await f.bound.addReviewedClassificationMapping!('major', { ...input, profileId });
    expect(result).toMatchObject({ id: 'mapping', taxonomyNodeId: 'node', standardCode: '061', metadata: { source: 'ADMIN_REVIEW', evidenceReference: 'review-1' } });
    expect(f.prisma.majorClassificationMapping.create).toHaveBeenCalledWith({ data: expect.objectContaining({ majorId: 'major', profileId: profileId ?? null }) });
    expect(f.prisma.$queryRaw.mock.calls[0][0].text).toContain('FOR UPDATE');
    expect(f.prisma.$queryRaw.mock.calls.at(-1)![0].text).toContain('FOR SHARE');
    expect(f.prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(f.prisma.major.findUnique.mock.invocationCallOrder[0]);
  });
  it('refuses a write outside an audited transaction', async () => {
    const f = fixture(); await expect(f.base.addReviewedClassificationMapping('major', input)).rejects.toThrow('TRANSACTION_REQUIRED');
    expect(f.prisma.majorClassificationMapping.create).not.toHaveBeenCalled();
  });
  it.each(['PUBLISHED', 'ARCHIVED', 'REJECTED'])('preserves immutable owner state: %s', async status => {
    const f = fixture(); f.prisma.major.findUnique.mockResolvedValue({ id: 'major', status });
    await expect(f.bound.addReviewedClassificationMapping!('major', input)).rejects.toThrow('OWNER_IMMUTABLE');
    expect(f.prisma.majorClassificationMapping.create).not.toHaveBeenCalled();
  });
  it('rejects a profile from a different major', async () => {
    const f = fixture(); f.prisma.majorLevelProfile.findUnique.mockResolvedValue({ majorId: 'foreign', status: 'READY_TO_REVIEW' });
    await expect(f.bound.addReviewedClassificationMapping!('major', { ...input, profileId: 'profile' })).rejects.toThrow('FOREIGN_PROFILE_OWNER');
    expect(f.prisma.majorClassificationMapping.create).not.toHaveBeenCalled();
  });
  it.each(['missing', 'DRAFT', 'ARCHIVED'])('rejects unresolved or inactive taxonomy: %s', async status => {
    const f = fixture(); f.prisma.academicTaxonomyNode.findUnique.mockResolvedValue(status === 'missing' ? null : { id: 'node', status } as never);
    await expect(f.bound.addReviewedClassificationMapping!('major', input)).rejects.toThrow('NOT_ACTIVE');
    expect(f.prisma.majorClassificationMapping.create).not.toHaveBeenCalled();
  });
  it('refuses duplicate mappings even though nullable database unique keys cannot enforce this alone', async () => {
    const f = fixture(); f.prisma.majorClassificationMapping.findFirst.mockResolvedValue({ id: 'existing' } as never);
    await expect(f.bound.addReviewedClassificationMapping!('major', input)).rejects.toThrow('DUPLICATE_MAPPING');
    expect(f.prisma.majorClassificationMapping.create).not.toHaveBeenCalled();
  });
  it('rejects a duplicate imported profile mapping regardless of whether its majorId was stored', async () => {
    const f = fixture(); f.prisma.majorClassificationMapping.findFirst.mockResolvedValue({ id: 'legacy-profile-mapping' } as never);
    await expect(f.bound.addReviewedClassificationMapping!('major', { ...input, profileId: 'profile' })).rejects.toThrow('DUPLICATE_MAPPING');
    expect(f.prisma.majorClassificationMapping.findFirst).toHaveBeenCalledWith({ where: { profileId: 'profile', taxonomyNodeId: 'node', relationshipType: 'PRIMARY' } });
    expect(f.prisma.majorClassificationMapping.create).not.toHaveBeenCalled();
  });
  it('applies canonical graph and search filters to both page and count queries', async () => {
    const f = fixture(); await f.base.list({taxonomyNodeId:'node',search:'science',page:2,pageSize:50});
    expect(f.prisma.$queryRaw).toHaveBeenCalledTimes(2);
    for (const [sql] of f.prisma.$queryRaw.mock.calls) {
      expect(sql.sql).toContain('"MajorClassificationMapping"');
      expect(sql.sql).toContain('c."profileId"=r."profileId"');
      expect(sql.values).toContain('node'); expect(sql.values).toContain('science');
    }
    expect(f.prisma.$queryRaw.mock.calls[0][0].values.slice(-2)).toEqual([50,50]);
  });
  it('locks test owner and allowlisted reference using parameterized IDs', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
    const base = new PrismaInternationalTestRepository(prisma as unknown as PrismaClient);
    await expect(base.acquireGraphMutationLock('test', 'COUNTRY', 'reference')).rejects.toThrow('TRANSACTION_REQUIRED');
    const bound = base.withTransaction({ boundaryId: 'b', transactionClient: prisma } as never);
    await bound.acquireGraphMutationLock!('test', 'TAXONOMY', 'reference');
    expect(prisma.$queryRaw.mock.calls[0][0].values).toEqual(['test']);
    expect(prisma.$queryRaw.mock.calls[1][0].text).toContain('"AcademicTaxonomyNode"');
    expect(prisma.$queryRaw.mock.calls[1][0].values).toEqual(['reference']);
  });
  it('filters the immutable published snapshots by canonical mapping and cursor', async () => {
    const f=fixture(); await f.base.listPublished({taxonomyNodeId:'node',search:'science',limit:50});
    expect(f.prisma.$queryRaw).toHaveBeenCalledTimes(2);
    for (const [sql] of f.prisma.$queryRaw.mock.calls) {
      expect(sql.sql).toContain('"MajorPublicationSnapshot"');
      expect(sql.values).toContain('node'); expect(sql.values).toContain('science');
    }
    expect(f.prisma.$queryRaw.mock.calls[0][0].values).toContain(51);
  });
});
