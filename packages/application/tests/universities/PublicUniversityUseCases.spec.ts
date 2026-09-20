import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicUniversityUseCases } from '../../src/universities/use-cases/PublicUniversityUseCases';
import {
  IUniversityRepository,
  UniversityImportCompletenessState,
  UniversityStatus
} from '@manaratak/domain';

describe('PublicUniversityUseCases', () => {
  let mockRepo: IUniversityRepository;
  let useCases: PublicUniversityUseCases;

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
      listPublished: vi.fn(),
    };
    useCases = new PublicUniversityUseCases(mockRepo);
  });

  it('listUniversities calls listPublished and strips internal fields', async () => {
    const filters = { country: 'Qatar', page: 1, pageSize: 20 };
    mockRepo.listPublished = vi.fn().mockResolvedValue({
      data: [{
        id: 'internal-id',
        publicId: 'pub-1',
        slug: 'qatar-university',
        displayName: 'Qatar University',
        canonicalName: 'Qatar University',
        canonicalDedupKey: 'secret-key',
        officialWebsite: 'https://www.qu.edu.qa',
        country: 'Qatar',
        institutionType: 'Public University',
        status: UniversityStatus.PUBLISHED,
        completenessStatus: UniversityImportCompletenessState.COMPLETE,
        sourceImportRecordId: 'rec-1',
        optionalFields: { description: 'Official university profile' },
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1
    });

    const result = await useCases.listUniversities(filters);

    expect(mockRepo.listPublished).toHaveBeenCalledWith(filters);
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0]).not.toHaveProperty('canonicalDedupKey');
    expect(result.data[0]).not.toHaveProperty('sourceImportRecordId');
    expect(result.data[0]).not.toHaveProperty('status');
    expect(result.data[0]).toHaveProperty('displayName', 'Qatar University');
    expect(result.data[0]).toHaveProperty('description', 'Official university profile');
  });

  it('getUniversity returns mapped DTO only if PUBLISHED', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'uni-1',
      publicId: 'pub-1',
      slug: 'qatar-university',
      displayName: 'Qatar University',
      canonicalName: 'Qatar University',
      officialWebsite: 'https://www.qu.edu.qa',
      country: 'Qatar',
      institutionType: 'Public University',
      status: UniversityStatus.PUBLISHED,
      completenessStatus: UniversityImportCompletenessState.COMPLETE,
      campuses: [{ name: 'Main Campus' }],
      optionalFields: {},
      updatedAt: new Date()
    });

    const result = await useCases.getUniversity('qatar-university');

    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('status');
    expect(result).toHaveProperty('displayName', 'Qatar University');
    expect(result).toHaveProperty('campuses', [{ name: 'Main Campus' }]);
  });

  it('getUniversity throws if not PUBLISHED', async () => {
    mockRepo.findBySlug = vi.fn().mockResolvedValue({
      id: 'uni-1',
      slug: 'qatar-university',
      status: UniversityStatus.READY_TO_PUBLISH,
      displayName: 'Qatar University'
    });

    await expect(useCases.getUniversity('qatar-university')).rejects.toThrow('University not found');
  });
});
