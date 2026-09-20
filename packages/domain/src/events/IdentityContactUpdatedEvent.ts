import { IDomainEvent } from '@manaratak/core';

export class IdentityContactUpdatedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date;

  constructor(
    public readonly identityId: string,
    public readonly contactType: string,
    public readonly oldValue: string,
    public readonly newValue: string
  ) {
    this.dateTimeOccurred = new Date();
  }

  public getAggregateId(): string {
    return this.identityId;
  }
}
