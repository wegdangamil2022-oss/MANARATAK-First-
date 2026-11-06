import { describe, expect, it, vi } from 'vitest';
import decisions from '../../docs/reviews/evidence/MAJOR_CLASSIFICATION_DECISIONS_2026-11-06.json';
import { ReviewMajorClassificationBatchUseCase, majorClassificationReviewHash, type MajorClassificationReviewBatch } from '../../packages/application/src/majors/use-cases/ReviewMajorClassificationBatchUseCase';
import { PrismaMajorClassificationReviewGateway } from '../../packages/infrastructure/src/majors/PrismaMajorClassificationReviewGateway';

const input = (): MajorClassificationReviewBatch => {
  const batch = { batchId: 'review', reason: 'Owner reviewed the subject and source.', reviewedHash: '', rows: [{ code: 'MJR-0001', profileId: 'profile', versionId: 'version', expectedRevision: '2026-11-06T00:00:00Z', canonicalName: 'Economics', academicFieldId: 'field', disciplineId: 'discipline', rationale: 'Economics is social and behavioural science.' }] };
  batch.reviewedHash = majorClassificationReviewHash(batch); return batch;
};
describe('explicit major subject classification', () => {
  it('requires a reviewer and an unchanged decision including the rationale', () => {
    const cases = new ReviewMajorClassificationBatchUseCase({ apply: vi.fn() }, {} as never), batch = input();
    expect(() => cases.execute(batch, { actorId: '' })).toThrow('INVALID');
    batch.rows[0].rationale = 'Changed rationale after review.';
    expect(() => cases.execute(batch, { actorId: 'owner' })).toThrow('INVALID');
  });
  it('requires the owner transaction', async () => {
    await expect(new PrismaMajorClassificationReviewGateway().apply(input(), {} as never, 'owner')).rejects.toThrow('TRANSACTION');
  });
  it.each(['source-name', 'stale-profile', 'existing-reference', 'wrong-parent'])('rejects %s before writing', async conflict => {
    const tx = { majorLevelProfile: { findMany: vi.fn().mockResolvedValue([{ majorId: 'major' }]) }, academicTaxonomyEdge: { findMany: vi.fn().mockResolvedValue(conflict === 'wrong-parent' ? [] : [{ parentNodeId: 'field', childNodeId: 'discipline' }]) }, $executeRaw: vi.fn(), $queryRaw: vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'major', status: 'READY_TO_REVIEW', currentPublishedVersionId: null }])
      .mockResolvedValueOnce([{ id: 'profile', majorId: 'major', code: 'MJR-0001', status: 'READY_TO_REVIEW', academicFieldId: conflict === 'existing-reference' ? 'existing' : null, disciplineId: null, currentPublishedVersionId: null, updatedAt: new Date(conflict === 'stale-profile' ? '2026-11-05T00:00:00Z' : '2026-11-06T00:00:00Z'), metadata: {} }])
      .mockResolvedValueOnce([{ id: 'field', nodeType: 'ACADEMIC_FIELD', status: 'ACTIVE' }, { id: 'discipline', nodeType: 'DISCIPLINE', status: 'ACTIVE' }])
      .mockResolvedValueOnce([{ id: 'version', profileId: 'profile', majorId: 'major', canonicalName: conflict === 'source-name' ? 'Accounting' : 'Economics', sourceHash: 'source-proof', status: 'NEEDS_REVIEW', publishedAt: null, approvedBy: null }]) };
    await expect(new PrismaMajorClassificationReviewGateway().apply(input(), { boundaryId: 'owner', transactionClient: tx } as never, 'owner')).rejects.toThrow('CONFLICT');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it('contains the reviewed economic, legal, clinical and engineering distinctions', () => {
    const field = (name: string) => new Set(decisions.decisions.filter(r => r.canonicalName === name).map(r => r.academicFieldCode));
    expect(field('Economics')).toEqual(new Set(['03']));
    expect(field('Accounting')).toEqual(new Set(['04']));
    expect(field('Political Science')).toEqual(new Set(['03']));
    expect(field('Law')).toEqual(new Set(['04']));
    expect(field('Clinical Nutrition')).toEqual(new Set(['09']));
    expect(field('Food Technology')).toEqual(new Set(['07']));
    expect(field('Software Engineering')).toEqual(new Set(['06']));
    expect(field('Social Work')).toEqual(new Set(['09']));
    expect(field('Pharmacology and Toxicology')).toEqual(new Set(['05']));
    expect(field('Interdisciplinary Studies')).toEqual(new Set(['MANARATAK-MULTI']));
  });
});
