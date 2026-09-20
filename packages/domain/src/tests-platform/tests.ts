import { z } from 'zod';
import { InternationalTestCompletenessStatus } from './enums';

export const InternationalTestImportPayloadSchema = z.object({
  // Core
  testName: z.string().optional(),
  canonicalName: z.string().optional(),
  displayName: z.string().optional(),
  testCode: z.string().optional(),
  testCategory: z.string().optional(),
  providerName: z.string().optional(),
  providerId: z.string().optional(),
  isSourceVerified: z.boolean().optional(),
  abbreviation: z.string().optional(),
  localizedNameAr: z.string().optional(),
  localizedNameEn: z.string().optional(),
  description: z.string().optional(),
  overview: z.string().optional(),

  // Use cases
  useCases: z.array(z.string()).optional(),
  targetAudience: z.array(z.string()).optional(),
  commonlyUsedCountriesOrRegions: z.array(z.string()).optional(),
  relatedLanguages: z.array(z.string()).optional(),

  // Variants
  variants: z.array(z.object({
    variantName: z.string(),
    description: z.string().optional(),
    deliveryMode: z.string().optional(),
    isActive: z.boolean().optional(),
    specificOfficialUrl: z.string().optional(),
    administrativeNotes: z.string().optional(),
  }).passthrough()).optional(),

  // Sections
  sections: z.array(z.object({
    sectionName: z.string(),
    sectionType: z.string().optional(),
    durationMinutes: z.number().optional(),
    order: z.number().optional(),
    questionTypes: z.array(z.string()).optional(),
    questionCount: z.number().optional(),
    scoreMinimum: z.number().optional(),
    scoreMaximum: z.number().optional(),
  }).passthrough()).optional(),

  // Score scale
  scoreScale: z.union([
    z.string(),
    z.object({
      overallMinimum: z.number().optional(),
      overallMaximum: z.number().optional(),
      scoreIncrement: z.number().optional(),
      bandsOrLevels: z.array(z.string()).optional(),
      bandDescriptions: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
      passFailRules: z.string().optional(),
      cefrEquivalency: z.string().optional(),
      crossTestEquivalency: z.unknown().optional(),
      resultValidityDurationMonths: z.number().optional(),
      resultDeliveryTimeDays: z.number().optional(),
      resultDeliveryMethod: z.string().optional(),
      scoreReportingUrl: z.string().optional(),
    }).passthrough()
  ]).optional(),

  // Fees
  fees: z.array(z.object({
    feeType: z.string().optional(),
    amount: z.number().optional(),
    currencyCode: z.string().optional(),
    hasRegionalVariation: z.boolean().optional(),
    countryCode: z.string().optional(),
    validityWindowNotes: z.string().optional(),
    lastUpdatedAt: z.union([z.string(), z.date()]).optional(),
  }).passthrough()).optional(),

  // Requirements & policies
  registrationRequirements: z.string().optional(),
  identificationRequirements: z.string().optional(),
  ageRules: z.string().optional(),
  retakePolicy: z.string().optional(),
  cancellationReschedulingNotes: z.string().optional(),
  accessibilityNotes: z.string().optional(),
  testDayRequirements: z.string().optional(),

  // Availability
  availability: z.object({
    availableCountryIds: z.array(z.string()).optional(),
    availableCityIds: z.array(z.string()).optional(),
    testCenters: z.array(z.object({
      centerName: z.string(),
      countryIso2Code: z.string().optional(),
      cityName: z.string().optional(),
      officialCenterUrl: z.string().optional(),
    }).passthrough()).optional(),
    onlineAvailabilityRegions: z.array(z.string()).optional(),
    testingWindowsNotes: z.string().optional(),
  }).passthrough().optional(),

  // Official links
  officialLinks: z.array(z.object({
    linkType: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    sourceName: z.string().optional(),
    lastVerifiedAt: z.union([z.string(), z.date()]).optional(),
    linkHealthStatus: z.string().optional(),
    sourceTrustLevel: z.string().optional(),
  }).passthrough()).optional(),

  // Preparation materials
  preparationMaterials: z.array(z.object({
    materialType: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    assetId: z.string().optional(),
    description: z.string().optional(),
    sourceName: z.string().optional(),
  }).passthrough()).optional(),

  // Evidence
  importEvidence: z.object({
    originalImportedName: z.string().optional(),
    normalizedCanonicalName: z.string().optional(),
    deterministicKey: z.string().optional(),
    sourceId: z.string().optional(),
    sourceUrl: z.string().optional(),
    contentHash: z.string().optional(),
    retrievedAt: z.union([z.string(), z.date()]).optional(),
    evidenceSnippet: z.string().optional(),
    confidenceScore: z.number().optional(),
    sourceTrustLevel: z.string().optional(),
    validationResults: z.unknown().optional(),
    duplicateStatus: z.string().optional(),
    conflictingFields: z.unknown().optional(),
    mergeSuggestions: z.unknown().optional(),
  }).passthrough().optional(),

  // Canonical relationships (Phase 7/8 IDs are authoritative)
  countryRelationships: z.array(z.object({
    canonicalReferenceId: z.string().min(1),
    referenceCode: z.string().min(1).optional(),
    relationshipType: z.string().min(1),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).optional(),
  languageRelationships: z.array(z.object({
    canonicalReferenceId: z.string().min(1),
    referenceCode: z.string().min(1).optional(),
    relationshipType: z.string().min(1),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).optional(),
  academicTaxonomyRelationships: z.array(z.object({
    taxonomyNodeId: z.string().min(1),
    relationshipType: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).optional(),
  degreeRelationships: z.array(z.object({
    degreeLevelId: z.string().min(1),
    canonicalCode: z.string().min(1).optional(),
    relationshipType: z.string().min(1),
    notes: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).passthrough()).optional(),

  // Missing / readiness
  missingFields: z.array(z.string()).optional(),
  readinessWarnings: z.array(z.string()).optional(),

  // Cross-phase references
  crossPhaseReferences: z.object({
    universityIds: z.array(z.string()).optional(),
    scholarshipIds: z.array(z.string()).optional(),
    preparationCourseIds: z.array(z.string()).optional(),
    cmsGuideIds: z.array(z.string()).optional(),
    studentToolIds: z.array(z.string()).optional(),
    paidServiceIds: z.array(z.string()).optional(),
  }).passthrough().optional(),
}).passthrough();

export class InternationalTestCompletenessClassifier {
  static classify(payload: Record<string, unknown>): { state: InternationalTestCompletenessStatus, missingFields?: string[] } {
    const missing = [];
    const nameVal = payload.testName || payload.canonicalName || payload.displayName;
    if (!nameVal) missing.push('testName');
    if (missing.length > 0) return { state: InternationalTestCompletenessStatus.INCOMPLETE, missingFields: missing };
    return { state: InternationalTestCompletenessStatus.COMPLETE };
  }
}

export class InternationalTestNamingService {
  static normalize(name: string): string { return name.toLowerCase().replace('official ', '').replace(/ test \d+$/, ''); }
}

export class InternationalTestDeduplicationService {
  static generateKey(payload: Record<string, unknown>): string {
    const nameVal = payload.testName || payload.canonicalName || payload.displayName || '';
    return `${nameVal}|${payload.providerName || 'UNKNOWN'}`.toLowerCase();
  }
}

