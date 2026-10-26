import type {
  UserDashboard,
  TrafficDashboard,
  ApplicationDashboard,
  DashboardDays,
} from '@manaratak/shared';
import { adminApiClient } from '../../api/client';
import { safeCount } from './DashboardContract';

export type ExecutivePayload = {
  users: UserDashboard;
  traffic: TrafficDashboard;
  applications: ApplicationDashboard;
};
export type ExecutiveKey = keyof ExecutivePayload;
export const executivePermissions = {
  users: 'admin:dashboard:users:view',
  traffic: 'admin:dashboard:analytics:view',
  applications: 'admin:dashboard:applications:view',
};
export type ExecutiveReading<K extends ExecutiveKey = ExecutiveKey> = {
  state:
    'loading' | 'available' | 'partial' | 'not_measured' | 'unavailable' | 'forbidden' | 'stale';
  data: ExecutivePayload[K] | null;
  days: DashboardDays;
  permissionKey: string;
};
const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));
export function parseExecutiveData<K extends ExecutiveKey>(
  key: K,
  value: unknown,
  days: DashboardDays,
): ExecutivePayload[K] {
  if (
    !isObject(value) ||
    !isObject(value.period) ||
    value.period.days !== days ||
    value.period.timezone !== 'UTC' ||
    typeof value.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.checkedAt)) ||
    typeof value.period.from !== 'string' ||
    typeof value.period.until !== 'string' ||
    Date.parse(value.period.until) - Date.parse(value.period.from) !== days * 86400000
  )
    throw new Error('SCHEMA_MISMATCH');
  const number = (field: string, nullable = false) => {
    if (!(nullable && value[field] === null) && safeCount(value[field]) === null)
      throw new Error('SCHEMA_MISMATCH');
  };
  const series = (field: string, secondary = false) => {
    if (!Array.isArray(value[field]) || value[field].length > days + 1)
      throw new Error('SCHEMA_MISMATCH');
    const seen = new Set<string>();
    for (const point of value[field]) {
      if (
        !isObject(point) ||
        typeof point.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(point.date) ||
        seen.has(point.date) ||
        (point.value !== null && safeCount(point.value) === null) ||
        (secondary && point.secondary !== null && safeCount(point.secondary) === null)
      )
        throw new Error('SCHEMA_MISMATCH');
      seen.add(point.date);
    }
  };
  if (key === 'users') {
    ['registeredUsers', 'registeredStudents', 'newRegistrations', 'previousRegistrations'].forEach(
      (field) => number(field),
    );
    series('registrations');
    if (
      value.definition !==
        'VERIFIED_HUMAN_ACCOUNTS_CURRENT_NON_DELETED_ACTIVE_OR_SUSPENDED_CREATION_COHORTS' ||
      !['comparable', 'started_from_zero', 'no_baseline'].includes(String(value.growthState)) ||
      (value.growthPercent !== null &&
        (typeof value.growthPercent !== 'number' || !Number.isFinite(value.growthPercent))) ||
      (value.registrations as Array<{ value: number | null }>).reduce(
        (sum, point) => sum + (point.value ?? 0),
        0,
      ) !== value.newRegistrations
    )
      throw new Error('SCHEMA_MISMATCH');
  } else if (key === 'traffic') {
    if (
      !['available', 'partial', 'not_measured'].includes(String(value.status)) ||
      value.coverage !== 'CONSENTED_BROWSER_IDENTIFIERS_ONLY'
    )
      throw new Error('SCHEMA_MISMATCH');
    ['visitors', 'pageViews', 'outboundClicks', 'outboundVisitors'].forEach((field) =>
      number(field, true),
    );
    series('visits', true);
    if (
      value.status !== 'not_measured' &&
      ['visitors', 'pageViews', 'outboundClicks', 'outboundVisitors'].some(
        (field) => value[field] === null,
      )
    )
      throw new Error('SCHEMA_MISMATCH');
    if (
      value.measurementStartedAt !== null &&
      (typeof value.measurementStartedAt !== 'string' ||
        !Number.isFinite(Date.parse(value.measurementStartedAt)))
    )
      throw new Error('SCHEMA_MISMATCH');
    if (
      !Array.isArray(value.destinations) ||
      value.destinations.length > 5 ||
      value.destinations.some(
        (row) => !isObject(row) || typeof row.host !== 'string' || safeCount(row.clicks) === null,
      )
    )
      throw new Error('SCHEMA_MISMATCH');
  } else {
    [
      'managedServiceRequests',
      'processing',
      'needsInformation',
      'attention',
      'managedUniversitySubmissions',
      'officialAccepted',
      'officialRejected',
      'directSelfReportedApplications',
    ].forEach((field) => number(field));
    if (
      value.definition !== 'SERVICE_RECEIPT_IS_NOT_UNIVERSITY_SUBMISSION' ||
      !['available', 'partial'].includes(String(value.status)) ||
      ['measurementStartedAt', 'coverageFrom'].some(
        (field) =>
          typeof value[field] !== 'string' || !Number.isFinite(Date.parse(value[field] as string)),
      )
    )
      throw new Error('SCHEMA_MISMATCH');
  }
  return value as unknown as ExecutivePayload[K];
}
export async function readExecutive<K extends ExecutiveKey>(
  key: K,
  days: DashboardDays,
  signal: AbortSignal,
) {
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      adminApiClient.request(`/admin/dashboard/${key}?days=${days}`, {
        signal: controller.signal,
        cache: 'no-store',
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('DASHBOARD_TIMEOUT'));
        }, 15000);
      }),
    ]);
    if (signal.aborted) throw new Error('REQUEST_ABORTED');
    return parseExecutiveData(key, raw, days);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
