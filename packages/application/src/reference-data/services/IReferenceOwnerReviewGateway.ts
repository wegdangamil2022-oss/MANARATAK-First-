import type { AtomicPersistenceContext, ReferenceOwnerReview, ReferenceSnapshotRecord } from '@manaratak/domain';
import type { P7ScreeningDecision } from './ReferenceDataScreeningHandoffConsumer';
export type { ReferenceOwnerReview, ReferenceSnapshotRecord } from '@manaratak/domain';
export interface IReferenceOwnerReviewGateway {
  withTransaction(context: AtomicPersistenceContext): IReferenceOwnerReviewGateway;
  lock(key: string): Promise<void>;
  screening(id: string): Promise<{ requestHash: string; result: P7ScreeningDecision } | null>;
  verifyArtifact(id: string, hash: string): Promise<void>;
  inspect(type: ReferenceOwnerReview['entityType'], payload: Record<string, unknown>): Promise<ReferenceOwnerReview['preview']>;
  get(id: string): Promise<ReferenceOwnerReview | null>;
  create(plan: ReferenceOwnerReview): Promise<void>;
  save(plan: ReferenceOwnerReview, expectedVersion: number): Promise<void>;
  apply(plan: ReferenceOwnerReview, context: AtomicPersistenceContext, actor: string): Promise<unknown>;
  list(page: number, status?: string): Promise<{ data: ReferenceOwnerReview[]; total: number }>;
  snapshots(page: number): Promise<{ data: ReferenceSnapshotRecord[]; total: number }>;
  reviewedSnapshots(): Promise<ReferenceSnapshotRecord[]>;
  snapshot(id: string): Promise<ReferenceSnapshotRecord | null>;
  saveSnapshot(record: ReferenceSnapshotRecord, expectedVersion?: number): Promise<void>;
}
