import type { ReviewDomain, ReviewReason, ReviewSource } from './ReviewSources';
import { domains, reasons } from './ReviewSources';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type SourceKind = 'imported' | 'manual' | 'cms' | 'unknown';
export type ReviewSignal = {
  key: string;
  source: string;
  reason: ReviewReason;
  capturedAt: string;
  reviewEnteredAt: string | null;
  dueAt: string | null;
  priority: Priority;
  priorityBasis: 'owner' | 'suggested';
  policy: string | null;
  ownerCode?: string;
};
export type ReviewItem = {
  key: string;
  id: string;
  kind: 'canonical' | 'import_record';
  domain: ReviewDomain;
  title: string;
  locale: string | null;
  href: string;
  detail: boolean;
  signals: ReviewSignal[];
  importedAt: string | null;
  modifiedAt: string | null;
  sourceKind: SourceKind;
  sourceUrl: string | null;
  verificationState: string;
  importRecordId: string | null;
  batchId: string | null;
  sourceRowNumber: number | null;
  sourceSystem: string | null;
  auditTarget: { domain: ReviewDomain; type: string; id: string } | null;
  diff: 'supported' | 'unsupported' | 'not_applicable';
};
export type ReviewFilters = {
  domain: string;
  reason: string;
  priority: string;
  source: string;
  age: string;
  sort: string;
  view: string;
};
const filterValues: Record<keyof ReviewFilters, readonly string[]> = {
  domain: ['all', ...domains],
  reason: ['all', ...reasons],
  priority: ['all', 'critical', 'high', 'medium', 'low'],
  source: ['all', 'imported', 'manual', 'cms', 'unknown'],
  age: ['all', 'today', 'week', 'older', 'unknown'],
  sort: ['priority', 'newest', 'oldest'],
  view: ['all', 'urgent', 'overdue', 'imported_today', 'translation', 'source', 'ready'],
};
export function parseReviewFilters(params: URLSearchParams): ReviewFilters {
  return Object.fromEntries(
    Object.entries(filterValues).map(([key, values]) => [
      key,
      values.includes(params.get(key) ?? '') ? params.get(key)! : values[0],
    ]),
  ) as ReviewFilters;
}
export function serializeReviewFilters(filters: ReviewFilters): URLSearchParams {
  const safe = parseReviewFilters(new URLSearchParams(filters));
  return new URLSearchParams(
    Object.entries(safe).filter(
      ([key, value]) => value !== filterValues[key as keyof ReviewFilters][0],
    ),
  );
}
export function dateValue(value: unknown): string | null {
  if (!(typeof value === 'string' || value instanceof Date)) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
export function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function ageBucket(value: string | null, now = Date.now()): string {
  if (!value || !Number.isFinite(Date.parse(value)) || Date.parse(value) > now) return 'unknown';
  const age = now - Date.parse(value);
  return age <= 86400000 ? 'today' : age <= 604800000 ? 'week' : 'older';
}
export function signalSla(
  signal: ReviewSignal,
  now = Date.now(),
): 'unknown' | 'on_track' | 'overdue' {
  if (
    !signal.reviewEnteredAt ||
    !signal.dueAt ||
    !signal.policy ||
    !Number.isFinite(Date.parse(signal.reviewEnteredAt)) ||
    !Number.isFinite(Date.parse(signal.dueAt)) ||
    Date.parse(signal.reviewEnteredAt) > now ||
    Date.parse(signal.dueAt) < Date.parse(signal.reviewEnteredAt)
  )
    return 'unknown';
  return Date.parse(signal.dueAt) < now ? 'overdue' : 'on_track';
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.slice(0, 500) : null;
}
export function projectReviewItem(
  source: ReviewSource,
  record: Record<string, unknown>,
  capturedAt: string,
): ReviewItem | null {
  const destination = source.domain === 'study-destinations';
  let countryIso2: string | null = null;
  let destinationProfileId: string | null = null;
  if (destination) {
    const country = record.country as Record<string, unknown> | undefined;
    const profile = record.profile as Record<string, unknown> | null;
    if (!country || !text(country.id) || !/^[A-Z]{2}$/.test(String(country.iso2Code)))
      throw new Error('SOURCE_COUNTRY_ID_INVALID');
    if (record.profile !== null && (!profile || typeof profile !== 'object' || Array.isArray(profile)))
      throw new Error('SOURCE_PROFILE_INVALID');
    if (profile && (!text(profile.id) || !['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(String(profile.status))))
      throw new Error('SOURCE_PROFILE_INVALID');
    countryIso2 = String(country.iso2Code);
    destinationProfileId = profile ? text(profile.id) : null;
    if ((source.params.status === 'NO_PROFILE' && profile) ||
      (source.params.status !== 'NO_PROFILE' && (!profile || profile.status !== source.params.status)) ||
      (source.params.completenessStatus && profile?.completenessStatus !== source.params.completenessStatus))
      throw new Error('SOURCE_DESTINATION_STATUS_INVALID');
    record = { ...profile, id: country.id, profileId: destinationProfileId,
      displayName: country.nameAr || country.name || countryIso2 };
  }
  const id = text(record.id);
  if (!id) throw new Error('SOURCE_RECORD_ID_MISSING');
  const verificationState =
    text(record.verificationState) ??
    (record.sourceVerified === true
      ? 'VERIFIED'
      : record.sourceVerified === false
        ? 'NEEDS_VERIFICATION'
        : 'UNKNOWN');
  if (source.key === 'courses:verification' && verificationState === 'VERIFIED') return null;
  const kind = source.key === 'scholarships:import' ? 'import_record' : 'canonical';
  const profileId = text(record.profileId);
  const key = `${source.domain}:${kind}:${id}:${profileId ?? ''}`;
  const ownerPriority = text(record.reviewPriority)?.toLowerCase();
  const owner = ['critical', 'high', 'medium', 'low'].includes(ownerPriority ?? '');
  const importRecordId = kind === 'import_record' ? id : text(record.sourceImportRecordId);
  let href = source.detail ? `${source.path}/${encodeURIComponent(id)}` : source.path;
  if (destination) href = `${source.path}/${countryIso2}`;
  if (source.domain === 'majors' && profileId)
    href += `?profileId=${encodeURIComponent(profileId)}`;
  const sourceKind = ['manual', 'imported', 'cms'].includes(String(record.sourceKind))
    ? (record.sourceKind as SourceKind)
    : source.imported ||
        importRecordId ||
        record.status === 'IMPORTED' ||
        record.originType === 'EXTERNAL_LINKED_COURSE'
      ? 'imported'
      : 'unknown';
  const item: ReviewItem = {
    key,
    id,
    kind,
    domain: source.domain,
    title:
      text(record.localizedNameAr) ??
      text(record.nameAr) ??
      text(record.displayName) ??
      text(record.title) ??
      text(record.cleanedScholarshipName) ??
      text(record.rawSourceTitle) ??
      text(record.canonicalName) ??
      id,
    locale: text(record.primaryLocale) ?? text(record.locale),
    href,
    detail: source.detail,
    signals: [
      {
        key: `${key}:${source.key}`,
        source: source.key,
        reason: source.reason,
        capturedAt,
        reviewEnteredAt: dateValue(record.reviewEnteredAt),
        dueAt: dateValue(record.reviewDueAt),
        policy: text(record.reviewPolicy),
        priority: owner
          ? (ownerPriority as Priority)
          : ['broken_link', 'source_verification', 'incomplete'].includes(source.reason)
            ? 'high'
            : 'medium',
        priorityBasis: owner ? 'owner' : 'suggested',
      },
    ],
    importedAt: dateValue(record.importedAt),
    modifiedAt: dateValue(record.updatedAt),
    sourceKind,
    sourceUrl: safeSourceUrl(
      record.officialSourceUrl ?? record.sourceUrl ?? record.directCourseUrl,
    ),
    verificationState,
    importRecordId,
    batchId: text(record.batchId) ?? text(record.importBatchId),
    sourceRowNumber: Number.isSafeInteger(record.sourceRowNumber)
      ? Number(record.sourceRowNumber)
      : null,
    sourceSystem: text(record.sourceSystem),
    // The owner audits COUNTRY_STUDY_PROFILE against country.id, not profile.id.
    auditTarget: destination
      ? (destinationProfileId ? { domain: source.domain, type: 'COUNTRY_STUDY_PROFILE', id } : null)
      : source.targetType ? { domain: source.domain, type: source.targetType, id } : null,
    diff:
      source.domain === 'scholarships' && importRecordId
        ? 'supported'
        : sourceKind === 'imported'
          ? 'unsupported'
          : 'not_applicable',
  };
  if (kind === 'import_record' && Array.isArray(record.reviewReasons)) {
    const codes = record.reviewReasons.filter(
      (value): value is string => typeof value === 'string' && value.length <= 200,
    );
    if (codes.length)
      item.signals = [...new Set(codes)].slice(0, 50).map((code) => ({
        ...item.signals[0],
        key: `${key}:${source.key}:${code}`,
        ownerCode: code,
      }));
  }
  if (!source.detail) {
    if (kind === 'import_record' && item.batchId)
      item.href += `?${new URLSearchParams({ reviewBatch: item.batchId })}`;
    else if (kind !== 'import_record')
      item.href += `?${new URLSearchParams({ reviewSearch: item.title.slice(0, 120) })}`;
  }
  return item;
}
export function mergeReviewItems(items: ReviewItem[]): ReviewItem[] {
  const map = new Map<string, ReviewItem>();
  for (const item of items) {
    const prior = map.get(item.key);
    if (!prior) {
      map.set(item.key, { ...item, signals: [...item.signals] });
      continue;
    }
    prior.signals = [
      ...new Map(
        [...prior.signals, ...item.signals].map((signal) => [signal.key, signal]),
      ).values(),
    ];
    // Do not rewrite signal entry clocks from another reason's modification clock.
  }
  return [...map.values()];
}
export function matchesReviewItem(
  item: ReviewItem,
  filters: ReviewFilters,
  now = Date.now(),
): boolean {
  return (
    (filters.domain === 'all' || filters.domain === item.domain) &&
    (filters.reason === 'all' || item.signals.some((s) => s.reason === filters.reason)) &&
    (filters.priority === 'all' || item.signals.some((s) => s.priority === filters.priority)) &&
    (filters.source === 'all' || item.sourceKind === filters.source) &&
    (filters.age === 'all' ||
      item.signals.some((s) => ageBucket(s.reviewEnteredAt, now) === filters.age)) &&
    (filters.view !== 'urgent' ||
      item.signals.some((s) => ['critical', 'high'].includes(s.priority))) &&
    (filters.view !== 'overdue' || item.signals.some((s) => signalSla(s, now) === 'overdue')) &&
    (filters.view !== 'imported_today' ||
      (item.sourceKind === 'imported' && ageBucket(item.importedAt, now) === 'today')) &&
    (filters.view !== 'translation' ||
      item.signals.some((s) => s.reason === 'needs_translation')) &&
    (filters.view !== 'source' || item.signals.some((s) => s.reason === 'source_verification')) &&
    (filters.view !== 'ready' || item.signals.some((s) => s.reason === 'ready_to_publish'))
  );
}
export const reviewFilterValues = filterValues;
