import { AuditId } from '../value-objects/AuditId';
import { AuditRetentionMetadata } from '../value-objects/AuditRetentionMetadata';

export class AuditRetentionAssignedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly auditId: AuditId,
    public readonly retentionMetadata: AuditRetentionMetadata
  ) {}
}
