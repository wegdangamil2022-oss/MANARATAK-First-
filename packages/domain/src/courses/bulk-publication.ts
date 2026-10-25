import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';
import type { CourseFilters } from './contracts/ICourseRepository';

export type CourseBulkState = 'PENDING' | 'ELIGIBLE' | 'BLOCKED' | 'SUCCESS' | 'FAILED' | 'NOT_EXECUTED';
export type CourseBulkPhase = 'PREVIEWING' | 'PREVIEWED' | 'EXECUTING' | 'COMPLETE' | 'CANCELLED';
export interface CourseBulkItem { id: string; name: string; version: number; state: CourseBulkState; reasons: string[] }
export interface CourseBulkSummary {
  id: string; digest: string; phase: CourseBulkPhase; createdAt: string; expiresAt: string;
  reason: string; total: number; counts: Record<CourseBulkState, number>; leaseUntil?: string | null;
}
export interface CourseBulkPage { summary: CourseBulkSummary; data: CourseBulkItem[]; page: number; total: number; totalPages: number }
export interface CourseBulkSelection { ids?: string[]; filters?: CourseFilters }
export interface CourseBulkClaim { summary: CourseBulkSummary; lease: string; items: Array<CourseBulkItem & { index: number }> }
export interface ICourseBulkPublicationRepository {
  list(actorId: string, page?: number): Promise<{ data: CourseBulkSummary[]; page: number; totalPages: number }>;
  retrySelection(id: string, actorId: string): Promise<string[]>;
  createSnapshot(context: AtomicPersistenceContext, input: { reference: string; actorId: string; requestDigest: string; reason: string; selection: CourseBulkSelection }): Promise<{ id: string; replayed: boolean }>;
  read(id: string, actorId: string, page?: number, state?: CourseBulkState): Promise<CourseBulkPage>;
  confirm(context: AtomicPersistenceContext, id: string, actorId: string, digest: string, eligibleOnly: boolean, reason: string): Promise<{ replayed: boolean }>;
  claim(id: string, actorId: string): Promise<CourseBulkClaim | null>;
  checkpoint(id: string, actorId: string, lease: string, items: Array<CourseBulkItem & { index: number }>): Promise<void>;
  release(id: string, actorId: string, lease: string): Promise<void>;
  publicationReceipt(courseId: string, version: number, batchId: string, actorId: string): Promise<boolean>;
  cancel(context: AtomicPersistenceContext, id: string, actorId: string): Promise<{ replayed: boolean }>;
}
