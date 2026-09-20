import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IMajorRepository,
  MajorImportCompletenessState,
  MajorStatus
} from '@manaratak/domain';
import { PublicMajorUseCases } from '../../src/majors/use-cases/PublicMajorUseCases';

describe('PublicMajorUseCases', () => {
  let mockRepo: IMajorRepository;
  let useCases: PublicMajorUseCases;

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
      list: vi.fn(),
      listPublished: vi.fn(),
      listContentSections: vi.fn(),
    };
    useCases = new PublicMajorUseCases(mockRepo);
  });

  it('listMajors calls listPublished and strips internal fields', async () => {
    const filters = { degreeLevel: 'Bachelor', page: 1, pageSize: 20 };
    mockRepo.listPublished = vi.fn().mockResolvedValue({
      data: [{
        id: 'internal-id',
        publicId: 'pub-1',
        slug: 'computer-science',
        displayName: 'Computer Science',
        canonicalName: 'Computer Science',
        canonicalDedupKey: 'secret-key',
        degreeLevel: 'Bachelor',
        sourceClassificationSystem: 'CIP',
        academicFieldOrDiscipline: 'Computing',
        status: MajorStatus.PUBLISHED,
        completenessStatus: MajorImportCompletenessState.COMPLETE,
        sourceImportRecordId: 'rec-1',
        optionalFields: { acquiredSkills: ['Programming'] },
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    });

    const result = await useCases.listMajors(filters);

    expect(mockRepo.listPublished).toHaveBeenCalledWith(filters);
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0]).not.toHaveProperty('canonicalDedupKey');
    expect(result.data[0]).not.toHaveProperty('sourceImportRecordId');
    expect(result.data[0]).not.toHaveProperty('status');
    expect(result.data[0]).toHaveProperty('displayName', 'Computer Science');
    expect(result.data[0]).toHaveProperty('acquiredSkills', ['Programming']);
    expect(result.data[0].phaseLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetType: 'ACADEMIC_PROGRAM', phase: 11 }),
      expect.objectContaining({ targetType: 'SCHOLARSHIP', phase: 12 }),
      expect.objectContaining({ targetType: 'COURSE', phase: 13 }),
      expect.objectContaining({ targetType: 'JOB', phase: 21 }),
    ]));
  });

  it('getMajor returns mapped DTO only if PUBLISHED', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'major-1',
      publicId: 'pub-1',
      slug: 'computer-science',
      displayName: 'Computer Science',
      canonicalName: 'Computer Science',
      degreeLevel: 'Bachelor',
      sourceClassificationSystem: 'CIP',
      status: MajorStatus.PUBLISHED,
      optionalFields: { careerOutcomes: ['Software Engineer'] },
      updatedAt: new Date()
    });

    mockRepo.listContentSections = vi.fn().mockResolvedValue([{
      sectionKey: 'what-students-study',
      title: 'ماذا يدرس الطالب',
      content: 'Programming, algorithms, and systems.',
      reviewStatus: 'PUBLISHED',
      metadata: { sourceLevel: 2 },
    }]);

    const result = await useCases.getMajor('computer-science');

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('status');
    expect(result).toHaveProperty('displayName', 'Computer Science');
    expect(result).toHaveProperty('careerOutcomes', ['Software Engineer']);
    expect(result.phaseLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetType: 'ACADEMIC_PROGRAM',
        source: 'MAJOR_LEVEL_PROFILE',
        query: expect.objectContaining({
          majorId: 'major-1',
          majorPublicId: 'pub-1',
          majorSlug: 'computer-science',
        }),
        metadata: expect.objectContaining({ degreeLevel: 'Bachelor', majorName: 'Computer Science' }),
      }),
    ]));
    expect(result.contentSections).toEqual([{
      sectionKey: 'what-students-study',
      title: 'ماذا يدرس الطالب',
      content: 'Programming, algorithms, and systems.',
      reviewStatus: 'PUBLISHED',
      metadata: { sourceLevel: 2 },
    }]);
  });

  it('getMajor throws if not PUBLISHED', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'major-1',
      slug: 'computer-science',
      status: MajorStatus.READY_TO_PUBLISH,
      displayName: 'Computer Science'
    });

    await expect(useCases.getMajor('computer-science')).rejects.toThrow('Major not found');
  });
});
