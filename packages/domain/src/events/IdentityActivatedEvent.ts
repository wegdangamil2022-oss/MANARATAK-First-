import { IDomainEvent } from '@manaratak/core';

export class IdentityActivatedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date;

  constructor(
    public readonly identityId: string,
    public readonly primaryEmail: string
  ) {
    this.dateTimeOccurred = new Date();
  }

  public getAggregateId(): string {
    return this.identityId;
  }
}
