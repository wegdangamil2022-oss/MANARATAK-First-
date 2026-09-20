import { BackgroundJobId } from '../value-objects/BackgroundJobId';
import { JobReference } from '../value-objects/JobReference';
import { JobOwnerReference } from '../value-objects/JobOwnerReference';
import { JobDefinition } from '../value-objects/JobDefinition';
import { JobParameters } from '../value-objects/JobParameters';
import { JobMetadata } from '../value-objects/JobMetadata';
import { BackgroundJobStatus } from '../enums/BackgroundJobStatus';
import { BackgroundJobCreatedEvent } from '../events/BackgroundJobCreatedEvent';
import { BackgroundJobScheduledEvent } from '../events/BackgroundJobScheduledEvent';
import { BackgroundJobStartedEvent } from '../events/BackgroundJobStartedEvent';
import { BackgroundJobCompletedEvent } from '../events/BackgroundJobCompletedEvent';
import { BackgroundJobFailedEvent } from '../events/BackgroundJobFailedEvent';
import { BackgroundJobCancelledEvent } from '../events/BackgroundJobCancelledEvent';

export interface BackgroundJobRestoreState {
  status: BackgroundJobStatus;
  createdAt: Date;
}

export class BackgroundJob {
  private status: BackgroundJobStatus;
  private readonly events: any[] = [];
  private readonly createdAt: Date;

  private constructor(
    private readonly id: BackgroundJobId,
    private readonly reference: JobReference,
    private readonly definition: JobDefinition,
    private readonly parameters: JobParameters,
    private readonly metadata: JobMetadata,
    private readonly ownerReference?: JobOwnerReference,
    restoreState?: BackgroundJobRestoreState,
  ) {
    this.status = restoreState?.status ?? BackgroundJobStatus.CREATED;
    this.createdAt = restoreState?.createdAt ? new Date(restoreState.createdAt) : new Date();
  }

  public static create(
    id: BackgroundJobId,
    reference: JobReference,
    definition: JobDefinition,
    parameters: JobParameters,
    metadata: JobMetadata,
    ownerReference?: JobOwnerReference
  ): BackgroundJob {
    const job = new BackgroundJob(id, reference, definition, parameters, metadata, ownerReference);
    job.addEvent(new BackgroundJobCreatedEvent(id, reference, definition));
    return job;
  }

  /**
   * Persistence-only rehydration path. Rehydration never re-emits historical
   * lifecycle events; those belong to the write that originally changed state.
   */
  public static restore(
    id: BackgroundJobId,
    reference: JobReference,
    definition: JobDefinition,
    parameters: JobParameters,
    metadata: JobMetadata,
    restoreState: BackgroundJobRestoreState,
    ownerReference?: JobOwnerReference,
  ): BackgroundJob {
    return new BackgroundJob(id, reference, definition, parameters, metadata, ownerReference, restoreState);
  }

  public getId(): BackgroundJobId { return this.id; }
  public getReference(): JobReference { return this.reference; }
  public getDefinition(): JobDefinition { return this.definition; }
  public getParameters(): JobParameters { return this.parameters; }
  public getMetadata(): JobMetadata { return this.metadata; }
  public getOwnerReference(): JobOwnerReference | undefined { return this.ownerReference; }
  public getStatus(): BackgroundJobStatus { return this.status; }
  public getCreatedAt(): Date { return new Date(this.createdAt); }

  public schedule(): void {
    if (this.status === BackgroundJobStatus.CREATED) {
      this.status = BackgroundJobStatus.SCHEDULED;
      this.addEvent(new BackgroundJobScheduledEvent(this.id, this.reference));
    }
  }

  /** Worker-owned transition. Control-plane HTTP routes must not call this. */
  public start(): void {
    if (this.status === BackgroundJobStatus.SCHEDULED || this.status === BackgroundJobStatus.CREATED) {
      this.status = BackgroundJobStatus.STARTED;
      this.addEvent(new BackgroundJobStartedEvent(this.id, this.reference));
    }
  }

  /** Worker-owned transition. Control-plane HTTP routes must not call this. */
  public complete(): void {
    if (this.status === BackgroundJobStatus.STARTED) {
      this.status = BackgroundJobStatus.COMPLETED;
      this.addEvent(new BackgroundJobCompletedEvent(this.id, this.reference));
    }
  }

  /** Worker-owned terminal transition after retry exhaustion. */
  public fail(reason?: string): void {
    if (this.status !== BackgroundJobStatus.COMPLETED && this.status !== BackgroundJobStatus.CANCELLED) {
      this.status = BackgroundJobStatus.FAILED;
      this.addEvent(new BackgroundJobFailedEvent(this.id, this.reference, reason));
    }
  }

  public cancel(): void {
    if (this.status !== BackgroundJobStatus.COMPLETED && this.status !== BackgroundJobStatus.FAILED && this.status !== BackgroundJobStatus.CANCELLED) {
      this.status = BackgroundJobStatus.CANCELLED;
      this.addEvent(new BackgroundJobCancelledEvent(this.id, this.reference));
    }
  }

  public getEvents(): ReadonlyArray<any> { return Object.freeze([...this.events]); }
  public clearEvents(): void { this.events.length = 0; }
  private addEvent(event: any): void { this.events.push(event); }
}
