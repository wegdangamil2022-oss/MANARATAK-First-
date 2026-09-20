import { describe, it, expect } from 'vitest';
import { 
  InternationalTestImportPayloadSchema,
  InternationalTestValidationService,
  InternationalTestCategory,
  InternationalTestStatus,
  InternationalTestCompletenessStatus,
  InternationalTestValidationSeverity,
  InternationalTestSourceTrustLevel
} from '../../src/tests-platform';

describe('InternationalTestUnifiedProfileValidation (P9J-3B)', () => {
  it('should parse simple legacy import payload successfully', () => {
    const legacyPayload = {
      testName: 'IELTS Academic',
      testCode: 'IELTS-AC',
      providerName: 'IDP / British Council',
      testCategory: 'LANGUAGE_PROFICIENCY'
    };

    const parsed = InternationalTestImportPayloadSchema.parse(legacyPayload);
    expect(parsed.testName).toBe('IELTS Academic');
    expect(parsed.providerName).toBe('IDP / British Council');
  });

  it('should parse rich IELTS Academic Unified Profile import payload successfully', () => {
    const richIeltsPayload = {
      testName: 'IELTS Academic',
      canonicalName: 'IELTS Academic',
      abbreviation: 'IELTS',
      providerName: 'IDP / British Council / Cambridge',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      localizedNameAr: 'اختبار الآيلتس الأكاديمي',
      description: 'International English Language Testing System for higher education and professional registration.',
      overview: 'Comprehensive 4-skills English assessment.',
      useCases: ['University Admission', 'Professional Registration', 'Visa / Immigration'],
      targetAudience: ['Undergraduate students', 'Postgraduate students', 'Medical professionals'],
      commonlyUsedCountriesOrRegions: ['UK', 'Australia', 'Canada', 'USA'],
      relatedLanguages: ['English'],

      variants: [
        {
          variantName: 'IELTS Academic Computer-Delivered',
          deliveryMode: 'ONLINE',
          isActive: true,
          specificOfficialUrl: 'https://takeielts.britishcouncil.org/take-ielts/computer-delivered',
          administrativeNotes: 'Results available in 3-5 days'
        },
        {
          variantName: 'IELTS Academic Paper-Based',
          deliveryMode: 'IN_PERSON',
          isActive: true,
          administrativeNotes: 'Results available in 13 days'
        }
      ],

      sections: [
        { sectionName: 'Listening', durationMinutes: 30, questionCount: 40, scoreMinimum: 0, scoreMaximum: 9 },
        { sectionName: 'Reading', durationMinutes: 60, questionCount: 40, scoreMinimum: 0, scoreMaximum: 9 },
        { sectionName: 'Writing', durationMinutes: 60, questionCount: 2, scoreMinimum: 0, scoreMaximum: 9 },
        { sectionName: 'Speaking', durationMinutes: 14, questionCount: 3, scoreMinimum: 0, scoreMaximum: 9 }
      ],

      scoreScale: {
        overallMinimum: 0,
        overallMaximum: 9,
        scoreIncrement: 0.5,
        bandsOrLevels: ['Band 9.0 - Expert', 'Band 8.0 - Very Good', 'Band 7.0 - Good', 'Band 6.0 - Competent'],
        cefrEquivalency: 'B1 to C2',
        resultValidityDurationMonths: 24,
        resultDeliveryTimeDays: 13,
        resultDeliveryMethod: 'Online Portal & Official TRF'
      },

      fees: [
        { feeType: 'REGISTRATION', amount: 215, currencyCode: 'USD', hasRegionalVariation: true }
      ],

      registrationRequirements: 'Valid Passport or National ID required during registration and test day.',
      identificationRequirements: 'Original valid passport or national identity document.',
      ageRules: 'Recommended for candidates 16 years and above.',
      retakePolicy: 'No limit on retakes, candidates can book any available test date.',

      availability: {
        availableCountryIds: ['GB', 'US', 'SA', 'AE', 'EG'],
        testCenters: [
          { centerName: 'Riyadh Main Test Center', countryIso2Code: 'SA', cityName: 'Riyadh' }
        ],
        onlineAvailabilityRegions: ['Global']
      },

      officialLinks: [
        { linkType: 'REGISTRATION', url: 'https://takeielts.britishcouncil.org', sourceTrustLevel: 'OFFICIAL_PROVIDER' }
      ],

      preparationMaterials: [
        { materialType: 'GUIDE', title: 'IELTS Official Candidate Guide', url: 'https://takeielts.britishcouncil.org/prepare', assetId: 'asset-ielts-guide-01' }
      ],

      importEvidence: {
        confidenceScore: 0.98,
        sourceTrustLevel: 'OFFICIAL_PROVIDER',
        sourceUrl: 'https://www.ielts.org'
      }
    };

    const parsed = InternationalTestImportPayloadSchema.parse(richIeltsPayload);
    expect(parsed.testName).toBe('IELTS Academic');
    expect(parsed.variants?.length).toBe(2);
    expect(parsed.sections?.length).toBe(4);
    expect(parsed.scoreScale?.overallMaximum).toBe(9);
    expect(parsed.fees?.[0].amount).toBe(215);

    const report = InternationalTestValidationService.validate(parsed);
    expect(report.isComplete).toBe(true);
    expect(report.canBeReviewed).toBe(true);
    expect(report.issues.filter(i => i.severity === InternationalTestValidationSeverity.ERROR)).toHaveLength(0);
  });

  it('should block section score range where section scoreMinimum > section scoreMaximum', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'IELTS Academic',
      providerName: 'IDP',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      sections: [
        { sectionName: 'Listening', scoreMinimum: 10, scoreMaximum: 5 }
      ]
    });

    expect(report.isComplete).toBe(false);
    const sectionError = report.issues.find(i => i.field === 'sections[0].scoreMinimum');
    expect(sectionError).toBeDefined();
    expect(sectionError?.message).toContain('Section score minimum cannot exceed maximum');
  });

  it('should block invalid HTTP/HTTPS URLs in officialLinks and preparationMaterials', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      officialLinks: [
        { url: 'not-a-valid-url' }
      ],
      preparationMaterials: [
        { url: 'ftp://invalid-protocol.com' }
      ]
    });

    expect(report.isComplete).toBe(false);
    expect(report.issues.some(i => i.field === 'officialLinks[0].url')).toBe(true);
    expect(report.issues.some(i => i.field === 'preparationMaterials[0].url')).toBe(true);
  });

  it('should block raw local file paths in preparationMaterials assetId', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      preparationMaterials: [
        { assetId: '/tmp/uploads/brochure.pdf' }
      ]
    });

    expect(report.isComplete).toBe(false);
    const assetError = report.issues.find(i => i.field === 'preparationMaterials[0].assetId');
    expect(assetError).toBeDefined();
    expect(assetError?.message).toContain('Phase 05 AssetId handle, not a raw local file path');
  });

  it('should strictly forbid payment execution fields in Phase 09', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      paymentGatewayId: 'stripe-123',
      chargeToken: 'tok_abc'
    });

    expect(report.isComplete).toBe(false);
    expect(report.issues.some(i => i.field === 'paymentGatewayId')).toBe(true);
    expect(report.issues.some(i => i.field === 'chargeToken')).toBe(true);
  });

  it('should strictly forbid auto-publish / auto-merge flags', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      autoPublish: true,
      bypassReview: 'true'
    });

    expect(report.isComplete).toBe(false);
    expect(report.issues.some(i => i.field === 'autoPublish')).toBe(true);
    expect(report.issues.some(i => i.field === 'bypassReview')).toBe(true);
  });

  it('should reject embedded objects in availability Phase 07 country references', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      availability: {
        availableCountryIds: [{ id: 'US', name: 'United States' }] as any,
        testCenters: [
          { centerName: 'Center 1', countryIso2Code: { code: 'US' } as any }
        ]
      }
    });

    expect(report.isComplete).toBe(false);
    expect(report.issues.some(i => i.field.includes('availableCountryIds'))).toBe(true);
    expect(report.issues.some(i => i.field.includes('countryIso2Code'))).toBe(true);
  });

  it('should classify a reviewable profile missing publication-mandatory fields as NEEDS_REVIEW', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'Basic Test',
      providerName: 'Basic Provider',
      testCategory: InternationalTestCategory.ACADEMIC_PLACEMENT
    });

    expect(report.isComplete).toBe(false);
    expect(report.canBeReviewed).toBe(true);
    expect(report.status).toBe(InternationalTestCompletenessStatus.NEEDS_REVIEW);
    expect(report.issues.some(i => i.severity === InternationalTestValidationSeverity.WARNING)).toBe(true);
  });
});
