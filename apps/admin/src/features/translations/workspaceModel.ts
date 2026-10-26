import { BookOpen, Building2, FileText, GraduationCap, Sparkles } from 'lucide-react';
import { TRANSLATION_OWNER_CAPABILITIES, resolveSourceLocaleEvidence } from '@manaratak/shared';
import type { useTranslation } from '../../i18n/I18nProvider';
export type WorkspaceDomain =
  'SCHOLARSHIP' | 'UNIVERSITY' | 'MAJOR' | 'INTERNATIONAL_TEST' | 'COURSE';
export type SupportedLocale = 'ar' | 'en';
export type UniversityTranslationReviewStatus =
  'NEEDS_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
export type TranslationStorage = 'NORMALIZED' | 'EXPLICIT_FIELDS' | 'COMPATIBILITY_OVERLAY';
export type AdminTranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

export interface UniversityTranslation {
  id?: string;
  locale: string;
  displayName?: string | null;
  description?: string | null;
  reviewStatus?: UniversityTranslationReviewStatus;
  sourceRecordId?: string | null;
}

export interface SourceRecord {
  sourceLocale?: string | null;
}

export interface WorkspaceEntity {
  originType?: string;
  hasAr?: boolean;
  hasEn?: boolean;
  translationStateAr?: string;
  translationStateEn?: string;
  id: string;
  profileId?: string;
  publicId?: string;
  slug?: string;
  canonicalName?: string;
  displayName: string;
  status?: string;
  completenessStatus?: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  localizedNames?: Record<string, string>;
  sourceLocale?: string | null;
  sourceRecords?: SourceRecord[];
  translations?: UniversityTranslation[];
  optionalFields?: Record<string, unknown>;
}

export interface MajorSource {
  sourceLocale?: string | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  coverageScope?: 'GLOBAL';
  ownerSourceStatus?: string;
  runtimeProof?: string;
  publicationReadiness?: string;
  importSupported?: boolean;
  stats?: {
    complete?: number;
    pending?: number;
    rejected?: number;
    published?: number;
    missingAr: number;
    missingEn: number;
    publicReadyAr: number;
    publicReadyEn: number;
  };
}

export interface TranslationDraft {
  arName: string;
  arDescription: string;
  arStatus: UniversityTranslationReviewStatus;
  enName: string;
  enDescription: string;
  enStatus: UniversityTranslationReviewStatus;
}

export interface DomainConfig {
  key: WorkspaceDomain;
  labelKey:
    | 'translation_domain_scholarships'
    | 'translation_domain_universities'
    | 'translation_domain_majors'
    | 'translation_domain_tests'
    | 'translation_domain_courses';
  endpoint: string;
  detailHref: (entity: WorkspaceEntity) => string;
  storage: TranslationStorage;
  icon: typeof Sparkles;
  supportsDescriptions: boolean;
  searchParam?: 'search' | 'query';
}

export const reviewStates: UniversityTranslationReviewStatus[] = [
  'NEEDS_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
];

export const domainConfigs: DomainConfig[] = [
  {
    key: 'SCHOLARSHIP',
    labelKey: 'translation_domain_scholarships',
    endpoint: '/admin/scholarships',
    detailHref: (entity) => `/scholarships/${entity.id}`,
    storage: 'COMPATIBILITY_OVERLAY',
    icon: Sparkles,
    supportsDescriptions: TRANSLATION_OWNER_CAPABILITIES.SCHOLARSHIP.centralDescriptionEditor,
    searchParam: 'query',
  },
  {
    key: 'UNIVERSITY',
    labelKey: 'translation_domain_universities',
    endpoint: '/admin/universities',
    detailHref: (entity) => `/universities/${entity.id}`,
    storage: 'NORMALIZED',
    icon: Building2,
    supportsDescriptions: TRANSLATION_OWNER_CAPABILITIES.UNIVERSITY.centralDescriptionEditor,
    searchParam: 'search',
  },
  {
    key: 'MAJOR',
    labelKey: 'translation_domain_majors',
    endpoint: '/admin/majors',
    detailHref: (entity) =>
      `/majors/${entity.id}${entity.profileId ? `?profileId=${encodeURIComponent(entity.profileId)}` : ''}`,
    storage: 'EXPLICIT_FIELDS',
    icon: GraduationCap,
    supportsDescriptions: TRANSLATION_OWNER_CAPABILITIES.MAJOR.centralDescriptionEditor,
    searchParam: 'search',
  },
  {
    key: 'INTERNATIONAL_TEST',
    labelKey: 'translation_domain_tests',
    endpoint: '/admin/international-tests',
    detailHref: (entity) => `/international-tests/${entity.id}`,
    storage: 'EXPLICIT_FIELDS',
    icon: FileText,
    supportsDescriptions:
      TRANSLATION_OWNER_CAPABILITIES.INTERNATIONAL_TEST.centralDescriptionEditor,
    searchParam: 'search',
  },
  {
    key: 'COURSE',
    labelKey: 'translation_domain_courses',
    endpoint: '/admin/courses',
    detailHref: (entity) =>
      entity.originType === 'NATIVE_MANARATAK_COURSE'
        ? `/courses/${encodeURIComponent(entity.id)}/editor`
        : entity.originType === 'EXTERNAL_LINKED_COURSE'
          ? `/courses/external?course=${encodeURIComponent(entity.id)}`
          : `/courses/${encodeURIComponent(entity.id)}`,
    storage: 'COMPATIBILITY_OVERLAY',
    icon: BookOpen,
    supportsDescriptions: TRANSLATION_OWNER_CAPABILITIES.COURSE.centralDescriptionEditor,
    searchParam: 'search',
  },
];

export function nonEmpty(value?: string | null): boolean {
  return Boolean(value?.trim());
}

export function normalizedNames(entity: WorkspaceEntity): Record<string, string> {
  if (entity.localizedNames && typeof entity.localizedNames === 'object')
    return entity.localizedNames;
  const optional = entity.optionalFields;
  if (!optional || typeof optional !== 'object' || Array.isArray(optional)) return {};
  const localizedNames = optional.localizedNames;
  if (!localizedNames || typeof localizedNames !== 'object' || Array.isArray(localizedNames))
    return {};
  return Object.fromEntries(
    Object.entries(localizedNames).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export function universityLocalePresent(entity: WorkspaceEntity, locale: SupportedLocale): boolean {
  const translation = entity.translations?.find((item) => item.locale === locale);
  return Boolean(
    translation && nonEmpty(translation.displayName) && translation.reviewStatus !== 'REJECTED',
  );
}

export function coverage(domain: WorkspaceDomain, entity: WorkspaceEntity) {
  if (typeof entity.hasAr === 'boolean' && typeof entity.hasEn === 'boolean')
    return { ar: entity.hasAr, en: entity.hasEn };
  if (domain === 'UNIVERSITY') {
    return {
      ar: universityLocalePresent(entity, 'ar'),
      en: universityLocalePresent(entity, 'en'),
    };
  }

  if (domain === 'MAJOR' || domain === 'INTERNATIONAL_TEST') {
    return {
      ar: nonEmpty(entity.localizedNameAr),
      en: nonEmpty(entity.localizedNameEn),
    };
  }

  const names = normalizedNames(entity);
  return {
    ar: nonEmpty(names.ar),
    en: nonEmpty(names.en),
  };
}

export function sourceLocaleFrom(
  values: readonly { sourceLocale?: string | null }[] | undefined,
): SupportedLocale | null {
  return resolveSourceLocaleEvidence(values).locale;
}

export function makeDraft(domain: WorkspaceDomain, entity: WorkspaceEntity): TranslationDraft {
  if (domain === 'UNIVERSITY') {
    const ar = entity.translations?.find((item) => item.locale === 'ar');
    const en = entity.translations?.find((item) => item.locale === 'en');
    return {
      arName: ar?.displayName ?? '',
      arDescription: ar?.description ?? '',
      arStatus: ar?.reviewStatus ?? 'NEEDS_REVIEW',
      enName: en?.displayName ?? '',
      enDescription: en?.description ?? '',
      enStatus: en?.reviewStatus ?? 'NEEDS_REVIEW',
    };
  }

  if (domain === 'MAJOR' || domain === 'INTERNATIONAL_TEST') {
    return {
      arName: entity.localizedNameAr ?? '',
      arDescription: '',
      arStatus: 'NEEDS_REVIEW',
      enName: entity.localizedNameEn ?? '',
      enDescription: '',
      enStatus: 'NEEDS_REVIEW',
    };
  }

  const names = normalizedNames(entity);
  return {
    arName: names.ar ?? '',
    arDescription: '',
    arStatus: 'NEEDS_REVIEW',
    enName: names.en ?? '',
    enDescription: '',
    enStatus: 'NEEDS_REVIEW',
  };
}

export function storageLabel(
  storage: TranslationStorage,
  t: (key: AdminTranslationKey) => string,
): string {
  if (storage === 'NORMALIZED') return t('translation_storage_normalized');
  if (storage === 'EXPLICIT_FIELDS') return t('translation_storage_explicit');
  return t('translation_storage_compatibility');
}
