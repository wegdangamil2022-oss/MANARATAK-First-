import {
  AuditRecord,
  IAuditRecordRepository,
  AuditRecordPageQuery,
  AuditIntegrityQuery,
} from '@manaratak/domain';
import { AuditRecordQueryDto } from '../dtos/AuditDtos';

/**
 * Administrative audit surface is intentionally query-only. Audit creation is
 * performed by trusted mutation/audit executors with server-owned context.
 */
export class ManageAuditRecordsUseCase {
  constructor(private readonly auditRepository: IAuditRecordRepository) {}

  public async queryAuditPage(dto: AuditRecordPageQuery) {
    return this.auditRepository.queryPage(dto);
  }

  public async verifyIntegrity(input?: AuditIntegrityQuery) {
    return this.auditRepository.verifyIntegrity(input);
  }

  public async getAuditRecord(id: string): Promise<AuditRecord | null> {
    if (!this.auditRepository.findByIdOrReference)
      throw new Error('AUDIT_RECORD_LOOKUP_UNAVAILABLE');
    return this.auditRepository.findByIdOrReference(id);
  }

  /** @deprecated Bounded compatibility projection; use queryAuditPage for pagination metadata. */
  public async queryAuditRecords(dto: AuditRecordQueryDto): Promise<AuditRecord[]> {
    return (await this.auditRepository.queryPage({ ...dto, limit: 50 })).items;
  }
}
