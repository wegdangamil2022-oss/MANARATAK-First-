import { createHash } from 'node:crypto';

export function auditExportManifest(input: {
  actorId: string;
  filters: Record<string, unknown>;
  items: Array<{ id: string }>;
  hasMore: boolean;
  startedAt: string;
}) {
  const { cursor: _cursor, format: _format, ...filters } = input.filters;
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b))));
  return {
    version: 1,
    scope: 'BOUNDED_PAGE' as const,
    snapshot: 'NOT_A_STABLE_MULTI_PAGE_SNAPSHOT' as const,
    coverage: input.hasMore || input.filters.cursor ? 'PARTIAL' : 'COMPLETE_FOR_QUERY_AT_READ_TIME',
    actorId: input.actorId,
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    filterHash: createHash('sha256').update(canonical).digest('hex'),
    exportedCount: input.items.length,
    eventIds: input.items.map(item => item.id),
    hasMore: input.hasMore,
    sanitizerVersion: 'AUDIT_READ_V1',
    contentSha256: createHash('sha256').update(JSON.stringify(input.items)).digest('hex'),
    checksumScope: 'EXPORTED_ITEMS_JSON_ONLY_NOT_DATABASE_INTEGRITY',
    cryptographicRecordVerification: false,
  };
}
