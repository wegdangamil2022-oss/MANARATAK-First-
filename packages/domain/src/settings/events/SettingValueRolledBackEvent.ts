import { IDomainEvent } from '@manaratak/core';

export class SettingValueRolledBackEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date = new Date();
  constructor(
    public readonly assignmentId: string,
    public readonly previousVersionId: string,
    public readonly newVersionId: string
  ) {}
  getAggregateId(): string { return this.assignmentId; }
}
