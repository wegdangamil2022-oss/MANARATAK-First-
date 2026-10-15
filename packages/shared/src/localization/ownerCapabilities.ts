/** Source capabilities describe existing owner contracts; they never enable writes. */
export type TranslationCapabilityKey =
  | 'UNIVERSITY'
  | 'MAJOR'
  | 'INTERNATIONAL_TEST'
  | 'SCHOLARSHIP'
  | 'COURSE'
  | 'STUDY_DESTINATION'
  | 'SERVICE'
  | 'CAREER_JOB';
export interface TranslationOwnerCapability {
  key: TranslationCapabilityKey;
  permission: string;
  ownerPath: string;
  locales: readonly ['ar', 'en'];
  descriptionFields: readonly string[];
  descriptionWorkflow:
    | 'NORMALIZED_OWNER'
    | 'VERSIONED_SECTIONS'
    | 'NATIVE_OWNER_WORKSPACE'
    | 'OWNER_CONTRACT_REQUIRED';
  supportsDescriptions: boolean;
  centralDescriptionEditor: boolean;
  importSupported: boolean;
  sourceVersion: string;
  publicReader: string;
  activation: 'INFRASTRUCTURE_ONLY';
  runtimeProof: 'PENDING';
}
const capability = (
  input: Omit<
    TranslationOwnerCapability,
    'locales' | 'activation' | 'runtimeProof' | 'supportsDescriptions' | 'centralDescriptionEditor'
  >,
): TranslationOwnerCapability => ({
  ...input,
  locales: ['ar', 'en'],
  activation: 'INFRASTRUCTURE_ONLY',
  runtimeProof: 'PENDING',
  supportsDescriptions: input.descriptionWorkflow !== 'OWNER_CONTRACT_REQUIRED',
  centralDescriptionEditor:input.descriptionWorkflow === 'NORMALIZED_OWNER',
});
export const TRANSLATION_OWNER_CAPABILITIES: Readonly<
  Record<TranslationCapabilityKey, TranslationOwnerCapability>
> = {
  UNIVERSITY: capability({
    key: 'UNIVERSITY',
    permission: 'admin:universities:manage',
    ownerPath: '/universities',
    descriptionFields: ['description'],
    descriptionWorkflow: 'NORMALIZED_OWNER',
    importSupported: true,
    sourceVersion: 'University source evidence + UniversityTranslation revision',
    publicReader: 'ApplicationLocaleProjectionService.projectUniversity',
  }),
  MAJOR: capability({
    key: 'MAJOR',
    permission: 'admin:majors:manage',
    ownerPath: '/majors',
    descriptionFields: ['section:*'],
    descriptionWorkflow: 'VERSIONED_SECTIONS',
    importSupported: true,
    sourceVersion: 'Major + exact profile/version/section source',
    publicReader: 'MajorPublicationSnapshot + ApplicationLocaleProjectionService.projectMajor',
  }),
  INTERNATIONAL_TEST: capability({
    key: 'INTERNATIONAL_TEST',
    permission: 'admin:international-tests:manage',
    ownerPath: '/international-tests',
    descriptionFields: ['optionalFields.ownerLocalizedDescriptions.ar.description','optionalFields.ownerLocalizedDescriptions.en.description'],
    descriptionWorkflow: 'NATIVE_OWNER_WORKSPACE',
    importSupported: false,
    sourceVersion: 'InternationalTestVersion',
    publicReader: 'ApplicationLocaleProjectionService.projectInternationalTest',
  }),
  SCHOLARSHIP: capability({
    key: 'SCHOLARSHIP',
    permission: 'admin:scholarships:manage',
    ownerPath: '/scholarships',
    descriptionFields: ['optionalFields.ownerLocalizedDescriptions.ar.description','optionalFields.ownerLocalizedDescriptions.en.description'],
    descriptionWorkflow: 'NATIVE_OWNER_WORKSPACE',
    importSupported: false,
    sourceVersion: 'ScholarshipVersion',
    publicReader: 'Scholarship owner published projection',
  }),
  COURSE: capability({
    key: 'COURSE',
    permission: 'admin:courses:manage',
    ownerPath: '/courses',
    descriptionFields: ['optionalFields.ownerLocalizedDescriptions.ar.description','optionalFields.ownerLocalizedDescriptions.en.description'],
    descriptionWorkflow: 'NATIVE_OWNER_WORKSPACE',
    importSupported: false,
    sourceVersion: 'CourseVersion',
    publicReader: 'Course owner published / enrollment-pinned projection',
  }),
  STUDY_DESTINATION: capability({
    key: 'STUDY_DESTINATION',
    permission: 'admin:study-destinations:read',
    ownerPath: '/study-destinations',
    descriptionFields: [
      'overviewAr',
      'overviewEn',
      'studySystemSummaryAr',
      'studySystemSummaryEn',
      'visaSummaryAr',
      'visaSummaryEn',
    ],
    descriptionWorkflow: 'NATIVE_OWNER_WORKSPACE',
    importSupported: false,
    sourceVersion: 'StudyDestinationProfile revision/governance',
    publicReader: 'StudyDestinationUseCases published owner projection',
  }),
  SERVICE: capability({
    key: 'SERVICE',
    permission: 'admin:services:manage',
    ownerPath: '/services',
    descriptionFields: [
      'localizedContent.ar.serviceDescription',
      'localizedContent.en.serviceDescription',
    ],
    descriptionWorkflow: 'NATIVE_OWNER_WORKSPACE',
    importSupported: false,
    sourceVersion: 'Service version/reviewedVersion/publishedSnapshot',
    publicReader: 'PublicServiceCatalogUseCases',
  }),
  CAREER_JOB: capability({
    key: 'CAREER_JOB',
    permission: 'admin:careers:manage',
    ownerPath: '/careers',
    descriptionFields: [
      'metadata.localizedContent.ar.description',
      'metadata.localizedContent.en.description',
    ],
    descriptionWorkflow: 'NATIVE_OWNER_WORKSPACE',
    importSupported: false,
    sourceVersion: 'Career job version/publishedSnapshot',
    publicReader: 'CareerPublicUseCases',
  }),
};
