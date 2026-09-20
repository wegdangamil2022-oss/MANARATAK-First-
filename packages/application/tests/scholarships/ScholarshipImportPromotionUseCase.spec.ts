import { describe, it, expect, vi } from 'vitest';
import { ScholarshipImportPromotionUseCase } from '../../src/scholarships/use-cases/ScholarshipImportPromotionUseCase';
import { 
  IScholarshipRepository, 
  ImportRecordDto, 
  ImportRecordStatus,
  ScholarshipStatus,
  ScholarshipCompletenessState
} from '@manaratak/domain';

describe('ScholarshipImportPromotionUseCase', () => {
  const createMockRepo = (): IScholarshipRepository => ({
    create: vi.fn().mockImplementation(async (data) => ({ id: 'schol-1', ...data })),
    findByDedupKey: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    findByPublicId: vi.fn(),
    findBySlug: vi.fn(),
    updateStatus: vi.fn(),
    updateImportLink: vi.fn(),
    listByStatus: vi.fn(),
    listPublishable: vi.fn(),
  });

  const createRecord = (status: ImportRecordStatus, payload: any): ImportRecordDto => ({
    id: 'rec-1',
    batchId: 'batch-1',
    status,
    rawPayload: payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('rejects records that are not VALID or NEEDS_REVIEW', async () => {
    const repo = createMockRepo();
    const useCase = new ScholarshipImportPromotionUseCase(repo);
    const record = createRecord(ImportRecordStatus.PENDING, {});
    
    const result = await useCase.promote(record);
    expect(result.type).toBe('REJECTED');
    if (result.type === 'REJECTED') {
      expect(result.reason).toContain('not VALID');
    }
  });

  it('creates scholarship from VALID import', async () => {
    const repo = createMockRepo();
    const useCase = new ScholarshipImportPromotionUseCase(repo);
    const record = createRecord(ImportRecordStatus.VALID, {
      scholarshipName: 'Test', description: 'desc',
      providerName: 'Example Foundation',
      fundingCoverage: 'Full',
      coverageDetails: 'Tuition and board',
      eligibleMajorsOrFields: 'All',
      degreeLevel: 'Bachelors',
      studyCountry: 'Qatar',
      eligibilityCriteria: 'Open to eligible students',
      requiredDocuments: 'Transcript and passport',
      officialSourceUrl: 'https://example.com',
      applicationLink: 'https://example.com/apply',
      applicationDeadline: '2027-10-01T00:00:00Z'
    });
    
    const result = await useCase.promote(record);
    expect(result.type).toBe('CREATED');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'Test',
      status: ScholarshipStatus.IMPORTED,
      completenessStatus: ScholarshipCompletenessState.COMPLETE,
      sourceImportRecordId: 'rec-1'
    }));
  });

  it('marks NEEDS_REVIEW properly based on completeness classifier', async () => {
    const repo = createMockRepo();
    const useCase = new ScholarshipImportPromotionUseCase(repo);
    const record = createRecord(ImportRecordStatus.NEEDS_REVIEW, {
      scholarshipName: 'Test', description: 'desc',
      providerName: 'Example Foundation',
      fundingCoverage: 'Full',
      coverageDetails: 'Tuition',
      eligibleMajorsOrFields: 'CS',
      degreeLevel: 'BSc',
      officialSourceUrl: 'https://example.com'
      // identity is ready, but core fields such as country, eligibility,
      // documents/tests, and deadline still need review.
    });
    
    const result = await useCase.promote(record);
    expect(result.type).toBe('CREATED');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      status: ScholarshipStatus.READY_TO_REVIEW,
      completenessStatus: ScholarshipCompletenessState.NEEDS_REVIEW
    }));
  });

  it('detects duplicate canonical dedup key', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'existing-1' });
    const useCase = new ScholarshipImportPromotionUseCase(repo);
    const record = createRecord(ImportRecordStatus.VALID, {
      scholarshipName: 'Test', description: 'desc',
      providerName: 'Example Foundation',
      fundingCoverage: 'Full',
      coverageDetails: 'Tuition and board',
      eligibleMajorsOrFields: 'All',
      degreeLevel: 'Bachelors',
      studyCountry: 'Qatar',
      eligibilityCriteria: 'Open to eligible students',
      requiredDocuments: 'Transcript and passport',
      officialSourceUrl: 'https://example.com',
      applicationLink: 'https://example.com/apply',
      applicationDeadline: '2027-10-01T00:00:00Z'
    });
    
    const result = await useCase.promote(record);
    expect(result.type).toBe('DUPLICATE');
    if (result.type === 'DUPLICATE') {
      expect(result.existingId).toBe('existing-1');
    }
  });
});
