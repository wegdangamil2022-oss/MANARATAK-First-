import { FileId } from '../value-objects/FileId';
import { FileReference } from '../value-objects/FileReference';
import { StorageLocator } from '../value-objects/StorageLocator';
import { FileMetadata } from '../value-objects/FileMetadata';
import { Checksum } from '../value-objects/Checksum';
import { RetentionMetadata } from '../value-objects/RetentionMetadata';
import { OwnerReference } from '../value-objects/OwnerReference';
import { SecurityClassification } from '../enums/SecurityClassification';
import { FileLifecycleState } from '../enums/FileLifecycleState';
import { RetentionCategory } from '../enums/RetentionCategory';

import { FileRegisteredEvent } from '../events/FileRegisteredEvent';
import { FileActivatedEvent } from '../events/FileActivatedEvent';
import { FileArchivedEvent } from '../events/FileArchivedEvent';
import { FileRestoredEvent } from '../events/FileRestoredEvent';
import { FileDeletedEvent } from '../events/FileDeletedEvent';

export interface FileRecordProps {
  id: FileId;
  reference: FileReference;
  locator: StorageLocator;
  metadata: FileMetadata;
  retention: RetentionMetadata;
  owner: OwnerReference;
  classification: SecurityClassification;
  state: FileLifecycleState;
  checksum?: Checksum;
}

export class FileRecord {
  private events: any[] = [];

  constructor(private props: FileRecordProps, isNew: boolean = false) {
    if (isNew) {
      this.props.state = FileLifecycleState.Registered;
      this.events.push(new FileRegisteredEvent(this.props.id));
    }
  }

  get id(): FileId { return this.props.id; }
  get reference(): FileReference { return this.props.reference; }
  get locator(): StorageLocator { return this.props.locator; }
  get metadata(): FileMetadata { return this.props.metadata; }
  get retention(): RetentionMetadata { return this.props.retention; }
  get owner(): OwnerReference { return this.props.owner; }
  get classification(): SecurityClassification { return this.props.classification; }
  get state(): FileLifecycleState { return this.props.state; }
  get checksum(): Checksum | undefined { return this.props.checksum; }

  public getUncommittedEvents(): any[] {
    return this.events;
  }

  public clearEvents(): void {
    this.events = [];
  }

  public activate(checksum: Checksum): void {
    if (this.props.state !== FileLifecycleState.Registered && this.props.state !== FileLifecycleState.Validating) {
      throw new Error('Can only activate from Registered or Validating state');
    }
    this.props.checksum = checksum;
    this.props.state = FileLifecycleState.Active;
    this.events.push(new FileActivatedEvent(this.props.id));
  }

  public archive(): void {
    if (this.props.state !== FileLifecycleState.Active) {
      throw new Error('Can only archive from Active state');
    }
    this.props.state = FileLifecycleState.Archived;
    this.props.retention = new RetentionMetadata(RetentionCategory.Archived, this.props.retention.expiresAt);
    this.events.push(new FileArchivedEvent(this.props.id));
  }

  public softDelete(): void {
    if (this.props.state === FileLifecycleState.Deleted || this.props.state === FileLifecycleState.Purged) {
      throw new Error('File is already deleted or purged');
    }
    this.props.state = FileLifecycleState.Deleted;
    this.props.retention = new RetentionMetadata(RetentionCategory.SoftDeleted, this.props.retention.expiresAt);
    this.events.push(new FileDeletedEvent(this.props.id));
  }

  public restore(): void {
    if (this.props.state !== FileLifecycleState.Deleted) {
      throw new Error('Can only restore from Deleted state');
    }
    this.props.state = FileLifecycleState.Active;
    this.props.retention = new RetentionMetadata(RetentionCategory.Permanent, this.props.retention.expiresAt); // Revert to Permanent
    this.events.push(new FileRestoredEvent(this.props.id));
  }
}
