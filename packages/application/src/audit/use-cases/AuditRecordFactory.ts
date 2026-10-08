import {
  ActorReference, AuditAction, AuditCategory, AuditChainReference, AuditId,
  AuditRecord, AuditReference, AuditRetentionMetadata, AuditSeverity, AuditTimestamp,
  ComplianceMetadata, ContextMetadata, CorrelationReference, SourceReference,
  TargetReference, TraceReference,
} from '@manaratak/domain';
import { CreateAuditRecordDto } from '../dtos/AuditDtos';
import { AuditRetentionPolicyResolver } from './AuditRetentionPolicyResolver';

export function createAuditRecordFromDto(dto: CreateAuditRecordDto, resolver = new AuditRetentionPolicyResolver()): AuditRecord {
  const retention = resolver.resolve(dto);
  return AuditRecord.create(
    AuditId.create(dto.id),
    AuditReference.create(dto.reference),
    AuditAction.create(dto.action),
    AuditCategory.create(dto.category),
    AuditSeverity.create(dto.severity),
    ActorReference.create(dto.actorId, dto.actorType),
    TargetReference.create(dto.targetId, dto.targetType),
    SourceReference.create(dto.source),
    AuditTimestamp.create(dto.timestamp),
    ContextMetadata.create({ ...dto.contextMetadata, auditRetention: {
      retentionClass: retention.retentionClass, status: retention.status,
    } }),
    dto.regulatoryTags ? ComplianceMetadata.create(dto.regulatoryTags) : undefined,
    dto.correlationReference ? CorrelationReference.create(dto.correlationReference) : undefined,
    dto.traceReference ? TraceReference.create(dto.traceReference) : undefined,
    dto.chainReference ? AuditChainReference.create(AuditReference.create(dto.chainReference)) : undefined,
    retention.retentionPeriodInDays !== undefined ? AuditRetentionMetadata.create(retention.retentionPeriodInDays, dto.timestamp) : undefined,
  );
}
