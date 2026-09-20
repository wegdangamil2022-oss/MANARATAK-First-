import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IMajorRepository,
  MajorImportCompletenessState,
  MajorStatus
} from '@manaratak/domain';
import { AdminMajorUseCases } from '../../src/majors/use-cases/AdminMajorUseCases';

describe('AdminMajorUseCases', () => {
  let mockRepo: IMajorRepository;
  let useCases: AdminMajorUseCases;

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
    };
    useCases = new AdminMajorUseCases(mockRepo);
  });

  it('listMajors delegates filters to repository', async () => {
    const filters = { status: MajorStatus.READY_TO_REVIEW, degreeLevel: 'Bachelor', page: 2 };
    mockRepo.list = vi.fn().mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 20, totalPages: 0 });

    await useCases.listMajors(filters);

    expect(mockRepo.list).toHaveBeenCalledWith(filters);
  });

  it('lists reverse taxonomy mappings through the Major-owned repository contract', async () => {
    const mappings = [{
      id: 'mapping-1',
      relationshipType: 'PRIMARY' as const,
      major: { id: 'major-1', canonicalName: 'Computer Science' },
    }];
    mockRepo.listByTaxonomyNode = vi.fn().mockResolvedValue(mappings);

    await expect(useCases.listByTaxonomyNode('taxonomy-1')).resolves.toEqual(mappings);
    expect(mockRepo.listByTaxonomyNode).toHaveBeenCalledWith('taxonomy-1');
  });

  it('updateMajor updates fields and recomputes completeness', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'major-1',
      displayName: 'Computer Science',
      degreeLevel: 'Bachelor',
      sourceClassificationSystem: 'CIP',
      academicFieldOrDiscipline: 'Computing',
      academicFieldId: 'taxonomy-computing',
      profiles: [{ degreeLevelId: 'degree-bachelor' }],
      officialSourceUrl: 'https://nces.ed.gov/ipeds/cipcode',
      status: MajorStatus.IMPORTED,
      completenessStatus: MajorImportCompletenessState.COMPLETE
    });
    mockRepo.update = vi.fn().mockResolvedValue({ id: 'major-1' });

    await useCases.updateMajor('major-1', {
      displayName: 'Updated Computer Science'
    });

    expect(mockRepo.update).toHaveBeenCalledWith('major-1', expect.objectContaining({
      displayName: 'Updated Computer Science',
      completenessStatus: MajorImportCompletenessState.COMPLETE
    }));
  });

  it('markReadyToPublish only allows COMPLETE majors', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'major-1',
      canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science',
      officialSourceUrl: 'https://example.edu/majors/computer-science',
      profiles: [{
        id: 'profile-bachelor',
        degreeLevelId: 'degree-bachelor',
        academicFieldId: 'taxonomy-computing'
      }],
      status: MajorStatus.READY_TO_REVIEW,
      completenessStatus: MajorImportCompletenessState.COMPLETE
    });

    await useCases.markReadyToPublish('major-1');

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('major-1', MajorStatus.READY_TO_PUBLISH);
  });

  it('publish only allows READY_TO_PUBLISH majors', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'major-1',
      status: MajorStatus.IMPORTED,
      completenessStatus: MajorImportCompletenessState.COMPLETE
    });

    await expect(useCases.publish('major-1')).rejects.toThrow('MAJOR_INVALID_PUBLICATION_STATUS');
  });

  it('blocks publication readiness without canonical degree and taxonomy references', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'major-1',
      canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science',
      officialSourceUrl: 'https://example.edu/majors/computer-science',
      status: MajorStatus.READY_TO_REVIEW,
      completenessStatus: MajorImportCompletenessState.COMPLETE,
      profiles: []
    });

    await expect(useCases.markReadyToPublish('major-1'))
      .rejects.toThrow('MAJOR_CANONICAL_DEGREE_REFERENCE_MISSING');
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });
});
