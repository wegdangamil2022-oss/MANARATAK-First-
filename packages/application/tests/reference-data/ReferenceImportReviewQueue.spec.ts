import { describe, expect, it, vi } from 'vitest';
import type { IReferenceDataRepository, ReferenceImportScreeningReviewPage } from '@manaratak/domain';
import { ReferenceDataUseCases } from '../../src';

describe('P7 durable screening review queue boundary', () => {
  const emptyPage: ReferenceImportScreeningReviewPage = {
    data: [], page: 1, pageSize: 25, total: 0, totalPages: 0, applyAvailable: false,
  };
  it('reads screening receipts without inferring applied or approved state', async () => {
    const listImportScreeningReviews = vi.fn().mockResolvedValue(emptyPage);
    const service = new ReferenceDataUseCases({ listImportScreeningReviews } as unknown as IReferenceDataRepository);
    const result = await service.listImportScreeningReviews(1, 25);
    expect(result.applyAvailable).toBe(false);
    expect(result.data).toEqual([]);
    expect(listImportScreeningReviews).toHaveBeenCalledWith(1, 25);
  });

  it('rejects invalid/too-large requests before repository reads', async () => {
    const listImportScreeningReviews = vi.fn();
    const service = new ReferenceDataUseCases({ listImportScreeningReviews } as unknown as IReferenceDataRepository);
    expect(() => service.listImportScreeningReviews(1, 500)).toThrow('Invalid reference import screening review pagination');
    expect(() => service.listImportScreeningReviews(0, 25)).toThrow('Invalid reference import screening review pagination');
    expect(listImportScreeningReviews).not.toHaveBeenCalled();
  });
});
