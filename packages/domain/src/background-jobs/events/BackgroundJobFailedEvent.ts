import { BackgroundJobId } from '../value-objects/BackgroundJobId';
import { JobReference } from '../value-objects/JobReference';

export class BackgroundJobFailedEvent {
  public readonly occurredOn: Date = new Date();

  constructor(
    public readonly backgroundJobId: BackgroundJobId,
    public readonly jobReference: JobReference,
    public readonly errorReason?: string
  ) {}
}
