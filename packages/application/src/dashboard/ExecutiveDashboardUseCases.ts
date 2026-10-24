import { randomBytes, createHash } from 'node:crypto';
import {
  DASHBOARD_DAYS,
  ANALYTICS_POLICY_VERSION,
  ANALYTICS_CONSENT_DAYS,
  type DashboardDays,
  type DashboardPeriod,
  type UserDashboard,
  type TrafficDashboard,
  type ApplicationDashboard,
  type PublicAnalyticsEvent,
  type ManagedApplicationEventKind,
} from '@manaratak/shared';
import type { IServiceRequestRepository, IServiceFinanceGateway } from '@manaratak/domain';
import { AssetSecurityClassification } from '@manaratak/domain';
import { AssetReferencePolicy } from '../asset-platform/AssetReferencePolicy';

export function dashboardPeriod(days: number, now = new Date()): DashboardPeriod {
  if (!(DASHBOARD_DAYS as readonly number[]).includes(days) || !Number.isFinite(now.getTime()))
    throw new Error('DASHBOARD_PERIOD_INVALID');
  return {
    days: days as DashboardDays,
    until: now.toISOString(),
    from: new Date(+now - days * 86400000).toISOString(),
    previousFrom: new Date(+now - days * 172800000).toISOString(),
    timezone: 'UTC',
  };
}
export function registrationGrowth(current: number, previous: number) {
  if (![current, previous].every((value) => Number.isSafeInteger(value) && value >= 0))
    throw new Error('DASHBOARD_COUNT_INVALID');
  return {
    growthPercent: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
    growthState:
      previous > 0
        ? ('comparable' as const)
        : current > 0
          ? ('started_from_zero' as const)
          : ('no_baseline' as const),
  };
}
export interface ExecutiveDashboardGateway {
  users(period: DashboardPeriod): Promise<UserDashboard>;
  traffic(period: DashboardPeriod, enabled: boolean): Promise<TrafficDashboard>;
  applications(period: DashboardPeriod): Promise<ApplicationDashboard>;
}
export class ExecutiveDashboardUseCases {
  constructor(
    private readonly gateway: ExecutiveDashboardGateway,
    private readonly analyticsEnabled: boolean,
  ) {}
  users(days: number) {
    return this.gateway.users(dashboardPeriod(days));
  }
  traffic(days: number) {
    return this.gateway.traffic(dashboardPeriod(days), this.analyticsEnabled);
  }
  applications(days: number) {
    return this.gateway.applications(dashboardPeriod(days));
  }
}
export interface PublicAnalyticsGateway {
  grant(tokenHash: string, expiresAt: Date, policyVersion: string): Promise<void>;
  record(tokenHash: string, event: PublicAnalyticsEvent): Promise<'recorded' | 'duplicate'>;
  withdraw(tokenHash: string): Promise<void>;
  purgeExpired(): Promise<number>;
}
export const analyticsTokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export class PublicAnalyticsUseCases {
  constructor(
    private readonly gateway: PublicAnalyticsGateway,
    private readonly enabled: boolean,
  ) {}
  configuration() {
    return {
      enabled: this.enabled,
      policyVersion: ANALYTICS_POLICY_VERSION,
      consentDays: ANALYTICS_CONSENT_DAYS,
      retentionDays: 90,
    };
  }
  async grant(policyVersion: string, consent: boolean) {
    if (!this.enabled) throw new Error('ANALYTICS_POLICY_NOT_APPROVED');
    if (!consent || policyVersion !== ANALYTICS_POLICY_VERSION)
      throw new Error('ANALYTICS_EXPLICIT_CONSENT_REQUIRED');
    const token = randomBytes(32).toString('hex'),
      expiresAt = new Date(Date.now() + ANALYTICS_CONSENT_DAYS * 86400000);
    await this.gateway.grant(analyticsTokenHash(token), expiresAt, policyVersion);
    return { token, expiresAt: expiresAt.toISOString(), policyVersion };
  }
  async record(token: string, event: PublicAnalyticsEvent, bot: boolean) {
    if (!this.enabled) throw new Error('ANALYTICS_POLICY_NOT_APPROVED');
    if (bot) return { result: 'excluded' as const };
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('ANALYTICS_CONSENT_REQUIRED');
    return { result: await this.gateway.record(analyticsTokenHash(token), event) };
  }
  async withdraw(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('ANALYTICS_CONSENT_REQUIRED');
    await this.gateway.withdraw(analyticsTokenHash(token));
  }
  purgeExpired() {
    return this.gateway.purgeExpired();
  }
}
export interface ManagedApplicationEvidenceGateway {
  purgeExpired(): Promise<number>;
  assets(
    actorId: string,
    after?: string,
  ): Promise<{ items: Array<{ id: string; name: string }>; nextCursor: string | null }>;
  append(input: {
    requestId: string;
    expectedVersion: number;
    actorId: string;
    kind: ManagedApplicationEventKind;
    evidenceAssetId: string | null;
    key: string;
  }): Promise<{ id: string; kind: string }>;
  selfReport(studentId: string, opportunityId: string, key: string): Promise<void>;
}
/** Extends service ownership; never creates a parallel application or modifies a tracker. */
export class ManagedApplicationEvidenceUseCases {
  constructor(
    private readonly gateway: ManagedApplicationEvidenceGateway,
    private readonly requests: IServiceRequestRepository,
    private readonly assets: AssetReferencePolicy,
    private readonly finance: IServiceFinanceGateway,
  ) {}
  evidenceAssets(actorId: string, after?: string) {
    return this.gateway.assets(actorId, after);
  }
  purgeExpired() {
    return this.gateway.purgeExpired();
  }
  async append(input: {
    requestId: string;
    expectedVersion: number;
    actorId: string;
    kind: ManagedApplicationEventKind;
    evidenceAssetId: string | null;
    key: string;
  }) {
    const request = await this.requests.findRequestById(input.requestId);
    if (!request || request.serviceSnapshot?.managedApplication !== true)
      throw new Error('MANAGED_APPLICATION_REQUEST_REQUIRED');
    if (
      request.status === 'CANCELLED' ||
      (request.status === 'COMPLETED' && !input.kind.startsWith('ADMISSION_'))
    )
      throw new Error('MANAGED_APPLICATION_REQUEST_CLOSED');
    const proven = ['UNIVERSITY_SUBMITTED', 'ADMISSION_ACCEPTED', 'ADMISSION_REJECTED'].includes(
      input.kind,
    );
    if (proven) {
      if (!input.evidenceAssetId) throw new Error('MANAGED_APPLICATION_EVIDENCE_REQUIRED');
      const asset = await this.assets.assertUsable(input.evidenceAssetId, {
        purpose: 'MANAGED_APPLICATION_EVIDENCE',
        expectedOwnerId: input.actorId,
        allowedClassifications: [
          AssetSecurityClassification.CONFIDENTIAL,
          AssetSecurityClassification.RESTRICTED,
        ],
      });
      if (!asset?.retention.expiresAt || asset.retention.expiresAt.getTime() <= Date.now())
        throw new Error('MANAGED_APPLICATION_EVIDENCE_EXPIRED');
      if (!['IN_PROGRESS', 'COMPLETED'].includes(request.status))
        throw new Error('MANAGED_APPLICATION_PROCESSING_REQUIRED');
      if (
        input.kind === 'UNIVERSITY_SUBMITTED' &&
        (request.serviceSnapshot.fulfillmentPolicy !== 'FREE' || request.financeInvoiceId)
      ) {
        if (
          !request.financeInvoiceId ||
          !(
            await this.finance.getInvoiceClearance(request.financeInvoiceId, {
              requestPublicId: request.publicId,
              studentReferenceId: request.studentReferenceId,
            })
          ).financiallyCleared
        )
          throw new Error('SERVICE_FINANCIAL_CLEARANCE_REQUIRED');
      }
    }
    return this.gateway.append(input);
  }
  selfReport(studentId: string, opportunityId: string, key: string) {
    return this.gateway.selfReport(studentId, opportunityId, key);
  }
}
