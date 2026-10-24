import { Prisma, type PrismaClient } from '@prisma/client';
import type { ExecutiveDashboardGateway } from '@manaratak/application';
import { registrationGrowth } from '@manaratak/application';
import {
  ANALYTICS_POLICY_VERSION,
  ANALYTICS_RETENTION_DAYS,
  type DashboardPeriod,
  type DashboardPoint,
  type UserDashboard,
  type TrafficDashboard,
  type ApplicationDashboard,
} from '@manaratak/shared';

const count = (value: bigint | number) => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('DASHBOARD_COUNT_INVALID');
  return result;
};
const eligible = Prisma.sql`i.type = 'Human' AND i.status IN ('ACTIVE','SUSPENDED') AND i."deletedAt" IS NULL
  AND u."isEmailVerified" = true AND a."accessState" IN ('Active','Suspended','Locked','RateLimited')`;

export function dashboardSeries(
  period: DashboardPeriod,
  values: Array<{ day: Date; value: bigint | number; secondary?: bigint | number }>,
  measuredFrom?: Date,
): DashboardPoint[] {
  const map = new Map(values.map((row) => [row.day.toISOString().slice(0, 10), row]));
  const day = new Date(period.from);
  day.setUTCHours(0, 0, 0, 0);
  const points: DashboardPoint[] = [];
  while (+day < +new Date(period.until)) {
    const key = day.toISOString().slice(0, 10),
      row = map.get(key);
    const known = !measuredFrom || +day + 86400000 > +measuredFrom;
    points.push({
      date: key,
      value: known ? count(row?.value ?? 0) : null,
      ...(values.some((value) => value.secondary !== undefined) || measuredFrom
        ? { secondary: known ? count(row?.secondary ?? 0) : null }
        : {}),
    });
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return points;
}

/** Bounded read-only aggregates; no student/application rows cross this port. */
export class PrismaExecutiveDashboardGateway implements ExecutiveDashboardGateway {
  constructor(private readonly prisma: PrismaClient) {}
  private read<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`;
        return work(tx);
      },
      { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 12000 },
    );
  }
  users(period: DashboardPeriod): Promise<UserDashboard> {
    return this.read(async (tx) => {
      const [totals] = await tx.$queryRaw<
        Array<{ total: bigint; students: bigint; current: bigint; previous: bigint;
          series: Array<{ day: string; value: string }> }>
      >`
        WITH accounts AS MATERIALIZED (
          SELECT i."createdAt", EXISTS (SELECT 1 FROM "RoleAssignmentRecord" r WHERE r."identityId"=i.id AND r."roleId"='student') AS student
          FROM "IdentityRecord" i JOIN "UserRecord" u ON u."identityId"=i.id JOIN "AccountRecord" a ON a."identityId"=i.id
          WHERE ${eligible} AND i."createdAt"<${new Date(period.until)}
        ), daily AS (
          SELECT to_char("createdAt" AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,count(*)::text AS value
          FROM accounts WHERE "createdAt">=${new Date(period.from)} GROUP BY 1
        )
        SELECT count(*) AS total,count(*) FILTER (WHERE student) AS students,
          count(*) FILTER (WHERE "createdAt">=${new Date(period.from)}) AS current,
          count(*) FILTER (WHERE "createdAt">=${new Date(period.previousFrom)} AND "createdAt"<${new Date(period.from)}) AS previous,
          (SELECT coalesce(jsonb_agg(d ORDER BY d.day),'[]'::jsonb) FROM daily d) AS series FROM accounts`;
      const series = totals.series.map(row => ({ day: new Date(row.day + 'T00:00:00.000Z'), value: BigInt(row.value) }));
      const current = count(totals.current),
        previous = count(totals.previous);
      return {
        period,
        checkedAt: new Date().toISOString(),
        registeredUsers: count(totals.total),
        registeredStudents: count(totals.students),
        newRegistrations: current,
        previousRegistrations: previous,
        ...registrationGrowth(current, previous),
        registrations: dashboardSeries(period, series),
        definition:
          'VERIFIED_HUMAN_ACCOUNTS_CURRENT_NON_DELETED_ACTIVE_OR_SUSPENDED_CREATION_COHORTS',
      };
    });
  }
  async traffic(period: DashboardPeriod, enabled: boolean): Promise<TrafficDashboard> {
    const base: TrafficDashboard = {
      period,
      checkedAt: new Date().toISOString(),
      status: 'not_measured',
      measurementStartedAt: null,
      visitors: null,
      pageViews: null,
      outboundClicks: null,
      outboundVisitors: null,
      visits: [],
      destinations: [],
      coverage: 'CONSENTED_BROWSER_IDENTIFIERS_ONLY',
      policyVersion: ANALYTICS_POLICY_VERSION,
      retentionDays: ANALYTICS_RETENTION_DAYS,
    };
    if (!enabled) return base;
    return this.read(async (tx) => {
      const [measurement] = await tx.$queryRaw<
        Array<{ startedAt: Date }>
      >`SELECT "startedAt" FROM "DashboardMeasurementEpoch" WHERE key=${ANALYTICS_POLICY_VERSION}`;
      if (!measurement) return base;
      const earliest = new Date(
        Math.max(+measurement.startedAt, Date.now() - ANALYTICS_RETENTION_DAYS * 86400000),
      );
      const from = new Date(Math.max(+earliest, +new Date(period.from))),
        until = new Date(period.until);
      const [totals] = await tx.$queryRaw<
        Array<{ views: bigint; visitors: bigint; clicks: bigint; outgoing: bigint;
          series: Array<{day: string; value: string; secondary: string}>;
          destinations: Array<{host: string; clicks: string}> }>
      >`
        WITH measured AS MATERIALIZED (
          SELECT e.* FROM "PublicAnalyticsEvent" e JOIN "PublicAnalyticsConsent" c ON c."tokenHash"=e."consentHash"
          WHERE c."revokedAt" IS NULL AND e."expiresAt">now() AND e."receivedAt">=${from} AND e."receivedAt"<${until}
        ), daily AS (
          SELECT to_char("receivedAt" AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
            count(DISTINCT "consentHash")::text AS value,count(*)::text AS secondary
          FROM measured WHERE kind='page_view' GROUP BY 1
        ), destinations AS (
          SELECT "destinationHost" AS host,count(*) AS clicks FROM measured WHERE kind='application_outbound_click'
          GROUP BY 1 ORDER BY 2 DESC,1 LIMIT 5
        )
        SELECT count(*) FILTER (WHERE e.kind='page_view') AS views,
          count(DISTINCT e."consentHash") FILTER (WHERE e.kind='page_view') AS visitors,
          count(*) FILTER (WHERE e.kind='application_outbound_click') AS clicks,
          count(DISTINCT e."consentHash") FILTER (WHERE e.kind='application_outbound_click') AS outgoing,
          (SELECT coalesce(jsonb_agg(d ORDER BY d.day),'[]'::jsonb) FROM daily d) AS series,
          (SELECT coalesce(jsonb_agg(jsonb_build_object('host',d.host,'clicks',d.clicks::text) ORDER BY d.clicks DESC,d.host),'[]'::jsonb) FROM destinations d) AS destinations
        FROM measured e`;
      const series = totals.series.map(row => ({day:new Date(row.day+'T00:00:00.000Z'),value:BigInt(row.value),secondary:BigInt(row.secondary)}));
      return {
        ...base,
        status: +earliest > +new Date(period.from) ? 'partial' : 'available',
        measurementStartedAt: measurement.startedAt.toISOString(),
        visitors: count(totals.visitors),
        pageViews: count(totals.views),
        outboundClicks: count(totals.clicks),
        outboundVisitors: count(totals.outgoing),
        visits: dashboardSeries(period, series, earliest),
        destinations: totals.destinations.map((row) => ({ host: row.host, clicks: count(BigInt(row.clicks)) })),
      };
    });
  }
  applications(period: DashboardPeriod): Promise<ApplicationDashboard> {
    return this.read(async (tx) => {
      const [epoch] = await tx.$queryRaw<Array<{
        startedAt: Date; received: bigint; processing: bigint; information: bigint; attention: bigint;
        submitted: bigint; accepted: bigint; rejected: bigint; reports: bigint;
      }>>`
        WITH requests AS (
          SELECT count(*) FILTER (WHERE r."createdAt">=${new Date(period.from)}) AS received,
            count(*) FILTER (WHERE r.status='IN_PROGRESS' AND r."createdAt">=${new Date(period.from)}) AS processing,
            count(*) FILTER (WHERE last.kind='NEEDS_INFORMATION' AND r."createdAt">=${new Date(period.from)}) AS information,
            count(*) FILTER (WHERE r.status NOT IN ('COMPLETED','CANCELLED') AND (last.kind='NEEDS_INFORMATION' OR r."dueAt"<${new Date(period.until)})) AS attention
          FROM "ServiceRequestRecord" r
          LEFT JOIN LATERAL (SELECT kind FROM "ServiceApplicationEvidence" e WHERE e."requestId"=r.id ORDER BY e."verifiedAt" DESC,e.id DESC LIMIT 1) last ON true
          WHERE r."serviceSnapshot"->>'managedApplication'='true' AND r."createdAt"<${new Date(period.until)}
        ), events AS (
          SELECT count(*) FILTER (WHERE e.kind='UNIVERSITY_SUBMITTED') AS submitted,
            count(*) FILTER (WHERE e.kind='ADMISSION_ACCEPTED') AS accepted,
            count(*) FILTER (WHERE e.kind='ADMISSION_REJECTED') AS rejected
          FROM "ServiceApplicationEvidence" e JOIN "ServiceRequestRecord" r ON r.id=e."requestId"
          WHERE r."serviceSnapshot"->>'managedApplication'='true' AND e."verifiedAt">=${new Date(period.from)} AND e."verifiedAt"<${new Date(period.until)}
            AND e."evidenceDigest" IS NOT NULL
        )
        SELECT epoch."startedAt",requests.*,events.*,
          (SELECT count(*) FROM "DirectApplicationReport" WHERE "reportedAt">=${new Date(period.from)} AND "reportedAt"<${new Date(period.until)} AND "expiresAt">${new Date()}) AS reports
        FROM "DashboardMeasurementEpoch" epoch CROSS JOIN requests CROSS JOIN events WHERE epoch.key='managed-application-v1'`;
      if (!epoch) throw new Error('DASHBOARD_APPLICATION_MEASUREMENT_UNAVAILABLE');
      const coverageFrom = new Date(Math.max(+epoch.startedAt, Date.now() - 180 * 86400000));
      return {
        period,
        checkedAt: new Date().toISOString(),
        status: +coverageFrom > +new Date(period.from) ? 'partial' : 'available',
        measurementStartedAt: epoch.startedAt.toISOString(),
        coverageFrom: coverageFrom.toISOString(),
        managedServiceRequests: count(epoch.received),
        processing: count(epoch.processing),
        needsInformation: count(epoch.information),
        attention: count(epoch.attention),
        managedUniversitySubmissions: count(epoch.submitted),
        officialAccepted: count(epoch.accepted),
        officialRejected: count(epoch.rejected),
        directSelfReportedApplications: count(epoch.reports),
        definition: 'SERVICE_RECEIPT_IS_NOT_UNIVERSITY_SUBMISSION',
      };
    });
  }
}
