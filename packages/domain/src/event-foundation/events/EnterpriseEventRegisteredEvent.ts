import { EventReference } from '../value-objects/EventReference';

export class EnterpriseEventRegisteredEvent {
  constructor(
    public readonly eventReference: EventReference,
    public readonly occurredOn: Date = new Date()
  ) {}
}
