import { isSupportedLocale, type SupportedLocale } from './locale';

/** Source-controlled release policy: UI copy parity is independent of owner data readiness. */
export const PUBLIC_ENGLISH_COPY_READY = false;
export const PUBLIC_TEMPLATE_LOCALES: readonly SupportedLocale[] = PUBLIC_ENGLISH_COPY_READY
  ? ['ar', 'en']
  : ['ar'];
export function isPublicTemplateLocaleEnabled(locale: SupportedLocale): boolean {
  return PUBLIC_TEMPLATE_LOCALES.includes(locale);
}
export interface SourceLocaleEvidence {
  sourceLocale?: string | null;
  status?: string;
  isCurrent?: boolean;
  isVerified?: boolean;
  importedAt?: string | Date | null;
  createdAt?: string | Date | null;
  acquiredAt?: string | Date | null;
  updatedAt?: string | Date | null;
}
export function resolveSourceLocaleEvidence(records: readonly unknown[] = []) {
  const evidence = records.filter(
    (row) => row && typeof row === 'object' && !Array.isArray(row),
  ) as SourceLocaleEvidence[];
  const eligible = evidence.filter(
    (row) =>
      isSupportedLocale(row.sourceLocale) &&
      !['ARCHIVED', 'REJECTED', 'SUPERSEDED', 'INACTIVE'].includes(row.status ?? '') &&
      row.isCurrent !== false,
  );
  const score = (row: SourceLocaleEvidence) => [
    (row.isCurrent === true ? 2 : 0) + (row.isVerified === true ? 1 : 0),
    Number.isFinite(new Date(row.importedAt ?? row.acquiredAt ?? row.updatedAt ?? row.createdAt ?? 0).getTime())
      ? new Date(row.importedAt ?? row.acquiredAt ?? row.updatedAt ?? row.createdAt ?? 0).getTime()
      : 0,
  ];
  const ordered = [...eligible].sort(
    (a, b) => score(b)[0] - score(a)[0] || score(b)[1] - score(a)[1],
  );
  if (!ordered.length) return { locale: null, status: 'MISSING' as const };
  const highest = score(ordered[0]);
  const top = ordered.filter((row) => score(row)[0] === highest[0] && score(row)[1] === highest[1]);
  const locales = new Set(top.map((row) => row.sourceLocale));
  return locales.size === 1
    ? {
        locale: ordered[0].sourceLocale as SupportedLocale,
        status: ordered[0].isVerified
          ? ('VERIFIED_SOURCE' as const)
          : ('SOURCE_UNVERIFIED' as const),
      }
    : { locale: null, status: 'AMBIGUOUS' as const };
}

export interface LocalizedFieldReadiness {
  hasValue: boolean;
  reviewed: boolean;
  published: boolean;
  publicUsable: boolean;
  requestedLocale: SupportedLocale;
  resolvedLocale: SupportedLocale | null;
  availability: 'REQUESTED' | 'FALLBACK' | 'MISSING';
}
export function assessLocalizedPage(
  locale: SupportedLocale,
  fields: readonly {
    value?: string | null;
    reviewStatus?: string;
    resolvedLocale?: SupportedLocale | null;
  }[],
) {
  const fieldStates = fields.map((field) => ({
    hasValue: Boolean(field.value?.trim()),
    reviewed: ['APPROVED', 'PUBLISHED'].includes(field.reviewStatus ?? ''),
    published: field.reviewStatus === 'PUBLISHED',
    publicUsable:
      Boolean(field.value?.trim()) &&
      field.reviewStatus === 'PUBLISHED' &&
      field.resolvedLocale === locale,
    requestedLocale: locale,
    resolvedLocale: field.resolvedLocale ?? null,
    availability: !field.value?.trim()
      ? ('MISSING' as const)
      : field.resolvedLocale === locale
        ? ('REQUESTED' as const)
        : ('FALLBACK' as const),
  }));
  const fullyLocalized = fields.length > 0 && fieldStates.every((field) => field.publicUsable);
  return {
    fields: fieldStates,
    fullyLocalized,
    indexable: fullyLocalized && isPublicTemplateLocaleEnabled(locale),
  };
}
