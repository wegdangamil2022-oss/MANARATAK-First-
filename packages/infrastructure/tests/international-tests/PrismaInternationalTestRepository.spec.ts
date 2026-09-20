import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaInternationalTestRepository } from '../../src/international-tests/PrismaInternationalTestRepository';
import { 
  InternationalTestCategory, 
  InternationalTestStatus, 
  InternationalTestDeliveryMode,
  InternationalTestSourceTrustLevel
} from '@manaratak/domain';

describe('PrismaInternationalTestRepository', () => {
  let mockPrisma: any;
  let repository: PrismaInternationalTestRepository;

  beforeEach(() => {
    mockPrisma = {
      internationalTest: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      internationalTestVariant: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      internationalTestSection: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      internationalTestScoreScale: {
        upsert: vi.fn()
      },
      internationalTestFeeMetadata: {
        create: vi.fn(),
        update: vi.fn()
      },
      internationalTestOfficialLink: {
        create: vi.fn(),
        update: vi.fn()
      },
      internationalTestAvailability: {
        findUnique: vi.fn(),
        upsert: vi.fn()
      },
      internationalTestPreparationMaterial: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      internationalTestEvidence: {
        findUnique: vi.fn(),
        upsert: vi.fn()
      }
    };

    repository = new PrismaInternationalTestRepository(mockPrisma as any);
  });

  it('should findById and map optionalFields fallback alongside normalized relations', async () => {
    mockPrisma.internationalTest.findUnique.mockResolvedValue({
      id: 'test-1',
      canonicalName: 'IELTS Academic',
      providerName: 'IDP',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.PUBLISHED,
      isPubliclyVisible: true,
      isSourceVerified: true,
      optionalFields: { legacyCustomNote: 'Special note' },
      variants: [{
        id: 'var-1',
        variantName: 'Computer-delivered',
        deliveryMode: InternationalTestDeliveryMode.COMPUTER_BASED,
        isActive: true
      }],
      scoreScale: {
        id: 'sc-1',
        overallMinimum: 0,
        overallMaximum: 9
      }
    });

    const result = await repository.findById('test-1');

    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-1');
    expect(result?.legacyCustomNote).toBe('Special note');
    expect(result?.variants?.[0].variantName).toBe('Computer-delivered');
    expect(result?.scoreScale?.overallMaximum).toBe(9);
  });


  it('should prevent compatibility JSON from shadowing canonical lifecycle/security fields', async () => {
    mockPrisma.internationalTest.findUnique.mockResolvedValue({
      id: 'test-shadow',
      canonicalName: 'Canonical SAT',
      providerName: 'College Board',
      testCategory: InternationalTestCategory.UNDERGRAD_ADMISSION,
      status: InternationalTestStatus.READY_TO_PUBLISH,
      isPubliclyVisible: false,
      isSourceVerified: false,
      optionalFields: {
        status: InternationalTestStatus.PUBLISHED,
        isPubliclyVisible: true,
        isSourceVerified: true,
        canonicalName: 'Shadow SAT',
        harmlessCompatibilityNote: 'preserved',
      },
    });

    const result = await repository.findById('test-shadow');

    expect(result?.status).toBe(InternationalTestStatus.READY_TO_PUBLISH);
    expect(result?.isPubliclyVisible).toBe(false);
    expect(result?.isSourceVerified).toBe(false);
    expect(result?.canonicalName).toBe('Canonical SAT');
    expect(result?.harmlessCompatibilityNote).toBe('preserved');
    expect((result?.optionalFields as any)?.status).toBeUndefined();
  });

  it('should enforce published and visible predicates inside findPublishedBySlug', async () => {
    mockPrisma.internationalTest.findFirst.mockResolvedValue(null);

    const result = await repository.findPublishedBySlug('private-test');

    expect(result).toBeNull();
    expect(mockPrisma.internationalTest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'private-test',
          status: InternationalTestStatus.PUBLISHED,
          isPubliclyVisible: true,
        },
      }),
    );
  });

  it('should persist root canonical relationships into normalized nested writes', async () => {
    mockPrisma.internationalTest.create.mockResolvedValue({
      id: 'test-rel',
      canonicalName: 'IELTS Academic',
      providerName: 'IDP',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.IMPORTED,
      isPubliclyVisible: false,
      isSourceVerified: false,
      optionalFields: {},
      countryRelationships: [],
      languageRelationships: [],
      academicTaxonomyRelationships: [],
      degreeRelationships: [],
    });

    await repository.create({
      canonicalName: 'IELTS Academic',
      providerName: 'IDP',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      countryRelationships: [{ canonicalReferenceId: 'country-gb', referenceCode: 'GB', relationshipType: 'AVAILABLE_IN' }],
      languageRelationships: [{ canonicalReferenceId: 'language-en', referenceCode: 'en', relationshipType: 'RELATED_LANGUAGE' }],
      academicTaxonomyRelationships: [{ taxonomyNodeId: 'tax-language', relationshipType: 'REQUIRED_FOR' }],
      degreeRelationships: [{ degreeLevelId: 'degree-bachelor', canonicalCode: 'BACHELOR', relationshipType: 'ACCEPTED_FOR' }],
    });

    expect(mockPrisma.internationalTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          countryRelationships: { create: [expect.objectContaining({ canonicalReferenceId: 'country-gb', countryIso2Code: 'GB' })] },
          languageRelationships: { create: [expect.objectContaining({ canonicalReferenceId: 'language-en', languageIsoCode: 'en' })] },
          academicTaxonomyRelationships: { create: [expect.objectContaining({ taxonomyNodeId: 'tax-language' })] },
          degreeRelationships: { create: [expect.objectContaining({ degreeLevelId: 'degree-bachelor', degreeLevelCode: 'BACHELOR' })] },
        }),
      }),
    );
  });

  it('should list and apply status, category, provider, search filters correctly', async () => {
    mockPrisma.internationalTest.findMany.mockResolvedValue([{
      id: 'test-1',
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.PUBLISHED
    }]);
    mockPrisma.internationalTest.count.mockResolvedValue(1);

    const result = await repository.list({
      status: [InternationalTestStatus.PUBLISHED],
      category: [InternationalTestCategory.LANGUAGE_PROFICIENCY],
      providerName: 'ETS',
      searchQuery: 'TOEFL'
    });

    expect(result.data.length).toBe(1);
    expect(result.total).toBe(1);
    expect(mockPrisma.internationalTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [InternationalTestStatus.PUBLISHED] },
          testCategory: { in: [InternationalTestCategory.LANGUAGE_PROFICIENCY] },
          providerName: 'ETS',
          OR: expect.any(Array)
        })
      })
    );
  });

  it('should listPublished forcing status PUBLISHED', async () => {
    mockPrisma.internationalTest.findMany.mockResolvedValue([]);
    mockPrisma.internationalTest.count.mockResolvedValue(0);

    await repository.listPublished({ providerName: 'IDP' });

    expect(mockPrisma.internationalTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [InternationalTestStatus.PUBLISHED] },
          isPubliclyVisible: true,
          providerName: 'IDP'
        })
      })
    );
  });

  it('should updateStatus and return updated DTO', async () => {
    mockPrisma.internationalTest.update.mockResolvedValue({
      id: 'test-1',
      canonicalName: 'SAT',
      status: InternationalTestStatus.PUBLISHED
    });

    const result = await repository.updateStatus('test-1', InternationalTestStatus.PUBLISHED);

    expect(result.id).toBe('test-1');
    expect(result.status).toBe(InternationalTestStatus.PUBLISHED);
  });

  it('should upsertTest using slug/dedup/deterministic key safely', async () => {
    // Existing record found by slug
    mockPrisma.internationalTest.findUnique.mockResolvedValueOnce({
      id: 'test-sat',
      slug: 'sat-digital',
      canonicalName: 'SAT Digital'
    });
    mockPrisma.internationalTest.update.mockResolvedValue({
      id: 'test-sat',
      slug: 'sat-digital',
      canonicalName: 'SAT Digital Updated'
    });

    const result = await repository.upsertTest({
      slug: 'sat-digital',
      canonicalName: 'SAT Digital Updated',
      providerName: 'College Board',
      testCategory: InternationalTestCategory.UNDERGRAD_ADMISSION
    });

    expect(result.id).toBe('test-sat');
    expect(result.canonicalName).toBe('SAT Digital Updated');
    expect(mockPrisma.internationalTest.update).toHaveBeenCalled();
  });

  it('should listVariants and upsertVariant calling correct model methods', async () => {
    mockPrisma.internationalTestVariant.findMany.mockResolvedValue([{
      id: 'var-1',
      variantName: 'Paper',
      deliveryMode: InternationalTestDeliveryMode.PAPER_BASED,
      isActive: true
    }]);

    const variants = await repository.listVariants('test-1');
    expect(variants.length).toBe(1);

    mockPrisma.internationalTestVariant.create.mockResolvedValue({
      id: 'var-2',
      variantName: 'Online',
      deliveryMode: InternationalTestDeliveryMode.ONLINE_REMOTE,
      isActive: true
    });

    const created = await repository.upsertVariant('test-1', {
      variantName: 'Online',
      deliveryMode: InternationalTestDeliveryMode.ONLINE_REMOTE,
      isActive: true
    });

    expect(created.id).toBe('var-2');
    expect(mockPrisma.internationalTestVariant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          testId: 'test-1',
          variantName: 'Online'
        })
      })
    );
  });

  it('should listSections and upsertSection calling correct model methods', async () => {
    mockPrisma.internationalTestSection.findMany.mockResolvedValue([{
      id: 'sec-1',
      sectionName: 'Listening',
      sectionType: 'LISTENING',
      order: 1
    }]);

    const sections = await repository.listSections('test-1');
    expect(sections.length).toBe(1);

    mockPrisma.internationalTestSection.create.mockResolvedValue({
      id: 'sec-2',
      sectionName: 'Reading',
      sectionType: 'READING',
      order: 2
    });

    const created = await repository.upsertSection('test-1', {
      sectionName: 'Reading',
      sectionType: 'READING',
      order: 2
    });

    expect(created.id).toBe('sec-2');
  });

  it('should upsertScoreScale by testId', async () => {
    mockPrisma.internationalTestScoreScale.upsert.mockResolvedValue({
      id: 'sc-1',
      testId: 'test-1',
      overallMinimum: 100,
      overallMaximum: 600
    });

    const result = await repository.upsertScoreScale('test-1', {
      overallMinimum: 100,
      overallMaximum: 600
    });

    expect(result.overallMinimum).toBe(100);
    expect(mockPrisma.internationalTestScoreScale.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { testId: 'test-1' }
      })
    );
  });

  it('should upsertFeeMetadata metadata only without payment fields', async () => {
    mockPrisma.internationalTestFeeMetadata.create.mockResolvedValue({
      id: 'fee-1',
      feeType: 'REGISTRATION',
      amount: 220,
      currencyCode: 'USD',
      hasRegionalVariation: false
    });

    const fee = await repository.upsertFeeMetadata('test-1', {
      feeType: 'REGISTRATION',
      amount: 220,
      currencyCode: 'USD',
      hasRegionalVariation: false
    });

    expect(fee.amount).toBe(220);
    expect(fee.currencyCode).toBe('USD');
    expect((fee as any).paymentGatewayId).toBeUndefined();
  });

  it('should upsertOfficialLink creating link model record', async () => {
    mockPrisma.internationalTestOfficialLink.create.mockResolvedValue({
      id: 'link-1',
      linkType: 'REGISTRATION',
      url: 'https://example.com/register'
    });

    const link = await repository.upsertOfficialLink('test-1', {
      linkType: 'REGISTRATION',
      url: 'https://example.com/register'
    });

    expect(link.url).toBe('https://example.com/register');
  });

  it('should listAvailability and upsertAvailability using one-to-one by testId', async () => {
    mockPrisma.internationalTestAvailability.findUnique.mockResolvedValue({
      id: 'avail-1',
      availableCountryIds: ['USA', 'EGY']
    });

    const avail = await repository.listAvailability('test-1');
    expect(avail?.availableCountryIds).toEqual(['USA', 'EGY']);

    mockPrisma.internationalTestAvailability.upsert.mockResolvedValue({
      id: 'avail-1',
      availableCountryIds: ['USA', 'EGY', 'SAU']
    });

    const updated = await repository.upsertAvailability('test-1', {
      availableCountryIds: ['USA', 'EGY', 'SAU']
    });

    expect(updated.availableCountryIds).toEqual(['USA', 'EGY', 'SAU']);
  });

  it('should listPreparationMaterials and upsertPreparationMaterial with assetId support', async () => {
    mockPrisma.internationalTestPreparationMaterial.findMany.mockResolvedValue([{
      id: 'prep-1',
      title: 'Guide Book',
      materialType: 'GUIDE',
      assetId: 'asset-100'
    }]);

    const materials = await repository.listPreparationMaterials('test-1');
    expect(materials[0].assetId).toBe('asset-100');
  });

  it('should listEvidence and addEvidence using evidence model', async () => {
    mockPrisma.internationalTestEvidence.findUnique.mockResolvedValue({
      id: 'ev-1',
      originalImportedName: 'Raw TOEFL',
      sourceTrustLevel: InternationalTestSourceTrustLevel.AUTHORITATIVE
    });

    const evidenceList = await repository.listEvidence('test-1');
    expect(evidenceList.length).toBe(1);
    expect(evidenceList[0].sourceTrustLevel).toBe(InternationalTestSourceTrustLevel.AUTHORITATIVE);
  });
});
