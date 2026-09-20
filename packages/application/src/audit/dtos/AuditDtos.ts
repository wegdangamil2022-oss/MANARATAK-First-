export interface CreateAuditRecordDto {
  id: string;
  reference: string;
  action: string;
  category: string;
  severity: string;
  actorId: string;
  actorType: string;
  targetId: string;
  targetType: string;
  source: string;
  timestamp: Date;
  contextMetadata: Record<string, any>;
  regulatoryTags?: string[];
  retentionPeriodInDays?: number;
  correlationReference?: string;
  traceReference?: string;
  chainReference?: string; // previous AuditReference value
}

export interface AuditRecordQueryDto {
  actorId?: string;
  targetId?: string;
  action?: string;
  category?: string;
  severity?: string;
  correlationId?: string;
}
