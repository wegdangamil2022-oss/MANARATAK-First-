import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

export type StaffKind = 'EMPLOYEE' | 'CONTRACTOR' | 'VOLUNTEER' | 'SERVICE';
export type StaffReadiness = {
  ready: boolean;
  missingTables: string[];
  missingPrivileges: string[];
  capabilities: {
    drafts: boolean;
    organization: boolean;
    invitations: boolean;
    activation: boolean;
    offboarding: boolean;
  };
};
export type StaffDepartment = {
  id: string;
  name: string;
  parentId: string | null;
  status: string;
  version: number;
};
export type StaffJobTitle = {
  id: string;
  name: string;
  description: string;
  departmentId: string | null;
  status: string;
  version: number;
};
export type StaffMember = {
  id: string;
  publicId: string;
  identityId: string | null;
  displayName: string;
  email: string;
  kind: StaffKind;
  status: string;
  departmentId: string | null;
  jobTitleId: string | null;
  managerId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  version: number;
  identityStatus: string | null;
  emailVerified: boolean | null;
};
export type StaffDraft = {
  id: string;
  identityId?: string;
  displayName?: string;
  email?: string;
  kind: StaffKind;
  departmentId?: string;
  jobTitleId?: string;
  managerId?: string;
  startsAt?: string;
  endsAt?: string;
  reason: string;
};
export type StaffEvent = {
  id: string;
  membershipId: string;
  eventType: string;
  actorId: string;
  reason: string;
  createdAt: string;
};
export interface IStaffWorkspaceRepository {
  readiness(): Promise<StaffReadiness>;
  list(query: {
    search?: string;
    status?: string;
    departmentId?: string;
    cursor?: string;
    limit: number;
  }): Promise<{ items: StaffMember[]; nextCursor: string | null }>;
  get(id: string, tx?: AtomicPersistenceContext): Promise<StaffMember | null>;
  events(query: {
    membershipId?: string;
    cursor?: string;
    limit: number;
  }): Promise<{ items: StaffEvent[]; nextCursor: string | null }>;
  organization(
    tx?: AtomicPersistenceContext,
  ): Promise<{ departments: StaffDepartment[]; titles: StaffJobTitle[] }>;
  eligibleIdentity(id: string, tx: AtomicPersistenceContext): Promise<boolean>;
  saveDraft(
    input: StaffDraft,
    publicId: string,
    actorId: string,
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  recordEvent(
    input: {
      membershipId: string;
      eventType: string;
      actorId: string;
      reason: string;
      correlationId?: string;
    },
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  cancelDraft(id: string, version: number, tx: AtomicPersistenceContext): Promise<boolean>;
  saveDepartment(
    input: { id: string; name: string; parentId?: string; version?: number },
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  saveTitle(
    input: {
      id: string;
      name: string;
      description: string;
      departmentId?: string;
      version?: number;
    },
    tx: AtomicPersistenceContext,
  ): Promise<void>;
}
