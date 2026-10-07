import { AuditRecord } from '../aggregates/AuditRecord';
import { ISpecification } from '@manaratak/core';
import { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';

export interface AuditRecordPageQuery {
  actorId?: string;
  targetId?: string;
  action?: string;
  category?: string;
  severity?: string;
  correlationId?: string;
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
}

export interface IAuditRecordRepository {
  findByIdOrReference?(id: string): Promise<AuditRecord | null>;
  save(record: AuditRecord): Promise<void>;
  findBy(specification: ISpecification<AuditRecord>): Promise<AuditRecord[]>;
  queryPage(input: AuditRecordPageQuery): Promise<AuditRecordPage>;
  verifyIntegrity(): Promise<AuditIntegrityReport>;
}

export interface ITransactionalAuditRecordRepository extends IAuditRecordRepository {
  saveInTransaction(record: AuditRecord, context: AtomicPersistenceContext): Promise<void>;
}
