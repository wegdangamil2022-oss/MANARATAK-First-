import { ApiServiceReference } from '../value-objects/ApiServiceReference';
import { ApiVersion } from '../value-objects/ApiVersion';

export class ApiVersionPublishedEvent {
  constructor(
    public readonly apiServiceReference: ApiServiceReference,
    public readonly apiVersion: ApiVersion,
    public readonly occurredOn: Date = new Date()
  ) {}
}
