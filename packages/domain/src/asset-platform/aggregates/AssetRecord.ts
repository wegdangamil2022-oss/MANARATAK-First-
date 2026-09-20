import { AssetId } from '../value-objects/AssetId';
import { AssetReference } from '../value-objects/AssetReference';
import { AssetStorageLocator } from '../value-objects/AssetStorageLocator';
import { AssetMetadata } from '../value-objects/AssetMetadata';
import { AssetChecksum } from '../value-objects/AssetChecksum';
import { AssetRetentionMetadata } from '../value-objects/AssetRetentionMetadata';
import { AssetOwnerReference } from '../value-objects/AssetOwnerReference';
import { AssetVersionChain } from '../value-objects/AssetVersionChain';
import { AssetSanitizationMetadata } from '../value-objects/AssetSanitizationMetadata';
import { AssetLifecycleState } from '../enums/AssetLifecycleState';
import { AssetSecurityClassification } from '../enums/AssetSecurityClassification';
import { AssetStorageZone } from '../enums/AssetStorageZone';
import { AssetRetentionCategory } from '../enums/AssetRetentionCategory';

import { AssetQuarantinedEvent } from '../events/AssetQuarantinedEvent';
import { AssetMalwareScanSucceededEvent } from '../events/AssetMalwareScanSucceededEvent';
import { AssetMalwareScanFailedEvent } from '../events/AssetMalwareScanFailedEvent';
import { AssetSanitizedEvent } from '../events/AssetSanitizedEvent';
import { AssetActivatedEvent } from '../events/AssetActivatedEvent';
import { AssetArchivedEvent } from '../events/AssetArchivedEvent';
import { AssetDeletedEvent } from '../events/AssetDeletedEvent';
import { AssetRestoredEvent } from '../events/AssetRestoredEvent';

export interface AssetRecordProps {
  id: AssetId;
  reference: AssetReference;
  locator: AssetStorageLocator;
  metadata: AssetMetadata;
  retention: AssetRetentionMetadata;
  owner: AssetOwnerReference;
  classification: AssetSecurityClassification;
  state: AssetLifecycleState;
  checksum?: AssetChecksum;
  versionChain?: AssetVersionChain;
  sanitization?: AssetSanitizationMetadata;
}

export class AssetRecord {
  private events: unknown[] = [];

  constructor(private props: AssetRecordProps, isNew: boolean = false) {
    if (isNew) {
      this.props.state = AssetLifecycleState.INITIATED;
    }
  }

  get id(): AssetId { return this.props.id; }
  get reference(): AssetReference { return this.props.reference; }
  get locator(): AssetStorageLocator { return this.props.locator; }
  get metadata(): AssetMetadata { return this.props.metadata; }
  get retention(): AssetRetentionMetadata { return this.props.retention; }
  get owner(): AssetOwnerReference { return this.props.owner; }
  get classification(): AssetSecurityClassification { return this.props.classification; }
  get state(): AssetLifecycleState { return this.props.state; }
  get checksum(): AssetChecksum | undefined { return this.props.checksum; }
  get versionChain(): AssetVersionChain | undefined { return this.props.versionChain; }
  get sanitization(): AssetSanitizationMetadata | undefined { return this.props.sanitization; }

  public getUncommittedEvents(): unknown[] {
    return this.events;
  }

  public clearEvents(): void {
    this.events = [];
  }

  public assignQuarantineLocator(locator: AssetStorageLocator): void {
    if (locator.storageZone !== AssetStorageZone.QUARANTINE) {
      throw new Error('Storage locator must be in QUARANTINE zone when quarantining');
    }
    this.props.locator = locator;
    this.props.state = AssetLifecycleState.QUARANTINED;
    this.events.push(new AssetQuarantinedEvent(this.props.id));
  }

  public startValidation(): void {
    if (this.props.state !== AssetLifecycleState.QUARANTINED && this.props.state !== AssetLifecycleState.INITIATED) {
      throw new Error('Can only start validation from INITIATED or QUARANTINED state');
    }
    this.props.state = AssetLifecycleState.VALIDATING;
  }

  public failMalwareScan(reason: string = 'Malware detected'): void {
    if (this.props.state === AssetLifecycleState.ACTIVE) {
      throw new Error('Cannot mark active asset as malware scan failed');
    }
    this.props.state = AssetLifecycleState.MALWARE_SCAN_FAILED;
    this.events.push(new AssetMalwareScanFailedEvent(this.props.id, reason));
  }

  public passMalwareScan(): void {
    this.events.push(new AssetMalwareScanSucceededEvent(this.props.id));
  }

  public startSanitizing(): void {
    if (this.props.state !== AssetLifecycleState.VALIDATING && this.props.state !== AssetLifecycleState.QUARANTINED) {
      throw new Error('Can only start sanitization from QUARANTINED or VALIDATING state');
    }
    this.props.state = AssetLifecycleState.SANITIZING;
  }

  public completeSanitization(sanitization: AssetSanitizationMetadata, sanitizedLocator?: AssetStorageLocator): void {
    if (this.props.state !== AssetLifecycleState.SANITIZING) {
      throw new Error('Can only complete sanitization from SANITIZING state');
    }
    if (sanitizedLocator) {
      if (sanitizedLocator.storageZone !== AssetStorageZone.QUARANTINE) {
        throw new Error('Sanitized asset must remain in QUARANTINE storage zone until activation');
      }
      this.props.locator = sanitizedLocator;
    }
    this.props.sanitization = sanitization;
    this.events.push(new AssetSanitizedEvent(this.props.id));
  }

  public activate(cleanLocator: AssetStorageLocator, checksum?: AssetChecksum): void {
    if (this.props.state === AssetLifecycleState.MALWARE_SCAN_FAILED) {
      throw new Error('Cannot activate asset that failed malware scanning');
    }
    if (
      this.props.state !== AssetLifecycleState.SANITIZING &&
      this.props.state !== AssetLifecycleState.VALIDATING &&
      this.props.state !== AssetLifecycleState.QUARANTINED
    ) {
      throw new Error(`Cannot activate asset in ${this.props.state} state`);
    }
    if (cleanLocator.storageZone !== AssetStorageZone.CLEAN) {
      throw new Error('Clean locator must be in CLEAN storage zone');
    }
    this.props.locator = cleanLocator;
    if (checksum) {
      this.props.checksum = checksum;
    }
    this.props.state = AssetLifecycleState.ACTIVE;
    this.events.push(new AssetActivatedEvent(this.props.id));
  }

  public archive(): void {
    if (this.props.state !== AssetLifecycleState.ACTIVE) {
      throw new Error('Can only archive from ACTIVE state');
    }
    this.props.state = AssetLifecycleState.ARCHIVED;
    this.props.retention = new AssetRetentionMetadata(AssetRetentionCategory.ARCHIVED, this.props.retention.expiresAt);
    this.events.push(new AssetArchivedEvent(this.props.id));
  }

  public softDelete(): void {
    if (this.props.state === AssetLifecycleState.DELETED || this.props.state === AssetLifecycleState.PURGED) {
      throw new Error('Asset is already deleted or purged');
    }
    this.props.state = AssetLifecycleState.DELETED;
    this.props.retention = new AssetRetentionMetadata(AssetRetentionCategory.SOFT_DELETED, this.props.retention.expiresAt);
    this.events.push(new AssetDeletedEvent(this.props.id));
  }

  public restore(): void {
    if (this.props.state !== AssetLifecycleState.DELETED) {
      throw new Error('Can only restore from DELETED state');
    }
    this.props.state = AssetLifecycleState.ACTIVE;
    this.props.retention = new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT, this.props.retention.expiresAt);
    this.events.push(new AssetRestoredEvent(this.props.id));
  }

  public purge(): void {
    if (this.props.state !== AssetLifecycleState.DELETED) {
      throw new Error('Can only purge soft-deleted assets');
    }
    this.props.state = AssetLifecycleState.PURGED;
  }
}
