import { ImportSessionId } from '../value-objects/ImportSessionId';
import { ImportContext } from '../value-objects/ImportContext';
import { ImportStatus } from '../enums/ImportStatus';

export class ImportSession {
  private status: ImportStatus;
  private startedAt: Date | null;
  private completedAt: Date | null;

  private constructor(
    private readonly id: ImportSessionId,
    private readonly context: ImportContext,
    private readonly createdAt: Date
  ) {
    this.status = ImportStatus.Pending;
    this.startedAt = null;
    this.completedAt = null;
  }

  public static create(id: ImportSessionId, context: ImportContext): ImportSession {
    return new ImportSession(id, context, new Date());
  }

  public getId(): ImportSessionId {
    return this.id;
  }

  public getContext(): ImportContext {
    return this.context;
  }

  public getStatus(): ImportStatus {
    return this.status;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getStartedAt(): Date | null {
    return this.startedAt;
  }

  public getCompletedAt(): Date | null {
    return this.completedAt;
  }

  public markAsInProgress(): void {
    if (this.status !== ImportStatus.Pending) {
      throw new Error('Cannot start a session that is not pending');
    }
    this.status = ImportStatus.InProgress;
    this.startedAt = new Date();
  }

  public markAsCompleted(): void {
    if (this.status !== ImportStatus.InProgress) {
      throw new Error('Cannot complete a session that is not in progress');
    }
    this.status = ImportStatus.Completed;
    this.completedAt = new Date();
  }

  public markAsFailed(): void {
    if (this.status !== ImportStatus.InProgress && this.status !== ImportStatus.Pending) {
      throw new Error('Cannot fail a session that is already completed or cancelled');
    }
    this.status = ImportStatus.Failed;
    this.completedAt = new Date();
  }

  public cancel(): void {
    if (this.status === ImportStatus.Completed || this.status === ImportStatus.Failed) {
      throw new Error('Cannot cancel a session that is already completed or failed');
    }
    this.status = ImportStatus.Cancelled;
    this.completedAt = new Date();
  }
}
