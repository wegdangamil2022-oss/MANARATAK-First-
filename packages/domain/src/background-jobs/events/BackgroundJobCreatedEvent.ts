import { BackgroundJobId } from '../value-objects/BackgroundJobId';
import { JobReference } from '../value-objects/JobReference';
import { JobDefinition } from '../value-objects/JobDefinition';

export class BackgroundJobCreatedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly backgroundJobId: BackgroundJobId,
    public readonly jobReference: JobReference,
    public readonly jobDefinition: JobDefinition
  ) {}
}
