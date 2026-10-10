import { describe, it, expect, vi } from 'vitest';
import { ReferenceDataUseCases } from '../../src';
import type { IReferenceDataRepository } from '@manaratak/domain';

describe('P7 owner list status filter', () => {
  const records = [{ id: 'x', isoCode: 'USD', name: 'US Dollar', isActive: false, lifecycleState: 'DEPRECATED' }];
  it('nonActiveOnly without activeOnly does not intersect with an implicit ACTIVE default', async () => {
    const listCurrencies = vi.fn().mockResolvedValue(records);
    const countRecords = vi.fn().mockResolvedValue(1);
    const useCases = new ReferenceDataUseCases({ listCurrencies, countRecords } as unknown as IReferenceDataRepository);
    const page = await useCases.listPage('currencies', { nonActiveOnly: true, page: 1, pageSize: 50 });
    expect(page.data).toEqual(records);
    expect(listCurrencies).toHaveBeenCalledWith(expect.objectContaining({ activeOnly: false, nonActiveOnly: true }));
    expect(countRecords).toHaveBeenCalledWith('currencies', expect.objectContaining({ activeOnly: false, nonActiveOnly: true }));
  });
  it('rejects contradictory source-owned ACTIVE and non-active query flags', async () => {
    const useCases = new ReferenceDataUseCases({} as IReferenceDataRepository);
    await expect(useCases.listPage('currencies', { activeOnly: true, nonActiveOnly: true })).rejects.toThrow('REFERENCE_DATA_FILTER_CONFLICT');
  });
});
