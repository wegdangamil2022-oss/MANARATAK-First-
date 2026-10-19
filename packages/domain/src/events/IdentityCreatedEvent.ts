import { IDomainEvent } from '@absheer/core';
import { IdentityType } from '../enums/IdentityType';

export class IdentityCreatedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date;
  
  constructor(
    public readonly identityId: string,
    public readonly identityType: IdentityType
  ) {
    this.dateTimeOccurred = new Date();
  }

  public getAggregateId(): string {
    return this.identityId;
  }
}
