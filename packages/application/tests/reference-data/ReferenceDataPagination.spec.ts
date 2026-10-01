import { describe, expect, it, vi } from 'vitest';
import type { IReferenceDataRepository } from '@manaratak/domain';
import { ReferenceDataUseCases } from '../../src/reference-data/use-cases/ReferenceDataUseCases';

describe('Reference data owner pagination', () => {
  it('returns page 2 and a total over all matching records, preserving activeOnly=false', async () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({ id: `language-${i}`, name: `Language ${i}` }));
    const listLanguages = vi.fn(async ({ page, pageSize }) => rows.slice((page - 1) * pageSize, page * pageSize));
    const countRecords = vi.fn(async () => rows.length);
    const useCases = new ReferenceDataUseCases({ listLanguages, countRecords } as unknown as IReferenceDataRepository);
    const filters = { page: 2, pageSize: 50, activeOnly: false, q: 'Language' };
    const result = await useCases.listPage('languages', filters);
    expect(result).toMatchObject({ total: 120, totalPages: 3, page: 2, pageSize: 50 });
    expect(result.data[0].id).toBe('language-50'); expect(result.data).toHaveLength(50);
    expect(listLanguages).toHaveBeenCalledWith(filters); expect(countRecords).toHaveBeenCalledWith('languages', filters);
  });

  it.each([{ page: 0 }, { page: 1.1 }, { pageSize: 0 }, { pageSize: 101 }])('rejects invalid internal pagination before repository calls: %j', async (filters) => {
    const countRecords = vi.fn(); const listLanguages = vi.fn();
    const useCases = new ReferenceDataUseCases({ listLanguages, countRecords } as unknown as IReferenceDataRepository);
    await expect(useCases.listPage('languages', filters)).rejects.toThrow('PAGINATION_INVALID');
    expect(listLanguages).not.toHaveBeenCalled(); expect(countRecords).not.toHaveBeenCalled();
  });
});
