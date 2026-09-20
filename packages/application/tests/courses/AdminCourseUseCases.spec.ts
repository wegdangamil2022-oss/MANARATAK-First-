import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CourseAccessType,
  CourseImportCompletenessState,
  CourseOriginType,
  CourseStatus,
  ICourseRepository
} from '@manaratak/domain';
import { AdminCourseUseCases } from '../../src/courses/use-cases/AdminCourseUseCases';
import { CoursePublicationService } from '../../src/courses/services/CoursePublicationService';

describe('AdminCourseUseCases', () => {
  let mockRepo: ICourseRepository;
  let useCases: AdminCourseUseCases;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findByDedupKey: vi.fn(),
      findById: vi.fn(),
      findByPublicId: vi.fn(),
      findBySlug: vi.fn(),
      updateStatus: vi.fn(),
      updateImportLink: vi.fn(),
      listByStatus: vi.fn(),
      list: vi.fn(),
    };
    useCases = new AdminCourseUseCases(mockRepo, new CoursePublicationService(mockRepo));
  });

  it('listCourses delegates filters to repository', async () => {
    const filters = { status: CourseStatus.READY_TO_REVIEW, platformName: 'Global Learning', page: 2 };
    mockRepo.list = vi.fn().mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 20, totalPages: 0 });

    await useCases.listCourses(filters);

    expect(mockRepo.list).toHaveBeenCalledWith(filters);
  });

  it('updateCourse updates fields and recomputes completeness', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'course-1',
      displayName: 'Introduction to Data Science',
      accessType: CourseAccessType.FREE_CERTIFICATE,
      originType: CourseOriginType.EXTERNAL_LINKED_COURSE,
      directCourseUrl: 'https://example.org/courses/data-science',
      platformName: 'Global Learning',
      sourceUrl: 'https://example.org/courses/data-science',
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE
    });
    mockRepo.update = vi.fn().mockResolvedValue({ id: 'course-1' });

    await useCases.updateCourse('course-1', {
      displayName: 'Updated Data Science'
    });

    expect(mockRepo.update).toHaveBeenCalledWith('course-1', expect.objectContaining({
      displayName: 'Updated Data Science',
      completenessStatus: CourseImportCompletenessState.COMPLETE
    }));
  });

  it('allows paid courses to be managed as Phase 13 courses outside the free import path', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'course-1',
      displayName: 'Premium IELTS Preparation',
      accessType: CourseAccessType.PAID,
      originType: CourseOriginType.PAID_COURSE,
      directCourseUrl: 'https://example.org/courses/ielts-premium',
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE
    });
    mockRepo.update = vi.fn().mockResolvedValue({ id: 'course-1' });

    await useCases.updateCourse('course-1', {
      displayName: 'Updated Premium IELTS Preparation'
    });

    expect(mockRepo.update).toHaveBeenCalledWith('course-1', expect.objectContaining({
      displayName: 'Updated Premium IELTS Preparation',
      completenessStatus: CourseImportCompletenessState.COMPLETE
    }));
  });

  it('markReadyToPublish only allows COMPLETE courses', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'course-1',
      status: CourseStatus.READY_TO_REVIEW,
      completenessStatus: CourseImportCompletenessState.COMPLETE
    });

    await useCases.markReadyToPublish('course-1');

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('course-1', CourseStatus.READY_TO_PUBLISH);
  });

  it('publish only allows READY_TO_PUBLISH courses', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'course-1',
      status: CourseStatus.IMPORTED,
      completenessStatus: CourseImportCompletenessState.COMPLETE
    });

    await expect(useCases.publish('course-1')).rejects.toThrow('Only READY_TO_PUBLISH');
  });
});
