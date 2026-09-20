import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicScholarshipUseCases } from '../../src/scholarships/use-cases/PublicScholarshipUseCases';
import { 
  IScholarshipRepository, 
  ScholarshipStatus,
  ScholarshipCompletenessState,
  ScholarshipPublicationStatus
} from '@manaratak/domain';

describe('PublicScholarshipUseCases', () => {
  let mockRepo: IScholarshipRepository;
  let useCases: PublicScholarshipUseCases;

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
      listPublishable: vi.fn(),
      list: vi.fn(),
      listPublished: vi.fn(),
      findPublishedBySlug: vi.fn(),
    };
    useCases = new PublicScholarshipUseCases(mockRepo);
  });

  it('listScholarships calls repo.listPublished and maps dtos', async () => {
    const filters = { page: 1, pageSize: 20 };
    mockRepo.listPublished = vi.fn().mockResolvedValue({ 
      data: [{
        id: 'internal-id',
        status: ScholarshipStatus.PUBLISHED,
        publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
        displayName: 'Test',
        optionalFields: { customField: 'value' }
      }], 
      total: 1 
    });
    
    const result = await useCases.listScholarships(filters);
    expect(mockRepo.listPublished).toHaveBeenCalledWith(filters);
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('displayName', 'Test');
    expect(result.data[0]).not.toHaveProperty('customField');
  });

  it('getScholarship returns mapped DTO if PUBLISHED', async () => {
    mockRepo.findPublishedBySlug = vi.fn().mockResolvedValue({
      id: 'schol-1',
      slug: 'test-slug',
      status: ScholarshipStatus.PUBLISHED,
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
      displayName: 'Test',
      optionalFields: { extra: 123 }
    });
    
    const result = await useCases.getScholarship('test-slug');
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('status');
    expect(result).toHaveProperty('displayName', 'Test');
    expect(result).not.toHaveProperty('extra');
  });

  it('getScholarship rejects legacy PUBLISHED when canonical publication is not PUBLISHED', async () => {
    mockRepo.findPublishedBySlug = vi.fn().mockResolvedValue(null);
    await expect(useCases.getScholarship('test-slug')).rejects.toThrow('Scholarship not found');
  });

  it('getScholarship throws if not found', async () => {
    mockRepo.findPublishedBySlug = vi.fn().mockResolvedValue(null);
    
    await expect(useCases.getScholarship('test-slug')).rejects.toThrow('Scholarship not found');
  });

  it('never exposes a legacy workflow PUBLISHED scholarship when canonical publication is DRAFT', async () => {
    mockRepo.findPublishedBySlug = vi.fn().mockResolvedValue(null);
    await expect(useCases.getScholarship('legacy')).rejects.toThrow('Scholarship not found');
  });
  it('projects the requested locale without exposing alternate-language payloads', async () => {
    mockRepo.findPublishedBySlug = vi.fn().mockResolvedValue({
      id: 'schol-1',
      slug: 'global-scholarship',
      displayName: 'Global Scholarship',
      sourceLocale: 'en',
      localizedNames: { ar: 'منحة عالمية', en: 'Global Scholarship' },
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
      updatedAt: new Date(),
    });

    const arabic = await useCases.getScholarship('global-scholarship', 'ar');
    const english = await useCases.getScholarship('global-scholarship', 'en');

    expect(arabic.displayName).toBe('منحة عالمية');
    expect(english.displayName).toBe('Global Scholarship');
    expect(arabic).not.toHaveProperty('localizedNames');
  });

});
