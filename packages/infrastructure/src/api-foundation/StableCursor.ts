export interface StableCursorPage<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

const PREFIX = 'mn1:';

/** Opaque cursor over immutable owner IDs. Public catalog traversal is ordered by id ASC. */
export function encodeStableCursor(id: string): string {
  if (!id) throw new Error('CURSOR_ID_REQUIRED');
  return Buffer.from(`${PREFIX}${id}`, 'utf8').toString('base64url');
}

export function decodeStableCursor(cursor?: string | null): string | null {
  if (!cursor) return null;
  if (cursor.length > 2048) throw new Error('CURSOR_INVALID');
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  } catch {
    throw new Error('CURSOR_INVALID');
  }
  if (!decoded.startsWith(PREFIX) || decoded.length <= PREFIX.length) throw new Error('CURSOR_INVALID');
  return decoded.slice(PREFIX.length);
}

export function boundedCursorLimit(limit?: number, fallback = 20, max = 100): number {
  const value = Number.isInteger(limit) ? Number(limit) : fallback;
  return Math.min(max, Math.max(1, value));
}

export async function queryStableCursorPage<TRecord, TOutput>(input: {
  delegate: { findMany(args: any): Promise<TRecord[]>; count(args: any): Promise<number> };
  where: unknown;
  include?: unknown;
  select?: unknown;
  cursor?: string | null;
  limit?: number;
  map: (record: TRecord) => TOutput;
}): Promise<{ data: TOutput[]; total: number; page: number; pageSize: number; totalPages: number; hasMore: boolean; nextCursor: string | null }> {
  const limit = boundedCursorLimit(input.limit);
  const afterId = decodeStableCursor(input.cursor);
  const query: any = {
    where: input.where,
    take: limit + 1,
    orderBy: { id: 'asc' },
    ...(input.include === undefined ? {} : { include: input.include }),
    ...(input.select === undefined ? {} : { select: input.select }),
    ...(afterId ? { cursor: { id: afterId }, skip: 1 } : {}),
  };
  const [candidateRows, total] = await Promise.all([
    input.delegate.findMany(query),
    input.delegate.count({ where: input.where }),
  ]);
  const hasMore = candidateRows.length > limit;
  const rows = hasMore ? candidateRows.slice(0, limit) : candidateRows;
  const last = rows.at(-1) as any;
  return {
    data: rows.map(input.map),
    total,
    page: 1,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
    hasMore,
    nextCursor: hasMore && last?.id ? encodeStableCursor(String(last.id)) : null,
  };
}
