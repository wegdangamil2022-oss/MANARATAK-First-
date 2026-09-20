import { describe, expect, it, vi } from 'vitest';
import { CourseContentStatus, LessonAssetType } from '@manaratak/domain';
import { PrismaCourseCurriculumRepository } from '../../src/courses/PrismaCourseCurriculumRepository';

describe('PrismaCourseCurriculumRepository', () => {
  it('persists a module with a real default content state', async () => {
    const created = {
      id: 'module-1',
      courseId: 'course-1',
      title: 'Intro',
      description: null,
      position: 1,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = { courseModule: { create: vi.fn().mockResolvedValue(created) } };
    const repository = new PrismaCourseCurriculumRepository(prisma as any);

    const result = await repository.createModule({
      courseId: 'course-1',
      title: 'Intro',
      position: 1,
    });

    expect(result.status).toBe(CourseContentStatus.DRAFT);
    expect(prisma.courseModule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ courseId: 'course-1', status: 'DRAFT' }),
    });
  });

  it('derives the owning course when persisting an EAP lesson asset reference', async () => {
    const now = new Date();
    const prisma = {
      courseLesson: { findUnique: vi.fn().mockResolvedValue({ courseId: 'course-1' }) },
      courseLessonAsset: {
        create: vi
          .fn()
          .mockResolvedValue({
            id: 'asset-ref-1',
            lessonId: 'lesson-1',
            assetId: 'asset-1',
            assetReference: null,
            title: 'Video',
            assetType: 'VIDEO',
            position: 1,
            isRequired: true,
            metadata: null,
            createdAt: now,
            updatedAt: now,
          }),
      },
    };
    const repository = new PrismaCourseCurriculumRepository(prisma as any);

    await repository.attachAssetToLesson({
      lessonId: 'lesson-1',
      assetId: 'asset-1',
      title: 'Video',
      assetType: LessonAssetType.VIDEO,
      position: 1,
      isRequired: true,
    });

    expect(prisma.courseLessonAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        courseId: 'course-1',
        lessonId: 'lesson-1',
        assetId: 'asset-1',
      }),
    });
  });
});
