import { IDomainEvent } from './IDomainEvent';
import { IAggregateRoot } from './IAggregateRoot';

export class DomainEvents {
  private static handlersMap: { [eventType: string]: any[] } = {};
  private static markedAggregates: IAggregateRoot[] = [];

  public static markAggregateForDispatch(aggregate: IAggregateRoot): void {
    const aggregateFound = !!this.findMarkedAggregateByID(aggregate.id.toString());
    if (!aggregateFound) {
      this.markedAggregates.push(aggregate);
    }
  }

  private static findMarkedAggregateByID(id: string): IAggregateRoot | null {
    let found = null;
    for (let aggregate of this.markedAggregates) {
      if (aggregate.id.toString() === id) {
        found = aggregate;
      }
    }
    return found;
  }

  public static dispatchEventsForAggregate(id: string): void {
    const aggregate = this.findMarkedAggregateByID(id);
    if (aggregate) {
      this.dispatchAggregateEvents(aggregate);
      aggregate.clearEvents();
      this.removeAggregateFromMarkedDispatchList(aggregate);
    }
  }

  private static dispatchAggregateEvents(aggregate: IAggregateRoot): void {
    aggregate.domainEvents.forEach((event: IDomainEvent) => this.dispatch(event));
  }

  private static removeAggregateFromMarkedDispatchList(aggregate: IAggregateRoot): void {
    const index = this.markedAggregates.findIndex((a) => (a as any).equals(aggregate));
    if (index !== -1) {
      this.markedAggregates.splice(index, 1);
    }
  }

  public static register(callback: (event: IDomainEvent) => void, eventClassName: string): void {
    if (!this.handlersMap.hasOwnProperty(eventClassName)) {
      this.handlersMap[eventClassName] = [];
    }
    this.handlersMap[eventClassName].push(callback);
  }

  public static clearHandlers(): void {
    this.handlersMap = {};
  }

  public static clearMarkedAggregates(): void {
    this.markedAggregates = [];
  }

  private static dispatch(event: IDomainEvent): void {
    const eventClassName = event.constructor.name;
    if (this.handlersMap.hasOwnProperty(eventClassName)) {
      const handlers = this.handlersMap[eventClassName];
      for (let handler of handlers) {
        handler(event);
      }
    }
  }
}
