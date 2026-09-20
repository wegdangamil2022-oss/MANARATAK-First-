import { AuditRecord, IAuditRecordRepository, AuditRecordQuerySpecification } from '@manaratak/domain';
import { AuditRecordQueryDto } from '../dtos/AuditDtos';

/**
 * Administrative audit surface is intentionally query-only. Audit creation is
 * performed by trusted mutation/audit executors with server-owned context.
 */
export class ManageAuditRecordsUseCase {
  constructor(private readonly auditRepository: IAuditRecordRepository) {}

  public async queryAuditPage(dto: AuditRecordQueryDto & { limit?: number; cursor?: { timestamp: Date; id: string } | null }) {
    return this.auditRepository.queryPage(dto);
  }

  public async verifyIntegrity() { return this.auditRepository.verifyIntegrity(); }

  public async queryAuditRecords(dto: AuditRecordQueryDto): Promise<AuditRecord[]> {
    const spec = new AuditRecordQuerySpecification({
      actorId: dto.actorId,
      targetId: dto.targetId,
      action: dto.action,
      category: dto.category,
      severity: dto.severity,
      correlationId: dto.correlationId,
    });

    return this.auditRepository.findBy(spec);
  }
}
