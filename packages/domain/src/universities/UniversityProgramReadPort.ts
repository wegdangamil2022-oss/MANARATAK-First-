import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';

/** V1 owner proof, not an ORM row or a label-based resolver. IDs are canonical internal IDs. */
export interface UniversityProgramReferenceV1 {
  contractVersion: 1;
  id: string;
  universityId: string;
  degreeLevelId: string | null;
  majorId: string | null;
  canonicalName: string;
  displayName: string;
  status: string;
  publiclyEligible: boolean;
}
/** Every supplied dimension must match the same owner program. */
export interface PublishedUniversityProgramQueryV1 {
  universityId?: string;
  academicProgramId?: string;
  degreeLevelId?: string;
  majorId?: string;
}
export interface IUniversityProgramReadPort {
  /** At most 500 unique IDs; no display-name lookup or inferred parent. */
  findByIds(ids: readonly string[]): Promise<UniversityProgramReferenceV1[]>;
  /** Complete bounded owner scope: >500 rows fails explicitly rather than truncating totals. */
  findPublished(query: PublishedUniversityProgramQueryV1): Promise<UniversityProgramReferenceV1[]>;
  /** Preserve the caller's atomic persistence context; never read the global client during a write. */
  withTransaction(context: AtomicPersistenceContext): IUniversityProgramReadPort;
}
