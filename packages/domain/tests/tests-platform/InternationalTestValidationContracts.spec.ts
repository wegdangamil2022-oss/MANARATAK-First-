import { describe, it, expect } from 'vitest';
import { 
  InternationalTestValidationService,
  InternationalTestCategory,
  InternationalTestStatus,
  InternationalTestCompletenessStatus,
  InternationalTestValidationSeverity,
  InternationalTestSourceTrustLevel
} from '../../src/tests-platform';

describe('InternationalTestValidationContracts', () => {
  it('should report missing required fields when canonicalName, providerName, or category are absent', () => {
    const report = InternationalTestValidationService.validate({});

    expect(report.entityType).toBe('INTERNATIONAL_TEST');
    expect(report.isComplete).toBe(false);
    expect(report.canBeReviewed).toBe(false);
    expect(report.canBePublished).toBe(false);
    expect(report.status).toBe(InternationalTestCompletenessStatus.INCOMPLETE);
    expect(report.missingFields).toContain('canonicalName');
    expect(report.missingFields).toContain('providerName');
    expect(report.missingFields).toContain('testCategory');
    expect(report.issues.length).toBeGreaterThanOrEqual(3);
  });

  it('should block invalid score ranges where min > max', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'GRE General',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.GRAD_ADMISSION,
      scoreScale: {
        overallMinimum: 340,
        overallMaximum: 260
      }
    });

    expect(report.isComplete).toBe(false);
    expect(report.canBeReviewed).toBe(false);
    const scoreError = report.issues.find(i => i.field === 'scoreScale.overallMinimum');
    expect(scoreError).toBeDefined();
    expect(scoreError?.severity).toBe(InternationalTestValidationSeverity.ERROR);
    expect(scoreError?.message).toContain('minimum cannot exceed maximum');
  });

  it('should block invalid fee metadata with negative amount or missing currencyCode', () => {
    const reportNegativeFee = InternationalTestValidationService.validate({
      canonicalName: 'SAT',
      providerName: 'College Board',
      testCategory: InternationalTestCategory.UNDERGRAD_ADMISSION,
      fees: [{ amount: -50, currencyCode: 'USD', feeType: 'REGISTRATION', hasRegionalVariation: false }]
    });

    expect(reportNegativeFee.isComplete).toBe(false);
    expect(reportNegativeFee.issues.some(i => i.field.includes('amount'))).toBe(true);

    const reportMissingCurrency = InternationalTestValidationService.validate({
      canonicalName: 'SAT',
      providerName: 'College Board',
      testCategory: InternationalTestCategory.UNDERGRAD_ADMISSION,
      fees: [{ amount: 100, currencyCode: '', feeType: 'REGISTRATION', hasRegionalVariation: false }]
    });

    expect(reportMissingCurrency.isComplete).toBe(false);
    expect(reportMissingCurrency.issues.some(i => i.field.includes('currencyCode'))).toBe(true);
  });

  it('should NEVER mark canBePublished as true from source confidence alone', () => {
    const reportWithHighTrust = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.IMPORTED,
      scoreScale: { overallMinimum: 0, overallMaximum: 120 },
      officialLinks: [{ linkType: 'REGISTRATION', url: 'https://www.ets.org/toefl/register' }],
      importEvidence: {
        sourceTrustLevel: InternationalTestSourceTrustLevel.AUTHORITATIVE
      }
    });

    expect(reportWithHighTrust.isComplete).toBe(true);
    expect(reportWithHighTrust.canBeReviewed).toBe(true);
    expect(reportWithHighTrust.canBePublished).toBe(false); // Explicit status required!

    const reportWithReadyStatus = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.READY_TO_PUBLISH,
      scoreScale: { overallMinimum: 0, overallMaximum: 120 },
      officialLinks: [{ linkType: 'REGISTRATION', url: 'https://www.ets.org/toefl/register' }],
      importEvidence: {
        sourceTrustLevel: InternationalTestSourceTrustLevel.AUTHORITATIVE
      }
    });

    expect(reportWithReadyStatus.canBePublished).toBe(true);
  });


  it('should emit NEEDS_REVIEW when canonical identity is valid but publication-mandatory profile fields are missing', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'Basic Test',
      providerName: 'Basic Provider',
      testCategory: InternationalTestCategory.ACADEMIC_PLACEMENT
    });

    expect(report.isComplete).toBe(false);
    expect(report.canBeReviewed).toBe(true);
    expect(report.status).toBe(InternationalTestCompletenessStatus.NEEDS_REVIEW);
    expect(report.missingFields).toEqual(expect.arrayContaining(['scoreScale', 'officialRegistrationUrl']));
  });

  it('should ensure validation contracts contain no Phase 10 major or Phase 19 payment execution fields', () => {
    const report = InternationalTestValidationService.validate({
      canonicalName: 'TOEFL iBT',
      providerName: 'ETS',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY
    });

    expect((report as any).majorId).toBeUndefined();
    expect((report as any).paymentGatewayId).toBeUndefined();
    expect((report as any).transactionId).toBeUndefined();
  });
});
