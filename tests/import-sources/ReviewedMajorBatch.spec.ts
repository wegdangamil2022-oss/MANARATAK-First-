import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ImportRecordStatus } from '@manaratak/domain';
import { MajorImportPromotionUseCase } from '../../packages/application/src/majors/use-cases/MajorImportPromotionUseCase';
import { ReviewedMajorTaxonomyResolver } from '../../packages/application/src/majors/services/ReviewedMajorTaxonomyResolver';
import { BufferedMajorImportRepository } from '../../packages/infrastructure/src/majors/BufferedMajorImportRepository';
import { ReviewedMajorBatchUseCase, reviewedMajorBatchHash, type ReviewedMajorBatch } from '../../packages/application/src/majors/use-cases/ReviewedMajorBatchUseCase';
import type { AtomicDomainMutationCoordinator } from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator';

const payload = (level = 'MASTER', code = 'MAS-0001') => ({ canonicalMajorName: 'Medical Sciences', classificationCode: code,
  localizedNames: { ar: 'العلوم الطبية', en: 'Medical Sciences' }, degreeLevel: level, degreeLevelId: '00000000-0000-4000-8000-000000000001',
  sourceImportMode: 'DETAIL_DOSSIER' as const, contentBlocks: [{ blockKey: 'overview', title: 'النبذة', content: 'نص المصدر كما ورد.', sourceSectionPath: 'النبذة' }] });
const handoff = () => ({ handoffId: 'source-1', ownerDomain: 'MAJORS', artifact: { sourceId: 'catalog', artifactId: 'scanned-source' }, normalizedPayload: payload(),
  provenance: { sourceSystem: 'catalog', contentHash: 'a'.repeat(64) }, validation: { state: 'VALID' as const, issues: [] },
  execution: { executionId: 'run', dryRun: false, attempt: 1, idempotencyKey: 'key' },
  referenceMetadata: { importBatchId: 'batch', sourceRecordDedupKey: 'key', artifactSha256: 'a'.repeat(64) } });
describe('reviewed major source batches', () => {
  it('never turns keyword suggestions into an approved classification', () => {
    const resolver = new ReviewedMajorTaxonomyResolver();
    expect(resolver.resolve(payload())).toMatchObject({ outcome: 'REVIEW_REQUIRED', confidence: 0 });
    expect(resolver.resolve({ ...payload(), academicFieldId: 'reviewed-health-field' })).toMatchObject({ academicFieldId: 'reviewed-health-field' });
  });
  it('retains Arabic names, exact sections and separate degree profiles using the existing domain promotion', async () => {
    const repo = new BufferedMajorImportRepository({} as PrismaClient, { majors: [], profiles: [], versions: [] });
    const promote = new MajorImportPromotionUseCase(repo, new ReviewedMajorTaxonomyResolver());
    for (const [level, code] of [['MASTER', 'MAS-0001'], ['DOCTORATE', 'DOC-0001']]) {
      const p = payload(level, code);
      expect(await promote.promote({ id: code, status: ImportRecordStatus.NEEDS_REVIEW, normalizedPayload: p })).toHaveProperty('type');
    }
    expect(repo.majors).toHaveLength(1);
    expect(repo.profiles.map(p => [p.code, p.level, p.localizedNameAr])).toEqual([
      ['MAS-0001', 'MASTER', 'العلوم الطبية'], ['DOC-0001', 'DOCTORATE', 'العلوم الطبية'],
    ]);
    expect(repo.versions.map(v => v.versionNumber)).toEqual([1, 2]);
    expect(repo.sections.map(s => s.content)).toEqual(['نص المصدر كما ورد.', 'نص المصدر كما ورد.']);
    expect(repo.mappings).toHaveLength(0);
    expect(repo.versions.every(v => v.status === 'NEEDS_REVIEW' && !v.publishedAt && !v.approvedBy)).toBe(true);
    expect(repo.sections.every(s => repo.profiles.some(p => p.id === s.profileId) && repo.versions.some(v => v.id === s.versionId))).toBe(true);
  });
  it('rejects unauthenticated, modified, duplicate and oversized batches before screening persistence', async () => {
    const gateway = { screen: vi.fn(), apply: vi.fn() }, useCase = new ReviewedMajorBatchUseCase(gateway, {} as AtomicDomainMutationCoordinator);
    const batch: ReviewedMajorBatch = { batchId: 'reviewed', handoffs: [handoff()], reason: 'Owner reviewed the exact supplied source.', reviewedHash: '' };
    batch.reviewedHash = reviewedMajorBatchHash(batch);
    await expect(useCase.execute(batch, { actorId: '' })).rejects.toThrow('ACTOR');
    batch.handoffs[0].normalizedPayload = { ...payload(), canonicalMajorName: 'Changed' };
    await expect(useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('REVIEW_INVALID');
    batch.handoffs = [handoff(), handoff()]; batch.reviewedHash = reviewedMajorBatchHash(batch);
    await expect(useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('SCREENING_INVALID');
    batch.handoffs = Array(26).fill(handoff()); batch.reviewedHash = reviewedMajorBatchHash(batch);
    await expect(useCase.execute(batch, { actorId: 'owner' })).rejects.toThrow('REVIEW_INVALID');
    expect(gateway.screen).not.toHaveBeenCalled(); expect(gateway.apply).not.toHaveBeenCalled();
  });
});
