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
        }, 5000);
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
