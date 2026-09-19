import type { SupportedLocale } from './locale';

export type TranslationContentMode = 'INFRASTRUCTURE_ONLY' | 'CONTENT_AUTHORING_ENABLED';
export type TranslationStorageMode =
  | 'NORMALIZED'
  | 'EXPLICIT_FIELDS'
  | 'COMPATIBILITY_OVERLAY'
  | 'OWNER_WORKSPACE'
  | 'SOURCE_DICTIONARY';

export type TranslationDomainKey =
  | 'SCHOLARSHIP'
  | 'UNIVERSITY'
  | 'MAJOR'
  | 'INTERNATIONAL_TEST'
  | 'COURSE'
  | 'CMS'
  | 'REFERENCE_DATA'
  | 'WEBSITE_UI';

export type TranslationOwner =
  | 'SCHOLARSHIPS'
  | 'UNIVERSITIES'
  | 'MAJORS'
  | 'INTERNATIONAL_TESTS'
  | 'COURSES'
  | 'CMS'
  | 'REFERENCE_DATA'
  | 'WEB';

export type TranslationRuntimeRequirement =
  | 'SOURCE_ONLY'
  | 'RUNTIME_PROOF_REQUIRED'
  | 'MIGRATION_DESIGN_REQUIRED';

export interface TranslationDomainPolicy {
  key: TranslationDomainKey;
  owner: TranslationOwner;
  storage: TranslationStorageMode;
  runtimeRequirement: TranslationRuntimeRequirement;
  contentAuthoringAllowed: boolean;
  canonicalIdentityImmutable: true;
  supportedLocales: readonly SupportedLocale[];
}

/**
 * Global project safety switch.
 *
 * This remains INFRASTRUCTURE_ONLY until a later, explicit content-translation
 * work package is opened. Keeping this source-controlled prevents an offline
 * source-preparation cycle from accidentally becoming a content mutation cycle.
 */
export const TRANSLATION_CONTENT_MODE: TranslationContentMode = 'INFRASTRUCTURE_ONLY';

export const TRANSLATION_DOMAIN_POLICIES: Readonly<Record<TranslationDomainKey, TranslationDomainPolicy>> = {
  SCHOLARSHIP: {
    key: 'SCHOLARSHIP',
    owner: 'SCHOLARSHIPS',
    storage: 'COMPATIBILITY_OVERLAY',
    runtimeRequirement: 'MIGRATION_DESIGN_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  UNIVERSITY: {
    key: 'UNIVERSITY',
    owner: 'UNIVERSITIES',
    storage: 'NORMALIZED',
    runtimeRequirement: 'RUNTIME_PROOF_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  MAJOR: {
    key: 'MAJOR',
    owner: 'MAJORS',
    storage: 'EXPLICIT_FIELDS',
    runtimeRequirement: 'RUNTIME_PROOF_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  INTERNATIONAL_TEST: {
    key: 'INTERNATIONAL_TEST',
    owner: 'INTERNATIONAL_TESTS',
    storage: 'EXPLICIT_FIELDS',
    runtimeRequirement: 'RUNTIME_PROOF_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  COURSE: {
    key: 'COURSE',
    owner: 'COURSES',
    storage: 'COMPATIBILITY_OVERLAY',
    runtimeRequirement: 'MIGRATION_DESIGN_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  CMS: {
    key: 'CMS',
    owner: 'CMS',
    storage: 'OWNER_WORKSPACE',
    runtimeRequirement: 'RUNTIME_PROOF_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  REFERENCE_DATA: {
    key: 'REFERENCE_DATA',
    owner: 'REFERENCE_DATA',
    storage: 'EXPLICIT_FIELDS',
    runtimeRequirement: 'RUNTIME_PROOF_REQUIRED',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
  WEBSITE_UI: {
    key: 'WEBSITE_UI',
    owner: 'WEB',
    storage: 'SOURCE_DICTIONARY',
    runtimeRequirement: 'SOURCE_ONLY',
    contentAuthoringAllowed: false,
    canonicalIdentityImmutable: true,
    supportedLocales: ['ar', 'en'],
  },
};

export function isTranslationContentAuthoringEnabled(
  mode: TranslationContentMode = TRANSLATION_CONTENT_MODE,
): boolean {
  return mode === 'CONTENT_AUTHORING_ENABLED';
}

export function canAuthorDomainTranslations(
  domain: TranslationDomainKey,
  mode: TranslationContentMode = TRANSLATION_CONTENT_MODE,
): boolean {
  return isTranslationContentAuthoringEnabled(mode) && TRANSLATION_DOMAIN_POLICIES[domain].contentAuthoringAllowed;
}


export class TranslationContentMutationDisabledError extends Error {
  constructor(domain?: TranslationDomainKey) {
    super(`TRANSLATION_CONTENT_AUTHORING_DISABLED${domain ? `:${domain}` : ''}`);
    this.name = 'TranslationContentMutationDisabledError';
  }
}

export function assertTranslationContentAuthoringEnabled(
  domain?: TranslationDomainKey,
  mode: TranslationContentMode = TRANSLATION_CONTENT_MODE,
): void {
  if (!isTranslationContentAuthoringEnabled(mode)) {
    throw new TranslationContentMutationDisabledError(domain);
  }
  if (domain && !TRANSLATION_DOMAIN_POLICIES[domain].contentAuthoringAllowed) {
    throw new TranslationContentMutationDisabledError(domain);
  }
}

export function assertNoTranslationPayloadFields(
  domain: TranslationDomainKey,
  payload: Record<string, unknown> | undefined | null,
  fields: readonly string[],
): void {
  if (!payload) return;
  const attempted = fields.some((field) => payload[field] !== undefined);
  if (attempted) assertTranslationContentAuthoringEnabled(domain);
}
