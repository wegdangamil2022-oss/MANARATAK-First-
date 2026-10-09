import { describe, expect, it, vi } from 'vitest';
import { ReferenceDataUseCases } from '../../src/reference-data/use-cases/ReferenceDataUseCases';
import type { IReferenceDataRepository } from '@manaratak/domain';

describe('P7 quality evidence policy', () => {
  it('counts owner records and does not invent completeness or broken FK metrics', async () => {
    const countRecords = vi.fn(async (_: string, f: { activeOnly?: boolean }) => f.activeOnly ? 3 : 5);
    const useCases = new ReferenceDataUseCases({ countRecords } as unknown as IReferenceDataRepository);
    const result = await useCases.getQualitySnapshot();
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ collection: 'countries', total: 5, active: 3, nonActive: 2,
      aliasCoverage: 'unknown', authoritativeCoverage: 'unknown', brokenRelationships: 'unknown' });
    expect(countRecords).toHaveBeenCalledTimes(10);
  });
});
