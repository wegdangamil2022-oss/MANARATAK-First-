import { describe, expect, it } from 'vitest';
import { UniversityImportPromotionUseCase } from '../../src/universities/use-cases/UniversityImportPromotionUseCase';

describe('UniversityImportPromotionUseCase safety gate', () => {
  it('fails closed without reading or writing the repository', async () => {
    const repository = new Proxy({}, {
      get: () => () => { throw new Error('repository must not be called'); },
    });
    const useCase = new UniversityImportPromotionUseCase(repository as any);

    await expect(useCase.promote({})).resolves.toEqual({
      type: 'REJECTED',
      reason: 'UNIVERSITY_BULK_IMPORT_BLOCKED_PENDING_GOOGLE_STUDIO',
    });
  });
});
