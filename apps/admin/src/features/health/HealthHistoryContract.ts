export type History = {
  protocolVersion: 2;
  availability: string;
  scope: string;
  window: string;
  nextCursor: string | null;
  total: number;
  startedAt?: string;
  continuousCoverage?: false;
  samplingMinimumMs?: number;
  samples: Array<{ checkedAt: string; components: Array<{ id: string; status: string }> }>;
};
export function parseHistory(value: unknown, expectedWindow?: string): History {
  const data = value as History;
  if (
    !data ||
    (data.startedAt !== undefined &&
      (typeof data.startedAt !== 'string' || !Number.isFinite(Date.parse(data.startedAt)))) ||
    (data.continuousCoverage !== undefined && data.continuousCoverage !== false) ||
    (data.samplingMinimumMs !== undefined &&
      (!Number.isFinite(data.samplingMinimumMs) || data.samplingMinimumMs < 30000)) ||
    data.protocolVersion !== 2 ||
    !['PARTIAL_OBSERVATIONS', 'UNAVAILABLE'].includes(data.availability) ||
    !['1h', '24h', '7d'].includes(data.window) ||
    (expectedWindow !== undefined && data.window !== expectedWindow) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.total > 10000 ||
    (data.nextCursor !== null &&
      (typeof data.nextCursor !== 'string' || !Number.isFinite(Date.parse(data.nextCursor)))) ||
    data.scope !== 'PROCESS_LOCAL_SESSION' ||
    !Array.isArray(data.samples) ||
    data.samples.length > 200 ||
    !data.samples.every(
      (s) =>
        s &&
        Number.isFinite(Date.parse(s.checkedAt)) &&
        Array.isArray(s.components) &&
        s.components.length <= 100 &&
        s.components.every(
          (c) =>
            c &&
            typeof c.id === 'string' &&
            /^[a-z][a-z0-9-]{0,79}$/.test(c.id) &&
            ['UP', 'DOWN', 'UNKNOWN', 'DEGRADED'].includes(c.status),
        ),
    )
  )
    throw new Error('SCHEMA_MISMATCH');
  if (
    data.total < data.samples.length ||
    (data.availability === 'UNAVAILABLE' && data.samples.length > 0) ||
    (data.nextCursor && data.samples.length === 0)
  )
    throw new Error('SCHEMA_MISMATCH');
  return data;
}
