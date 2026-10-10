import { describe, expect, it, vi } from 'vitest';
import { PrismaCanonicalAcademicUsageGateway } from '../../src/academic-taxonomy/PrismaCanonicalAcademicUsageGateway';
describe('bounded canonical usage read model', () => {
  it('uses aggregate relation counts without loading consumer entities', async () => {
    const db = { academicTaxonomyNode: { findUnique: vi.fn(async () => ({ _count: { courseTaxonomyLinks: 3, majorClassificationMappings: 2 } })) } };
    const result = await new PrismaCanonicalAcademicUsageGateway(db as any).summarize('TAXONOMY_NODE', 'node');
    expect(result.totalReferences).toBe(5);
    expect(db.academicTaxonomyNode.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'node' }, select: { _count: { select: expect.objectContaining({ courseTaxonomyLinks: true, majorClassificationMappings: true }) } } }));
  });
  it('counts legacy degree code-only links without double-counting ID-backed rows', async () => {
    const db = { degreeLevel: { findUnique: vi.fn(async () => ({ canonicalCode: 'MASTER', _count: { universityPrograms: 3, internationalTestDegreeRelationships: 2 } })) },
      internationalTestDegreeRelationship: { count: vi.fn(async () => 4) }, majorLevelProfile: { count: vi.fn(async () => 1) } };
    const result = await new PrismaCanonicalAcademicUsageGateway(db as any).summarize('DEGREE_LEVEL', 'degree');
    expect(result.totalReferences).toBe(10);
    expect(db.internationalTestDegreeRelationship.count).toHaveBeenCalledWith({ where: { degreeLevelId: null, degreeLevelCode: 'MASTER' } });
    expect(db.majorLevelProfile.count).toHaveBeenCalledWith({ where: { degreeLevelId: null, level: 'MASTER' } });
  });
  it('does not turn a missing identity into a reassuring zero-impact report', async () => {
    const db = { academicTaxonomyNode: { findUnique: async () => null } };
    await expect(new PrismaCanonicalAcademicUsageGateway(db as any).summarize('TAXONOMY_NODE', 'missing')).rejects.toThrow('ACADEMIC_USAGE_REFERENCE_NOT_FOUND');
  });
  it('refuses an unbound atomic context', () => {
    expect(() => new PrismaCanonicalAcademicUsageGateway({} as any).withTransaction({ boundaryId: 'tx' })).toThrow('ACADEMIC_USAGE_TRANSACTION_REQUIRED');
  });
});
