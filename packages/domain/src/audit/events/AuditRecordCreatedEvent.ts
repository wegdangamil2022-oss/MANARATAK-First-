import { AuditId } from '../value-objects/AuditId';
import { AuditReference } from '../value-objects/AuditReference';

export class AuditRecordCreatedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly auditId: AuditId,
    public readonly reference: AuditReference
  ) {}
}
