import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainEvents, type IAggregateRoot, type IDomainEvent } from '@manaratak/core';

class ChangedEvent implements IDomainEvent {
  readonly dateTimeOccurred = new Date();
  constructor(private readonly id: string) {}
  getAggregateId(): string { return this.id; }
}

function aggregate(id: string): IAggregateRoot {
  return { id: { toString: () => id }, domainEvents: [new ChangedEvent(id)], clearEvents() { this.domainEvents = []; } };
}

afterEach(() => {
  DomainEvents.clearHandlers();
  DomainEvents.clearMarkedAggregates();
});

describe('domain dispatch through the aggregate contract', () => {
  it('dispatches and removes an aggregate without requiring an undeclared equals method', () => {
    const handler = vi.fn();
    const first = aggregate('one');
    DomainEvents.register(handler, ChangedEvent.name);
    DomainEvents.markAggregateForDispatch(first);
    DomainEvents.dispatchEventsForAggregate('one');
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: 'one' }));
    expect(first.domainEvents).toEqual([]);
    const next = aggregate('one');
    DomainEvents.markAggregateForDispatch(next);
    DomainEvents.dispatchEventsForAggregate('one');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(next.domainEvents).toEqual([]);
  });

  it('deduplicates identities and preserves other pending aggregates', () => {
    const handler = vi.fn();
    DomainEvents.register(handler, ChangedEvent.name);
    DomainEvents.markAggregateForDispatch(aggregate('one'));
    DomainEvents.markAggregateForDispatch(aggregate('one'));
    const second = aggregate('two');
    DomainEvents.markAggregateForDispatch(second);
    DomainEvents.dispatchEventsForAggregate('one');
    DomainEvents.dispatchEventsForAggregate('one');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(second.domainEvents).toHaveLength(1);
    DomainEvents.dispatchEventsForAggregate('two');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(second.domainEvents).toEqual([]);
  });
});
