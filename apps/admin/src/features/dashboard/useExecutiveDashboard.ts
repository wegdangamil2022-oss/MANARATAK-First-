import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardDays, UserDashboard } from '@manaratak/shared';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { adminApiClient } from '../../api/client';
import { dashboardSources } from './DashboardSources';
import {
  initialDashboardReading,
  type DashboardReading,
  effectiveDashboardState,
} from './DashboardContract';
import { loadDashboardSources } from './DashboardLoader';
import {
  executivePermissions,
  readExecutive,
  type ExecutiveKey,
  type ExecutiveReading,
} from './ExecutiveData';

const primaryKeys = [
  'universities:total',
  'scholarships:total',
  'majors:total',
  'courses:total',
  'tests:total',
  'careers:total',
  'cms:total',
];
const keys = new Set([
  ...primaryKeys,
  'health',
  'activity',
  'imports',
  'finance',
  'scholarships:quality',
]);
const sources = dashboardSources.filter((source) => keys.has(source.key));
export { primaryKeys };
export function useExecutiveDashboard(days: DashboardDays) {
  const { permissions } = useAdminAuthorization(),
    permissionKey = [...permissions].sort().join('|');
  const grants = useMemo(() => permissionKey.split('|'), [permissionKey]);
  const permits = useCallback(
    (key: string) =>
      grants.some(
        (value) =>
          value === '*' ||
          value === key ||
          (value.endsWith(':*') && key.startsWith(value.slice(0, -1))),
      ),
    [grants],
  );
  const [readings, setReadings] = useState<DashboardReading[]>([]),
    latest = useRef(readings);
  latest.current = readings;
  const [executive, setExecutive] = useState<Partial<Record<ExecutiveKey, ExecutiveReading>>>({});
  const [headline, setHeadline] = useState<{
    data: UserDashboard;
    permissionKey: string;
    state: 'available' | 'stale';
  } | null>(null);
  const latestExecutive = useRef(executive);
  latestExecutive.current = executive;
  const [coreBusy, setCoreBusy] = useState(false),
    [periodBusy, setPeriodBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const coreGeneration = useRef(0),
    periodGeneration = useRef(0),
    lock = useRef(false);
  const refreshData = useCallback(() => {
    if (!lock.current) {
      lock.current = true;
      setRefresh((value) => value + 1);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController(),
      generation = ++coreGeneration.current;
    const allowed = sources.filter((source) => source.permissions.every(permits));
    setCoreBusy(allowed.length > 0);
    const candidates = allowed.map((source) => {
      const prior = latest.current.find((reading) => reading.source.key === source.key);
      return prior ?? initialDashboardReading(source, true);
    });
    setReadings(
      candidates.map((reading) => ({
        ...reading,
        state: reading.receivedAt ? 'stale' : 'loading',
      })),
    );
    // Basic cards get the first slots. Activity/health are independent and never block rendering.
    candidates.sort(
      (a, b) =>
        Number(primaryKeys.includes(b.source.key)) - Number(primaryKeys.includes(a.source.key)),
    );
    void loadDashboardSources(
      candidates,
      (url, options) => adminApiClient.request(url, options),
      controller.signal,
      (reading) => {
        if (generation === coreGeneration.current && !controller.signal.aborted)
          setReadings((rows) =>
            rows.map((row) => (row.source.key === reading.source.key ? reading : row)),
          );
      },
    ).finally(() => {
      if (generation === coreGeneration.current && !controller.signal.aborted) setCoreBusy(false);
    });
    return () => {
      controller.abort();
    };
  }, [permits, refresh]);
  useEffect(() => {
    const controller = new AbortController(),
      generation = ++periodGeneration.current;
    const allowed = (Object.keys(executivePermissions) as ExecutiveKey[]).filter((key) =>
      permits(executivePermissions[key]),
    );
    setPeriodBusy(allowed.length > 0);
    setExecutive(
      Object.fromEntries(
        allowed.map((key) => {
          const prior = latestExecutive.current[key];
          const data =
            prior?.days === days && prior.permissionKey === permissionKey ? prior.data : null;
          return [key, { state: data ? 'stale' : 'loading', data, days, permissionKey }];
        }),
      ),
    );
    void Promise.all(
      allowed.map(async (key) => {
        try {
          const data = await readExecutive(key, days, controller.signal);
          if (generation !== periodGeneration.current || controller.signal.aborted) return;
          const state = 'status' in data ? data.status : 'available';
          setExecutive((rows) => ({ ...rows, [key]: { state, data, days, permissionKey } }));
          if (key === 'users')
            setHeadline({ data: data as UserDashboard, permissionKey, state: 'available' });
        } catch (error) {
          if (generation !== periodGeneration.current || controller.signal.aborted) return;
          const forbidden =
            error instanceof Error && /403|401|FORBIDDEN|UNAUTHORIZED|SESSION/i.test(error.message);
          if (key === 'users')
            setHeadline((prior) =>
              forbidden ? null : prior ? { ...prior, state: 'stale' } : null,
            );
          setExecutive((rows) => {
            const prior = rows[key];
            return {
              ...rows,
              [key]: {
                days,
                permissionKey,
                state: forbidden ? 'forbidden' : prior?.data ? 'stale' : 'unavailable',
                data: forbidden ? null : (prior?.data ?? null),
              },
            };
          });
        }
      }),
    ).finally(() => {
      if (generation === periodGeneration.current && !controller.signal.aborted)
        setPeriodBusy(false);
    });
    return () => controller.abort();
  }, [days, permits, permissionKey, refresh]);
  useEffect(() => {
    if (!coreBusy && !periodBusy) lock.current = false;
  }, [coreBusy, periodBusy]);
  const visible = readings.filter((reading) => reading.source.permissions.every(permits));
  const resources = Object.fromEntries(
    (Object.keys(executivePermissions) as ExecutiveKey[]).flatMap((key) => {
      const row = executive[key];
      return row &&
        row.permissionKey === permissionKey &&
        row.days === days &&
        permits(executivePermissions[key])
        ? [[key, row]]
        : [];
    }),
  ) as Partial<Record<ExecutiveKey, ExecutiveReading>>;
  const state = (reading?: DashboardReading) =>
    reading ? effectiveDashboardState(reading, Date.now()) : 'loading';
  const userHeadline =
    permits(executivePermissions.users) && headline?.permissionKey === permissionKey
      ? headline
      : null;
  return {
    readings: visible,
    resources,
    userHeadline,
    busy: coreBusy || periodBusy,
    refreshData,
    state,
    permits,
  };
}
