import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternationalTestPublicUseCases } from '../../src/tests-platform/use-cases/InternationalTestUseCases';
import { 
  InternationalTestStatus,
  IInternationalTestRepository
} from '@manaratak/domain';

describe('InternationalTestPublicUseCases', () => {
  let mockRepository: any;
  let useCases: InternationalTestPublicUseCases;

  beforeEach(() => {
    mockRepository = {
      listPublished: vi.fn(),
      findPublishedBySlug: vi.fn()
    };

    useCases = new InternationalTestPublicUseCases(mockRepository as IInternationalTestRepository);
  });

  describe('listPublished', () => {
    it('should call repository.listPublished and cap page size to 50', async () => {
      mockRepository.listPublished.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50
      });

      await useCases.listPublished({ pageSize: 100 });

      expect(mockRepository.listPublished).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 50
        })
      );
    });
  });

  describe('getPublishedBySlug', () => {
    it('should throw if test is not found', async () => {
      mockRepository.findPublishedBySlug.mockResolvedValue(null);

      await expect(useCases.getPublishedBySlug('sat-digital')).rejects.toThrow('International test not found');
    });

    it('should rely on repository publication predicate instead of post-filtering a non-published row', async () => {
      mockRepository.findPublishedBySlug.mockResolvedValue(null);

      await expect(useCases.getPublishedBySlug('sat-digital')).rejects.toThrow('International test not found');
      expect(mockRepository.findPublishedBySlug).toHaveBeenCalledWith('sat-digital');
    });

    it('should return test if status is PUBLISHED', async () => {
      const publishedTest = {
        id: 'test-1',
        slug: 'sat-digital',
        status: InternationalTestStatus.PUBLISHED,
        canonicalName: 'SAT Digital'
      };

      mockRepository.findPublishedBySlug.mockResolvedValue(publishedTest);

      const result = await useCases.getPublishedBySlug('sat-digital');

      expect(result).toEqual(publishedTest);
    });
  });
});
