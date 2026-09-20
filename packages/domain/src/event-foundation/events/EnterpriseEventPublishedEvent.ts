import { EventReference } from '../value-objects/EventReference';

export class EnterpriseEventPublishedEvent {
  constructor(
    public readonly eventReference: EventReference,
    public readonly occurredOn: Date = new Date()
  ) {}
}
