import { IDomainEvent } from '@manaratak/core';
import { LifeStatus } from '../enums/LifeStatus';

export class IdentityStatusChangedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date;

  constructor(
    public readonly identityId: string,
    public readonly oldStatus: LifeStatus,
    public readonly newStatus: LifeStatus,
    public readonly reason?: string
  ) {
    this.dateTimeOccurred = new Date();
  }

  public getAggregateId(): string {
    return this.identityId;
  }
}
