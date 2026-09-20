import { describe, expect, it, vi } from 'vitest';
import {
  ICourseRepository,
  ImportRecordDto,
  ImportRecordStatus
} from '@manaratak/domain';
import { CourseImportPromotionUseCase } from '../../src/courses/use-cases/CourseImportPromotionUseCase';

describe('CourseImportPromotionUseCase', () => {
  const disabledReason = 'COURSE_IMPORT_LEGACY_PROMOTION_DISABLED_USE_COURSE_IMPORT_COORDINATOR';

  const createMockRepo = (): ICourseRepository => ({
    create: vi.fn().mockImplementation(async (data) => ({ id: 'course-1', createdAt: new Date(), updatedAt: new Date(), ...data })),
    update: vi.fn(),
    findByDedupKey: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    findByPublicId: vi.fn(),
    findBySlug: vi.fn(),
    updateStatus: vi.fn(),
    updateImportLink: vi.fn(),
    listByStatus: vi.fn(),
    list: vi.fn(),
  });

  const createRecord = (status: ImportRecordStatus, payload: Record<string, unknown>): ImportRecordDto => ({
    id: 'rec-1',
    batchId: 'batch-1',
    status,
    rawPayload: payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('fails closed for records that are not VALID or NEEDS_REVIEW', async () => {
    const repo = createMockRepo();
    const useCase = new CourseImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord(ImportRecordStatus.STAGED, {}));

    expect(result.type).toBe('REJECTED');
    expect(result).toEqual({ type: 'REJECTED', reason: disabledReason });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('routes trusted VALID free imports away from the disabled legacy path', async () => {
    const repo = createMockRepo();
    const useCase = new CourseImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord(ImportRecordStatus.VALID, {
      courseName: 'Introduction to Data Science',
      accessType: 'FREE_CERTIFICATE',
      originType: 'EXTERNAL_LINKED_COURSE',
      directCourseUrl: 'https://example.org/courses/data-science',
      platformName: 'Global Learning',
      sourceUrl: 'https://example.org/courses/data-science',
      acquiredSkills: ['Data analysis']
    }));

    expect(result).toEqual({ type: 'REJECTED', reason: disabledReason });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('routes paid imports away from the disabled legacy path', async () => {
    const repo = createMockRepo();
    const useCase = new CourseImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord(ImportRecordStatus.VALID, {
      courseName: 'Premium IELTS Preparation',
      accessType: 'PAID',
      directCourseUrl: 'https://example.org/courses/ielts-premium',
      platformName: 'Global Learning',
      sourceUrl: 'https://example.org/courses/ielts-premium'
    }));

    expect(result).toEqual({ type: 'REJECTED', reason: disabledReason });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does not perform legacy duplicate resolution when a canonical course already exists', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'existing-1' });
    const useCase = new CourseImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord(ImportRecordStatus.VALID, {
      courseName: 'Introduction to Data Science',
      accessType: 'FREE_STUDY',
      directCourseUrl: 'https://example.org/courses/data-science',
      platformName: 'Global Learning',
      sourceUrl: 'https://example.org/courses/data-science'
    }));

    expect(result).toEqual({ type: 'REJECTED', reason: disabledReason });
    expect(repo.findByDedupKey).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
