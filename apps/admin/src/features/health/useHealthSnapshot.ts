import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { parseHealthOverview, type HealthOverview } from './HealthOverviewContract';
import { healthFreshness } from './healthPresentation';
export type HealthReadError = 'error' | 'schema' | 'forbidden' | null;
export function isHealthAccessError(error: unknown) {
  return error instanceof Error && /\[(401|403)\]/.test(error.message);
}
export function useHealthSnapshot() {
  const [overview, setOverview] = useState<HealthOverview | null>(null);
  const [error, setError] = useState<HealthReadError>(null);
  const [loading, setLoading] = useState(true),
    [now, setNow] = useState(Date.now());
  const generation = useRef(0),
    active = useRef<AbortController | null>(null);
  const revoke = useCallback(() => {
    generation.current++;
    active.current?.abort();
    setOverview(null);
    setError('forbidden');
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    // Preserve a failed/stale marker until a new observation actually succeeds.
    try {
      const raw = await adminApiClient.request<unknown>('/admin/monitoring/overview', {
        signal: controller.signal,
        cache: 'no-store',
      });
      const parsed = parseHealthOverview(raw);
      if (current === generation.current && !controller.signal.aborted) {
        setOverview(parsed);
        setError(null);
        setNow(Date.now());
      }
    } catch (cause) {
      if (current === generation.current && !controller.signal.aborted) {
        if (isHealthAccessError(cause)) revoke();
        else
          setError(
            cause instanceof Error && cause.message === 'SCHEMA_MISMATCH' ? 'schema' : 'error',
          );
      }
    } finally {
      if (current === generation.current && !controller.signal.aborted) setLoading(false);
    }
  }, [revoke]);
  useEffect(() => {
    void refresh();
    // Only the evidence-age label changes; this is not an automatic API poll.
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active.current?.abort();
      globalThis.clearInterval(timer);
    };
  }, [refresh]);
  return {
    overview,
    error,
    loading,
    now,
    refresh,
    revoke,
    freshness: healthFreshness(overview?.checkedAt, now, Boolean(error)),
  };
}
