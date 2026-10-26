export const DASHBOARD_DAYS = [7, 30, 90, 365] as const;
export type DashboardDays = (typeof DASHBOARD_DAYS)[number];
export type DashboardPeriod = {
  days: DashboardDays;
  from: string;
  until: string;
  previousFrom: string;
  timezone: 'UTC';
};
export type DashboardPoint = { date: string; value: number | null; secondary?: number | null };
export type DashboardMetricStatus =
  'available' | 'partial' | 'not_measured' | 'unavailable' | 'forbidden';
export type UserDashboard = {
  period: DashboardPeriod;
  checkedAt: string;
  registeredUsers: number;
  registeredStudents: number;
  newRegistrations: number;
  previousRegistrations: number;
  growthPercent: number | null;
  growthState: 'comparable' | 'started_from_zero' | 'no_baseline';
  registrations: DashboardPoint[];
  definition: 'VERIFIED_HUMAN_ACCOUNTS_CURRENT_NON_DELETED_ACTIVE_OR_SUSPENDED_CREATION_COHORTS';
};
export const ANALYTICS_POLICY_VERSION = 'public-analytics-v1-2026-10-24';
export const ANALYTICS_RETENTION_DAYS = 90;
export const ANALYTICS_CONSENT_DAYS = 30;
export const PUBLIC_PAGE_KEYS = [
  'home',
  'scholarships',
  'universities',
  'majors',
  'courses',
  'tests',
  'services',
  'careers',
  'articles',
  'countries',
] as const;
export type PublicPageKey = (typeof PUBLIC_PAGE_KEYS)[number];
export type PublicAnalyticsEvent = {
  eventId: string;
  kind: 'page_view' | 'application_outbound_click';
  pageKey: PublicPageKey;
  opportunityId?: string;
};
export type TrafficDashboard = {
  period: DashboardPeriod;
  checkedAt: string;
  status: DashboardMetricStatus;
  measurementStartedAt: string | null;
  visitors: number | null;
  pageViews: number | null;
  outboundClicks: number | null;
  outboundVisitors: number | null;
  visits: DashboardPoint[];
  destinations: Array<{ host: string; clicks: number }>;
  coverage: 'CONSENTED_BROWSER_IDENTIFIERS_ONLY';
  policyVersion: string;
  retentionDays: number;
};
export const MANAGED_APPLICATION_EVENTS = [
  'NEEDS_INFORMATION',
  'PROCESSING',
  'UNIVERSITY_SUBMITTED',
  'ADMISSION_ACCEPTED',
  'ADMISSION_REJECTED',
] as const;
export type ManagedApplicationEventKind = (typeof MANAGED_APPLICATION_EVENTS)[number];
export type ApplicationDashboard = {
  period: DashboardPeriod;
  checkedAt: string;
  status: DashboardMetricStatus;
  measurementStartedAt: string;
  coverageFrom: string;
  managedServiceRequests: number;
  processing: number;
  needsInformation: number;
  attention: number;
  managedUniversitySubmissions: number;
  officialAccepted: number;
  officialRejected: number;
  directSelfReportedApplications: number;
  definition: 'SERVICE_RECEIPT_IS_NOT_UNIVERSITY_SUBMISSION';
};
