import {
  ActorReference, AuditAction, AuditCategory, AuditChainReference, AuditId,
  AuditRecord, AuditReference, AuditRetentionMetadata, AuditSeverity, AuditTimestamp,
  ComplianceMetadata, ContextMetadata, CorrelationReference, SourceReference,
  TargetReference, TraceReference,
} from '@manaratak/domain';
import { CreateAuditRecordDto } from '../dtos/AuditDtos';

export function createAuditRecordFromDto(dto: CreateAuditRecordDto): AuditRecord {
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
    ContextMetadata.create(dto.contextMetadata),
    dto.regulatoryTags ? ComplianceMetadata.create(dto.regulatoryTags) : undefined,
    dto.correlationReference ? CorrelationReference.create(dto.correlationReference) : undefined,
    dto.traceReference ? TraceReference.create(dto.traceReference) : undefined,
    dto.chainReference ? AuditChainReference.create(AuditReference.create(dto.chainReference)) : undefined,
    dto.retentionPeriodInDays !== undefined ? AuditRetentionMetadata.create(dto.retentionPeriodInDays, dto.timestamp) : undefined,
  );
}
