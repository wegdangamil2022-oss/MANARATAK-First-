import { IDomainEvent } from '@manaratak/core';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';

export class SettingValueUpdatedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date = new Date();
  constructor(
    public readonly assignmentId: string,
    public readonly key: string,
    public readonly scope: ScopeIdentifier,
    public readonly versionId: string
  ) {}
  getAggregateId(): string { return this.assignmentId; }
}
