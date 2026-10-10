import { AuditRecord } from '../aggregates/AuditRecord';
import { ISpecification } from '@manaratak/core';
import { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';

export interface AuditRecordPageQuery {
  actorId?: string;
  subjectIdentityId?: string;
  subjectRoleIds?: string[];
  targetId?: string;
  action?: string;
  category?: string;
  severity?: string;
  correlationId?: string;
  reference?: string;
  traceId?: string;
  actorType?: string;
  targetType?: string;
  source?: string;
  lifecycleState?: 'RECORDED' | 'ARCHIVED';
  result?: 'SUCCESS' | 'FAILURE' | 'INTENT' | 'UNKNOWN';
  complianceTag?: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  from?: Date;
  until?: Date;
  limit?: number;
  cursor?: { timestamp: Date; id: string } | null;
}
export interface AuditRecordPage {
  items: AuditRecord[];
  hasMore: boolean;
  nextCursor: { timestamp: Date; id: string } | null;
}
export interface AuditIntegrityReport {
  status: 'PASS' | 'FAIL';
  checkedRecords: number;
  brokenChainReferences: string[];
  futureTimestamps: string[];
  scope: 'REFERENCE_LINKAGE_AND_TIMESTAMPS';
  cryptographicVerification: false;
  checkedAt: string;
  maxRecords: number;
  hasMore: boolean;
  nextCursor: { timestamp: Date; id: string } | null;
  range: { from: Date | null; until: Date | null };
}

export interface AuditIntegrityQuery {
  limit?: number;
  from?: Date;
  until?: Date;
  cursor?: { timestamp: Date; id: string } | null;
}

export interface IAuditRecordRepository {
  findByIdOrReference?(id: string): Promise<AuditRecord | null>;
  save(record: AuditRecord): Promise<void>;
  /** @deprecated Legacy internal compatibility only; runtime readers must use queryPage. */
  findBy(specification: ISpecification<AuditRecord>): Promise<AuditRecord[]>;
  queryPage(input: AuditRecordPageQuery): Promise<AuditRecordPage>;
  verifyIntegrity(input?: AuditIntegrityQuery): Promise<AuditIntegrityReport>;
}

export interface ITransactionalAuditRecordRepository extends IAuditRecordRepository {
  saveInTransaction(record: AuditRecord, context: AtomicPersistenceContext): Promise<void>;
}
