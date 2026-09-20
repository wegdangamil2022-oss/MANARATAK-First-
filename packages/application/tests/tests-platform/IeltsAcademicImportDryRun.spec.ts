import { describe, it, expect, vi } from 'vitest';
import { 
  InternationalTestImportPayloadSchema,
  InternationalTestValidationService,
  InternationalTestCategory,
  InternationalTestCompletenessStatus,
  InternationalTestValidationSeverity,
  InternationalTestStatus,
  IInternationalTestRepository,
  IReferenceResolver
} from '@manaratak/domain';
import { 
  InternationalTestImportPromotionUseCase 
} from '@manaratak/application';

export const ieltsAcademicDryRunPayload = {
  testName: 'IELTS Academic',
  canonicalName: 'IELTS Academic',
  displayName: 'IELTS Academic Test',
  abbreviation: 'IELTS-AC',
  providerName: 'British Council / IDP / Cambridge Assessment English',
  testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
  localizedNameAr: 'اختبار الآيلتس الأكاديمي',
  localizedNameEn: 'IELTS Academic Test',
  description: 'The International English Language Testing System (IELTS) Academic test measures English language proficiency required for higher education academic environments.',
  overview: 'Evaluates four core English language competencies: Listening, Reading, Writing, and Speaking for academic contexts.',
  
  useCases: [
    'Higher Education University Admissions',
    'Professional Registration (Medical, Nursing, Legal)',
    'Government Visa and Immigration Requirements'
  ],
  targetAudience: [
    'Undergraduate Degree Applicants',
    'Postgraduate & Master Applicants',
    'Medical & Healthcare Professionals'
  ],
  commonlyUsedCountriesOrRegions: ['United Kingdom', 'Australia', 'Canada', 'United States', 'New Zealand'],
  relatedLanguages: ['English'],

  variants: [
    {
      variantName: 'IELTS Academic Computer-Delivered',
      deliveryMode: 'ONLINE',
      isActive: true,
      specificOfficialUrl: 'https://takeielts.britishcouncil.org/take-ielts/computer-delivered',
      administrativeNotes: 'Results delivered within 3-5 calendar days.'
    },
    {
      variantName: 'IELTS Academic Paper-Based',
      deliveryMode: 'IN_PERSON',
      isActive: true,
      administrativeNotes: 'Results delivered within 13 calendar days.'
    },
    {
      variantName: 'IELTS Online',
      deliveryMode: 'HYBRID',
      isActive: true,
      administrativeNotes: 'Proctored online version accepted by select universities.'
    }
  ],

  sections: [
    {
      sectionName: 'Listening',
      sectionType: 'LISTENING',
      durationMinutes: 30,
      order: 1,
      questionTypes: ['Multiple Choice', 'Matching', 'Plan/Map/Diagram Labelling', 'Form/Note Completion'],
      scoreMinimum: 0,
      scoreMaximum: 9
    },
    {
      sectionName: 'Reading',
      sectionType: 'READING',
      durationMinutes: 60,
      order: 2,
      questionTypes: ['True/False/Not Given', 'Matching Headings', 'Sentence Completion'],
      scoreMinimum: 0,
      scoreMaximum: 9
    },
    {
      sectionName: 'Writing',
      sectionType: 'WRITING',
      durationMinutes: 60,
      order: 3,
      questionTypes: ['Task 1 Graph/Chart Analysis', 'Task 2 Discursive Essay'],
      scoreMinimum: 0,
      scoreMaximum: 9
    },
    {
      sectionName: 'Speaking',
      sectionType: 'SPEAKING',
      durationMinutes: 14,
      order: 4,
      questionTypes: ['Part 1 Introduction', 'Part 2 Individual Long Turn', 'Part 3 Two-way Discussion'],
      scoreMinimum: 0,
      scoreMaximum: 9
    }
  ],

  scoreScale: {
    overallMinimum: 0,
    overallMaximum: 9,
    scoreIncrement: 0.5,
    bandsOrLevels: ['9.0 Expert', '8.5 Very Good', '8.0 Very Good', '7.5 Good', '7.0 Good', '6.5 Competent', '6.0 Competent'],
    passFailRules: 'No single pass/fail threshold; score requirements set individually by recipient institutions.',
    cefrEquivalency: 'CEFR B1 to C2 mapping available.',
    resultValidityDurationMonths: 24,
    resultDeliveryTimeDays: 13,
    scoreReportingUrl: 'https://takeielts.britishcouncil.org/results'
  },

  fees: [
    {
      feeType: 'REGISTRATION',
      amount: 220,
      currencyCode: 'USD',
      hasRegionalVariation: true,
      validityWindowNotes: 'Standard global baseline fee; varies locally per test center currency.'
    },
    {
      feeType: 'RESCHEDULING',
      amount: 45,
      currencyCode: 'USD',
      hasRegionalVariation: true,
      validityWindowNotes: 'Applicable if requested at least 5 weeks before test date.'
    }
  ],

  registrationRequirements: 'Valid government-issued Passport or National ID card required during online registration.',
  identificationRequirements: 'Original physical identification document matching registration details must be presented at test center.',
  ageRules: 'Not recommended for persons under 16 years of age.',
  retakePolicy: 'Candidates may retake the test at any time with no mandatory waiting period limits.',
  cancellationReschedulingNotes: 'Full refund available minus administrative fee if cancelled more than 5 weeks prior.',
  accessibilityNotes: 'Special accommodations available upon request at least 6 weeks in advance.',
  testDayRequirements: 'Arrive 45 minutes prior; only transparent water bottles and approved ID allowed in examination room.',

  availability: {
    availableCountryIds: ['GB', 'US', 'CA', 'AU', 'SA', 'AE', 'EG', 'JO'],
    onlineAvailabilityRegions: ['Global'],
    testingWindowsNotes: 'Tests offered up to 4 days per week in major cities worldwide.'
  },

  officialLinks: [
    {
      linkType: 'REGISTRATION',
      url: 'https://takeielts.britishcouncil.org',
      description: 'Official British Council IELTS Registration Portal',
      sourceTrustLevel: 'AUTHORITATIVE'
    },
    {
      linkType: 'INFORMATION',
      url: 'https://www.ielts.org',
      description: 'Global Official IELTS Website',
      sourceTrustLevel: 'AUTHORITATIVE'
    }
  ],

  preparationMaterials: [
    {
      materialType: 'PRACTICE_TEST',
      title: 'Free Official IELTS Practice Tests',
      url: 'https://takeielts.britishcouncil.org/prepare/free-ielts-practice-tests',
      assetId: 'asset-ielts-prep-01',
      description: 'Free sample listening, reading, and writing tasks.'
    }
  ],

  importEvidence: {
    originalImportedName: 'IELTS Academic Test 2026',
    normalizedCanonicalName: 'ielts academic',
    deterministicKey: 'ielts academic|british council / idp / cambridge assessment english',
    sourceId: 'record-ielts-dryrun-001',
    sourceUrl: 'https://www.ielts.org',
    contentHash: 'a1b2c3d4e5f67890123456789abcdef0',
    retrievedAt: '2026-07-31T12:00:00.000Z',
    evidenceSnippet: 'Official IELTS Academic specification sheet retrieved from ielts.org.',
    confidenceScore: 0.98,
    sourceTrustLevel: 'AUTHORITATIVE',
    duplicateStatus: 'NEW'
  },

  missingFields: [],
  readinessWarnings: [
    'Regional pricing varies by local test center location and currency exchange rates.',
    'IELTS Online acceptance depends on institutional admission policies.'
  ]
};

describe('Phase 09 P9J-3D: IELTS Academic Import Dry-Run Readiness', () => {
  it('validates IELTS Academic payload through Schema and Validation Service without ERROR issues', () => {
    // 1. Schema check
    const parsed = InternationalTestImportPayloadSchema.parse(ieltsAcademicDryRunPayload);
    expect(parsed.testName).toBe('IELTS Academic');
    expect(parsed.variants).toHaveLength(3);
    expect(parsed.sections).toHaveLength(4);

    // 2. Validation check
    const report = InternationalTestValidationService.validate(parsed);
    expect(report.isComplete).toBe(true);
    expect(report.canBeReviewed).toBe(true);

    const errors = report.issues.filter(i => i.severity === InternationalTestValidationSeverity.ERROR);
    expect(errors).toHaveLength(0);

    // Confirm payload readinessWarnings exist as advisory information
    expect(parsed.readinessWarnings).toHaveLength(2);
  });

  it('executes promotion mapping dry-run and verifies non-publishing and child propagation behavior', async () => {
    const upsertVariant = vi.fn().mockResolvedValue({});
    const upsertSection = vi.fn().mockResolvedValue({});
    const upsertScoreScale = vi.fn().mockResolvedValue({});
    const upsertFeeMetadata = vi.fn().mockResolvedValue({});
    const upsertOfficialLink = vi.fn().mockResolvedValue({});
    const upsertAvailability = vi.fn().mockResolvedValue({});
    const upsertPreparationMaterial = vi.fn().mockResolvedValue({});
    const addEvidence = vi.fn().mockResolvedValue({});

    const mockRepo: IInternationalTestRepository = {
      findByDedupKey: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-ielts-promoted-id' }),
      upsertVariant,
      upsertSection,
      upsertScoreScale,
      upsertFeeMetadata,
      upsertOfficialLink,
      upsertAvailability,
      upsertPreparationMaterial,
      addEvidence,
    } as unknown as IInternationalTestRepository;

    const referenceResolver: IReferenceResolver = {
      resolveCountry: vi.fn(async ({ id }) => ({ id: id!, standardCode: id!, type: 'COUNTRY', active: true })),
      resolveRegion: vi.fn().mockResolvedValue(null),
      resolveCity: vi.fn(async ({ id }) => ({ id: id!, type: 'CITY', active: true })),
      resolveLanguage: vi.fn(async ({ standardCode, alias }) => ({
        id: `language-${standardCode || alias}`,
        standardCode: standardCode === 'English' ? 'en' : (standardCode || 'en'),
        type: 'LANGUAGE',
        active: true,
      })),
      resolveCurrency: vi.fn(async ({ standardCode }) => ({ id: standardCode!, standardCode, type: 'CURRENCY', active: true })),
    };
    const promotionUseCase = new InternationalTestImportPromotionUseCase(mockRepo, undefined, referenceResolver);

    const mockImportRecord = {
      id: 'record-ielts-dryrun-001',
      batchId: 'batch-ielts-001',
      status: 'VALID' as any,
      rawPayload: ieltsAcademicDryRunPayload,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const promotionResult = await promotionUseCase.promote(mockImportRecord);

    expect(promotionResult).toEqual({ type: 'CREATED', testId: 'test-ielts-promoted-id' });

    // Verify root test entity status
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'IELTS Academic Test',
        providerName: 'British Council / IDP / Cambridge Assessment English',
        testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
        status: InternationalTestStatus.IMPORTED,
        completenessStatus: InternationalTestCompletenessStatus.COMPLETE,
        sourceImportRecordId: 'record-ielts-dryrun-001'
      })
    );

    // Verify child entity propagations
    expect(upsertVariant).toHaveBeenCalledTimes(3);
    expect(upsertSection).toHaveBeenCalledTimes(4);
    expect(upsertScoreScale).toHaveBeenCalledTimes(1);
    expect(upsertFeeMetadata).toHaveBeenCalledTimes(2);
    expect(upsertOfficialLink).toHaveBeenCalledWith('test-ielts-promoted-id', expect.objectContaining({ url: 'https://takeielts.britishcouncil.org' }));
    expect(upsertAvailability).toHaveBeenCalledWith('test-ielts-promoted-id', expect.objectContaining({ availableCountryIds: ['GB', 'US', 'CA', 'AU', 'SA', 'AE', 'EG', 'JO'] }));
    expect(upsertPreparationMaterial).toHaveBeenCalledWith('test-ielts-promoted-id', expect.objectContaining({ assetId: 'asset-ielts-prep-01' }));
    expect(addEvidence).toHaveBeenCalledWith('test-ielts-promoted-id', expect.objectContaining({ sourceTrustLevel: 'AUTHORITATIVE' }));
  });
});
