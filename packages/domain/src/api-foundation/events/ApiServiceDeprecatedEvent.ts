import { ApiServiceReference } from '../value-objects/ApiServiceReference';

export class ApiServiceDeprecatedEvent {
  constructor(
    public readonly apiServiceReference: ApiServiceReference,
    public readonly occurredOn: Date = new Date()
  ) {}
}
