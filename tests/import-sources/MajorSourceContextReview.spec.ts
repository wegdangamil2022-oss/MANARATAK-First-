import { describe, expect, it, vi } from 'vitest';
import { majorSourceAcademicContext, ReviewMajorSourceContextUseCase, majorSourceContextReviewHash, type MajorSourceContextReview } from '../../packages/application/src/majors/use-cases/ReviewMajorSourceContextUseCase';
import { PrismaMajorSourceContextReviewGateway } from '../../packages/infrastructure/src/majors/PrismaMajorSourceContextReviewGateway';

describe('literal major source academic context', () => {
  it.each(['الكلية', 'المجال الأكاديمي', 'الكلية أو المجال الأكاديمي'])('recognizes the source table label %s', label => {
    expect(majorSourceAcademicContext([{ content: `| العنصر | المعلومات |\n| ${label} | كلية الطب والعلوم الطبية الأساسية |` }])).toBe('كلية الطب والعلوم الطبية الأساسية');
  });
  it('does not infer a field from a name, notes, later sections or conflicting table values', () => {
    expect(majorSourceAcademicContext([{ content: '| الاسم | Medical Sciences |' }, { content: '| الكلية | كلية الطب |' }])).toBeUndefined();
    expect(majorSourceAcademicContext([{ content: '| الكلية | كلية الطب |\n| المجال الأكاديمي | كلية الهندسة |' }])).toBeUndefined();
  });
  it('requires actor authority, exact reviewed content and distinct profiles', async () => {
    const gateway = { apply: vi.fn() }, useCase = new ReviewMajorSourceContextUseCase(gateway, {} as never);
    const input: MajorSourceContextReview = { batchId: 'review', reason: 'Reviewed literal college context.', rows: [{ code: 'MJR-0001', profileId: 'profile', versionId: 'version', academicFieldId: 'field', expectedRevision: '2026-11-06T00:00:00Z', sourceContext: 'كلية الطب' }], reviewedHash: '' };
    input.reviewedHash = majorSourceContextReviewHash(input);
    expect(() => useCase.execute(input, { actorId: '' })).toThrow('INVALID');
    input.rows[0].academicFieldId = 'changed';
    expect(() => useCase.execute(input, { actorId: 'reviewer' })).toThrow('INVALID');
    expect(gateway.apply).not.toHaveBeenCalled();
  });
  it('requires the owner transaction', async () => {
    await expect(new PrismaMajorSourceContextReviewGateway().apply({} as never, {} as never, 'reviewer')).rejects.toThrow('TRANSACTION');
  });
  it.each(['source', 'revision', 'inactive-field'])('rejects a conflicting %s without changing the profile', async conflict => {
    const input: MajorSourceContextReview = { batchId: 'review', reason: 'Reviewed literal college context.', reviewedHash: '', rows: [{ code: 'MJR-0001', profileId: 'profile', versionId: 'version', academicFieldId: 'field', expectedRevision: conflict === 'revision' ? '2026-11-05T00:00:00Z' : '2026-11-06T00:00:00Z', sourceContext: 'كلية الطب' }] };
    const tx = { majorLevelProfile: { findMany: vi.fn().mockResolvedValue([{ majorId: 'major' }]) }, $executeRaw: vi.fn(), $queryRaw: vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'major', status: 'READY_TO_REVIEW', currentPublishedVersionId: null }])
      .mockResolvedValueOnce([{ id: 'profile', majorId: 'major', code: 'MJR-0001', status: 'READY_TO_REVIEW', academicFieldId: null, disciplineId: null, currentPublishedVersionId: null, updatedAt: new Date('2026-11-06T00:00:00Z'), metadata: {} }])
      .mockResolvedValueOnce([{ id: 'field', nodeType: 'ACADEMIC_FIELD', status: conflict === 'inactive-field' ? 'ARCHIVED' : 'ACTIVE' }])
      .mockResolvedValueOnce([{ id: 'version', profileId: 'profile', majorId: 'major', sourceImportRecordId: 'record', sourceHash: 'hash', status: 'NEEDS_REVIEW', publishedAt: null, approvedBy: null, firstBlock: { content: `| الكلية | ${conflict === 'source' ? 'كلية مختلفة' : 'كلية الطب'} |` } }]) };
    await expect(new PrismaMajorSourceContextReviewGateway().apply(input, { boundaryId: 'owner', transactionClient: tx } as never, 'reviewer')).rejects.toThrow('CONFLICT');
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
