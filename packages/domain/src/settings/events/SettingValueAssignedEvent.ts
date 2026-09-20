import { IDomainEvent } from '@manaratak/core';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';

export class SettingValueAssignedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date = new Date();
  constructor(
    public readonly assignmentId: string,
    public readonly key: string,
    public readonly scope: ScopeIdentifier
  ) {}
  getAggregateId(): string { return this.assignmentId; }
}
