/** Adapt legacy page-number graph UI without silently repeating owner page one. */
export async function budgetedOwnerCursorPage<T>(
  fetchPage: (
    cursor?: string,
  ) => Promise<{ data: T[]; total: number; nextCursor?: string | null; hasMore?: boolean }>,
  page: number,
  pageSize: number,
) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 25)
    throw new Error('OWNER_CURSOR_PAGE_BUDGET_EXCEEDED');
  let cursor: string | undefined;
  const seen = new Set<string>();
  for (let index = 1; index <= page; index++) {
    const result = await fetchPage(cursor);
    const totalPages = Math.ceil(result.total / pageSize);
    if (index === page) return { ...result, page, pageSize, totalPages };
    if (!result.nextCursor)
      return { ...result, data: [] as T[], page, pageSize, totalPages, hasMore: false };
    if (seen.has(result.nextCursor)) throw new Error('OWNER_CURSOR_DID_NOT_ADVANCE');
    seen.add(result.nextCursor);
    cursor = result.nextCursor;
  }
  throw new Error('OWNER_CURSOR_PAGE_BUDGET_EXCEEDED');
}
