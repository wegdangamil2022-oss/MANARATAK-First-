import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

export type CanonicalAcademicReferenceKind = 'TAXONOMY_NODE' | 'DEGREE_LEVEL';
export interface CanonicalAcademicUsageSummary {
  kind: CanonicalAcademicReferenceKind;
  id: string;
  counts: Record<string, number>;
  /** Relationship rows, not distinct consumers; a consumer can have several links. */
  totalReferences: number;
  observedAt: string;
}
/** Generic read model: the owner never imports downstream domain repositories. */
export interface ICanonicalAcademicUsageGateway {
  summarize(kind: CanonicalAcademicReferenceKind, id: string): Promise<CanonicalAcademicUsageSummary>;
  withTransaction(context: AtomicPersistenceContext): ICanonicalAcademicUsageGateway;
}
export interface AcademicLifecycleDecision {
  reason: string;
  acknowledgeHistoricalReferences: boolean;
}
export function assertAcademicLifecycleDecision(decision?: AcademicLifecycleDecision): void {
  if (!decision?.reason?.trim() || decision.reason.trim().length > 1000 || decision.acknowledgeHistoricalReferences !== true)
    throw new Error('ACADEMIC_LIFECYCLE_DECISION_REQUIRED');
}
