import {
  InternationalTestStatus, 
  InternationalTestCategory, 
  InternationalTestCompletenessStatus,
  InternationalTestDeliveryMode,
  InternationalTestSourceTrustLevel
} from './enums';
import { 
  InternationalTestCompletenessReport,
  InternationalTestValidationIssue
} from './validation';
import { CanonicalDegreeLevelCode } from '../degree-level/DegreeLevel';

export type { InternationalTestCompletenessReport, InternationalTestValidationIssue };

export interface InternationalTestDto {
  id: string;
  canonicalName: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  abbreviation?: string;
  testCategory: InternationalTestCategory;
  providerName: string;
  familyId?: string;
  providerId?: string;
  currentPublishedVersionId?: string;
  status: InternationalTestStatus;
  isPubliclyVisible: boolean;
  isSourceVerified: boolean;
  completenessStatus?: InternationalTestCompletenessStatus;
  
  family?: InternationalTestFamilyDto;
  provider?: InternationalTestProviderDto;
  versions?: InternationalTestVersionDto[];
  variants?: InternationalTestVariantDto[];
  scoreScale?: InternationalTestScoreScaleDto;
  sections?: InternationalTestSectionDto[];
  fees?: InternationalTestFeeMetadataDto[];
  sessions?: InternationalTestSessionDto[];
  centers?: InternationalTestCenterDto[];
  requirements?: InternationalTestRequirementDto[];
  policies?: InternationalTestPolicyDto[];
  countryRelationships?: InternationalTestReferenceRelationshipDto[];
  languageRelationships?: InternationalTestReferenceRelationshipDto[];
  academicTaxonomyRelationships?: InternationalTestAcademicTaxonomyRelationshipDto[];
  degreeRelationships?: InternationalTestDegreeRelationshipReference[];
  equivalencyMappings?: InternationalTestEquivalencyMappingDto[];
  registrationRequirements?: string;
  identificationRequirements?: string;
  retakePolicy?: string;
  cancellationReschedulingNotes?: string;
  accessibilityNotes?: string;
  availability?: InternationalTestAvailabilityDto;
  officialLinks?: InternationalTestOfficialLinkDto[];
  preparationMaterials?: InternationalTestPreparationMaterialDto[];
  
  crossPhaseReferences?: {
    /** @deprecated Compatibility navigation only; this is not University acceptance ownership. */
    universityIds?: string[];
    scholarshipIds?: string[];
    preparationCourseIds?: string[];
    cmsGuideIds?: string[];
    studentToolIds?: string[];
    paidServiceIds?: string[];
  };
  
  importEvidence?: InternationalTestEvidenceDto;
  completenessReport?: InternationalTestCompletenessReport;
  
  [key: string]: unknown;
}

export interface UpsertInternationalTestDto {
  canonicalName: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  abbreviation?: string;
  testCategory: InternationalTestCategory;
  providerName: string;
  familyId?: string;
  providerId?: string;
  currentPublishedVersionId?: string;
  status?: InternationalTestStatus;
  
  versions?: UpsertInternationalTestVersionDto[];
  variants?: UpsertInternationalTestVariantDto[];
  scoreScale?: UpsertInternationalTestScoreScaleDto;
  sections?: UpsertInternationalTestSectionDto[];
  fees?: UpsertInternationalTestFeeMetadataDto[];
  sessions?: UpsertInternationalTestSessionDto[];
  centers?: UpsertInternationalTestCenterDto[];
  requirements?: UpsertInternationalTestRequirementDto[];
  policies?: UpsertInternationalTestPolicyDto[];
  countryRelationships?: UpsertInternationalTestReferenceRelationshipDto[];
  languageRelationships?: UpsertInternationalTestReferenceRelationshipDto[];
  academicTaxonomyRelationships?: UpsertInternationalTestAcademicTaxonomyRelationshipDto[];
  degreeRelationships?: UpsertInternationalTestDegreeRelationshipReference[];
  equivalencyMappings?: UpsertInternationalTestEquivalencyMappingDto[];
  registrationRequirements?: string;
  identificationRequirements?: string;
  retakePolicy?: string;
  cancellationReschedulingNotes?: string;
  accessibilityNotes?: string;
  availability?: UpsertInternationalTestAvailabilityDto;
  officialLinks?: UpsertInternationalTestOfficialLinkDto[];
  preparationMaterials?: UpsertInternationalTestPreparationMaterialDto[];
  
  crossPhaseReferences?: {
    /** @deprecated Compatibility navigation only; this is not University acceptance ownership. */
    universityIds?: string[];
    scholarshipIds?: string[];
    preparationCourseIds?: string[];
    cmsGuideIds?: string[];
    studentToolIds?: string[];
    paidServiceIds?: string[];
  };

  [key: string]: unknown;
}

export interface InternationalTestFamilyDto {
  id: string;
  key: string;
  displayName: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  category: InternationalTestCategory | string;
  profileType: InternationalTestFamilyProfileType;
  defaultSectionModel: 'LANGUAGE_SKILLS' | 'ACADEMIC_SUBJECTS' | 'PROFESSIONAL_COMPETENCIES' | 'CUSTOM';
  allowsCustomContentBlocks: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

export type InternationalTestFamilyProfileType =
  | 'LANGUAGE_PROFICIENCY'
  | 'UNIVERSITY_ADMISSION'
  | 'SPECIALIZED_ADMISSION'
  | 'PROFESSIONAL_LICENSING';

export interface InternationalTestProviderDto {
  id: string;
  key: string;
  displayName: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  providerType?: string;
  officialWebsite?: string;
  countryIso2Code?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestVersionDto {
  id: string;
  testId: string;
  versionNumber: number;
  cycle?: InternationalTestCycleReference;
  status: 'DRAFT' | 'NEEDS_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';
  sourceImportRecordId?: string;
  sourceFileName?: string;
  sourceLocale?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: Date;
  publishedAt?: Date;
  approvedBy?: string;
  supersededAt?: Date;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  changeSummary?: Record<string, unknown>;
  rawContentBlocks?: Record<string, unknown>[];
  deliveryModes?: InternationalTestDeliveryModeProfileDto[];
  scoreScales?: InternationalTestVersionScoreScaleDto[];
  contentBlocks?: InternationalTestContentBlockDto[];
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestVersionDto {
  versionNumber: number;
  cycle?: InternationalTestCycleReference;
  status: InternationalTestVersionDto['status'];
  sourceImportRecordId?: string;
  sourceFileName?: string;
  sourceLocale?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: Date;
  publishedAt?: Date;
  approvedBy?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  changeSummary?: Record<string, unknown>;
  rawContentBlocks?: Record<string, unknown>[];
  deliveryModes?: UpsertInternationalTestDeliveryModeProfileDto[];
  scoreScales?: UpsertInternationalTestVersionScoreScaleDto[];
  contentBlocks?: UpsertInternationalTestContentBlockDto[];
  metadata?: Record<string, unknown>;
}

export interface InternationalTestImportDraftRequestDto {
  sourceImportRecordId?: string;
  sourceFileName: string;
  sourceLocale?: string;
  sourceUri?: string;
  sourceHash?: string;
  rawContent?: string;
  importedBy?: string;
  detectedFields?: Record<string, unknown>;
  detectedSections?: string[];
  unmappedSections?: InternationalTestImportedSectionDraftDto[];
  metadata?: Record<string, unknown>;
}

export interface InternationalTestImportedSectionDraftDto {
  sectionKey: string;
  title?: string;
  sourceSectionPath?: string;
  content: string;
  locale?: string;
  detectedFieldKeys?: string[];
  metadata?: Record<string, unknown>;
}

export interface InternationalTestImportDraftResultDto {
  testId: string;
  versionId: string;
  versionNumber: number;
  status: InternationalTestVersionDto['status'];
  sourceFileName: string;
  sourceLocale?: string;
  sourceHash?: string;
  preservedRawContent: boolean;
  reviewStatus: 'NEEDS_REVIEW';
  createdContentBlockCount: number;
  needsReviewSectionCount: number;
}

export interface InternationalTestDeliveryModeProfileDto {
  id: string;
  versionId: string;
  mode: InternationalTestDeliveryMode | string;
  displayName: string;
  isActive: boolean;
  registrationUrl?: string;
  administrationNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestDeliveryModeProfileDto {
  mode: InternationalTestDeliveryMode | string;
  displayName: string;
  isActive?: boolean;
  registrationUrl?: string;
  administrationNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestVariantDto {
  id: string;
  variantName: string;
  deliveryMode: InternationalTestDeliveryMode;
  isActive: boolean;
  specificOfficialUrl?: string;
  administrativeNotes?: string;
}

export interface UpsertInternationalTestVariantDto {
  variantName: string;
  deliveryMode: InternationalTestDeliveryMode;
  isActive: boolean;
  specificOfficialUrl?: string;
  administrativeNotes?: string;
}

export interface InternationalTestSectionDto {
  id: string;
  sectionName: string;
  sectionType: string;
  durationMinutes?: number;
  order: number;
  questionTypes?: string[];
  scoreMinimum?: number;
  scoreMaximum?: number;
}

export interface UpsertInternationalTestSectionDto {
  sectionName: string;
  sectionType: string;
  durationMinutes?: number;
  order: number;
  questionTypes?: string[];
  scoreMinimum?: number;
  scoreMaximum?: number;
}

export interface InternationalTestScoreScaleDto {
  id: string;
  overallMinimum: number;
  overallMaximum: number;
  scoreIncrement?: number;
  bandsOrLevels?: string[];
  passFailRules?: string;
  cefrEquivalency?: string;
  crossTestEquivalency?: string;
  resultValidityDurationMonths?: number;
  resultDeliveryTimeDays?: number;
  scoreReportingUrl?: string;
}

export interface UpsertInternationalTestScoreScaleDto {
  overallMinimum: number;
  overallMaximum: number;
  scoreIncrement?: number;
  bandsOrLevels?: string[];
  passFailRules?: string;
  cefrEquivalency?: string;
  crossTestEquivalency?: string;
  resultValidityDurationMonths?: number;
  resultDeliveryTimeDays?: number;
  scoreReportingUrl?: string;
}

export interface InternationalTestFeeMetadataDto {
  id: string;
  feeType: 'REGISTRATION' | 'LATE_REGISTRATION' | 'RESCHEDULING' | 'CANCELLATION' | 'OTHER';
  amount: number;
  currencyCode: string; // Reference Data code
  currencyReferenceId: string;
  hasRegionalVariation: boolean;
  validityWindowNotes?: string;
}

export interface UpsertInternationalTestFeeMetadataDto {
  feeType: 'REGISTRATION' | 'LATE_REGISTRATION' | 'RESCHEDULING' | 'CANCELLATION' | 'OTHER';
  amount: number;
  currencyCode: string;
  currencyReferenceId: string;
  hasRegionalVariation: boolean;
  validityWindowNotes?: string;
}

export interface InternationalTestOfficialLinkDto {
  id: string;
  linkType: 'REGISTRATION' | 'INFORMATION' | 'PREPARATION' | 'SCORE_REPORTING' | 'OTHER';
  url: string;
  description?: string;
}

export interface UpsertInternationalTestOfficialLinkDto {
  linkType: 'REGISTRATION' | 'INFORMATION' | 'PREPARATION' | 'SCORE_REPORTING' | 'OTHER';
  url: string;
  description?: string;
}

export interface InternationalTestAvailabilityDto {
  id: string;
  availableCountryIds: string[]; // Phase 07 references
  availableCityIds?: string[]; // Phase 07 references
  onlineAvailabilityRegions?: string[];
  testingWindowsNotes?: string;
}

export const INTERNATIONAL_TEST_AVAILABILITY_SSoT = 'CANONICAL_REFERENCE_IDS' as const;

export interface UpsertInternationalTestAvailabilityDto {
  availableCountryIds: string[];
  availableCityIds?: string[];
  onlineAvailabilityRegions?: string[];
  testingWindowsNotes?: string;
}

export interface InternationalTestPreparationMaterialDto {
  id: string;
  materialType: 'SAMPLE_QUESTIONS' | 'PRACTICE_TEST' | 'BROCHURE' | 'AUDIO_SAMPLE' | 'GUIDE';
  url?: string;
  assetId?: string; // Phase 05 reference
  title: string;
  description?: string;
}

export interface UpsertInternationalTestPreparationMaterialDto {
  materialType: 'SAMPLE_QUESTIONS' | 'PRACTICE_TEST' | 'BROCHURE' | 'AUDIO_SAMPLE' | 'GUIDE';
  url?: string;
  assetId?: string;
  title: string;
  description?: string;
}

export interface InternationalTestEvidenceDto {
  originalImportedName?: string;
  normalizedCanonicalName?: string;
  deterministicKey?: string;
  sourceId?: string;
  sourceUrl?: string;
  contentHash?: string;
  retrievedAt?: Date;
  evidenceSnippet?: string;
  duplicateStatus?: 'NEW' | 'DUPLICATE_SKIPPED' | 'EXISTING_ENRICHED';
  conflictingFields?: string[];
  mergeSuggestions?: Record<string, unknown> | null;
  sourceTrustLevel?: InternationalTestSourceTrustLevel;
}

export interface InternationalTestVersionScoreScaleDto {
  id: string;
  versionId: string;
  scaleName: string;
  overallMinimum?: number;
  overallMaximum?: number;
  scoreIncrement?: number;
  bandsOrLevels?: string[];
  passFailRules?: string;
  cefrEquivalency?: string;
  crossTestEquivalency?: string;
  resultValidityDurationMonths?: number;
  resultDeliveryTimeDays?: number;
  scoreReportingUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestVersionScoreScaleDto {
  scaleName: string;
  overallMinimum?: number;
  overallMaximum?: number;
  scoreIncrement?: number;
  bandsOrLevels?: string[];
  passFailRules?: string;
  cefrEquivalency?: string;
  crossTestEquivalency?: string;
  resultValidityDurationMonths?: number;
  resultDeliveryTimeDays?: number;
  scoreReportingUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestSessionDto {
  id: string;
  testId: string;
  versionId?: string;
  deliveryModeId?: string;
  sessionCode?: string;
  title: string;
  registrationOpensAt?: Date;
  registrationClosesAt?: Date;
  startsAt?: Date;
  endsAt?: Date;
  timezone?: string;
  capacity?: number;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestSessionDto {
  versionId?: string;
  deliveryModeId?: string;
  sessionCode?: string;
  title: string;
  registrationOpensAt?: Date;
  registrationClosesAt?: Date;
  startsAt?: Date;
  endsAt?: Date;
  timezone?: string;
  capacity?: number;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestCenterDto {
  id: string;
  testId: string;
  deliveryModeId?: string;
  centerCode?: string;
  displayName: string;
  countryIso2Code?: string;
  cityName?: string; // Display/address metadata, not a canonical City relationship
  address?: string;
  latitude?: number;
  longitude?: number;
  officialUrl?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestCenterDto {
  deliveryModeId?: string;
  centerCode?: string;
  displayName: string;
  countryIso2Code?: string;
  cityName?: string; // Display/address metadata, not a canonical City relationship
  address?: string;
  latitude?: number;
  longitude?: number;
  officialUrl?: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestRequirementDto {
  id: string;
  testId: string;
  versionId?: string;
  requirementType: string;
  title: string;
  description?: string;
  appliesTo?: Record<string, unknown>;
  isMandatory: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestRequirementDto {
  versionId?: string;
  requirementType: string;
  title: string;
  description?: string;
  appliesTo?: Record<string, unknown>;
  isMandatory?: boolean;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestPolicyDto {
  id: string;
  testId: string;
  versionId?: string;
  policyType: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestPolicyDto {
  versionId?: string;
  policyType: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestReferenceRelationshipDto {
  id: string;
  testId: string;
  canonicalReferenceId?: string;
  referenceCode?: string; // Compatibility/provenance only
  relationshipType: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestReferenceRelationshipDto {
  canonicalReferenceId: string;
  referenceCode?: string;
  relationshipType: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestDegreeRelationshipReference {
  degreeLevelId?: string;
  canonicalCode?: CanonicalDegreeLevelCode;
  relationshipType: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestDegreeRelationshipReference {
  degreeLevelId: string;
  canonicalCode?: CanonicalDegreeLevelCode;
  relationshipType: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestCycleReference {
  cycleKey: string;
  versionKey: string;
  displayLabel: string;
  startYear?: number;
  endYear?: number;
}

export interface InternationalTestAcademicTaxonomyRelationshipDto {
  id: string;
  testId: string;
  taxonomyNodeId: string;
  relationshipType: string;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestAcademicTaxonomyRelationshipDto {
  taxonomyNodeId: string;
  relationshipType: string;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestEquivalencyMappingDto {
  id: string;
  testId: string;
  sourceScale: string;
  sourceValue: string;
  targetScale: string;
  targetValue: string;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestEquivalencyMappingDto {
  sourceScale: string;
  sourceValue: string;
  targetScale: string;
  targetValue: string;
  confidence?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface InternationalTestContentBlockDto {
  id: string;
  versionId: string;
  blockKey: string;
  blockType: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus: 'NEEDS_REVIEW' | 'MAPPED' | 'IGNORED' | 'APPROVED';
  metadata?: Record<string, unknown>;
}

export interface UpsertInternationalTestContentBlockDto {
  blockKey: string;
  blockType: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus?: InternationalTestContentBlockDto['reviewStatus'];
  metadata?: Record<string, unknown>;
}


export interface InternationalTestFilters {
  searchQuery?: string;
  status?: InternationalTestStatus | InternationalTestStatus[];
  category?: InternationalTestCategory | InternationalTestCategory[];
  providerName?: string;
  countryIso2Code?: string;
  completenessStatus?: InternationalTestCompletenessStatus | InternationalTestCompletenessStatus[];
  isPubliclyVisible?: boolean;
  page?: number;
  limit?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export interface PaginatedInternationalTestResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
