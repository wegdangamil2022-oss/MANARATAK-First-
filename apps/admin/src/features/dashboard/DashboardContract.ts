import { parseHealthOverview, type HealthOverview } from '../health/HealthOverviewContract';
import type { DashboardSource } from './DashboardSources';
export type ReadState =
  | 'loading'
  | 'available'
  | 'partial'
  | 'forbidden'
  | 'unavailable'
  | 'timed_out'
  | 'network_error'
  | 'stale'
  | 'not_measured';
export type DashboardActivity = {
  id: string;
  action: string;
  targetClass: string;
  owner: string;
  actorAlias: 'IDENTITY' | 'SYSTEM' | 'UNKNOWN';
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE' | 'INTENT' | 'UNKNOWN';
};
export type DashboardReading = {
  source: DashboardSource;
  state: ReadState;
  metrics: Record<string, number | null>;
  errors: Record<string, string>;
  capturedAt: string | null;
  receivedAt: string | null;
  consistency: 'BEST_EFFORT_OWNER_READS';
  health: HealthOverview | null;
  reconciliation: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN' | null;
  activity: DashboardActivity[];
  activityPartial: boolean;
};
export function safeCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function strictSum(values: Array<number | null>): number | null {
  if (!values.length || values.some((value) => safeCount(value) === null)) return null;
  return safeCount((values as number[]).reduce((sum, value) => sum + value, 0));
}
export function coverageSubtotal(values: Array<number | null>) {
  const known = values.filter((value): value is number => safeCount(value) !== null);
  return {
    knownSubtotal: known.length ? strictSum(known) : null,
    missing: values.length - known.length,
    exact: known.length === values.length && values.length > 0,
  };
}
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
export function timestamp(value: unknown): string | null {
  if (!(typeof value === 'string' || value instanceof Date)) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
export function initialDashboardReading(
  source: DashboardSource,
  allowed: boolean,
): DashboardReading {
  return {
    source,
    state: allowed ? 'loading' : 'forbidden',
    metrics: Object.fromEntries(source.metrics.map((key) => [key, null])),
    errors: {},
    capturedAt: null,
    receivedAt: null,
    consistency: 'BEST_EFFORT_OWNER_READS',
    health: null,
    reconciliation: null,
    activity: [],
    activityPartial: false,
  };
}
export function parseDashboardResponse(
  source: DashboardSource,
  value: unknown,
  receivedAt = new Date().toISOString(),
): DashboardReading {
  if (!object(value)) throw new Error('SCHEMA_MISMATCH');
  const reading = initialDashboardReading(source, true);
  reading.state = 'available';
  reading.receivedAt = receivedAt;
  reading.capturedAt = timestamp(value.checkedAt ?? value.generatedAt) ?? receivedAt;
  const count = (metric: string, raw: unknown) => {
    const parsed = safeCount(raw);
    reading.metrics[metric] = parsed;
    if (parsed === null) reading.errors[metric] = 'COUNTER_INVALID';
  };
  switch (source.kind) {
    case 'total':
      count(source.metrics[0], value.total);
      break;
    case 'identity':
      count('humans', object(value.data) ? value.data.total : undefined);
      break;
    case 'scholarships':
      for (const metric of source.metrics) count(metric, value[metric]);
      break;
    case 'courses': {
      const overview = object(value.overview) ? value.overview : {};
      for (const metric of source.metrics) count(metric, overview[metric.replace('imported_', '')]);
      break;
    }
    case 'imports': {
      count('batches', value.totalBatches);
      count('records', value.totalRecords);
      const counts = object(value.recordStatusCounts) ? value.recordStatusCounts : {};
      for (const metric of source.metrics.filter(
        (metric) => !['batches', 'records'].includes(metric),
      ))
        count(metric, counts[metric]);
      break;
    }
    case 'finance': {
      for (const metric of source.metrics) count(metric, value[metric]);
      if (
        ['HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN'].includes(String(value.reconciliationHealth))
      )
        reading.reconciliation = value.reconciliationHealth as DashboardReading['reconciliation'];
      else reading.errors.reconciliation = 'STATUS_INVALID';
      break;
    }
    case 'health': {
      reading.health = parseHealthOverview(value);
      if (
        [
          reading.health.productionReadiness.blockerCount,
          reading.health.productionReadiness.warningCount,
          reading.health.coverage.expectedCount,
          reading.health.coverage.matchedCount,
          reading.health.coverage.missingCount,
        ].some((count) => safeCount(count) === null)
      )
        throw new Error('SCHEMA_MISMATCH');
      reading.capturedAt = reading.health.checkedAt;
      // Keep the owner's exact status and release gate. No second readiness reducer.
      break;
    }
    case 'activity': {
      if (
        !['AVAILABLE', 'PARTIAL'].includes(String(value.availability)) ||
        value.protocolVersion !== 1 ||
        !Array.isArray(value.items) ||
        value.items.length > 10 ||
        typeof value.partial !== 'boolean' ||
        value.scope !== 'PERMISSIONED_OWNER_AUDIT_EVENTS'
      )
        throw new Error('SCHEMA_MISMATCH');
      reading.activity = value.items.map((item: unknown) => {
        if (
          !object(item) ||
          !['id', 'action', 'targetClass', 'owner'].every(
            (key) => typeof item[key] === 'string' && String(item[key]).length <= 200,
          ) ||
          !timestamp(item.timestamp) ||
          !['IDENTITY', 'SYSTEM', 'UNKNOWN'].includes(String(item.actorAlias)) ||
          !['SUCCESS', 'FAILURE', 'INTENT', 'UNKNOWN'].includes(String(item.result))
        )
          throw new Error('SCHEMA_MISMATCH');
        return {
          id: String(item.id),
          action: String(item.action),
          targetClass: String(item.targetClass),
          owner: String(item.owner),
          actorAlias: item.actorAlias as DashboardActivity['actorAlias'],
          result: item.result as DashboardActivity['result'],
          timestamp: timestamp(item.timestamp)!,
        };
      });
      reading.activityPartial = value.partial;
      if (value.partial) reading.state = 'partial';
      break;
    }
  }
  if (Object.keys(reading.errors).length)
    reading.state = Object.values(reading.metrics).some((metric) => metric !== null)
      ? 'partial'
      : 'unavailable';
  return reading;
}
export function dashboardReadError(cause: unknown): ReadState {
  const message = cause instanceof Error ? cause.message : '';
  return /\[(401|403)\]/.test(message)
    ? 'forbidden'
    : message.includes('TIMED_OUT')
      ? 'timed_out'
      : cause instanceof TypeError || /network|failed to fetch/i.test(message)
        ? 'network_error'
        : 'unavailable';
}
export function effectiveDashboardState(reading: DashboardReading, now: number): ReadState {
  if (!['available', 'partial', 'stale'].includes(reading.state)) return reading.state;
  return !reading.capturedAt ||
    !reading.receivedAt ||
    Date.parse(reading.capturedAt) > now + 5000 ||
    now - Math.min(Date.parse(reading.capturedAt), Date.parse(reading.receivedAt)) >
      reading.source.ttlMs
    ? 'stale'
    : reading.state;
}
