import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';
import type { StaffMember } from './StaffWorkspace';

export const STAFF_CHANGE_ACTIONS = [
  'ACTIVATE',
  'SUSPEND',
  'RESUME',
  'OFFBOARD',
  'TRANSFER',
] as const;
export type StaffChangeAction = (typeof STAFF_CHANGE_ACTIONS)[number];
export interface StaffChangePayload {
  departmentId?: string | null;
  jobTitleId?: string | null;
  managerId?: string | null;
}
export interface StaffInvitation {
  id: string;
  membershipId: string;
  memberVersion: number;
  identityId: string | null;
  email: string;
  tokenHash: string;
  issuedBy: string;
  commandHash: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  revokedAt: string | null;
  version: number;
  createdAt: string;
}
export type StaffInvitationSummary = Omit<StaffInvitation, 'tokenHash' | 'commandHash'>;
export interface StaffChangeRequest {
  id: string;
  membershipId: string;
  memberVersion: number;
  action: StaffChangeAction;
  payload: StaffChangePayload;
  snapshotHash: string;
  reason: string;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  usedAt: string | null;
  expiresAt: string;
  version: number;
}
export interface StaffLifecycleReadiness {
  ready: boolean;
  missingTables: string[];
  missingPrivileges: string[];
  tokenService: boolean;
  externalDelivery: false;
}
export interface StaffLifecycleSnapshot {
  member: StaffMember;
  identityEligible: boolean;
  mfaEnrolled: boolean;
  accepted: boolean;
  ownedGrants: number;
  otherGrants: number;
  pending: Record<string, number>;
  hash: string;
}
export interface IStaffLifecycleRepository {
  readiness(): Promise<Omit<StaffLifecycleReadiness, 'tokenService' | 'externalDelivery'>>;
  lock(tx: AtomicPersistenceContext): Promise<void>;
  snapshot(id: string, tx?: AtomicPersistenceContext): Promise<StaffLifecycleSnapshot>;
  listInvitations(
    limit: number,
    cursor?: string,
  ): Promise<{ items: StaffInvitationSummary[]; nextCursor: string | null }>;
  invitation(id: string, tx: AtomicPersistenceContext): Promise<StaffInvitation | null>;
  issue(input: StaffInvitation, tx: AtomicPersistenceContext): Promise<void>;
  revoke(
    id: string,
    version: number,
    actorId: string,
    reason: string,
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  accept(
    input: { id: string; actorId: string; tokenHash: string },
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  listChanges(
    actorId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: StaffChangeRequest[]; nextCursor: string | null }>;
  request(id: string, tx: AtomicPersistenceContext): Promise<StaffChangeRequest | null>;
  saveRequest(input: StaffChangeRequest, tx: AtomicPersistenceContext): Promise<void>;
  approve(
    id: string,
    version: number,
    actorId: string,
    tx: AtomicPersistenceContext,
  ): Promise<void>;
  apply(request: StaffChangeRequest, tx: AtomicPersistenceContext): Promise<void>;
  assertActor(id: string, tx: AtomicPersistenceContext): Promise<void>;
  assertRecoveryAdmin(excludedId: string, tx: AtomicPersistenceContext): Promise<void>;
  adminAccessAllowed(identityId: string): Promise<boolean>;
  recordGrant(
    assignmentId: string,
    membershipId: string,
    tx: AtomicPersistenceContext,
  ): Promise<void>;
}
