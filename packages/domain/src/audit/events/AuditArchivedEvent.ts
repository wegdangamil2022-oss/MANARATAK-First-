import { AuditId } from '../value-objects/AuditId';

export class AuditArchivedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly auditId: AuditId
  ) {}
}
