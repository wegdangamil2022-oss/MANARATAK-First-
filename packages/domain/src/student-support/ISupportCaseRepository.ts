import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';
import type {
  SupportAccess,
  SupportCase,
  SupportEvent,
  SupportMacro,
  SupportMessage,
  SupportPolicy,
  SupportTeam,
} from './SupportCase';

export interface SupportReadiness {
  ready: boolean;
  missingTables: string[];
  missingPrivileges: string[];
  missingGuards: string[];
  attachments: false;
  notificationDelivery: 'OWNER_MANAGED';
  slaAutomation: false;
}
export interface SupportQuery {
  limit: number;
  cursor?: string;
  q?: string;
  studentId?: string;
  status?: string;
  priority?: string;
  category?: string;
  teamId?: string;
  view?:
    'ALL' | 'MINE' | 'UNASSIGNED' | 'NEEDS_REPLY' | 'WAITING' | 'OVERDUE' | 'RESOLVED' | 'REOPENED';
}
export interface ISupportCaseRepository {
  commandStatus(
    access: SupportAccess,
    key: string,
  ): Promise<{ state: 'SAVED'; caseId: string; messageId: string | null } | { state: 'UNKNOWN' }>;
  messageStatus(
    caseId: string,
    messageId: string,
    access: SupportAccess,
  ): Promise<{
    saved: true;
    visibility: 'PUBLIC' | 'INTERNAL';
    notification:
      'NOT_REQUESTED' | 'QUEUED' | 'DELIVERED' | 'FAILED' | 'PENDING' | 'SUPPRESSED' | 'UNKNOWN';
  } | null>;
  readiness(): Promise<SupportReadiness>;
  teamsForActor(actorId: string): Promise<string[]>;
  replayCommand(
    access: SupportAccess,
    command: { key: string; hash: string },
    tx: AtomicPersistenceContext,
  ): Promise<SupportCase | null>;
  get(
    id: string,
    access: SupportAccess,
    tx?: AtomicPersistenceContext,
  ): Promise<SupportCase | null>;
  list(
    query: SupportQuery,
    access: SupportAccess,
  ): Promise<{ items: SupportCase[]; nextCursor: string | null; hasMore: boolean }>;
  messages(
    caseId: string,
    access: SupportAccess,
    limit: number,
    cursor?: string,
  ): Promise<{ items: SupportMessage[]; nextCursor: string | null }>;
  events(
    caseId: string,
    access: SupportAccess,
    limit: number,
    cursor?: string,
  ): Promise<{ items: SupportEvent[]; nextCursor: string | null }>;
  create(
    record: SupportCase,
    message: SupportMessage,
    event: SupportEvent,
    tx: AtomicPersistenceContext,
    command: { key: string; hash: string },
  ): Promise<void>;
  change(
    record: SupportCase,
    expectedVersion: number,
    event: SupportEvent,
    tx: AtomicPersistenceContext,
    command: { key: string; hash: string },
    message?: SupportMessage,
  ): Promise<void>;
  assertStudent(studentId: string, tx: AtomicPersistenceContext): Promise<void>;
  assertTeam(id: string, tx: AtomicPersistenceContext): Promise<void>;
  assertAssignee(
    actorId: string,
    teamId: string | null,
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  policy(tx?: AtomicPersistenceContext): Promise<SupportPolicy | null>;
  configuration(): Promise<{
    teams: SupportTeam[];
    policies: SupportPolicy[];
    macros: SupportMacro[];
  }>;
  saveTeam(input: SupportTeam, memberIds: string[], tx: AtomicPersistenceContext): Promise<void>;
  savePolicy(input: SupportPolicy, tx: AtomicPersistenceContext): Promise<void>;
  saveMacro(input: SupportMacro, tx: AtomicPersistenceContext): Promise<void>;
  linkDuplicate(
    caseId: string,
    relatedCaseId: string,
    actorId: string,
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  metrics(access: SupportAccess): Promise<{
    total: number;
    needsReply: number;
    unassigned: number;
    overdue: number;
    waiting: number;
    resolved: number;
    reopened: number;
    checkedAt: string;
    csat: null;
  }>;
}
