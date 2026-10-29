import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
const mutationContext = {actorId: 'reviewer-1', reason: 'Reviewed official source', expectedRevision: 1};
const atomic = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(
{execute: async operation => operation({boundaryId: 'source-test'})},
{saveInTransaction: async () => undefined} as never, {appendInTransaction: async () => undefined} as never));
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminScholarshipUseCases } from '../../src/scholarships/use-cases/AdminScholarshipUseCases';
import { 
  IScholarshipRepository, 
  ScholarshipStatus,
  ScholarshipCompletenessState,
  ScholarshipPublicationStatus
} from '@manaratak/domain';

describe('AdminScholarshipUseCases', () => {
  const publicationReady = { publicationStatus: ScholarshipPublicationStatus.DRAFT, officialSourceUrl: 'https://example.edu/scholarship',
    completenessStatus: ScholarshipCompletenessState.COMPLETE,
    verificationStatus: 'VERIFIED',
    versions: [{ id: 'version-1' }],
    sponsorContext: { sponsorName: 'Test sponsor' },
    applicationCycles: [{ id: 'cycle-1' }],
  };
  let mockRepo: IScholarshipRepository;
  let useCases: AdminScholarshipUseCases;

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
        withTransaction() {
            return this;
        },
        lockForRevision: vi.fn(),
        advanceRevision: vi.fn().mockResolvedValue(2),
        assertCurrentRevision: vi.fn()
    };
    useCases = new AdminScholarshipUseCases(mockRepo, atomic);
  });

  it('listScholarships calls repo.list with filters', async () => {
    const filters = { status: ScholarshipStatus.READY_TO_REVIEW, page: 2 };
    mockRepo.list = vi.fn().mockResolvedValue({ data: [], total: 0 });
    
    await useCases.listScholarships(filters);
    expect(mockRepo.list).toHaveBeenCalledWith(filters);
  });

  it('saves one source criterion under revision lock without replacing source, enrichment or relationships', async () => {
    const metadata = { rawSourceSections: { 'الشروط ومعايير التقديم': 'درجة جامعية، سجل أكاديمي قوي.' }, conditionalLanguageEvidence: { score: 100 } };
    const existing = { id: 'schol-1', displayName: 'Source scholarship', status: ScholarshipStatus.IMPORTED, ...publicationReady, revision: 1, metadata,
      eligibilityItems: [{ itemKey: 'old-language', valueText: 'Enrichment retained' }], majorTargets: [{ targetKey: 'degree-1', majorId: 'm1' }] };
    mockRepo.findById = vi.fn().mockResolvedValue(existing);
    mockRepo.update = vi.fn().mockImplementation(async (_id, updates) => ({ ...existing, ...updates, revision: 2 }));
    const saved = await useCases.updateEligibilityCriterion('schol-1', 'source-criterion-2', 'سجل أكاديمي متميز.', mutationContext);
    expect(mockRepo.assertCurrentRevision).toHaveBeenCalledWith('schol-1', 1);
    const updates = vi.mocked(mockRepo.update).mock.calls[0][1];
    expect(Object.keys(updates).sort()).toEqual(['metadata', 'status']);
    expect(updates.metadata?.rawSourceSections).toEqual(metadata.rawSourceSections);
    expect(updates.metadata?.conditionalLanguageEvidence).toEqual(metadata.conditionalLanguageEvidence);
    expect(updates.metadata?.eligibilityAuthoring).toMatchObject({ edits: [expect.objectContaining({ key: 'source-criterion-2', text: 'سجل أكاديمي متميز.', actorId: 'reviewer-1' })] });
    expect(saved.majorTargets).toEqual(existing.majorTargets);
    expect(saved.eligibilityItems).toEqual(existing.eligibilityItems);
  });

  it('rejects a stale or unknown criterion and source rewrites without altering the owner record', async () => {
    const existing = { id: 'schol-1', displayName: 'Source', status: ScholarshipStatus.IMPORTED, ...publicationReady, metadata: { rawSourceSections: { 'الشروط ومعايير التقديم': 'Literal source.' } } };
    mockRepo.findById = vi.fn().mockResolvedValue(existing);
    await expect(useCases.updateScholarship('schol-1', { metadata: { rawSourceSections: {} } }, mutationContext)).rejects.toThrow('SOURCE_IMMUTABLE');
    await expect(useCases.updateEligibilityCriterion('schol-1', 'wrong', 'Text', mutationContext)).rejects.toThrow('NOT_FOUND');
    mockRepo.assertCurrentRevision = vi.fn().mockRejectedValue(new Error('REVISION_MISMATCH'));
    await expect(useCases.updateEligibilityCriterion('schol-1', 'source-criterion-1', 'Text', mutationContext)).rejects.toThrow('REVISION_MISMATCH');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('updateScholarship updates fields and recomputes completeness', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'schol-1',
      displayName: 'Test',
      fundingCoverage: 'Full',
      status: ScholarshipStatus.IMPORTED,
      ...publicationReady,
    });
    
    await useCases.updateScholarship('schol-1', {
      displayName: 'Updated Test',
      fundingCoverage: 'None'
    }, mutationContext);
    
    expect(mockRepo.update).toHaveBeenCalledWith('schol-1', expect.objectContaining({
      displayName: 'Updated Test',
      fundingCoverage: 'None',
      completenessStatus: expect.any(String) // should be recomputed
    }));
  });

  it('markReadyToPublish transitions only if COMPLETE', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'schol-1',
      status: ScholarshipStatus.READY_TO_REVIEW,
      ...publicationReady,
    });
    
    await useCases.markReadyToPublish('schol-1', mutationContext);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('schol-1', ScholarshipStatus.READY_TO_PUBLISH);
  });

  it('markReadyToPublish rejects if INCOMPLETE', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'schol-1',
      status: ScholarshipStatus.READY_TO_REVIEW,
      completenessStatus: ScholarshipCompletenessState.INCOMPLETE
    });
    
    await expect(useCases.markReadyToPublish('schol-1', mutationContext)).rejects.toThrow('SCHOLARSHIP_NOT_COMPLETE');
  });

  it('publish transitions only if READY_TO_PUBLISH', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'schol-1',
      status: ScholarshipStatus.READY_TO_PUBLISH,
      ...publicationReady,
    });
    
    await useCases.publish('schol-1', mutationContext);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('schol-1', ScholarshipStatus.PUBLISHED);
  });
  
  it('publish rejects if not READY_TO_PUBLISH', async () => {
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'schol-1',
      status: ScholarshipStatus.IMPORTED,
    });
    
    await expect(useCases.publish('schol-1', mutationContext)).rejects.toThrow('Only READY_TO_PUBLISH');
  });

  it('publishes through canonical publication lifecycle without changing completeness', async () => {
    mockRepo.updateLifecycle = vi.fn();
    mockRepo.findById = vi.fn().mockResolvedValue({
      id: 'schol-1', status: ScholarshipStatus.READY_TO_PUBLISH,
      ...publicationReady,
    });
    await useCases.publish('schol-1', mutationContext);
    expect(mockRepo.updateLifecycle).toHaveBeenCalledWith('schol-1', {
      workflowStatus: ScholarshipStatus.PUBLISHED,
      publicationStatus: ScholarshipPublicationStatus.PUBLISHED,
    });
  });
});
