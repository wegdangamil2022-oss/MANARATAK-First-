import type { ReviewPage, ReviewQuery, ReviewRecord } from '@manaratak/shared';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
export const workRequest = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  adminApiClient.request<T>('/admin/review-workspace' + path, {
    cache: 'no-store',
    signal,
    ...(body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          idempotencyKey: createAdminIdempotencyKey(),
        }),
  });
export function parseWorkspacePage(value: ReviewPage): ReviewPage {
  if (
    !value ||
    !Array.isArray(value.records) ||
    value.records.length > 50 ||
    !Array.isArray(value.sources) ||
    !['complete', 'partial'].includes(value.coverage) ||
    !value.counters ||
    typeof value.snapshot !== 'string' ||
    (value.total !== null && (!Number.isSafeInteger(value.total) || value.total < 0))
  )
    throw new Error('REVIEW_RESPONSE_INVALID');
  if (new Set(value.records.map((row) => row.key)).size !== value.records.length)
    throw new Error('REVIEW_DUPLICATE_INVALID');
  for (const row of value.records)
    if (
      typeof row.key !== 'string' ||
      !Array.isArray(row.reasons) ||
      typeof row.title !== 'string' ||
      typeof row.href !== 'string' ||
      !/^\/(scholarships|universities|majors|courses|international-tests|services|cms|careers|study-destinations|imports\/scholarships)(\/|\?|$)/.test(
        row.href,
      ) ||
      !Number.isInteger(row.version)
    )
      throw new Error('REVIEW_RECORD_INVALID');
  for (const counter of Object.values(value.counters))
    if (counter !== null && (!Number.isSafeInteger(counter) || counter < 0))
      throw new Error('REVIEW_COUNT_INVALID');
  return value;
}
export function ownerEvidenceItem(row: ReviewRecord) {
  return {
    key: row.key,
    id: row.ownerId,
    kind: row.profileId === 'import' ? ('import_record' as const) : ('canonical' as const),
    domain: row.domain,
    title: row.title,
    status: row.status,
    locale: row.locale,
    href: row.href,
    detail: row.detail,
    signals: [],
    importedAt: null,
    modifiedAt: row.modifiedAt,
    sourceKind: ['manual', 'imported', 'cms'].includes(row.sourceKind)
      ? (row.sourceKind as 'manual' | 'imported' | 'cms')
      : ('unknown' as const),
    sourceUrl: row.sourceUrl,
    verificationState: row.verificationState,
    importRecordId: row.importRecordId,
    batchId: row.batchId,
    sourceRowNumber: row.sourceRowNumber,
    sourceSystem: null,
    auditTarget: row.auditType
      ? { domain: row.domain, type: row.auditType, id: row.ownerId }
      : null,
    diff:
      row.domain === 'scholarships' && row.importRecordId
        ? ('supported' as const)
        : ('unsupported' as const),
  };
}
export function cleanWorkspaceFilters(query: ReviewQuery): ReviewQuery {
  return Object.fromEntries(
    Object.entries(query).filter(
      ([key, value]) =>
        value !== undefined &&
        value !== '' &&
        value !== 'all' &&
        !['cursor', 'snapshot'].includes(key),
    ),
  ) as ReviewQuery;
}
