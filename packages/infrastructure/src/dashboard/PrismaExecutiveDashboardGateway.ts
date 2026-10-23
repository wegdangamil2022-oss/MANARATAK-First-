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
        Array<{ total: bigint; students: bigint; current: bigint; previous: bigint }>
      >`
        SELECT count(*) AS total,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "RoleAssignmentRecord" r WHERE r."identityId"=i.id AND r."roleId"='student')) AS students,
          count(*) FILTER (WHERE i."createdAt">=${new Date(period.from)} AND i."createdAt"<${new Date(period.until)}) AS current,
          count(*) FILTER (WHERE i."createdAt">=${new Date(period.previousFrom)} AND i."createdAt"<${new Date(period.from)}) AS previous
        FROM "IdentityRecord" i JOIN "UserRecord" u ON u."identityId"=i.id JOIN "AccountRecord" a ON a."identityId"=i.id
        WHERE ${eligible} AND i."createdAt"<${new Date(period.until)}`;
      const series = await tx.$queryRaw<Array<{ day: Date; value: bigint }>>`
        SELECT date_trunc('day',i."createdAt" AT TIME ZONE 'UTC') AS day, count(*) AS value
        FROM "IdentityRecord" i JOIN "UserRecord" u ON u."identityId"=i.id JOIN "AccountRecord" a ON a."identityId"=i.id
        WHERE ${eligible} AND i."createdAt">=${new Date(period.from)} AND i."createdAt"<${new Date(period.until)} GROUP BY 1 ORDER BY 1`;
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
        Array<{ views: bigint; visitors: bigint; clicks: bigint; outgoing: bigint }>
      >`
        SELECT count(*) FILTER (WHERE e.kind='page_view') AS views,
          count(DISTINCT e."consentHash") FILTER (WHERE e.kind='page_view') AS visitors,
          count(*) FILTER (WHERE e.kind='application_outbound_click') AS clicks,
          count(DISTINCT e."consentHash") FILTER (WHERE e.kind='application_outbound_click') AS outgoing
        FROM "PublicAnalyticsEvent" e JOIN "PublicAnalyticsConsent" c ON c."tokenHash"=e."consentHash"
        WHERE c."revokedAt" IS NULL AND e."expiresAt">now() AND e."receivedAt">=${from} AND e."receivedAt"<${until}`;
      const series = await tx.$queryRaw<Array<{ day: Date; value: bigint; secondary: bigint }>>`
        SELECT date_trunc('day',e."receivedAt" AT TIME ZONE 'UTC') AS day,
          count(DISTINCT e."consentHash") AS value, count(*) AS secondary
        FROM "PublicAnalyticsEvent" e JOIN "PublicAnalyticsConsent" c ON c."tokenHash"=e."consentHash"
        WHERE e.kind='page_view' AND c."revokedAt" IS NULL AND e."expiresAt">now() AND e."receivedAt">=${from} AND e."receivedAt"<${until}
        GROUP BY 1 ORDER BY 1`;
      const destinations = await tx.$queryRaw<Array<{ host: string; clicks: bigint }>>`
        SELECT e."destinationHost" AS host, count(*) AS clicks FROM "PublicAnalyticsEvent" e
        JOIN "PublicAnalyticsConsent" c ON c."tokenHash"=e."consentHash"
        WHERE e.kind='application_outbound_click' AND c."revokedAt" IS NULL AND e."expiresAt">now()
          AND e."receivedAt">=${from} AND e."receivedAt"<${until} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 5`;
      return {
        ...base,
        status: +earliest > +new Date(period.from) ? 'partial' : 'available',
        measurementStartedAt: measurement.startedAt.toISOString(),
        visitors: count(totals.visitors),
        pageViews: count(totals.views),
        outboundClicks: count(totals.clicks),
        outboundVisitors: count(totals.outgoing),
        visits: dashboardSeries(period, series, earliest),
        destinations: destinations.map((row) => ({ host: row.host, clicks: count(row.clicks) })),
      };
    });
  }
  applications(period: DashboardPeriod): Promise<ApplicationDashboard> {
    return this.read(async (tx) => {
      const [epoch] = await tx.$queryRaw<
        Array<{ startedAt: Date }>
      >`SELECT "startedAt" FROM "DashboardMeasurementEpoch" WHERE key='managed-application-v1'`;
      if (!epoch) throw new Error('DASHBOARD_APPLICATION_MEASUREMENT_UNAVAILABLE');
      const coverageFrom = new Date(Math.max(+epoch.startedAt, Date.now() - 180 * 86400000));
      const [requests] = await tx.$queryRaw<
        Array<{ received: bigint; processing: bigint; information: bigint; attention: bigint }>
      >`
        SELECT count(*) FILTER (WHERE r."createdAt">=${new Date(period.from)}) AS received,
          count(*) FILTER (WHERE r.status='IN_PROGRESS' AND r."createdAt">=${new Date(period.from)}) AS processing,
          count(*) FILTER (WHERE last.kind='NEEDS_INFORMATION' AND r."createdAt">=${new Date(period.from)}) AS information,
          count(*) FILTER (WHERE r.status NOT IN ('COMPLETED','CANCELLED') AND (last.kind='NEEDS_INFORMATION' OR r."dueAt"<${new Date(period.until)})) AS attention
        FROM "ServiceRequestRecord" r
        LEFT JOIN LATERAL (SELECT kind FROM "ServiceApplicationEvidence" e WHERE e."requestId"=r.id ORDER BY e."verifiedAt" DESC,e.id DESC LIMIT 1) last ON true
        WHERE r."serviceSnapshot"->>'managedApplication'='true' AND r."createdAt"<${new Date(period.until)}`;
      const events = await tx.$queryRaw<Array<{ kind: string; total: bigint }>>`
        SELECT e.kind, count(*) AS total FROM "ServiceApplicationEvidence" e JOIN "ServiceRequestRecord" r ON r.id=e."requestId"
        WHERE r."serviceSnapshot"->>'managedApplication'='true' AND e."verifiedAt">=${new Date(period.from)} AND e."verifiedAt"<${new Date(period.until)}
        AND (e.kind NOT IN ('UNIVERSITY_SUBMITTED','ADMISSION_ACCEPTED','ADMISSION_REJECTED') OR e."evidenceDigest" IS NOT NULL) GROUP BY e.kind`;
      const map = new Map(events.map((row) => [row.kind, count(row.total)]));
      const reports = await tx.directApplicationReport.count({
        where: {
          reportedAt: { gte: new Date(period.from), lt: new Date(period.until) },
          expiresAt: { gt: new Date() },
        },
      });
      return {
        period,
        checkedAt: new Date().toISOString(),
        status: +coverageFrom > +new Date(period.from) ? 'partial' : 'available',
        measurementStartedAt: epoch.startedAt.toISOString(),
        coverageFrom: coverageFrom.toISOString(),
        managedServiceRequests: count(requests.received),
        processing: count(requests.processing),
        needsInformation: count(requests.information),
        attention: count(requests.attention),
        managedUniversitySubmissions: map.get('UNIVERSITY_SUBMITTED') ?? 0,
        officialAccepted: map.get('ADMISSION_ACCEPTED') ?? 0,
        officialRejected: map.get('ADMISSION_REJECTED') ?? 0,
        directSelfReportedApplications: reports,
        definition: 'SERVICE_RECEIPT_IS_NOT_UNIVERSITY_SUBMISSION',
      };
    });
  }
}
