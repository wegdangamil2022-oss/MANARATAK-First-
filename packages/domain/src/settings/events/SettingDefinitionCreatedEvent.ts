import { IDomainEvent } from '@manaratak/core';

export class SettingDefinitionCreatedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date = new Date();
  constructor(public readonly definitionId: string, public readonly key: string) {}
  getAggregateId(): string { return this.definitionId; }
}
