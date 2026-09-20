import { 
  InternationalTestCompletenessStatus, 
  InternationalTestCategory, 
  InternationalTestStatus, 
  InternationalTestValidationSeverity 
} from './enums';
import { InternationalTestDeterministicKey } from './key';

export interface InternationalTestValidationIssue {
  field: string;
  message: string;
  severity: InternationalTestValidationSeverity;
}

export interface InternationalTestCompletenessReport {
  entityType: 'INTERNATIONAL_TEST';
  deterministicKey?: string;
  requiredFields: string[];
  presentFields: string[];
  missingFields: string[];
  issues: InternationalTestValidationIssue[];
  warnings: InternationalTestValidationIssue[];
  missingMandatoryFields: string[];
  incompleteOptionalFields: string[];
  isComplete: boolean;
  canBeReviewed: boolean;
  canBePublished: boolean;
  status: InternationalTestCompletenessStatus;
}

export interface RawTestInput {
  canonicalName?: string;
  displayName?: string;
  testName?: string;
  providerName?: string;
  testCategory?: string;
  category?: string;
  officialSourceUrl?: string;
  scoreScale?: {
    overallMinimum?: number;
    scoreMinimum?: number;
    overallMaximum?: number;
    scoreMaximum?: number;
  };
  sections?: Array<{ scoreMinimum?: number; scoreMaximum?: number }>;
  fees?: Array<{ amount?: number; currencyCode?: string }> | { amount?: number; currencyCode?: string };
  officialLinks?: Array<{ linkType?: string; url?: string }>;
  preparationMaterials?: Array<{ url?: string; assetId?: string }>;
  availability?: {
    availableCountryIds?: unknown[];
    testCenters?: Array<{ countryIso2Code?: unknown }>;
  };
  deterministicKey?: string;
  importEvidence?: { deterministicKey?: string };
  status?: string;
  [key: string]: unknown;
}

export interface IInternationalTestValidationService {
  validate(input: unknown): InternationalTestCompletenessReport;
}

export class InternationalTestValidationService implements IInternationalTestValidationService {
  public validate(input: unknown): InternationalTestCompletenessReport {
    return InternationalTestValidationService.validate(input);
  }

  public static validate(input: unknown): InternationalTestCompletenessReport {
    const payload = (input && typeof input === 'object' ? input : {}) as RawTestInput;
    // Required fields check
    const requiredFields = ['canonicalName', 'providerName', 'testCategory', 'scoreScale', 'officialRegistrationUrl'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];
    const issues: InternationalTestValidationIssue[] = [];

    // Prohibited payment execution fields check
    const paymentExecutionKeys = ['paymentGatewayId', 'chargeToken', 'paymentStatus', 'executePayment', 'transactionId', 'cartId', 'checkoutUrl'];
    for (const key of paymentExecutionKeys) {
      if (payload[key] !== undefined && payload[key] !== null) {
        issues.push({
          field: key,
          message: `Payment execution field '${key}' is strictly forbidden in Phase 09. Payments belong strictly to Phase 19.`,
          severity: InternationalTestValidationSeverity.ERROR
        });
      }
    }

    // Prohibited auto-publish / auto-merge flags check
    const autoPublishKeys = ['autoPublish', 'publishImmediately', 'autoMerge', 'bypassReview'];
    for (const key of autoPublishKeys) {
      const val = payload[key];
      if (val === true || (typeof val === 'string' && val.toLowerCase() === 'true')) {
        issues.push({
          field: key,
          message: `Auto-publish/auto-merge flag '${key}' is strictly forbidden. Publishing requires explicit administrative review.`,
          severity: InternationalTestValidationSeverity.ERROR
        });
      }
    }

    const nameVal = payload.canonicalName || payload.displayName || payload.testName;
    if (nameVal && typeof nameVal === 'string' && nameVal.trim() !== '') {
      presentFields.push('canonicalName');
    } else {
      missingFields.push('canonicalName');
      issues.push({
        field: 'canonicalName',
        message: 'Test name / canonical name is required',
        severity: InternationalTestValidationSeverity.ERROR
      });
    }

    const providerVal = payload.providerName;
    if (providerVal && typeof providerVal === 'string' && providerVal.trim() !== '') {
      presentFields.push('providerName');
    } else {
      missingFields.push('providerName');
      issues.push({
        field: 'providerName',
        message: 'Provider name is required',
        severity: InternationalTestValidationSeverity.ERROR
      });
    }

    const categoryVal = payload.testCategory || payload.category;
    if (categoryVal && typeof categoryVal === 'string' && categoryVal.trim() !== '') {
      const validCategories = Object.values(InternationalTestCategory);
      if (validCategories.includes(categoryVal as InternationalTestCategory)) {
        presentFields.push('testCategory');
      } else {
        missingFields.push('testCategory');
        issues.push({
          field: 'testCategory',
          message: `Invalid test category: ${categoryVal}`,
          severity: InternationalTestValidationSeverity.ERROR
        });
      }
    } else {
      missingFields.push('testCategory');
      issues.push({
        field: 'testCategory',
        message: 'Test category is required',
        severity: InternationalTestValidationSeverity.ERROR
      });
    }

    // Canonical publication profile requires a normalized score scale with explicit bounds.
    const scale = payload.scoreScale;
    if (scale && typeof scale === 'object') {
      const min = scale.overallMinimum !== undefined ? scale.overallMinimum : scale.scoreMinimum;
      const max = scale.overallMaximum !== undefined ? scale.overallMaximum : scale.scoreMaximum;
      if (min === undefined || max === undefined || !Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) {
        missingFields.push('scoreScale');
        issues.push({
          field: 'scoreScale',
          message: 'A normalized score scale with explicit minimum and maximum is required for a complete test profile',
          severity: InternationalTestValidationSeverity.WARNING
        });
      } else if (Number(min) > Number(max)) {
        missingFields.push('scoreScale');
        issues.push({
          field: 'scoreScale.overallMinimum',
          message: 'Score scale minimum cannot exceed maximum',
          severity: InternationalTestValidationSeverity.ERROR
        });
      } else {
        presentFields.push('scoreScale');
      }
    } else {
      missingFields.push('scoreScale');
      issues.push({
        field: 'scoreScale',
        message: 'A normalized score scale is required for a complete test profile',
        severity: InternationalTestValidationSeverity.WARNING
      });
    }

    // Section score range sanity check
    if (Array.isArray(payload.sections)) {
      for (let i = 0; i < payload.sections.length; i++) {
        const sec = payload.sections[i];
        if (sec && sec.scoreMinimum !== undefined && sec.scoreMaximum !== undefined && Number(sec.scoreMinimum) > Number(sec.scoreMaximum)) {
          issues.push({
            field: `sections[${i}].scoreMinimum`,
            message: 'Section score minimum cannot exceed maximum',
            severity: InternationalTestValidationSeverity.ERROR
          });
        }
      }
    }

    // Fee metadata sanity check
    const fees = Array.isArray(payload.fees) ? payload.fees : (payload.fees ? [payload.fees] : []);
    for (let i = 0; i < fees.length; i++) {
      const fee = fees[i];
      const fieldPrefix = fees.length > 1 ? `fees[${i}]` : 'fees';
      if (fee) {
        if (fee.amount !== undefined && fee.amount !== null && Number(fee.amount) < 0) {
          issues.push({
            field: `${fieldPrefix}.amount`,
            message: 'Fee amount must be non-negative',
            severity: InternationalTestValidationSeverity.ERROR
          });
        }
        if (
          (fee.amount !== undefined && fee.amount !== null) && 
          (!fee.currencyCode || typeof fee.currencyCode !== 'string' || fee.currencyCode.trim() === '')
        ) {
          issues.push({
            field: `${fieldPrefix}.currencyCode`,
            message: 'Currency code is required when fee amount is specified',
            severity: InternationalTestValidationSeverity.ERROR
          });
        }
      }
    }

    function isValidUrl(urlStr?: string): boolean {
      if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') return false;
      try {
        const parsed = new URL(urlStr);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }

    // Official links / URL shape check. Only a normalized REGISTRATION link is publication evidence.
    let hasOfficialRegistrationLink = false;
    if (Array.isArray(payload.officialLinks) && payload.officialLinks.length > 0) {
      for (let i = 0; i < payload.officialLinks.length; i++) {
        const link = payload.officialLinks[i];
        if (link && link.url !== undefined && !isValidUrl(link.url)) {
          issues.push({
            field: `officialLinks[${i}].url`,
            message: 'Official link URL must be a valid http/https URL',
            severity: InternationalTestValidationSeverity.ERROR
          });
        }
        if (link?.linkType === 'REGISTRATION' && isValidUrl(link.url)) {
          hasOfficialRegistrationLink = true;
        }
      }
    }
    if (hasOfficialRegistrationLink) {
      presentFields.push('officialRegistrationUrl');
    } else {
      missingFields.push('officialRegistrationUrl');
      issues.push({
        field: 'officialLinks',
        message: 'A normalized official REGISTRATION link is required for a complete test profile',
        severity: InternationalTestValidationSeverity.WARNING
      });
    }

    if (payload.officialSourceUrl !== undefined && !isValidUrl(payload.officialSourceUrl)) {
      issues.push({
        field: 'officialSourceUrl',
        message: 'Official source URL must be a non-empty string',
        severity: InternationalTestValidationSeverity.ERROR
      });
    }

    // Preparation materials assetId check
    if (Array.isArray(payload.preparationMaterials)) {
      for (let i = 0; i < payload.preparationMaterials.length; i++) {
        const mat = payload.preparationMaterials[i];
        if (mat) {
          if (mat.url !== undefined && !isValidUrl(mat.url)) {
            issues.push({
              field: `preparationMaterials[${i}].url`,
              message: 'Preparation material URL must be a valid http/https URL',
              severity: InternationalTestValidationSeverity.ERROR
            });
          }
          if (mat.assetId && typeof mat.assetId === 'string') {
            const lowerAsset = mat.assetId.toLowerCase();
            const rawPathPrefixes = ['/', './', '../', 'file://', 'c:\\', 'd:\\'];
            if (rawPathPrefixes.some(p => lowerAsset.startsWith(p)) || lowerAsset.includes('/tmp/')) {
              issues.push({
                field: `preparationMaterials[${i}].assetId`,
                message: 'AssetId must be a registered Phase 05 AssetId handle, not a raw local file path',
                severity: InternationalTestValidationSeverity.ERROR
              });
            }
          }
        }
      }
    }

    // Availability references check (Phase 07 isolation)
    if (payload.availability) {
      if (Array.isArray(payload.availability.availableCountryIds)) {
        for (let i = 0; i < payload.availability.availableCountryIds.length; i++) {
          const item = payload.availability.availableCountryIds[i];
          if (typeof item === 'object' && item !== null) {
            issues.push({
              field: `availability.availableCountryIds[${i}]`,
              message: 'availableCountryIds must contain ID/code references only, not full objects',
              severity: InternationalTestValidationSeverity.ERROR
            });
          }
        }
      }
      if (Array.isArray(payload.availability.testCenters)) {
        for (let i = 0; i < payload.availability.testCenters.length; i++) {
          const center = payload.availability.testCenters[i];
          if (center && typeof center.countryIso2Code === 'object' && center.countryIso2Code !== null) {
            issues.push({
              field: `availability.testCenters[${i}].countryIso2Code`,
              message: 'countryIso2Code must be a country code string, not a full object',
              severity: InternationalTestValidationSeverity.ERROR
            });
          }
        }
      }
    }

    // Deterministic key calculation
    let deterministicKey: string | undefined = payload.deterministicKey || payload.importEvidence?.deterministicKey;
    if (!deterministicKey && nameVal && providerVal && categoryVal) {
      try {
        deterministicKey = InternationalTestDeterministicKey.generate({
          testName: nameVal,
          providerName: providerVal,
          category: categoryVal
        });
      } catch {
        deterministicKey = undefined;
      }
    }

    const hasErrors = issues.some(i => i.severity === InternationalTestValidationSeverity.ERROR);
    const coreIdentityPresent = ['canonicalName', 'providerName', 'testCategory'].every(field => presentFields.includes(field));
    const canBeReviewed = coreIdentityPresent && !hasErrors;
    const isComplete = missingFields.length === 0 && !hasErrors;

    const currentStatus = payload.status;
    const canBePublished = isComplete && (
      currentStatus === InternationalTestStatus.READY_TO_PUBLISH ||
      currentStatus === InternationalTestStatus.PUBLISHED ||
      currentStatus === 'READY_TO_PUBLISH' ||
      currentStatus === 'PUBLISHED'
    );

    let completenessStatus = InternationalTestCompletenessStatus.INCOMPLETE;
    if (isComplete) {
      completenessStatus = InternationalTestCompletenessStatus.COMPLETE;
    } else if (canBeReviewed) {
      completenessStatus = InternationalTestCompletenessStatus.NEEDS_REVIEW;
    }

    const warnings = issues.filter(i => i.severity === InternationalTestValidationSeverity.WARNING);

    return {
      entityType: 'INTERNATIONAL_TEST',
      deterministicKey,
      requiredFields,
      presentFields,
      missingFields,
      issues,
      warnings,
      missingMandatoryFields: missingFields,
      incompleteOptionalFields: [],
      isComplete,
      canBeReviewed,
      canBePublished,
      status: completenessStatus
    };
  }
}
