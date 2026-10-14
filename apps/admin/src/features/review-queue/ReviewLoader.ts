import type { ReviewSource } from './ReviewSources';
import { dateValue, projectReviewItem, type ReviewItem } from './ReviewContracts';
export type Availability = 'ready' | 'partial' | 'unavailable' | 'access_denied' | 'stale';
export type ReviewPageState = {
  source: ReviewSource;
  availability: Availability;
  rows: ReviewItem[];
  nextPage: number | null;
  scanned: number;
  total: number | null;
  totalScope: 'matching_records' | 'owner_candidates';
  capturedAt: string | null;
  consistency: 'LIVE_OFFSET_RECHECK_REQUIRED';
  errorCode: string | null;
  windowLimited: boolean;
  ownerChanged: boolean;
};
export type ReviewRequest = (
  url: string,
  options: { signal: AbortSignal; cache: 'no-store' },
) => Promise<unknown>;
export function initialSourceState(source: ReviewSource, allowed: boolean): ReviewPageState {
  return {
    source,
    availability: allowed ? 'unavailable' : 'access_denied',
    rows: [],
    nextPage: allowed ? 1 : null,
    scanned: 0,
    total: null,
    totalScope: source.imported ? 'owner_candidates' : 'matching_records',
    capturedAt: null,
    consistency: 'LIVE_OFFSET_RECHECK_REQUIRED',
    errorCode: allowed ? null : 'ACCESS_DENIED',
    windowLimited: false,
    ownerChanged: false,
  };
}
export function reviewErrorCode(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : '';
  return message.includes('[403]')
    ? 'ACCESS_DENIED'
    : message.includes('[401]')
      ? 'SESSION_REQUIRED'
      : message.includes('TIMEOUT')
        ? 'SOURCE_TIMEOUT'
        : message.includes('INVALID') || message.includes('MISSING')
          ? 'SOURCE_CONTRACT_INVALID'
          : 'SOURCE_UNAVAILABLE';
}
export async function readNextReviewPage(
  state: ReviewPageState,
  request: ReviewRequest,
  signal: AbortSignal,
): Promise<ReviewPageState> {
  if (state.nextPage === null || signal.aborted || state.availability === 'access_denied')
    return state;
  const page = state.nextPage,
    pageSize = state.source.key === 'scholarships:import' ? 25 : 50;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const capturedAt = new Date().toISOString();
  try {
    const response = await Promise.race([
      request(
        `${state.source.endpoint}?${new URLSearchParams({ ...state.source.params, page: String(page), pageSize: String(pageSize) })}`,
        { signal: controller.signal, cache: 'no-store' },
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('SOURCE_TIMEOUT'));
        }, 8000);
      }),
    ]);
    if (signal.aborted) return state;
    if (!response || typeof response !== 'object') throw new Error('SOURCE_RESPONSE_INVALID');
    const value = response as Record<string, unknown>;
    if (
      !Array.isArray(value.data) ||
      value.data.length > pageSize ||
      !Number.isSafeInteger(value.total) ||
      Number(value.total) < 0 ||
      value.page !== page ||
      value.pageSize !== pageSize
    )
      throw new Error('SOURCE_PAGE_INVALID');
    const rawTotal = Number(value.total);
    const hasMore = typeof value.hasMore === 'boolean' ? value.hasMore : page * pageSize < rawTotal;
    const scannedRecords = value.scannedRecords ?? value.data.length;
    if (
      !Number.isSafeInteger(scannedRecords) ||
      Number(scannedRecords) < value.data.length ||
      Number(scannedRecords) > pageSize
    )
      throw new Error('SOURCE_SCAN_INVALID');
    // A safely filtered candidate page can legitimately contain no REAL review rows.
    if (hasMore && Number(scannedRecords) === 0) throw new Error('SOURCE_CONTINUATION_INVALID');
    const incoming = value.data
      .map((row: unknown) => {
        if (!row || typeof row !== 'object' || Array.isArray(row))
          throw new Error('SOURCE_ROW_INVALID');
        return projectReviewItem(state.source, row as Record<string, unknown>, capturedAt);
      })
      .filter((row): row is ReviewItem => row !== null);
    const all = [...new Map([...state.rows, ...incoming].map((row) => [row.key, row])).values()];
    const windowLimited = state.windowLimited || all.length > 500;
    const totalChanged = (state.total !== null && state.total !== rawTotal) || state.ownerChanged;
    const pageLimit = hasMore && page >= (state.source.maxPage ?? 10000);
    return {
      ...state,
      rows: all.slice(-500),
      scanned: state.scanned + Number(scannedRecords),
      total: rawTotal,
      totalScope:
        value.totalScope === 'owner_candidates' || state.source.key === 'courses:verification'
          ? 'owner_candidates'
          : 'matching_records',
      nextPage: hasMore && !pageLimit ? page + 1 : null,
      capturedAt,
      availability: totalChanged ? 'stale' : hasMore || windowLimited ? 'partial' : 'ready',
      windowLimited,
      ownerChanged: totalChanged,
      errorCode: pageLimit ? 'OWNER_PAGE_LIMIT' : totalChanged ? 'SOURCE_CHANGED_RECHECK' : null,
    };
  } catch (cause) {
    if (signal.aborted) return state;
    const errorCode = reviewErrorCode(cause);
    return {
      ...state,
      availability:
        errorCode === 'ACCESS_DENIED' || errorCode === 'SESSION_REQUIRED'
          ? 'access_denied'
          : state.rows.length
            ? 'stale'
            : 'unavailable',
      rows: errorCode === 'ACCESS_DENIED' || errorCode === 'SESSION_REQUIRED' ? [] : state.rows,
      total: errorCode === 'ACCESS_DENIED' || errorCode === 'SESSION_REQUIRED' ? null : state.total,
      nextPage: errorCode === 'ACCESS_DENIED' || errorCode === 'SESSION_REQUIRED' ? null : page,
      errorCode,
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
export async function loadReviewSources(
  states: ReviewPageState[],
  request: ReviewRequest,
  signal: AbortSignal,
  onSource: (state: ReviewPageState) => void,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, states.length) }, async () => {
      while (!signal.aborted && next < states.length) {
        const index = next++;
        const result = await readNextReviewPage(states[index], request, signal);
        if (!signal.aborted) onSource(result);
      }
    }),
  );
}
export function auditQuery(item: ReviewItem, allowed: boolean, cursor?: string): string | null {
  if (!allowed || !item.auditTarget) return null;
  return `/admin/audit/records?${new URLSearchParams({ targetId: item.auditTarget.id, targetType: item.auditTarget.type, limit: '12', ...(cursor ? { cursor } : {}) })}`;
}

/** Preview allowlist intentionally omits actor and context metadata. */
export function parseAuditPreview(value: unknown, item: ReviewItem) {
  if (!value || typeof value !== 'object' || !item.auditTarget)
    throw new Error('AUDIT_RESPONSE_INVALID');
  const response = value as Record<string, unknown>;
  if (
    !Array.isArray(response.items) ||
    response.items.length > 12 ||
    typeof response.hasMore !== 'boolean' ||
    (response.nextCursor !== null &&
      (typeof response.nextCursor !== 'string' || response.nextCursor.length > 2048)) ||
    (response.hasMore && (!response.nextCursor || response.items.length === 0))
  )
    throw new Error('AUDIT_PAGE_INVALID');
  const items = response.items.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('AUDIT_ROW_INVALID');
    const row = value as Record<string, unknown>,
      target = row.target as Record<string, unknown> | undefined;
    const timestamp = dateValue(row.timestamp);
    if (
      target?.targetId !== item.auditTarget!.id ||
      target?.targetType !== item.auditTarget!.type ||
      typeof row.id !== 'string' ||
      row.id.length > 200 ||
      typeof row.action !== 'string' ||
      row.action.length > 200 ||
      !timestamp
    )
      throw new Error('AUDIT_TARGET_INVALID');
    return { id: row.id, action: row.action, timestamp };
  });
  return { items, hasMore: response.hasMore, nextCursor: response.nextCursor as string | null };
}
