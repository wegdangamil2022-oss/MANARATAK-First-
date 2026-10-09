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

export interface AssetUploadEvidence {
  locator: string;
  byteSize: number;
  verifiedMimeType: string;
  checksumSha256: string;
  verifiedAt: string;
  signatureVerified: boolean;
}

export interface AssetActivationOperation {
  version: 1;
  operationId: string;
  phase: 'PREPARED' | 'COMPLETED';
  sourceLocator: string;
  expectedSha256: string;
  preparedAt: string;
  completedAt?: string;
}
export interface AssetArchiveOperation {
  version: 1;
  operationId: string;
  phase: 'RUNNING' | 'RECOVERY_REQUIRED' | 'COMPLETED';
  sourceLocator: string;
  preparedAt: string;
  updatedAt: string;
}
export interface AssetRestoreOperation {
  version: 1;
  operationId: string;
  phase: 'PREPARED' | 'RESTORING' | 'RECOVERY_REQUIRED' | 'COMPLETED' | 'CANCELLED';
  sourceLocator: string;
  expectedSha256: string;
  expectedByteSize: number;
  expectedMimeType: string;
  preparedAt: string;
  updatedAt: string;
}
export interface AssetRetentionSnapshot {
  category: AssetRetentionCategory.PERMANENT | AssetRetentionCategory.TEMPORARY;
  expiresAt: string | null;
}
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
  malwareScan?: { status: 'PASSED' | 'FAILED'; scannedAt: string; locator: string };
  uploadVerification?: AssetUploadEvidence;
  activationOperation?: AssetActivationOperation;
  restoreOperation?: AssetRestoreOperation;
  archiveOperation?: AssetArchiveOperation;
  retentionBeforeLifecycle?: AssetRetentionSnapshot;
}

export class AssetRecord {
  private events: unknown[] = [];

  constructor(private props: AssetRecordProps, isNew: boolean = false) {
    if (props.archiveOperation) this.recordArchiveOperation(props.archiveOperation);
    if (props.restoreOperation) this.recordRestoreOperation(props.restoreOperation);
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
  get malwareScan(): AssetRecordProps['malwareScan'] { return this.props.malwareScan; }
  get uploadVerification(): AssetRecordProps['uploadVerification'] { return this.props.uploadVerification; }
  get activationOperation(): AssetActivationOperation | undefined { return this.props.activationOperation ? { ...this.props.activationOperation } : undefined; }
  get archiveOperation(): AssetArchiveOperation | undefined { return this.props.archiveOperation ? { ...this.props.archiveOperation } : undefined; }
  public recordArchiveOperation(operation: AssetArchiveOperation): void {
    if (operation.version !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operation.operationId) ||
      !['RUNNING', 'RECOVERY_REQUIRED', 'COMPLETED'].includes(operation.phase) ||
      !/^(clean|quarantine):\/\//.test(operation.sourceLocator) ||
      (operation.phase !== 'COMPLETED' && operation.sourceLocator !== this.props.locator.value) ||
      !Number.isFinite(Date.parse(operation.preparedAt)) || !Number.isFinite(Date.parse(operation.updatedAt))) throw new Error('ASSET_ARCHIVE_OPERATION_INVALID');
    this.props.archiveOperation = { ...operation };
  }
  private assertNoPendingArchive(): void {
    if (this.props.archiveOperation && this.props.archiveOperation.phase !== 'COMPLETED') throw new Error('ASSET_ARCHIVE_RECOVERY_PENDING');
  }

  get restoreOperation(): AssetRestoreOperation | undefined { return this.props.restoreOperation ? { ...this.props.restoreOperation } : undefined; }

  public recordRestoreOperation(operation: AssetRestoreOperation): void {
    if (operation.version !== 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operation.operationId) ||
      !['PREPARED', 'RESTORING', 'RECOVERY_REQUIRED', 'COMPLETED', 'CANCELLED'].includes(operation.phase) ||
      !/^clean:\/\//.test(operation.sourceLocator) || !/^[0-9a-f]{64}$/.test(operation.expectedSha256) ||
      !Number.isSafeInteger(operation.expectedByteSize) || operation.expectedByteSize <= 0 || !operation.expectedMimeType ||
      (!['COMPLETED', 'CANCELLED'].includes(operation.phase) &&
        (operation.sourceLocator !== this.props.locator.value || operation.expectedSha256 !== this.props.checksum?.hash ||
          operation.expectedByteSize !== this.props.metadata.byteSize || operation.expectedMimeType !== this.props.metadata.mimeType)) ||
      !Number.isFinite(Date.parse(operation.preparedAt)) || !Number.isFinite(Date.parse(operation.updatedAt))) {
      throw new Error('ASSET_RESTORE_OPERATION_INVALID');
    }
    this.props.restoreOperation = { ...operation };
  }

  private assertNoPendingRestore(): void {
    if (this.props.restoreOperation && !['COMPLETED', 'CANCELLED'].includes(this.props.restoreOperation.phase)) {
      throw new Error('ASSET_RESTORE_RECOVERY_PENDING');
    }
  }

  get retentionBeforeLifecycle(): AssetRetentionSnapshot | undefined { return this.props.retentionBeforeLifecycle ? { ...this.props.retentionBeforeLifecycle } : undefined; }

  /** Local transition artifacts only; no published integration/outbox contract. See EAP lifecycle ADR. */
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
    if ((this.props.state !== AssetLifecycleState.INITIATED &&
         this.props.state !== AssetLifecycleState.QUARANTINED) ||
        this.props.uploadVerification || this.props.malwareScan ||
        this.props.sanitization || this.props.checksum) {
      throw new Error('ASSET_UPLOAD_LOCATOR_ASSIGNMENT_INVALID_STATE');
    }
    this.props.locator = locator;
    // Allocating a quarantine locator is not evidence that an upload has completed.
    this.props.state = AssetLifecycleState.INITIATED;
  }

  public confirmUploadedObject(evidence: AssetUploadEvidence): void {
    // Accept legacy unverified QUARANTINED records, but new uploads stay INITIATED until proof.
    if ((this.props.state !== AssetLifecycleState.INITIATED &&
         this.props.state !== AssetLifecycleState.QUARANTINED) ||
        this.props.locator.storageZone !== AssetStorageZone.QUARANTINE) {
      throw new Error('ASSET_UPLOAD_VERIFICATION_INVALID_STATE');
    }
    if (evidence.locator !== this.props.locator.value ||
      evidence.signatureVerified !== true ||
      evidence.byteSize !== this.props.metadata.byteSize ||
      evidence.verifiedMimeType !== this.props.metadata.mimeType ||
      !/^[a-f0-9]{64}$/i.test(evidence.checksumSha256) ||
      !Number.isFinite(Date.parse(evidence.verifiedAt))) {
      throw new Error('ASSET_UPLOAD_VERIFICATION_FAILED');
    }
    const firstConfirmed = !this.props.uploadVerification;
    this.props.uploadVerification = { ...evidence };
    this.props.checksum = new AssetChecksum('sha256', evidence.checksumSha256.toLowerCase());
    this.props.state = AssetLifecycleState.QUARANTINED;
    if (firstConfirmed) this.events.push(new AssetQuarantinedEvent(this.props.id));
  }

  public startValidation(): void {
    if (this.props.state !== AssetLifecycleState.QUARANTINED) {
      throw new Error('Can only start validation from QUARANTINED state');
    }
    if (!this.props.uploadVerification || this.props.uploadVerification.locator !== this.props.locator.value ||
      this.props.uploadVerification.signatureVerified !== true ||
      this.props.checksum?.hash !== this.props.uploadVerification.checksumSha256.toLowerCase()) {
      throw new Error('ASSET_UPLOAD_VERIFICATION_REQUIRED');
    }
    this.props.malwareScan = undefined;
    this.props.state = AssetLifecycleState.VALIDATING;
  }

  public failMalwareScan(reason: string = 'Malware detected'): void {
    this.assertNoPendingActivation();
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
    if (this.props.state === AssetLifecycleState.ACTIVE) {
      throw new Error('Cannot mark active asset as malware scan failed');
    }
    if (![AssetLifecycleState.QUARANTINED, AssetLifecycleState.VALIDATING, AssetLifecycleState.SANITIZING].includes(this.props.state)) {
      throw new Error('ASSET_MALWARE_SCAN_INVALID_STATE');
    }
    this.props.state = AssetLifecycleState.MALWARE_SCAN_FAILED;
    this.props.malwareScan = { status: 'FAILED', scannedAt: new Date().toISOString(), locator: this.props.locator.value };
    this.events.push(new AssetMalwareScanFailedEvent(this.props.id, reason));
  }

  public passMalwareScan(): void {
    if (this.props.state !== AssetLifecycleState.VALIDATING || this.props.locator.storageZone !== AssetStorageZone.QUARANTINE) {
      throw new Error('ASSET_MALWARE_SCAN_INVALID_STATE');
    }
    this.props.malwareScan = { status: 'PASSED', scannedAt: new Date().toISOString(), locator: this.props.locator.value };
    this.events.push(new AssetMalwareScanSucceededEvent(this.props.id));
  }

  public startSanitizing(): void {
    if (this.props.state !== AssetLifecycleState.VALIDATING) {
      throw new Error('Can only start sanitization from VALIDATING state');
    }
    if (this.props.malwareScan?.status !== 'PASSED' || this.props.malwareScan.locator !== this.props.locator.value) {
      throw new Error('ASSET_MALWARE_SCAN_PASSED_EVIDENCE_REQUIRED');
    }
    this.props.state = AssetLifecycleState.SANITIZING;
  }

  public completeSanitization(sanitization: AssetSanitizationMetadata, sanitizedLocator?: AssetStorageLocator): void {
    this.assertNoPendingActivation();
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
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
    // Sanitizers may rewrite bytes even while preserving the locator; prior scan/digest is stale.
    this.props.uploadVerification = undefined;
    this.props.malwareScan = undefined;
    this.props.checksum = undefined;
    this.events.push(new AssetSanitizedEvent(this.props.id));
  }

  public confirmSanitizedObject(evidence: AssetUploadEvidence): void {
    this.assertNoPendingActivation();
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
    if (this.props.state !== AssetLifecycleState.SANITIZING ||
      !this.props.sanitization ||
      this.props.locator.storageZone !== AssetStorageZone.QUARANTINE) {
      throw new Error('ASSET_SANITIZED_UPLOAD_INVALID_STATE');
    }
    if (evidence.locator !== this.props.locator.value ||
      evidence.signatureVerified !== true ||
      !Number.isSafeInteger(evidence.byteSize) || evidence.byteSize <= 0 ||
      evidence.verifiedMimeType !== this.props.metadata.mimeType ||
      !/^[a-f0-9]{64}$/i.test(evidence.checksumSha256) ||
      !Number.isFinite(Date.parse(evidence.verifiedAt))) {
      throw new Error('ASSET_SANITIZED_UPLOAD_VERIFICATION_FAILED');
    }
    this.props.uploadVerification = { ...evidence, checksumSha256: evidence.checksumSha256.toLowerCase() };
    this.props.checksum = new AssetChecksum('sha256', evidence.checksumSha256.toLowerCase());
    this.props.metadata = new AssetMetadata(
      this.props.metadata.originalFilename, this.props.metadata.mimeType,
      this.props.metadata.fileExtension, evidence.byteSize,
      this.props.metadata.width, this.props.metadata.height,
      this.props.metadata.duration, this.props.metadata.extraMetadata,
    );
  }

  public passSanitizedMalwareScan(): void {
    this.assertNoPendingActivation();
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
    if (this.props.state !== AssetLifecycleState.SANITIZING ||
      !this.props.sanitization ||
      !this.props.uploadVerification ||
      this.props.uploadVerification.locator !== this.props.locator.value ||
      this.props.checksum?.hash !== this.props.uploadVerification.checksumSha256) {
      throw new Error('ASSET_SANITIZED_MALWARE_SCAN_INVALID_STATE');
    }
    this.props.malwareScan = {
      status: 'PASSED', scannedAt: new Date().toISOString(), locator: this.props.locator.value,
    };
    this.events.push(new AssetMalwareScanSucceededEvent(this.props.id));
  }

  public assertCanActivate(): void {
    if (this.props.state === AssetLifecycleState.MALWARE_SCAN_FAILED) {
      throw new Error('Cannot activate asset that failed malware scanning');
    }
    if (this.props.state !== AssetLifecycleState.SANITIZING) {
      throw new Error(`Cannot activate asset in ${this.props.state} state`);
    }
    if (this.props.uploadVerification?.signatureVerified !== true ||
      this.props.uploadVerification.locator !== this.props.malwareScan?.locator ||
      this.props.uploadVerification.locator !== this.props.locator.value ||
      this.props.uploadVerification.checksumSha256.toLowerCase() !== this.props.checksum?.hash ||
      this.props.malwareScan?.status !== 'PASSED' ||
      !Number.isFinite(Date.parse(this.props.malwareScan.scannedAt)) ||
      this.props.malwareScan.locator.length === 0 ||
      !this.props.sanitization ||
      !this.props.sanitization.sanitizedAt) {
      throw new Error('ASSET_MALWARE_SCAN_PASSED_EVIDENCE_REQUIRED');
    }
    if (this.props.locator.storageZone !== AssetStorageZone.QUARANTINE) {
      throw new Error('ASSET_QUARANTINE_REQUIRED_FOR_ACTIVATION');
    }
  }

  private assertNoPendingActivation(): void {
    if (this.props.activationOperation?.phase === 'PREPARED') throw new Error('ASSET_ACTIVATION_RECOVERY_PENDING');
  }

  public prepareActivation(operationId: string): void {
    this.assertCanActivate();
    if (this.props.activationOperation) {
      this.assertActivationOperation();
      return;
    }
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(operationId)) throw new Error('ASSET_ACTIVATION_OPERATION_INVALID');
    this.props.activationOperation = {
      version: 1, operationId, phase: 'PREPARED', sourceLocator: this.props.locator.value,
      expectedSha256: this.props.checksum!.hash, preparedAt: new Date().toISOString(),
    };
  }

  public assertActivationOperation(): void {
    const operation = this.props.activationOperation;
    if (!operation || operation.version !== 1 || operation.phase !== 'PREPARED' ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(operation.operationId) ||
        operation.sourceLocator !== this.props.locator.value ||
        operation.expectedSha256 !== this.props.checksum?.hash ||
        !Number.isFinite(Date.parse(operation.preparedAt))) {
      throw new Error('ASSET_ACTIVATION_OPERATION_INVALID');
    }
    this.assertCanActivate();
  }

  private preserveRetentionPolicy(): void {
    if (this.props.retentionBeforeLifecycle) return;
    const category = this.props.retention.category;
    if (category === AssetRetentionCategory.PERMANENT || category === AssetRetentionCategory.TEMPORARY) {
      this.props.retentionBeforeLifecycle = { category, expiresAt: this.props.retention.expiresAt?.toISOString() ?? null };
    }
  }

  public activate(cleanLocator: AssetStorageLocator, checksum?: AssetChecksum): void {
    this.assertCanActivate();
    if (cleanLocator.storageZone !== AssetStorageZone.CLEAN) {
      throw new Error('Clean locator must be in CLEAN storage zone');
    }
    this.props.locator = cleanLocator;
    if (checksum) {
      this.props.checksum = checksum;
    }
    this.props.state = AssetLifecycleState.ACTIVE;
    if (this.props.activationOperation) {
      this.props.activationOperation = { ...this.props.activationOperation, phase: 'COMPLETED', completedAt: new Date().toISOString() };
    }
    this.events.push(new AssetActivatedEvent(this.props.id));
  }

  public archive(): void {
    if (this.props.state !== AssetLifecycleState.ACTIVE) {
      throw new Error('Can only archive from ACTIVE state');
    }
    this.preserveRetentionPolicy();
    this.props.state = AssetLifecycleState.ARCHIVED;
    this.props.retention = new AssetRetentionMetadata(AssetRetentionCategory.ARCHIVED, this.props.retention.expiresAt);
    this.events.push(new AssetArchivedEvent(this.props.id));
  }

  public softDelete(): void {
    this.assertNoPendingActivation();
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
    if (this.props.state === AssetLifecycleState.DELETED || this.props.state === AssetLifecycleState.PURGED) {
      throw new Error('Asset is already deleted or purged');
    }
    this.preserveRetentionPolicy();
    this.props.state = AssetLifecycleState.DELETED;
    this.props.retention = new AssetRetentionMetadata(AssetRetentionCategory.SOFT_DELETED, this.props.retention.expiresAt);
    this.events.push(new AssetDeletedEvent(this.props.id));
  }

  private assertVerifiedCleanEvidence(): void {
    if (this.props.locator.storageZone !== AssetStorageZone.CLEAN ||
      this.props.uploadVerification?.signatureVerified !== true ||
      this.props.malwareScan?.status !== 'PASSED' ||
      this.props.uploadVerification.locator !== this.props.malwareScan.locator ||
      !this.props.sanitization?.sanitizedAt ||
      !Number.isFinite(this.props.sanitization.sanitizedAt.getTime()) ||
      !Number.isFinite(Date.parse(this.props.uploadVerification.verifiedAt)) ||
      !Number.isFinite(Date.parse(this.props.malwareScan.scannedAt)) ||
      !Number.isSafeInteger(this.props.metadata.byteSize) || this.props.metadata.byteSize <= 0 ||
      this.props.uploadVerification.byteSize !== this.props.metadata.byteSize ||
      this.props.uploadVerification.verifiedMimeType !== this.props.metadata.mimeType ||
      !this.props.checksum || this.props.checksum.algorithm.toLowerCase() !== 'sha256' ||
      !/^[a-f0-9]{64}$/i.test(this.props.uploadVerification.checksumSha256) ||
      this.props.checksum.hash !== this.props.uploadVerification.checksumSha256.toLowerCase()) {
      throw new Error('ASSET_DELIVERY_TRUST_EVIDENCE_REQUIRED');
    }
  }

  public assertCanDeliver(): void {
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
    if (this.props.state !== AssetLifecycleState.ACTIVE ||
      this.props.locator.storageZone !== AssetStorageZone.CLEAN) {
      throw new Error('ASSET_DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET');
    }
    this.assertVerifiedCleanEvidence();
  }

  public restore(): void {
    this.assertNoPendingRestore();
    this.assertNoPendingArchive();
    if (this.props.state !== AssetLifecycleState.DELETED) {
      throw new Error('Can only restore from DELETED state');
    }
    this.assertVerifiedCleanEvidence();
    const policy = this.props.retentionBeforeLifecycle;
    if (!policy || ![AssetRetentionCategory.PERMANENT, AssetRetentionCategory.TEMPORARY].includes(policy.category)) {
      throw new Error('ASSET_RESTORE_RETENTION_POLICY_UNKNOWN');
    }
    const expiry = policy.expiresAt === null ? null : new Date(policy.expiresAt);
    if ((policy.category === AssetRetentionCategory.TEMPORARY && !expiry) ||
        (expiry && (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()))) {
      throw new Error('ASSET_RESTORE_RETENTION_POLICY_EXPIRED');
    }
    this.props.state = AssetLifecycleState.ACTIVE;
    this.props.retention = new AssetRetentionMetadata(policy.category, expiry);
    this.events.push(new AssetRestoredEvent(this.props.id));
  }

  public purge(): void {
    if (this.props.state !== AssetLifecycleState.DELETED) {
      throw new Error('Can only purge soft-deleted assets');
    }
    this.props.state = AssetLifecycleState.PURGED;
  }
}
