import {
  dashboardReadError,
  effectiveDashboardState,
  parseDashboardResponse,
  type DashboardReading,
} from './DashboardContract';
export type DashboardRequest = (
  url: string,
  options: { signal: AbortSignal; cache: 'no-store' },
) => Promise<unknown>;
export async function readDashboardSource(
  previous: DashboardReading,
  request: DashboardRequest,
  signal: AbortSignal,
): Promise<DashboardReading> {
  if (previous.state === 'forbidden' || signal.aborted) return previous;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const query = new URLSearchParams(previous.source.params).toString();
    const value = await Promise.race([
      request(`${previous.source.endpoint}${query ? `?${query}` : ''}`, {
        signal: controller.signal,
        cache: 'no-store',
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('TIMED_OUT'));
        }, 30000);
      }),
    ]);
    if (signal.aborted) return previous;
    const parsed = parseDashboardResponse(previous.source, value);
    if (parsed.state === 'unavailable' && previous.receivedAt) throw new Error('SCHEMA_MISMATCH');
    return parsed;
  } catch (cause) {
    if (signal.aborted) return previous;
    const error = dashboardReadError(cause);
    const denied = error === 'forbidden';
    const hasEvidence = !denied && previous.receivedAt !== null;
    return {
      ...previous,
      state: hasEvidence ? 'stale' : error,
      metrics: denied
        ? Object.fromEntries(previous.source.metrics.map((key) => [key, null]))
        : previous.metrics,
      health: denied ? null : previous.health,
      activity: denied ? [] : previous.activity,
      reconciliation: denied ? null : previous.reconciliation,
      capturedAt: denied ? null : previous.capturedAt,
      receivedAt: denied ? null : previous.receivedAt,
      errors: {
        read:
          error === 'forbidden'
            ? 'ACCESS_DENIED'
            : error === 'timed_out'
              ? 'TIMED_OUT'
              : error === 'network_error'
                ? 'NETWORK_ERROR'
                : cause instanceof Error && cause.message === 'SCHEMA_MISMATCH'
                  ? 'SCHEMA_MISMATCH'
                  : 'SOURCE_UNAVAILABLE',
      },
    };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
export async function loadDashboardSources(
  readings: DashboardReading[],
  request: DashboardRequest,
  signal: AbortSignal,
  onReading: (reading: DashboardReading) => void,
): Promise<void> {
  const catalogs = readings.filter(reading =>
    ['universities','scholarships','majors','courses','tests','careers','cms'].includes(reading.source.domain)
      && reading.source.key === `${reading.source.domain}:total` && reading.state !== 'forbidden');
  if (catalogs.length > 1) {
    const grouped = new Set(catalogs.map(reading => reading.source.key));
    const controller = new AbortController();
    const combined = AbortSignal.any([signal, controller.signal]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pending = Promise.race([
      request(`/admin/dashboard/catalogs?keys=${catalogs.map(reading => reading.source.domain).join(',')}`, { signal: combined, cache: 'no-store' }),
      new Promise<never>((_,reject) => { timer=setTimeout(() => { controller.abort(); reject(new Error('TIMED_OUT')); },30000); }),
    ]).finally(() => clearTimeout(timer));
    await Promise.all([
      pending.then(async raw => {
        const sources = raw && typeof raw === 'object' && 'sources' in raw ? raw.sources as Record<string, {state?: string;total?: number}> : {};
        for (const previous of catalogs) {
          if (signal.aborted) return;
          const value = sources[previous.source.domain];
          const reading = await readDashboardSource(previous, async () => {
            if (value?.state === 'forbidden') throw new Error('[403]');
            if (value?.state !== 'available') throw new Error('[503]');
            return { total: value.total };
          }, signal);
          if (!signal.aborted) onReading(reading);
        }
        if (!signal.aborted && typeof window !== 'undefined'
          && Object.values(sources).some(source => source?.state === 'forbidden'))
          window.dispatchEvent(new Event('manaratak-admin-permission-changed'));
      }).catch(async error => {
        for (const previous of catalogs) {
          const reading = await readDashboardSource(previous, async () => { throw error; }, signal);
          if (!signal.aborted) onReading(reading);
        }
      }),
      loadDashboardSources(readings.filter(reading => !grouped.has(reading.source.key)),request,signal,onReading),
    ]);
    return;
  }
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, readings.length) }, async () => {
      while (!signal.aborted && index < readings.length) {
        const reading = await readDashboardSource(readings[index++], request, signal);
        if (!signal.aborted) onReading(reading);
      }
    }),
  );
}
export function dashboardRefreshNeeded(readings: DashboardReading[], now = Date.now()): boolean {
  return readings.some(
    (reading) =>
      reading.state !== 'forbidden' &&
      (effectiveDashboardState(reading, now) === 'stale' ||
        ['unavailable', 'timed_out', 'network_error'].includes(reading.state)),
  );
}
