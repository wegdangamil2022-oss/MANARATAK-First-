export const SUPPORT_STATUSES = [
  'NEW',
  'OPEN',
  'WAITING_ON_STUDENT',
  'WAITING_ON_OWNER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export const SUPPORT_CATEGORIES = [
  'ACCOUNT',
  'SCHOLARSHIPS',
  'UNIVERSITIES',
  'APPLICATIONS',
  'COURSES',
  'CERTIFICATES',
  'SERVICES',
  'FILES',
  'TECHNICAL',
  'OTHER',
] as const;
export type SupportPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export interface SupportCalendar {
  timeZone: string;
  weekdays: number[];
  opensAtMinute: number;
  closesAtMinute: number;
  holidays: string[];
}
export interface SupportSlaSnapshot {
  policyId: string;
  version: number;
  firstReplyMinutes: number;
  resolutionMinutes: number;
  reopenDays: number;
  pauseWaitingForStudent: boolean;
  calendar: SupportCalendar;
}
export interface SupportCase {
  id: string;
  publicId: string;
  studentId: string;
  title: string;
  category: string;
  status: SupportStatus;
  priority: SupportPriority;
  origin: 'STUDENT_PORTAL' | 'ADMIN_PROXY';
  teamId: string | null;
  assigneeId: string | null;
  version: number;
  lastStudentMessageAt: string;
  lastPublicReplyAt: string | null;
  firstPublicReplyAt: string | null;
  firstReplyDueAt: string | null;
  resolutionDueAt: string | null;
  slaPausedAt: string | null;
  slaRemainingMinutes: number | null;
  slaBreached: boolean;
  slaSnapshot: SupportSlaSnapshot | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface SupportMessage {
  id: string;
  caseId: string;
  authorId: string;
  authorKind: 'STUDENT' | 'AGENT';
  visibility: 'PUBLIC' | 'INTERNAL';
  body: string;
  createdAt: string;
}
export interface SupportEvent {
  id: string;
  caseId: string;
  actorId: string;
  type: string;
  data: Record<string, string | number | boolean | null>;
  createdAt: string;
}
export interface SupportAccess {
  actorId: string;
  kind: 'STUDENT' | 'AGENT';
  teamIds: string[];
  allTeams: boolean;
  internalNotes: boolean;
}
export interface SupportTeam {
  id: string;
  name: string;
  active: boolean;
  version: number;
}
export interface SupportPolicy {
  id: string;
  name: string;
  active: boolean;
  version: number;
  data: Omit<SupportSlaSnapshot, 'policyId' | 'version'>;
}
export interface SupportMacro {
  id: string;
  title: string;
  locale: 'ar' | 'en';
  body: string;
  status: 'DRAFT' | 'APPROVED' | 'RETIRED';
  version: number;
}

export function canReadSupportCase(
  record: Pick<SupportCase, 'studentId' | 'teamId' | 'assigneeId'>,
  access: SupportAccess,
): boolean {
  if (access.kind === 'STUDENT') return record.studentId === access.actorId;
  return (
    access.allTeams ||
    record.assigneeId === access.actorId ||
    Boolean(record.teamId && access.teamIds.includes(record.teamId))
  );
}

const transitions: Record<SupportStatus, readonly SupportStatus[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['WAITING_ON_STUDENT', 'WAITING_ON_OWNER', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_STUDENT: ['OPEN', 'RESOLVED', 'CANCELLED'],
  WAITING_ON_OWNER: ['OPEN', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['REOPENED', 'CLOSED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['OPEN', 'WAITING_ON_STUDENT', 'WAITING_ON_OWNER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: ['REOPENED'],
};
export function assertSupportTransition(from: SupportStatus, to: SupportStatus): void {
  if (!transitions[from]?.includes(to)) throw Error('SUPPORT_TRANSITION_INVALID');
}

export function supportNeedsReply(
  record: Pick<SupportCase, 'lastStudentMessageAt' | 'lastPublicReplyAt' | 'status'>,
): boolean {
  return (
    !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(record.status) &&
    (!record.lastPublicReplyAt ||
      Date.parse(record.lastStudentMessageAt) > Date.parse(record.lastPublicReplyAt))
  );
}
