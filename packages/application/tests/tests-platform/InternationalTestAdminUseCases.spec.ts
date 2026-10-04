import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternationalTestAdminUseCases } from '../../src/tests-platform/use-cases/InternationalTestUseCases';
import { 
  InternationalTestCategory, 
  InternationalTestCompletenessStatus, 
  InternationalTestDeliveryMode,
  InternationalTestStatus,
  IInternationalTestRepository,
  IReferenceResolver
} from '@manaratak/domain';

describe('InternationalTestAdminUseCases', () => {
  let mockRepository: any;
  let useCases: InternationalTestAdminUseCases;

  beforeEach(() => {
    mockRepository = {
      list: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findPublishedBySlug: vi.fn(),
      findByDedupKey: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      upsertTest: vi.fn(),
      listVariants: vi.fn(),
      upsertVariant: vi.fn(),
      listSections: vi.fn(),
      upsertSection: vi.fn(),
      upsertScoreScale: vi.fn(),
      upsertFeeMetadata: vi.fn(),
      upsertOfficialLink: vi.fn(),
      listAvailability: vi.fn(),
      upsertAvailability: vi.fn(),
      listPreparationMaterials: vi.fn(),
      upsertPreparationMaterial: vi.fn(),
      listEvidence: vi.fn(),
      addEvidence: vi.fn(),
      listImportVersions: vi.fn()
    };

    const referenceResolver: IReferenceResolver = {
      resolveCountry: vi.fn(async ({ id }: { id?: string }) => id ? ({ id, type: 'COUNTRY', active: true }) : null),
      resolveRegion: vi.fn(),
      resolveCity: vi.fn(async ({ id }: { id?: string }) => id ? ({ id, type: 'CITY', active: true }) : null),
      resolveLanguage: vi.fn(async ({ id }: { id?: string }) => id ? ({ id, type: 'LANGUAGE', active: true }) : null),
      resolveCurrency: vi.fn(async ({ id, standardCode }: { id?: string; standardCode?: string }) => ({
        id: id ?? `currency-${standardCode}`,
        type: 'CURRENCY',
        standardCode,
        active: true
      }))
    };

    useCases = new InternationalTestAdminUseCases(
      mockRepository as IInternationalTestRepository,
      undefined,
      undefined,
      undefined,
      referenceResolver
    );
  });

  describe('createTest', () => {
    it('should block creation if domain validation contains ERROR issues', async () => {
      // Missing providerName and testCategory -> ERROR
      const invalidData = {
        canonicalName: 'IELTS Academic'
      };

      await expect(useCases.createTest(invalidData)).rejects.toThrow(/Validation failed/);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create test when data passes domain validation', async () => {
      const validData = {
        canonicalName: 'IELTS Academic',
        providerName: 'IDP',
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY
      };

      mockRepository.create.mockResolvedValue({ id: 'test-1', ...validData });

      const result = await useCases.createTest(validData);

      expect(result.id).toBe('test-1');
      expect(mockRepository.create).toHaveBeenCalledWith(validData);
    });
  });

  describe('updateTest', () => {
    it('should block update if merged data produces validation ERROR', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        providerName: 'IDP',
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY
      });

      // Updating providerName to empty string -> ERROR
      await expect(useCases.updateTest('test-1', { providerName: '' })).rejects.toThrow(/Validation failed/);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('upsertTest', () => {
    it('should block upsert if domain validation contains ERROR issues', async () => {
      const invalidData = {
        canonicalName: 'TOEFL iBT'
        // Missing providerName and testCategory
      };

      await expect(useCases.upsertTest(invalidData)).rejects.toThrow(/Validation failed/);
      expect(mockRepository.upsertTest).not.toHaveBeenCalled();
    });
  });

  describe('markReadyToPublish', () => {
    it('should block markReadyToPublish if test is incomplete', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        // Missing providerName and testCategory
        completenessStatus: InternationalTestCompletenessStatus.INCOMPLETE
      });

      await expect(useCases.markReadyToPublish('test-1')).rejects.toThrow(/INTERNATIONAL_TEST_PROVIDERNAME_INVALID/);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should update status to READY_TO_PUBLISH if test is complete and reviewable', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        localizedNameAr: 'آيلتس الأكاديمي',
        localizedNameEn: 'IELTS Academic',
        providerName: 'IDP',
        providerId: 'provider-idp',
        isSourceVerified: true,
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
        scoreScale: { overallMinimum: 0, overallMaximum: 9 },
        officialLinks: [{ linkType: 'REGISTRATION', url: 'https://ielts.org/register' }],
        completenessStatus: InternationalTestCompletenessStatus.COMPLETE
      });

      await useCases.markReadyToPublish('test-1');

      expect(mockRepository.update).toHaveBeenCalledWith('test-1', {
        status: InternationalTestStatus.READY_TO_PUBLISH,
        isPubliclyVisible: false,
      });
    });
  });

  describe('publish', () => {
    it('should block publish if test status is not READY_TO_PUBLISH', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        providerName: 'IDP',
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
        status: InternationalTestStatus.IMPORTED
      });

      await expect(useCases.publish('test-1')).rejects.toThrow(/INTERNATIONAL_TEST_INVALID_PUBLICATION_STATUS/);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should block publish if test is incomplete even if status is READY_TO_PUBLISH', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        // Missing providerName and testCategory -> validation will fail
        status: InternationalTestStatus.READY_TO_PUBLISH
      });

      await expect(useCases.publish('test-1')).rejects.toThrow(/INTERNATIONAL_TEST_PROVIDERNAME_INVALID/);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should publish successfully when status is READY_TO_PUBLISH and test is complete', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        localizedNameAr: 'آيلتس الأكاديمي',
        localizedNameEn: 'IELTS Academic',
        providerName: 'IDP',
        providerId: 'provider-idp',
        isSourceVerified: true,
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
        scoreScale: { overallMinimum: 0, overallMaximum: 9 },
        officialLinks: [{ linkType: 'REGISTRATION', url: 'https://ielts.org/register' }],
        status: InternationalTestStatus.READY_TO_PUBLISH
      });

      await useCases.publish('test-1');

      expect(mockRepository.update).toHaveBeenCalledWith('test-1', {
        status: InternationalTestStatus.PUBLISHED,
        isPubliclyVisible: true,
      });
    });
  });

  describe('archive', () => {
    it('should perform status transition to ARCHIVED', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'test-1',
        canonicalName: 'IELTS Academic',
        status: InternationalTestStatus.PUBLISHED
      });

      await useCases.archive('test-1');

      expect(mockRepository.update).toHaveBeenCalledWith('test-1', {
        status: InternationalTestStatus.ARCHIVED,
        isPubliclyVisible: false,
      });
    });
  });

  describe('child profile delegates', () => {
    const parentTest = {
      id: 'test-1',
      canonicalName: 'IELTS Academic',
      providerName: 'IDP',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.DRAFT
    };

    it('listVariants delegates to repository after verifying parent', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);
      mockRepository.listVariants.mockResolvedValue([{ id: 'v1', variantName: 'Academic Computer-based' }]);

      const result = await useCases.listVariants('test-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('test-1');
      expect(mockRepository.listVariants).toHaveBeenCalledWith('test-1');
      expect(result).toHaveLength(1);
    });

    it('upsertVariant rejects missing parent', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        useCases.upsertVariant('missing-id', {
          variantName: 'Academic Paper-based',
          deliveryMode: InternationalTestDeliveryMode.PAPER,
          isActive: true
        })
      ).rejects.toThrow(/not found/);

      expect(mockRepository.upsertVariant).not.toHaveBeenCalled();
    });

    it('upsertSection rejects missing parent', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        useCases.upsertSection('missing-id', {
          sectionName: 'Listening',
          sectionType: 'LISTENING',
          order: 1
        })
      ).rejects.toThrow(/not found/);

      expect(mockRepository.upsertSection).not.toHaveBeenCalled();
    });

    it('upsertScoreScale rejects score min > max', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);

      await expect(
        useCases.upsertScoreScale('test-1', {
          overallMinimum: 100,
          overallMaximum: 10
        })
      ).rejects.toThrow(/overallMinimum cannot be greater than overallMaximum/);

      expect(mockRepository.upsertScoreScale).not.toHaveBeenCalled();
    });

    it('upsertFeeMetadata rejects negative amount', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);

      await expect(
        useCases.upsertFeeMetadata('test-1', {
          feeType: 'REGISTRATION',
          amount: -50,
          currencyCode: 'USD',
          hasRegionalVariation: false
        })
      ).rejects.toThrow(/Fee amount cannot be negative/);

      expect(mockRepository.upsertFeeMetadata).not.toHaveBeenCalled();
    });

    it('canonicalizes currencyCode and persists the resolved Currency id without client UUID', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);
      mockRepository.upsertFeeMetadata.mockResolvedValue({});
      await useCases.upsertFeeMetadata('test-1', {
        feeType: 'REGISTRATION', amount: 200, currencyCode: 'USD', hasRegionalVariation: false,
      });
      expect(mockRepository.upsertFeeMetadata).toHaveBeenCalledWith('test-1', expect.objectContaining({
        currencyCode: 'USD', currencyReferenceId: 'currency-USD',
      }));
      expect(mockRepository.upsertFeeMetadata.mock.calls[0][1].currencyReferenceId).toBeDefined();
    });

    it('rejects a client currency id that mismatches the exact currency code', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);
      await expect(useCases.upsertFeeMetadata('test-1', {
        feeType: 'REGISTRATION', amount: 200, currencyCode: 'USD', currencyReferenceId: 'currency-EUR', hasRegionalVariation: false,
      })).rejects.toThrow('CURRENCY_REFERENCE_ID_CODE_MISMATCH');
      expect(mockRepository.upsertFeeMetadata).not.toHaveBeenCalled();
    });

    it('upsertFeeMetadata does not accept payment execution fields', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);

      await expect(
        useCases.upsertFeeMetadata('test-1', {
          feeType: 'REGISTRATION',
          amount: 200,
          currencyCode: 'USD',
          hasRegionalVariation: false,
          paymentGatewayId: 'stripe_123'
        } as any)
      ).rejects.toThrow(/Payment execution fields are not supported/);

      expect(mockRepository.upsertFeeMetadata).not.toHaveBeenCalled();
    });

    it('upsertOfficialLink rejects empty URL', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);

      await expect(
        useCases.upsertOfficialLink('test-1', {
          linkType: 'REGISTRATION',
          url: '   '
        })
      ).rejects.toThrow(/URL is required/);

      expect(mockRepository.upsertOfficialLink).not.toHaveBeenCalled();
    });

    it('upsertAvailability delegates safely and references codes/ids only', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);
      const availabilityDto = {
        id: 'avail-1',
        availableCountryIds: ['SA', 'AE'],
        availableCityIds: ['Riyadh', 'Dubai']
      };
      mockRepository.upsertAvailability.mockResolvedValue(availabilityDto);

      const result = await useCases.upsertAvailability('test-1', {
        availableCountryIds: ['SA', 'AE'],
        availableCityIds: ['Riyadh', 'Dubai']
      });

      expect(result).toEqual(availabilityDto);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('upsertPreparationMaterial supports assetId and rejects raw local file paths if present', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);

      await expect(
        useCases.upsertPreparationMaterial('test-1', {
          materialType: 'GUIDE',
          title: 'Official Prep Guide',
          url: 'file:///C:/Users/Admin/SecretGuide.pdf'
        })
      ).rejects.toThrow(/Raw local file paths are not allowed/);

      expect(mockRepository.upsertPreparationMaterial).not.toHaveBeenCalled();
    });

    it('addEvidence delegates safely and never changes status to PUBLISHED', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);
      const evidence = {
        sourceUrl: 'https://officialsite.com',
        evidenceSnippet: 'Official guide'
      };
      mockRepository.addEvidence.mockResolvedValue(evidence);

      const result = await useCases.addEvidence('test-1', evidence);

      expect(result).toEqual(evidence);
      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('all child methods do not call publish/updateStatus unless explicitly intended', async () => {
      mockRepository.findById.mockResolvedValue(parentTest);
      mockRepository.listSections.mockResolvedValue([]);
      mockRepository.listPreparationMaterials.mockResolvedValue([]);
      mockRepository.listEvidence.mockResolvedValue([]);

      await useCases.listSections('test-1');
      await useCases.listPreparationMaterials('test-1');
      await useCases.listEvidence('test-1');

      expect(mockRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('reviewSourceNames', () => {
    const parentTest = {
      id: 'test-1',
      canonicalName: 'IELTS Academic',
      localizedNameAr: null,
      localizedNameEn: null
    };

    const validVersion = {
      id: 'ver-1',
      testId: 'test-1',
      versionNumber: 1,
      sourceHash: 'a'.repeat(64),
      status: 'DRAFT'
    };

    it('successfully updates localized names when version and source hash match', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);
      mockRepository.update.mockResolvedValue({
        ...parentTest,
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS'
      });

      const result = await useCases.reviewSourceNames('test-1', {
        versionId: 'ver-1',
        sourceHash: 'a'.repeat(64),
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS',
        reviewReason: 'Verified from official candidate guide',
        evidenceReference: 'workspace/sources/ielts.md'
      });

      expect(mockRepository.update).toHaveBeenCalledWith('test-1', {
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS'
      });
      expect(result.localizedNameAr).toBe('اختبار الآيلتس');
      expect(result.localizedNameEn).toBe('IELTS');
    });

    it('rejects version belonging to another test or not found', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest });
      mockRepository.listImportVersions.mockResolvedValue([
        { ...validVersion, id: 'ver-other' }
      ]);

      await expect(useCases.reviewSourceNames('test-1', {
        versionId: 'ver-unknown',
        sourceHash: 'a'.repeat(64),
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS',
        reviewReason: 'Official update',
        evidenceReference: 'sources/ielts.md'
      })).rejects.toThrow(/does not belong to test/);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('rejects when source hash does not match version', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);

      await expect(useCases.reviewSourceNames('test-1', {
        versionId: 'ver-1',
        sourceHash: 'b'.repeat(64),
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS',
        reviewReason: 'Official update',
        evidenceReference: 'sources/ielts.md'
      })).rejects.toThrow('TEST_IMPORT_SOURCE_HASH_MISMATCH');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('rejects conflicting modification when expectedCurrent does not match', async () => {
      mockRepository.findById.mockResolvedValue({
        ...parentTest,
        localizedNameAr: 'اسم قديم'
      });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);

      await expect(useCases.reviewSourceNames('test-1', {
        versionId: 'ver-1',
        sourceHash: 'a'.repeat(64),
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS',
        reviewReason: 'Official update',
        evidenceReference: 'sources/ielts.md',
        expectedCurrentLocalizedNameAr: 'اسم مختلف'
      })).rejects.toThrow('CONFLICTING_LOCALIZED_NAME_AR_MODIFICATION');

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('is idempotent on replay when names already match requested', async () => {
      mockRepository.findById.mockResolvedValue({
        ...parentTest,
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS'
      });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);

      const result = await useCases.reviewSourceNames('test-1', {
        versionId: 'ver-1',
        sourceHash: 'a'.repeat(64),
        localizedNameAr: 'اختبار الآيلتس',
        localizedNameEn: 'IELTS',
        reviewReason: 'Replay request',
        evidenceReference: 'sources/ielts.md'
      });

      expect(result.localizedNameAr).toBe('اختبار الآيلتس');
      expect(result.localizedNameEn).toBe('IELTS');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('correctDraftCanonicalIdentity', () => {
    const parentTest = {
      id: 'test-sat',
      canonicalName: 'SAT Suite of Assessments (Scholastic Assessment Test)',
      canonicalDedupKey: 'sat suite of assessments (scholastic assessment test)|college board',
      displayName: 'SAT Suite of Assessments (Scholastic Assessment Test)',
      providerName: 'College Board',
      status: 'READY_TO_REVIEW'
    };

    const validVersion = {
      id: 'ver-sat-1',
      testId: 'test-sat',
      versionNumber: 1,
      sourceHash: 'b'.repeat(64),
      status: 'DRAFT'
    };

    it('successfully corrects draft canonical identity and updates dedup key', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);
      mockRepository.findByDedupKey.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue({
        ...parentTest,
        canonicalName: 'SAT',
        displayName: 'SAT',
        canonicalDedupKey: 'sat|college board'
      });

      const result = await useCases.correctDraftCanonicalIdentity('test-sat', {
        versionId: 'ver-sat-1',
        sourceHash: 'b'.repeat(64),
        expectedCurrentCanonicalName: 'SAT Suite of Assessments (Scholastic Assessment Test)',
        newCanonicalName: 'SAT',
        correctionReason: 'Official SAT source correction',
        evidenceReference: 'sources/sat.md'
      });

      expect(mockRepository.update).toHaveBeenCalledWith('test-sat', {
        canonicalName: 'SAT',
        displayName: 'SAT',
        canonicalDedupKey: 'sat|college board'
      });
      expect(result.canonicalName).toBe('SAT');
    });

    it('rejects correction if test is published', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest, status: 'PUBLISHED' });

      await expect(useCases.correctDraftCanonicalIdentity('test-sat', {
        versionId: 'ver-sat-1',
        sourceHash: 'b'.repeat(64),
        newCanonicalName: 'SAT',
        correctionReason: 'Official update',
        evidenceReference: 'sources/sat.md'
      })).rejects.toThrow('CANNOT_CORRECT_PUBLISHED_INTERNATIONAL_TEST_IDENTITY');
    });

    it('rejects if expected current canonical name does not match', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);

      await expect(useCases.correctDraftCanonicalIdentity('test-sat', {
        versionId: 'ver-sat-1',
        sourceHash: 'b'.repeat(64),
        expectedCurrentCanonicalName: 'Different Name',
        newCanonicalName: 'SAT',
        correctionReason: 'Official update',
        evidenceReference: 'sources/sat.md'
      })).rejects.toThrow('CONFLICTING_CANONICAL_NAME_MODIFICATION');
    });

    it('rejects if identity collision occurs with another test', async () => {
      mockRepository.findById.mockResolvedValue({ ...parentTest });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);
      mockRepository.findByDedupKey.mockResolvedValue({ id: 'another-test-id' });

      await expect(useCases.correctDraftCanonicalIdentity('test-sat', {
        versionId: 'ver-sat-1',
        sourceHash: 'b'.repeat(64),
        newCanonicalName: 'SAT',
        correctionReason: 'Official update',
        evidenceReference: 'sources/sat.md'
      })).rejects.toThrow('INTERNATIONAL_TEST_CANONICAL_IDENTITY_COLLISION');
    });

    it('is idempotent on replay when canonical name and dedup key already match', async () => {
      mockRepository.findById.mockResolvedValue({
        ...parentTest,
        canonicalName: 'SAT',
        displayName: 'SAT',
        canonicalDedupKey: 'sat|college board'
      });
      mockRepository.listImportVersions.mockResolvedValue([validVersion]);
      mockRepository.findByDedupKey.mockResolvedValue({ id: 'test-sat' });

      const result = await useCases.correctDraftCanonicalIdentity('test-sat', {
        versionId: 'ver-sat-1',
        sourceHash: 'b'.repeat(64),
        newCanonicalName: 'SAT',
        correctionReason: 'Replay request',
        evidenceReference: 'sources/sat.md'
      });

      expect(result.canonicalName).toBe('SAT');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
