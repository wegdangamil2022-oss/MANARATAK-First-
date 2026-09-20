import { IDomainEvent } from './IDomainEvent';

export interface IAggregateRoot {
  id: { toString(): string };
  domainEvents: IDomainEvent[];
  clearEvents(): void;
}
