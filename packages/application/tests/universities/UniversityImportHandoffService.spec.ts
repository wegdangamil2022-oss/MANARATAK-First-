import { describe, expect, it, vi } from 'vitest';
import { UniversityImportHandoffService } from '../../src/universities/handoff/UniversityImportHandoffService';

const handoff = (payload: Record<string, unknown> = {
  universityName: ' Example University ',
  country: 'Yemen',
  institutionType: 'PUBLIC',
  officialWebsite: 'https://example.edu',
  officialSourceUrl: 'https://example.edu/about',
  city: 'Aden',
}) => ({
  handoffId: 'handoff:university-1',
  ownerDomain: 'UNIVERSITIES',
  artifact: { sourceId: 'manual' },
  normalizedPayload: payload,
  provenance: { sourceSystem: 'manual' },
  validation: { state: 'VALID' as const, issues: [] },
  execution: { executionId: 'exec-1', dryRun: false, attempt: 1, idempotencyKey: 'dedup-1' },
});

describe('UniversityImportHandoffService', () => {
  it('stages a valid candidate without writing or publishing', async () => {
    const repository = { findByDedupKey: vi.fn().mockResolvedValue(null) } as any;
    const service = new UniversityImportHandoffService(repository);

    const result = await service.accept(handoff());

    expect(result.stageState).toBe('STAGED_COMPLETE');
    expect(result.normalizedUniversityName).toBe('Example University');
    expect(result.promotion).toEqual({ automatic: false, publication: false, state: 'MANUAL_REVIEW_REQUIRED' });
    expect(repository.findByDedupKey).toHaveBeenCalledTimes(1);
  });

  it('routes duplicates to review instead of auto-merging', async () => {
    const repository = { findByDedupKey: vi.fn().mockResolvedValue({ id: 'u1', publicId: 'INS-YE-0001' }) } as any;
    const service = new UniversityImportHandoffService(repository);

    const result = await service.accept(handoff());

    expect(result.stageState).toBe('STAGED_DUPLICATE_REVIEW');
    expect(result.dedupe).toMatchObject({ duplicate: true, existingUniversityId: 'u1', existingPublicId: 'INS-YE-0001' });
  });

  it('rejects invalid owner domains', async () => {
    const repository = { findByDedupKey: vi.fn() } as any;
    const service = new UniversityImportHandoffService(repository);
    await expect(service.accept({ ...handoff(), ownerDomain: 'COURSES' })).rejects.toThrow('UNIVERSITY_HANDOFF_OWNER_DOMAIN_INVALID');
  });
});
