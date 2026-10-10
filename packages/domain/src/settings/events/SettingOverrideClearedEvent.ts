import { IDomainEvent } from '@manaratak/core';
export class SettingOverrideClearedEvent implements IDomainEvent {
  public readonly dateTimeOccurred = new Date();
  constructor(public readonly assignmentId: string, public readonly key: string, public readonly versionId: string) {}
  getAggregateId(): string { return this.assignmentId; }
}
