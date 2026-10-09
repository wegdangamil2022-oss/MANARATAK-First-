import { describe, expect, it, vi } from 'vitest';
import { PrismaAcademicTaxonomyRepository } from '../../src/academic-taxonomy/PrismaAcademicTaxonomyRepository';
import { AcademicStandardType, AcademicTaxonomyNodeType, AcademicTaxonomyStatus } from '@manaratak/domain';
const revision = '2026-10-09T00:00:00.000Z';
const data = { nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '06', canonicalName: 'ICT',
  standardType: AcademicStandardType.ISCED, status: AcademicTaxonomyStatus.ACTIVE };
function fixture(count: number) {
  const tx = { academicTaxonomyNode: { findUnique: vi.fn(async () => ({ id: 'stable', ...data,
    createdAt: new Date(revision), updatedAt: new Date(revision) })), updateMany: vi.fn(async () => ({ count })) } };
  const prisma = { ...tx, $transaction: vi.fn(async (work: (transaction: unknown) => Promise<unknown>) => work(tx)) };
  return { repository: new PrismaAcademicTaxonomyRepository(prisma as any), tx, prisma };
}
describe('taxonomy edit persistence fence', () => {
  it('compares persisted version in the write and excludes identity columns', async () => {
    const { repository, tx, prisma } = fixture(1);
    expect((await repository.updateNode('stable', data, revision)).nodeId).toBe('stable');
    const input = tx.academicTaxonomyNode.updateMany.mock.calls[0][0] as any;
    expect(input.where).toEqual({ id: 'stable', updatedAt: new Date(revision) });
    expect(input.data).not.toHaveProperty('canonicalCode');
    expect(input.data).not.toHaveProperty('standardType');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('refuses a lost compare-and-swap', async () => {
    await expect(fixture(0).repository.updateNode('stable', data, revision)).rejects.toThrow('VERSION_CONFLICT');
  });
});
