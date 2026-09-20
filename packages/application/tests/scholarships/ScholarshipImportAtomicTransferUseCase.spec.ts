import { describe, expect, it, vi } from 'vitest';
import {
  ScholarshipCompletenessState,
  ScholarshipPublicationStatus,
  ScholarshipDeduplicationService,
  ScholarshipNamingService,
  ScholarshipStatus,
  type AtomicPersistenceContext,
  type CreateScholarshipDto,
  type IScholarshipRepository,
  type ScholarshipDto,
  type UpdateScholarshipDto,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {
  ScholarshipImportAtomicTransferUseCase,
  type IScholarshipImportAtomicGateway,
  type ScholarshipImportCenterBatchRecord,
  type ScholarshipImportCenterStoredRecord,
} from '../../src/scholarships/import-center';

function payload() {
  return {
    scholarshipName: 'Qatar University Scholarship 2027',
    providerName: 'Qatar University',
    fundingCoverage: 'Fully funded',
    coverageDetails: 'Tuition and stipend',
    studyCountry: 'Qatar',
    degreeLevel: 'Doctorate',
    eligibilityCriteria: 'Academic merit',
    requiredDocuments: ['Transcript'],
    applicationDeadline: '2027-01-01',
    officialSourceUrl: 'https://example.edu/scholarship',
    metadata: {
      verificationState: 'VERIFIED',
      academicYear: '2027',
      canonicalScreening: [{
        target: 'COUNTRY',
        state: 'RESOLVED',
        rawValue: 'Qatar',
        canonicalReferenceId: 'country-qa',
      }],
    },
  };
}

function setup(existing: ScholarshipDto | null = null) {
  const batch: ScholarshipImportCenterBatchRecord = {
    id: 'batch-1',
    sourceSystem: 'OFFICIAL_SITE',
    dataType: 'SCHOLARSHIPS',
    batchStatus: 'COMPLETED',
    totalRecords: 1,
  };
  let record: ScholarshipImportCenterStoredRecord = {
    id: 'rec-1',
    batchId: batch.id,
    status: 'COMPLETE',
    rawPayload: payload(),
    processingNotes: null,
    promotedEntityId: null,
    sourceRowNumber: 7,
    createdAt: new Date('2026-08-20T00:00:00Z'),
    updatedAt: new Date('2026-08-20T00:00:00Z'),
  };

  const importGateway: IScholarshipImportAtomicGateway = {
    async listBatches() { return [batch]; },
    async listRecords() { return { data: [record], total: 1, page: 1, pageSize: 50 }; },
    async getRecordById(id) { return id === record.id ? record : null; },
    async getBatchById(id) { return id === batch.id ? batch : null; },
    async updateRecord(id, updates) {
      if (id !== record.id) throw new Error('record missing');
      record = { ...record, ...updates, updatedAt: new Date() };
      return record;
    },
    withTransaction() { return this; },
  };

  let current = existing;
  const create = vi.fn(async (data: CreateScholarshipDto) => {
    current = {
      ...data,
      id: 'sch-new',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ScholarshipDto;
    return current;
  });
  const update = vi.fn(async (id: string, updates: UpdateScholarshipDto) => {
    if (!current || current.id !== id) throw new Error('scholarship missing');
    current = { ...current, ...updates, id: current.id, publicId: current.publicId } as ScholarshipDto;
    return current;
  });
  const repository: IScholarshipRepository & { withTransaction(context: AtomicPersistenceContext): IScholarshipRepository } = {
    create,
    update,
    async findByDedupKey() { return current; },
    async findById(id) { return current?.id === id ? current : null; },
    async findBySlug() { return null; },
    async updateStatus() {},
    async list() { return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }; },
    async listPublished() { return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }; },
    withTransaction() { return this; },
  };
  const atomicMutations = {
    execute: vi.fn(async (_definition: unknown, mutation: (context: AtomicPersistenceContext) => Promise<unknown>) =>
      mutation({ boundaryId: 'tx-1', transactionClient: {} } as AtomicPersistenceContext)),
  } as unknown as AtomicDomainMutationCoordinator;

  const service = new ScholarshipImportAtomicTransferUseCase(importGateway, repository, atomicMutations);
  return {
    service,
    importGateway,
    repository,
    atomicMutations,
    create,
    update,
    getRecord: () => record,
    getScholarship: () => current,
  };
}

function existingScholarship(status: ScholarshipStatus = ScholarshipStatus.IMPORTED): ScholarshipDto {
  const source = payload();
  const cleaned = ScholarshipNamingService.clean(source.scholarshipName);
  const duplicateKey = ScholarshipDeduplicationService.buildKey({
    cleanedScholarshipName: cleaned.cleanedScholarshipName,
    providerName: source.providerName,
    providerCanonicalPublicId: null,
    year: '2027',
    incomingSourceImportRecordId: 'old-record',
  }).duplicateKey;
  return {
    id: 'sch-existing',
    publicId: 'SCH-PUBLIC-1',
    slug: 'qatar-university-scholarship-2027',
    canonicalName: cleaned.cleanedScholarshipName,
    canonicalDedupKey: duplicateKey,
    displayName: 'Old display name',
    status,
    completenessStatus: ScholarshipCompletenessState.COMPLETE,
    publicationStatus: status === ScholarshipStatus.PUBLISHED
      ? ScholarshipPublicationStatus.PUBLISHED
      : status === ScholarshipStatus.ARCHIVED
        ? ScholarshipPublicationStatus.ARCHIVED
        : ScholarshipPublicationStatus.DRAFT,
    providerName: source.providerName,
    sourceImportRecordId: 'old-record',
    sourceEvidence: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ScholarshipDto;
}

describe('WP12-10 ScholarshipImportAtomicTransferUseCase', () => {
  it('creates a genuinely new canonical Scholarship as non-published and links the ImportRecord', async () => {
    const env = setup();
    const result = await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });

    expect(result.publicationStatus).toBe('DRAFT');
    expect(result.scholarshipId).toBe('sch-new');
    expect(env.create).toHaveBeenCalledTimes(1);
    const createInput = env.create.mock.calls[0][0];
    expect(createInput.status).toBe(ScholarshipStatus.IMPORTED);
    expect(createInput.publicationStatus).toBe(ScholarshipPublicationStatus.DRAFT);
    expect(createInput.sourceImportRecordId).toBe('rec-1');
    expect(createInput.sourceEvidence?.some((item) => item.importRecordId === 'rec-1')).toBe(true);
    expect(env.getRecord().promotedEntityId).toBe('sch-new');
    expect((env.atomicMutations.execute as any).mock.calls[0][0].action).toBe('SCHOLARSHIP_IMPORT_TRANSFERRED');
  });

  it('requires a durable MERGE decision and preserves existing id/publicId', async () => {
    const existing = existingScholarship();
    const env = setup(existing);

    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_REVIEW_DECISION_REQUIRED');

    const decision = await env.service.recordDecision({
      recordId: 'rec-1',
      action: 'MERGE',
      actorId: 'admin-1',
      reason: 'Reviewed incoming source and approved the update.',
    });
    expect(decision.action).toBe('MERGE');
    expect(env.getRecord().processingNotes).toContain('SCHOLARSHIP_IMPORT_REVIEW_DECISION_V1');

    const result = await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    expect(result.scholarshipId).toBe(existing.id);
    expect(env.update).toHaveBeenCalledTimes(1);
    expect(env.getScholarship()?.id).toBe(existing.id);
    expect(env.getScholarship()?.publicId).toBe(existing.publicId);
    expect(env.getScholarship()?.status).toBe(ScholarshipStatus.IMPORTED);
  });

  it('refuses to mutate a canonically published target through import transfer', async () => {
    const env = setup(existingScholarship(ScholarshipStatus.PUBLISHED));
    await env.service.recordDecision({ recordId: 'rec-1', action: 'MERGE', actorId: 'admin-1' });

    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_TARGET_PUBLICATION_LOCKED');
    expect(env.update).not.toHaveBeenCalled();
  });

  it('binds both repositories to the same atomic transaction context', async () => {
    const env = setup();
    const importBinding = vi.spyOn(env.importGateway, 'withTransaction');
    const scholarshipBinding = vi.spyOn(env.repository as any, 'withTransaction');
    await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    const context = (env.atomicMutations.execute as any).mock.calls[0][1] ? importBinding.mock.calls[0][0] : null;
    expect(context).toMatchObject({ boundaryId: 'tx-1' });
    expect(scholarshipBinding).toHaveBeenCalledWith(context);
  });

  it('returns a truthful durable receipt on repeat transfer without another mutation', async () => {
    const env = setup();
    const first = await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    const second = await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-2' });
    expect(second).toEqual(first);
    expect(env.create).toHaveBeenCalledTimes(1);
    expect(env.update).not.toHaveBeenCalled();
    env.getScholarship()!.publicationStatus = ScholarshipPublicationStatus.PUBLISHED;
    const afterExplicitPublish = await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-3' });
    expect(afterExplicitPublish.publicationStatus).toBe(ScholarshipPublicationStatus.PUBLISHED);
    expect(afterExplicitPublish.transferredAt).toBe(first.transferredAt);
  });

  it('rejects a corrupt promotedEntityId or missing durable transfer receipt', async () => {
    const missing = setup();
    missing.getRecord().promotedEntityId = 'missing-scholarship';
    await expect(missing.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_PROMOTION_LINK_CORRUPT');

    const noReceipt = setup(existingScholarship());
    noReceipt.getRecord().promotedEntityId = 'sch-existing';
    await expect(noReceipt.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_PROMOTION_LINK_CORRUPT');
  });

  it.each([
    [ScholarshipStatus.PUBLISHED],
    [ScholarshipStatus.ARCHIVED],
  ])('locks %s canonical targets from import mutation', async (status) => {
    const env = setup(existingScholarship(status));
    await env.service.recordDecision({ recordId: 'rec-1', action: 'MERGE', actorId: 'admin-1' });
    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_TARGET_PUBLICATION_LOCKED');
    expect(env.update).not.toHaveBeenCalled();
  });

  it.each([
    ['KEEP_CURRENT', 'SCHOLARSHIP_IMPORT_KEEP_CURRENT_BLOCKS_TRANSFER'],
    ['SPLIT', 'SCHOLARSHIP_IMPORT_SPLIT_REQUIRES_NEW_DEDUPE_IDENTITY'],
  ] as const)('%s decision cannot silently merge', async (action, error) => {
    const env = setup(existingScholarship());
    await env.service.recordDecision({ recordId: 'rec-1', action, actorId: 'admin-1' });
    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' })).rejects.toThrow(error);
    expect(env.update).not.toHaveBeenCalled();
  });

  it('rejects a stale durable review decision after incoming context changes', async () => {
    const env = setup(existingScholarship());
    await env.service.recordDecision({ recordId: 'rec-1', action: 'MERGE', actorId: 'admin-1' });
    (env.getRecord().rawPayload as any).coverageDetails = 'Changed after review';
    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_REVIEW_DECISION_STALE');
    expect(env.update).not.toHaveBeenCalled();
  });

  it('rejects when the duplicate target changes after durable review', async () => {
    const env = setup(existingScholarship());
    await env.service.recordDecision({ recordId: 'rec-1', action: 'MERGE', actorId: 'admin-1' });
    const changedTarget = existingScholarship();
    changedTarget.id = 'sch-different';
    vi.spyOn(env.repository, 'findByDedupKey').mockResolvedValue(changedTarget);
    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_REVIEW_DECISION_STALE');
    expect(env.update).not.toHaveBeenCalled();
  });

  it('transfers normalized structures using only resolved canonical ids', async () => {
    const env = setup();
    const raw = env.getRecord().rawPayload as any;
    raw.eligibleMajorsOrFields = ['Computer Science'];
    raw.targetUniversities = ['Qatar University'];
    raw.studyLanguage = 'English';
    raw.metadata.internationalTests = ['IELTS'];
    raw.metadata.canonicalScreening = [
      { target: 'COUNTRY', state: 'RESOLVED', rawValue: 'Qatar', canonicalReferenceId: 'country-qa' },
      { target: 'LANGUAGE', state: 'RESOLVED', rawValue: 'English', canonicalReferenceId: 'language-en' },
      { target: 'DEGREE_LEVEL', state: 'RESOLVED', rawValue: 'Doctorate', canonicalReferenceId: 'degree-phd' },
      { target: 'MAJOR', state: 'RESOLVED', rawValue: 'Computer Science', canonicalReferenceId: 'major-cs' },
      { target: 'INTERNATIONAL_TEST', state: 'RESOLVED', rawValue: 'IELTS', canonicalReferenceId: 'test-ielts' },
      { target: 'UNIVERSITY', state: 'RESOLVED', rawValue: 'Qatar University', canonicalReferenceId: 'university-qu' },
    ];
    await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    const created = env.create.mock.calls[0][0];
    expect(created.benefits?.length).toBeGreaterThan(0);
    expect(created.degreeTargets).toEqual(expect.arrayContaining([expect.objectContaining({ degreeLevelId: 'degree-phd' })]));
    expect(created.majorTargets).toEqual(expect.arrayContaining([expect.objectContaining({ majorId: 'major-cs' })]));
    expect(created.eligibilityItems).toEqual(expect.arrayContaining([expect.objectContaining({ internationalTestId: 'test-ielts' })]));
    expect(created.requiredDocumentItems?.length).toBeGreaterThan(0);
    expect(created.universityLinks).toEqual(expect.arrayContaining([expect.objectContaining({ universityId: 'university-qu' })]));
  });


  it('persists explicit canonical AcademicProgram targets instead of unresolved text placeholders', async () => {
    const env = setup();
    const raw = env.getRecord().rawPayload as any;
    raw.targetAcademicProgramReferences = [{ canonicalId: 'program-cs-phd', sourceLabel: 'Computer Science PhD' }];
    raw.metadata.canonicalScreening = [
      { target: 'COUNTRY', state: 'RESOLVED', rawValue: 'Qatar', canonicalReferenceId: 'country-qa' },
      { target: 'ACADEMIC_PROGRAM', state: 'RESOLVED', rawValue: 'Computer Science PhD', canonicalReferenceId: 'program-cs-phd' },
    ];
    await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    expect(env.create.mock.calls[0][0].universityLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationshipTypeCode: 'TARGET_PROGRAM', academicProgramId: 'program-cs-phd', resolutionStatus: 'RESOLVED' }),
    ]));
  });

  it('merge retains prior SourceEvidence and adds incoming provenance deterministically', async () => {
    const existing = existingScholarship();
    existing.sourceEvidence = [{ evidenceKey: 'old-source', sourceTypeCode: 'OFFICIAL_SOURCE', sourceUrl: 'https://old.example/source', importRecordId: 'old-record' }];
    const env = setup(existing);
    await env.service.recordDecision({ recordId: 'rec-1', action: 'MERGE', actorId: 'admin-1' });
    await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    const evidence = env.update.mock.calls[0][1].sourceEvidence ?? [];
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ evidenceKey: 'old-source', importRecordId: 'old-record' }),
      expect.objectContaining({ importRecordId: 'rec-1' }),
    ]));
  });

  it.each([
    ['UNRESOLVED'], ['AMBIGUOUS'], ['REVIEW_REQUIRED'],
  ])('blocks %s canonical screening states', async (state) => {
    const env = setup();
    (env.getRecord().rawPayload as any).metadata.canonicalScreening = [{ target: 'COUNTRY', state, rawValue: 'Qatar' }];
    await expect(env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_CANONICAL_REVIEW_REQUIRED');
    expect(env.create).not.toHaveBeenCalled();
  });

  it('blocks unverified and missing canonical-screening records', async () => {
    const unverified = setup();
    (unverified.getRecord().rawPayload as any).metadata.verificationState = 'PENDING';
    await expect(unverified.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_SOURCE_NOT_VERIFIED');

    const unscreened = setup();
    delete (unscreened.getRecord().rawPayload as any).metadata.canonicalScreening;
    await expect(unscreened.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' }))
      .rejects.toThrow('SCHOLARSHIP_IMPORT_CANONICAL_SCREENING_REQUIRED');
  });

  it('does not trust a raw InternationalTest id without a resolved canonical screening result', async () => {
    const env = setup();
    (env.getRecord().rawPayload as any).metadata.requiredDocumentItems = [{ displayName: 'IELTS result', internationalTestLabel: 'IELTS', internationalTestId: 'injected-id' }];
    await env.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' });
    expect(env.create.mock.calls[0][0].requiredDocumentItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ displayName: 'IELTS result', internationalTestId: null }),
    ]));
  });

  it('propagates Scholarship and ImportRecord failures instead of reporting partial success', async () => {
    const scholarshipFailure = setup();
    scholarshipFailure.create.mockRejectedValueOnce(new Error('scholarship write failed'));
    const linkSpy = vi.spyOn(scholarshipFailure.importGateway, 'updateRecord');
    await expect(scholarshipFailure.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' })).rejects.toThrow('scholarship write failed');
    expect(linkSpy).not.toHaveBeenCalled();

    const promotionFailure = setup();
    vi.spyOn(promotionFailure.importGateway, 'updateRecord').mockRejectedValueOnce(new Error('promotion link failed'));
    await expect(promotionFailure.service.transfer({ recordId: 'rec-1', actorId: 'admin-1' })).rejects.toThrow('promotion link failed');
  });
});
