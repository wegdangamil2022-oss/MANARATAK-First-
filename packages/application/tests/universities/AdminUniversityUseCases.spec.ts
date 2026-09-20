import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUniversityUseCases } from '../../src/universities/use-cases/AdminUniversityUseCases';
import {
  IUniversityRepository,
  UniversityImportCompletenessState,
  UniversityStatus
} from '@manaratak/domain';

describe('AdminUniversityUseCases', () => {
  let mockRepo: IUniversityRepository;
  let useCases: AdminUniversityUseCases;

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
      upsertAcademicProgram: vi.fn(),
      archiveAcademicProgram: vi.fn(),
    };
    useCases = new AdminUniversityUseCases(mockRepo);
  });

  it('listUniversities delegates filters to repository', async () => {
    const filters = { status: UniversityStatus.READY_TO_REVIEW, country: 'Qatar', page: 2 };
    mockRepo.list = vi.fn().mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 20, totalPages: 0 });

    await useCases.listUniversities(filters);

    expect(mockRepo.list).toHaveBeenCalledWith(filters);
  });

  it('updateUniversity updates fields and recomputes completeness', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1',
      displayName: 'Qatar University',
      officialWebsite: 'https://www.qu.edu.qa',
      country: 'Qatar',
      institutionType: 'Public University',
      sourceUrl: 'https://www.qu.edu.qa/about',
      officialSourceUrl: 'https://www.qu.edu.qa/about',
      status: UniversityStatus.IMPORTED,
      completenessStatus: UniversityImportCompletenessState.COMPLETE
    });
    mockRepo.update = vi.fn().mockResolvedValue({ id: 'uni-1' });

    await useCases.updateUniversity('uni-1', {
      displayName: 'Updated Qatar University', city: 'Doha'
    });

    expect(mockRepo.update).toHaveBeenCalledWith('uni-1', expect.objectContaining({
      displayName: 'Updated Qatar University', city: 'Doha',
      completenessStatus: UniversityImportCompletenessState.COMPLETE
    }));
  });

  it('markReadyToPublish only allows COMPLETE universities', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1',
      publicId: 'INS-QAT-0001',
      countryReferenceId: 'ctry-QA',
      status: UniversityStatus.READY_TO_REVIEW,
      completenessStatus: UniversityImportCompletenessState.COMPLETE
    });

    await useCases.markReadyToPublish('uni-1');

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('uni-1', UniversityStatus.READY_TO_PUBLISH);
  });

  it('blocks publication readiness when canonical country and test references are missing', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1', publicId: 'INS-QAT-0001', status: UniversityStatus.READY_TO_REVIEW,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
      acceptedLanguageTests: ['IELTS'], admissionRequirements: [],
    });

    const result = await useCases.checkPublicationReadiness('uni-1');

    expect(result.ready).toBe(false);
    expect(result.blockingIssues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'UNIVERSITY_CANONICAL_COUNTRY_REFERENCE_MISSING',
      'UNIVERSITY_TEST_REFERENCES_NOT_CANONICAL',
    ]));
  });

  it('publish only allows READY_TO_PUBLISH universities', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1',
      status: UniversityStatus.IMPORTED,
      completenessStatus: UniversityImportCompletenessState.COMPLETE
    });

    await expect(useCases.publish('uni-1')).rejects.toThrow('Only READY_TO_PUBLISH');
  });
  it('updates an AcademicProgram through the owner repository without replacing its canonical ID', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1', publicId: 'INS-QAT-0001', status: UniversityStatus.READY_TO_REVIEW,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
    });
    mockRepo.upsertAcademicProgram = vi.fn().mockResolvedValue({ id: 'uni-1' } as any);

    await useCases.upsertAcademicProgram('uni-1', 'program-1', {
      sourceReferenceId: 'source-program-1', sourceProgramName: 'Computer Science',
      degreeLevelId: 'degree-bachelor', majorId: 'major-cs', majorMappingState: 'CANONICALLY_MAPPED',
      campusIds: ['campus-1'], admissionRequirements: [{ internationalTestId: 'test-ielts', minimumScore: 6.5 }],
    });

    expect(mockRepo.upsertAcademicProgram).toHaveBeenCalledWith('uni-1', 'program-1', expect.objectContaining({
      degreeLevelId: 'degree-bachelor', majorId: 'major-cs',
    }));
  });

  it('archives an AcademicProgram instead of hard-deleting its canonical identity', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1', status: UniversityStatus.READY_TO_REVIEW, completenessStatus: UniversityImportCompletenessState.COMPLETE,
    });
    mockRepo.archiveAcademicProgram = vi.fn().mockResolvedValue({ id: 'uni-1' } as any);

    await useCases.archiveAcademicProgram('uni-1', 'program-1');

    expect(mockRepo.archiveAcademicProgram).toHaveBeenCalledWith('uni-1', 'program-1');
  });

  it('blocks normalized structural replacement and archive while the University is published', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1', status: UniversityStatus.PUBLISHED, completenessStatus: UniversityImportCompletenessState.COMPLETE,
      countryReferenceId: 'country-old',
    });

    await expect(useCases.replaceNormalizedDetails('uni-1', {} as any))
      .rejects.toThrow('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    await expect(useCases.archive('uni-1'))
      .rejects.toThrow('Cannot archive a PUBLISHED university. Unpublish first.');
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('blocks canonical relationship changes while the University is published', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'uni-1', status: UniversityStatus.PUBLISHED, completenessStatus: UniversityImportCompletenessState.COMPLETE,
      countryReferenceId: 'country-old',
    });

    await expect(useCases.updateUniversity('uni-1', { countryReferenceId: 'country-new' }))
      .rejects.toThrow('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    await expect(useCases.upsertAcademicProgram('uni-1', 'program-1', {
      sourceProgramName: 'Computer Science', degreeLevelId: 'degree-bachelor', majorMappingState: 'UNMAPPED',
    })).rejects.toThrow('UNIVERSITY_PUBLISHED_STRUCTURE_IMMUTABLE');
    expect(mockRepo.update).not.toHaveBeenCalled();
    expect(mockRepo.upsertAcademicProgram).not.toHaveBeenCalled();
  });

});
