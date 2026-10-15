import type { GraphReadScope } from './GraphReadPolicy';
export type GraphEdgeCursors = {
  universityCursor?: string;
  scholarshipCursor?: string;
  courseCursor?: string;
  programCursor?: string;
  majorCursor?: string;
  editorialCursor?: string;
  testCursor?: string;
  careerCursor?: string;
  serviceCursor?: string;
  toolCursor?: string;
};
export const graphEdgeCursorKeys: Record<string, keyof GraphEdgeCursors> = {
  universities: 'universityCursor',
  scholarships: 'scholarshipCursor',
  courses: 'courseCursor',
  preparationCourses: 'courseCursor',
  providerHeadquartersCourses: 'courseCursor',
  academicPrograms: 'programCursor',
  majors: 'majorCursor',
  editorialContent: 'editorialCursor',
  internationalTests: 'testCursor',
  careerJobs: 'careerCursor',
  services: 'serviceCursor',
  studentTools: 'toolCursor',
};
/** Arrays are owner-provided canonical relations, not an offset into unrelated owner pages. */
export function graphArrayPage<T>(
  rows: T[],
  key: (value: T) => string,
  scopeKey: string,
  cursor: string | undefined,
  limit: number,
) {
  let after = '';
  if (cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (
        parsed.scope !== scopeKey ||
        typeof parsed.after !== 'string' ||
        !parsed.after ||
        parsed.after.length > 240
      )
        throw new Error();
      after = parsed.after;
    } catch {
      throw new Error('GRAPH_CURSOR_INVALID');
    }
  }
  const ordered = [...new Map(rows.map((row) => [key(row), row])).values()].sort((a, b) =>
    key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0,
  );
  const candidates = ordered.filter((row) => key(row) > after),
    data = candidates.slice(0, limit),
    hasMore = candidates.length > limit;
  return {
    data,
    total: ordered.length,
    hasMore,
    nextCursor: hasMore
      ? Buffer.from(JSON.stringify({ scope: scopeKey, after: key(data.at(-1)!) })).toString(
          'base64url',
        )
      : null,
  };
}
export function finalizeGraph<T extends { readScope?: GraphReadScope; relationships: object }>(
  graph: T,
  scopeKey: string,
  options: GraphEdgeCursors,
  pageSize: number,
): T {
  const scope = graph.readScope!;
  for (const [name, value] of Object.entries(graph.relationships)) {
    const cursorKey = graphEdgeCursorKeys[name];
    if (!cursorKey) continue;
    if (
      scope.collections[name]?.state === 'UNAVAILABLE' ||
      scope.collections[name]?.state === 'NOT_INTEGRATED'
    )
      continue;
    if (Array.isArray(value)) {
      // Owner-native program/major/CMS pages have already populated this scope.
      if (
        scope.collections[name]?.scope === 'OWNER_QUERY' &&
        scope.collections[name].total !== undefined
      )
        continue;
      const page = graphArrayPage(
        value,
        (row) => String(row.ownerId ?? row.contentId),
        `${scopeKey}:${name}`,
        options[cursorKey],
        pageSize,
      );
      Object.assign(graph.relationships, { [name]: page.data });
      scope.collections[name] = {
        ...scope.collections[name],
        state: scope.collections[name]?.state ?? 'AVAILABLE',
        scope: 'OWNER_QUERY',
        total: page.total,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor,
      };
    } else if (value && typeof value === 'object' && Array.isArray(value.data)) {
      const previous = scope.collections[name];
      scope.collections[name] = {
        ...previous,
        state: previous?.state ?? 'AVAILABLE',
        scope: 'OWNER_QUERY',
        total: previous?.state === 'UNAVAILABLE' ? null : (value.total ?? null),
        hasMore: value.hasMore ?? false,
        nextCursor: value.nextCursor ?? null,
      };
    }
  }
  return graph;
}
