export type GraphReadScope = {
  capturedAt: string;
  consistency: 'LIVE_OWNER_READS';
  collections: Record<
    string,
    {
      state: 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_INTEGRATED';
      errorCode?: string;
      scope?: 'OWNER_QUERY' | 'PROGRAM_PAGE_SAMPLE';
      total?: number | null;
      hasMore?: boolean;
      nextCursor?: string | null;
    }
  >;
};
export function createGraphReadScope(): GraphReadScope {
  return { capturedAt: new Date().toISOString(), consistency: 'LIVE_OWNER_READS', collections: {} };
}
export async function graphOwnerRead<T>(
  scope: GraphReadScope,
  name: string,
  read: (() => Promise<T>) | undefined,
  empty: T,
): Promise<T> {
  if (!read) {
    scope.collections[name] = { state: 'NOT_INTEGRATED', total: null };
    return empty;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([read(), new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('OWNER_READ_TIMEOUT')), 5000);
    })]);
    scope.collections[name] = { state: 'AVAILABLE', scope: 'OWNER_QUERY' };
    return value;
  } catch {
    scope.collections[name] = {
      state: 'UNAVAILABLE',
      errorCode: 'OWNER_READ_UNAVAILABLE',
      total: null,
    };
    return empty;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export function requireGraphFirstPage(page?: number) {
  if (page !== undefined && page !== 1) throw new Error('GRAPH_PAGE_UNSUPPORTED_USE_EDGE_CURSOR');
}
export function reviewedGraphLabel(
  value: {
    displayName?: string;
    canonicalName?: string;
    translations?: Array<{ locale: string; reviewStatus?: string; displayName?: string | null }>;
  },
  locale = 'ar',
) {
  const translated = value.translations?.find(
    (row) => row.locale === locale && row.reviewStatus === 'PUBLISHED' && row.displayName,
  );
  return {
    displayName: translated?.displayName ?? value.displayName ?? value.canonicalName ?? '',
    labelLocale: translated ? locale : 'OWNER_DEFAULT',
    localeFallback: !translated,
  };
}
