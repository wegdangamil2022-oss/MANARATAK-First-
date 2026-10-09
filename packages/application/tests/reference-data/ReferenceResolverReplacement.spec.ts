import { describe, expect, it, vi } from 'vitest';
import { ReferenceResolverService } from '../../src/reference-data/services/ReferenceResolverService';
import type { IReferenceResolutionRepository } from '@manaratak/domain';

describe('P7 historical canonical resolver continuity', () => {
  it('reports the replacement but preserves the original canonical UUID', async () => {
    const getReplacement = vi.fn().mockResolvedValue({ relationshipType: 'SUPERSEDED_BY', targetReferenceId: 'new-id' });
    const resolver = new ReferenceResolverService({
      resolveCityCandidate: vi.fn().mockResolvedValue({ record: { id: 'old-id', isActive: false }, method: 'EXACT_ID' }),
      getReplacement,
    } as unknown as IReferenceResolutionRepository);
    expect(await resolver.resolveCity({ id: 'old-id' })).toMatchObject({
      id: 'old-id', active: false, replacement: { targetReferenceId: 'new-id', relationshipType: 'SUPERSEDED_BY' },
    });
    expect(getReplacement).toHaveBeenCalledWith('CITY', 'old-id');
  });
  it('does not follow historical links for an ACTIVE canonical record', async () => {
    const getReplacement = vi.fn();
    const resolver = new ReferenceResolverService({
      resolveCityCandidate: vi.fn().mockResolvedValue({ record: { id: 'active-id', isActive: true }, method: 'EXACT_ID' }),
      getReplacement,
    } as unknown as IReferenceResolutionRepository);
    const value = await resolver.resolveCity({ id: 'active-id' });
    expect(value?.replacement).toBeUndefined();
    expect(getReplacement).not.toHaveBeenCalled();
  });
});
