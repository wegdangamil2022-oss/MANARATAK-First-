import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IInternationalTestRepository,
  IReferenceResolver,
  ImportRecordDto,
  ImportRecordStatus,
  InternationalTestCategory,
  InternationalTestCompletenessStatus,
  InternationalTestStatus
} from '@manaratak/domain';
import { InternationalTestImportPromotionUseCase } from '../../src/tests-platform/use-cases/InternationalTestImportPromotionUseCase';

describe('InternationalTestImportPromotionUseCase', () => {
  let repository: IInternationalTestRepository;
  let useCase: InternationalTestImportPromotionUseCase;
  const referenceResolver: IReferenceResolver = {
    resolveCountry: vi.fn(async ({ id, standardCode }: { id?: string; standardCode?: string }) => id ? ({
      id,
      type: 'COUNTRY',
      standardCode: standardCode || id,
      active: true
    }) : null),
    resolveRegion: vi.fn(),
    resolveCity: vi.fn(async ({ id }: { id?: string }) => id ? ({ id, type: 'CITY', active: true }) : null),
    resolveLanguage: vi.fn(async ({ standardCode }: { standardCode?: string }) => standardCode ? ({
      id: `language-${standardCode}`,
      type: 'LANGUAGE',
      standardCode,
      active: true
    }) : null),
    resolveCurrency: vi.fn(async ({ standardCode }: { standardCode?: string }) => standardCode ? ({
      id: `currency-${standardCode}`,
      type: 'CURRENCY',
      standardCode,
      active: true
    }) : null)
  };

  const record: ImportRecordDto = {
    id: 'record-1',
    batchId: 'batch-1',
    status: ImportRecordStatus.VALID,
    rawPayload: {
      testName: 'Official IELTS Academic Test 2027',
      testCode: 'IELTS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      providerName: 'British Council',
      officialRegistrationUrl: 'https://ielts.org/register',
      officialSourceUrl: 'https://ielts.org',
      officialLinks: [{ linkType: 'REGISTRATION', url: 'https://ielts.org/register' }],
      acceptedFor: ['University Admission', 'Scholarships'],
      scoreScale: { overallMinimum: 0, overallMaximum: 9, scoreIncrement: 0.5 },
      validityPeriodMonths: 24,
      currencyCode: 'USD',
      feeAmountMinorUnits: '25000',
      feeScale: 2,
      sampleMaterialAssetIds: ['asset-sample-1']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    repository = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-1', createdAt: new Date(), updatedAt: new Date(), ...data })),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findPublishedBySlug: vi.fn(),
      findByDedupKey: vi.fn().mockResolvedValue(null),
      updateStatus: vi.fn(),
      list: vi.fn(),
      listPublished: vi.fn()
    };
    useCase = new InternationalTestImportPromotionUseCase(repository);
  });

  it('promotes a generic valid import record into an international test', async () => {
    const result = await useCase.promote(record);

    expect(result).toEqual({ type: 'CREATED', testId: 'test-1' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      displayName: 'Official IELTS Academic Test 2027',
      canonicalName: 'ielts academic',
      sourceImportRecordId: 'record-1',
      completenessStatus: InternationalTestCompletenessStatus.COMPLETE,
      status: InternationalTestStatus.IMPORTED
    }));
  });

  it('rejects records that are not VALID or NEEDS_REVIEW', async () => {
    const result = await useCase.promote({ ...record, status: ImportRecordStatus.STAGED });

    expect(result.type).toBe('REJECTED');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects records when domain validation has ERROR issues', async () => {
    const invalidRecord: ImportRecordDto = {
      ...record,
      rawPayload: {
        ...record.rawPayload,
        testCategory: 'INVALID_CATEGORY'
      }
    };

    const result = await useCase.promote(invalidRecord);

    expect(result.type).toBe('REJECTED');
    if (result.type === 'REJECTED') {
      expect(result.reason).toContain('Domain validation failed');
    }
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('ensures promoted records are created with IMPORTED or READY_TO_REVIEW status, never PUBLISHED', async () => {
    const result = await useCase.promote(record);

    expect(result.type).toBe('CREATED');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.stringMatching(/^(IMPORTED|READY_TO_REVIEW)$/)
      })
    );
  });

  it('promotes a rich IELTS Academic Unified Profile payload and invokes sub-entity repository methods if available', async () => {
    const upsertVariant = vi.fn().mockResolvedValue({});
    const upsertSection = vi.fn().mockResolvedValue({});
    const upsertScoreScale = vi.fn().mockResolvedValue({});
    const upsertFeeMetadata = vi.fn().mockResolvedValue({});
    const upsertOfficialLink = vi.fn().mockResolvedValue({});
    const upsertAvailability = vi.fn().mockResolvedValue({});
    const upsertPreparationMaterial = vi.fn().mockResolvedValue({});
    const addEvidence = vi.fn().mockResolvedValue({});
    const createImportDraftVersion = vi.fn().mockResolvedValue({});
    const upsertCountryRelationship = vi.fn().mockResolvedValue(undefined);
    const upsertLanguageRelationship = vi.fn().mockResolvedValue(undefined);
    const upsertAcademicTaxonomyRelationship = vi.fn().mockResolvedValue(undefined);
    const upsertDegreeRelationship = vi.fn().mockResolvedValue(undefined);

    const richRepo: IInternationalTestRepository = {
      ...repository,
      upsertVariant,
      upsertSection,
      upsertScoreScale,
      upsertFeeMetadata,
      upsertOfficialLink,
      upsertAvailability,
      upsertPreparationMaterial,
      addEvidence,
      createImportDraftVersion,
      upsertCountryRelationship,
      upsertLanguageRelationship,
      upsertAcademicTaxonomyRelationship,
      upsertDegreeRelationship,
    };

    const degreeLevelRepository: any = {
      getDegreeLevelById: vi.fn().mockResolvedValue({
        id: 'degree-bachelor',
        canonicalCode: 'BACHELOR',
        status: 'ACTIVE',
      }),
    };
    const academicTaxonomyRepository: any = {
      getNode: vi.fn().mockResolvedValue({
        nodeId: 'taxonomy-language-studies',
        status: 'ACTIVE',
      }),
    };
    const richUseCase = new InternationalTestImportPromotionUseCase(
      richRepo,
      undefined,
      referenceResolver,
      undefined,
      degreeLevelRepository,
      academicTaxonomyRepository,
    );

    const richRecord: ImportRecordDto = {
      id: 'record-rich-1',
      batchId: 'batch-rich-1',
      status: ImportRecordStatus.VALID,
      rawPayload: {
        testName: 'IELTS Academic',
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
        providerName: 'British Council / IDP',
        abbreviation: 'IELTS',
        localizedNameAr: 'اختبار الآيلتس الأكاديمي',
        description: 'International English Language Testing System',
        useCases: ['University Admission'],
        relatedLanguages: ['en'],
        variants: [
          { variantName: 'Computer-Delivered', deliveryMode: 'ONLINE', isActive: true }
        ],
        sections: [
          { sectionName: 'Listening', durationMinutes: 30, scoreMinimum: 0, scoreMaximum: 9 }
        ],
        scoreScale: {
          overallMinimum: 0,
          overallMaximum: 9,
          scoreIncrement: 0.5,
          cefrEquivalency: 'B1-C2'
        },
        fees: [
          { feeType: 'REGISTRATION', amount: 215, currencyCode: 'USD' }
        ],
        officialLinks: [
          { linkType: 'REGISTRATION', url: 'https://takeielts.britishcouncil.org', sourceTrustLevel: 'AUTHORITATIVE' }
        ],
        availability: {
          availableCountryIds: ['GB', 'SA'],
          onlineAvailabilityRegions: ['Global']
        },
        academicTaxonomyRelationships: [
          { taxonomyNodeId: 'taxonomy-language-studies', relationshipType: 'REQUIRED_FOR', confidence: 0.95 }
        ],
        degreeRelationships: [
          { degreeLevelId: 'degree-bachelor', canonicalCode: 'BACHELOR', relationshipType: 'ACCEPTED_FOR' }
        ],
        preparationMaterials: [
          { materialType: 'GUIDE', title: 'Official Guide', url: 'https://takeielts.britishcouncil.org/prepare', assetId: 'asset-1' }
        ],
        importEvidence: {
          confidenceScore: 0.95,
          sourceTrustLevel: 'AUTHORITATIVE',
          sourceUrl: 'https://www.ielts.org'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await richUseCase.promote(richRecord);

    expect(result).toEqual({ type: 'CREATED', testId: 'test-1' });

    // Verify root test created with READY_TO_REVIEW or IMPORTED, never PUBLISHED
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'IELTS Academic',
        canonicalName: 'ielts academic',
        providerName: 'British Council / IDP',
        status: expect.stringMatching(/^(IMPORTED|READY_TO_REVIEW)$/)
      })
    );

    // Verify sub-entity calls
    expect(upsertVariant).toHaveBeenCalledWith('test-1', expect.objectContaining({ variantName: 'Computer-Delivered' }));
    expect(upsertSection).toHaveBeenCalledWith('test-1', expect.objectContaining({ sectionName: 'Listening', durationMinutes: 30 }));
    expect(upsertScoreScale).toHaveBeenCalledWith('test-1', expect.objectContaining({ overallMaximum: 9 }));
    expect(upsertFeeMetadata).toHaveBeenCalledWith('test-1', expect.objectContaining({ amount: 215, currencyCode: 'USD' }));
    expect(upsertOfficialLink).toHaveBeenCalledWith('test-1', expect.objectContaining({ url: 'https://takeielts.britishcouncil.org' }));
    expect(upsertAvailability).toHaveBeenCalledWith('test-1', expect.objectContaining({ availableCountryIds: ['GB', 'SA'] }));
    expect(upsertPreparationMaterial).toHaveBeenCalledWith('test-1', expect.objectContaining({ title: 'Official Guide' }));
    expect(addEvidence).toHaveBeenCalledWith('test-1', expect.objectContaining({ sourceTrustLevel: 'AUTHORITATIVE', sourceUrl: 'https://www.ielts.org' }));
    expect(createImportDraftVersion).toHaveBeenCalledWith('test-1', expect.objectContaining({
      sourceImportRecordId: 'record-rich-1',
      metadata: expect.objectContaining({ normalizedLifecycle: 'INTERNATIONAL_TEST_READY_MINIMUM' })
    }));
    expect(upsertCountryRelationship).toHaveBeenCalledWith('test-1', expect.objectContaining({
      referenceCode: 'GB',
      relationshipType: 'AVAILABLE_IN'
    }));
    expect(upsertLanguageRelationship).toHaveBeenCalledWith('test-1', expect.objectContaining({
      referenceCode: 'en',
      relationshipType: 'RELATED_LANGUAGE'
    }));
    expect(upsertAcademicTaxonomyRelationship).toHaveBeenCalledWith('test-1', expect.objectContaining({
      taxonomyNodeId: 'taxonomy-language-studies',
      relationshipType: 'REQUIRED_FOR'
    }));
    expect(upsertDegreeRelationship).toHaveBeenCalledWith('test-1', expect.objectContaining({
      degreeLevelId: 'degree-bachelor',
      relationshipType: 'ACCEPTED_FOR'
    }));
  });

  it('rejects promotion if raw payload includes payment execution or auto-publish flags', async () => {
    const paymentRecord: ImportRecordDto = {
      ...record,
      rawPayload: {
        ...record.rawPayload,
        paymentGatewayId: 'stripe-test-id'
      }
    };

    const result = await useCase.promote(paymentRecord);
    expect(result.type).toBe('REJECTED');
    if (result.type === 'REJECTED') {
      expect(result.reason).toContain('Domain validation failed');
      expect(result.reason).toContain('paymentGatewayId');
    }
  });
});
