export const reviewDomains = [
  'scholarships',
  'universities',
  'majors',
  'courses',
  'tests',
  'services',
  'cms',
  'careers',
  'study-destinations',
] as const;
export type ReviewOwner = (typeof reviewDomains)[number];
export const reviewReasons = [
  'workflow_review',
  'incomplete',
  'ready_to_publish',
  'imported_unreviewed',
  'needs_translation',
  'source_verification',
  'broken_link',
  'import_review',
] as const;
export type WorkPriority = 'critical' | 'high' | 'medium' | 'low';
export type ReviewQuery = {
  search?: string;
  domain?: ReviewOwner;
  reason?: string;
  priority?: WorkPriority;
  assignee?: string;
  state?: string;
  source?: string;
  age?: string;
  locale?: string;
  sort?: string;
  view?: string;
  pageSize?: number;
  cursor?: string;
  snapshot?: string;
};
export type ReviewRecord = {
  key: string;
  domain: ReviewOwner;
  ownerId: string;
  profileId: string | null;
  title: string;
  titleEn: string | null;
  reference: string;
  status: string;
  reasons: string[];
  priority: WorkPriority;
  priorityBasis: 'owner' | 'reviewer' | 'suggested';
  ownerRevision: string;
  modifiedAt: string;
  sourceKind: string;
  locale: string | null;
  sourceUrl: string | null;
  verificationState: string;
  importRecordId: string | null;
  batchId: string | null;
  sourceRowNumber: number | null;
  href: string;
  detail: boolean;
  auditType: string | null;
  caseId: string | null;
  version: number;
  cycle: number;
  assigneeId: string | null;
  teamId: string | null;
  assigneeLabel: string | null;
  workState: string;
  enteredAt: string | null;
  dueAt: string | null;
  policyId: string | null;
  sla: 'overdue' | 'near_due' | 'on_track' | 'unknown';
  synchronizedAt: string | null;
};
export type ReviewSourceStatus = {
  domain: ReviewOwner;
  state: 'ready' | 'stale' | 'unavailable' | 'forbidden';
  synchronizedAt: string | null;
  observed: number | null;
  errorCode: string | null;
};
export type ReviewCounters = {
  open: number | null;
  mine: number | null;
  unassigned: number | null;
  urgent: number | null;
  overdue: number | null;
  withoutSla: number | null;
};
export type ReviewPage = {
  records: ReviewRecord[];
  total: number | null;
  counters: ReviewCounters;
  sources: ReviewSourceStatus[];
  snapshot: string;
  nextCursor: string | null;
  coverage: 'complete' | 'partial';
  canCoordinate: boolean;
  readAt: string;
};
export type ReviewCommand = {
  key: string;
  version: number;
  ownerRevision: string;
  idempotencyKey: string;
  action: 'claim' | 'assign' | 'priority' | 'note' | 'state';
  assigneeId?: string | null;
  teamId?: string | null;
  priority?: WorkPriority;
  note?: string;
  state?: 'OPEN' | 'WAITING_INFORMATION' | 'REFERRED';
  reason: string;
};
export type ReviewHistory = {
  id: string;
  action: string;
  at: string;
  note: string | null;
  actorLabel: string | null;
  cycle: number;
};
export type ReviewAnalytics = {
  days: number;
  measuredFrom: string | null;
  coverage: 'complete' | 'partial';
  newCases: number | null;
  completed: number | null;
  open: number | null;
  medianHours: number | null;
  overdue: number | null;
  withoutSla: number | null;
  completedWithinSla: number | null;
  completedWithSla: number | null;
  series: Array<{ day: string; entered: number; completed: number }>;
  domains: Array<{ key: string; count: number }>;
  reasons: Array<{ key: string; count: number }>;
  assignees: Array<{ key: string; count: number }>;
  sources: ReviewSourceStatus[];
};
export type ReviewSavedView = { id: string; name: string; shared: boolean; filters: ReviewQuery };
export type ReviewSlaPolicy = {
  domain: ReviewOwner;
  version: number;
  hours: number;
  warningHours: number;
  timezone: 'UTC';
  approvedBy: string;
  approvedAt: string;
};
