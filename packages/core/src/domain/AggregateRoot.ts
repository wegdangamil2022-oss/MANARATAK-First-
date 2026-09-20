import { Entity } from './Entity';
import { IDomainEvent } from './events/IDomainEvent';
import { IAggregateRoot } from './events/IAggregateRoot';

export abstract class AggregateRoot<T> extends Entity<T> implements IAggregateRoot {
  private _domainEvents: IDomainEvent[] = [];

  get domainEvents(): IDomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    // Production event publication is repository/application owned through the durable transactional outbox.
    // Do not register aggregates in the legacy process-local DomainEvents registry: it has no durability,
    // multi-instance semantics, or production consumers and can retain aggregate references indefinitely.
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents.splice(0, this._domainEvents.length);
  }
}
