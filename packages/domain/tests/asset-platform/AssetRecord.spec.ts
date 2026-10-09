import { describe, it, expect } from 'vitest';
import {
  AssetId,
  AssetReference,
  AssetOwnerReference,
  AssetStorageLocator,
  AssetMetadata,
  AssetChecksum,
  AssetRetentionMetadata,
  AssetSanitizationMetadata,
  AssetRecord,
  AssetLifecycleState,
  AssetSecurityClassification,
  AssetStorageZone,
  AssetRetentionCategory,
  AssetQuarantinedEvent,
  AssetMalwareScanFailedEvent,
  AssetSanitizedEvent,
  AssetActivatedEvent,
  AssetArchivedEvent,
  AssetDeletedEvent,
  AssetRestoredEvent,
} from '../../src';

describe('Phase 05 EAP Domain Core - Slice 2A', () => {
  describe('Value Objects URL Rejection', () => {
    it('rejects raw URLs in AssetId', () => {
      expect(() => new AssetId('https://example.com/file.png')).toThrow('AssetId must be a Phase 05 EAP handle, not a raw URL');
      expect(() => new AssetId('http://cdn.site.com/asset.mp4')).toThrow('AssetId must be a Phase 05 EAP handle, not a raw URL');
      expect(() => new AssetId('')).toThrow('AssetId cannot be empty');
      expect(new AssetId('ast-123456').value).toBe('ast-123456');
    });

    it('rejects raw URLs in AssetReference', () => {
      expect(() => new AssetReference('https://storage.googleapis.com/b/k')).toThrow('AssetReference must be a Phase 05 EAP handle, not a raw URL');
      expect(() => new AssetReference('')).toThrow('AssetReference cannot be empty');
      expect(new AssetReference('ref-abc-999').value).toBe('ref-abc-999');
    });
  });

  describe('AssetRecord Lifecycle', () => {
    function createInitialAsset() {
      const id = new AssetId('ast-001');
      const reference = new AssetReference('ref-001');
      const locator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'quarantine-bucket', 'uploads/pending-1.pdf');
      const metadata = new AssetMetadata('document.pdf', 'application/pdf', 'pdf', 1024);
      const retention = new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT);
      const owner = new AssetOwnerReference('user-100', 'STUDENT');
      const classification = AssetSecurityClassification.INTERNAL;

      const record = new AssetRecord({
        id,
        reference,
        locator,
        metadata,
        retention,
        owner,
        classification,
        state: AssetLifecycleState.INITIATED,
      }, true);

      return { record, id, reference, locator, metadata, retention, owner };
    }

    it('follows valid lifecycle INITIATED -> QUARANTINED -> VALIDATING -> SANITIZING -> ACTIVE', () => {
      const { record } = createInitialAsset();
      expect(record.state).toBe(AssetLifecycleState.INITIATED);

      const quarantineLocator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'quarantine-bucket', 'quarantine/ast-001.pdf');
      record.assignQuarantineLocator(quarantineLocator);
      expect(record.state).toBe(AssetLifecycleState.INITIATED);
      expect(record.getUncommittedEvents()).not.toContainEqual(expect.any(AssetQuarantinedEvent));
      expect(record.locator.value).toBe('quarantine://quarantine-bucket/quarantine/ast-001.pdf');

      record.confirmUploadedObject({
        locator: record.locator.value,
        byteSize: record.metadata.byteSize,
        verifiedMimeType: record.metadata.mimeType,
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verifiedAt: new Date().toISOString(),
        signatureVerified: true,
      });
      expect(record.state).toBe(AssetLifecycleState.QUARANTINED);
      record.startValidation();
      expect(record.state).toBe(AssetLifecycleState.VALIDATING);
      record.passMalwareScan();

      record.startSanitizing();
      expect(record.state).toBe(AssetLifecycleState.SANITIZING);

      record.completeSanitization(new AssetSanitizationMetadata(true, new Date(), 'EXIF metadata stripped'));
      expect(record.sanitization?.exifStripped).toBe(true);
      expect(() => record.assertCanActivate()).toThrow('ASSET_MALWARE_SCAN_PASSED_EVIDENCE_REQUIRED');
      record.confirmSanitizedObject({
        locator: record.locator.value, byteSize: record.metadata.byteSize,
        verifiedMimeType: record.metadata.mimeType, checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verifiedAt: new Date().toISOString(), signatureVerified: true,
      });
      record.passSanitizedMalwareScan();

      const cleanLocator = new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean-bucket', 'assets/ast-001.pdf');
      const checksum = new AssetChecksum('sha256', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      record.activate(cleanLocator, checksum);

      expect(record.state).toBe(AssetLifecycleState.ACTIVE);
      expect(record.locator.value).toBe('clean://clean-bucket/assets/ast-001.pdf');
      expect(record.checksum?.hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

      const events = record.getUncommittedEvents();
      expect(events.some((e) => e instanceof AssetQuarantinedEvent)).toBe(true);
      expect(events.some((e) => e instanceof AssetSanitizedEvent)).toBe(true);
      expect(events.some((e) => e instanceof AssetActivatedEvent)).toBe(true);
    });

    it.each([AssetLifecycleState.INITIATED, AssetLifecycleState.DELETED, AssetLifecycleState.PURGED, AssetLifecycleState.ARCHIVED])('does not resurrect %s through manual malware failure', (state) => {
      const initial = createInitialAsset();
      const record = new AssetRecord({
        id: initial.id, reference: initial.reference, locator: initial.locator,
        metadata: initial.metadata, retention: initial.retention, owner: initial.owner,
        classification: AssetSecurityClassification.INTERNAL, state,
      });
      expect(() => record.failMalwareScan('manual')).toThrow('ASSET_MALWARE_SCAN_INVALID_STATE');
      expect(record.state).toBe(state);
      expect(record.getUncommittedEvents()).toHaveLength(0);
    });

    it('preserves TEMPORARY policy across soft-delete/restore and refuses elapsed or missing policy', () => {
      const base = createInitialAsset();
      const expiresAt = new Date(Date.now() + 60_000);
      const source = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'b', 'uploads/test.pdf');
      const props = {
        id: base.id, reference: base.reference, owner: base.owner,
        locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'b', 'clean/test.pdf'),
        metadata: base.metadata, classification: AssetSecurityClassification.INTERNAL,
        state: AssetLifecycleState.ACTIVE,
        retention: new AssetRetentionMetadata(AssetRetentionCategory.TEMPORARY, expiresAt),
        checksum: new AssetChecksum('sha256', 'a'.repeat(64)),
        sanitization: new AssetSanitizationMetadata(true, new Date()),
        malwareScan: { status: 'PASSED' as const, scannedAt: new Date().toISOString(), locator: source.value },
        uploadVerification: { locator: source.value, byteSize: base.metadata.byteSize, verifiedMimeType: 'application/pdf',
          checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(), signatureVerified: true },
      };
      const record = new AssetRecord({ ...props });
      record.softDelete();
      expect(record.retentionBeforeLifecycle).toEqual({ category: 'TEMPORARY', expiresAt: expiresAt.toISOString() });
      record.restore();
      expect(record.retention.category).toBe(AssetRetentionCategory.TEMPORARY);
      expect(record.retention.expiresAt?.getTime()).toBe(expiresAt.getTime());
      const legacy = new AssetRecord({ ...props, state: AssetLifecycleState.DELETED });
      expect(() => legacy.restore()).toThrow('ASSET_RESTORE_RETENTION_POLICY_UNKNOWN');
      const elapsed = new AssetRecord({ ...props, state: AssetLifecycleState.DELETED,
        retentionBeforeLifecycle: { category: AssetRetentionCategory.TEMPORARY, expiresAt: new Date(Date.now()-1).toISOString() } });
      expect(() => elapsed.restore()).toThrow('ASSET_RESTORE_RETENTION_POLICY_EXPIRED');
      expect(elapsed.state).toBe(AssetLifecycleState.DELETED);
    });

    it('prevents activation when malware scan fails', () => {
      const { record } = createInitialAsset();
      record.assignQuarantineLocator(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q-bucket', 'file.exe'));
      record.confirmUploadedObject({
        locator: record.locator.value,
        byteSize: record.metadata.byteSize,
        verifiedMimeType: record.metadata.mimeType,
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verifiedAt: new Date().toISOString(),
        signatureVerified: true,
      });
      record.startValidation();

      record.failMalwareScan('EICAR test signature detected');
      expect(record.state).toBe(AssetLifecycleState.MALWARE_SCAN_FAILED);

      const cleanLocator = new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean-bucket', 'file.exe');
      expect(() => record.activate(cleanLocator)).toThrow('Cannot activate asset that failed malware scanning');

      const events = record.getUncommittedEvents();
      const failEvent = events.find((e) => e instanceof AssetMalwareScanFailedEvent) as AssetMalwareScanFailedEvent;
      expect(failEvent).toBeDefined();
      expect(failEvent.reason).toBe('EICAR test signature detected');
    });

    it('handles archive, soft delete, restore, and purge rules correctly', () => {
      const { record } = createInitialAsset();
      record.assignQuarantineLocator(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q-bucket', 'doc.pdf'));
      record.confirmUploadedObject({
        locator: record.locator.value,
        byteSize: record.metadata.byteSize,
        verifiedMimeType: record.metadata.mimeType,
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verifiedAt: new Date().toISOString(),
        signatureVerified: true,
      });
      record.startValidation();
      record.passMalwareScan();
      record.startSanitizing();
      record.completeSanitization(new AssetSanitizationMetadata(true, new Date(), 'Verified sanitized output'));
      record.confirmSanitizedObject({
        locator: record.locator.value, byteSize: record.metadata.byteSize,
        verifiedMimeType: record.metadata.mimeType, checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verifiedAt: new Date().toISOString(), signatureVerified: true,
      });
      record.passSanitizedMalwareScan();
      record.activate(new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean-bucket', 'doc.pdf'));

      expect(record.state).toBe(AssetLifecycleState.ACTIVE);

      record.archive();
      expect(record.state).toBe(AssetLifecycleState.ARCHIVED);
      expect(record.retention.category).toBe(AssetRetentionCategory.ARCHIVED);

      // Cannot archive non-active asset
      expect(() => record.archive()).toThrow('Can only archive from ACTIVE state');

      // Soft delete from ARCHIVED
      record.softDelete();
      expect(record.state).toBe(AssetLifecycleState.DELETED);
      expect(record.retention.category).toBe(AssetRetentionCategory.SOFT_DELETED);

      // Restore back to ACTIVE
      record.restore();
      expect(record.state).toBe(AssetLifecycleState.ACTIVE);
      expect(record.retention.category).toBe(AssetRetentionCategory.PERMANENT);

      // Delete again & purge
      record.softDelete();
      expect(record.state).toBe(AssetLifecycleState.DELETED);

      record.purge();
      expect(record.state).toBe(AssetLifecycleState.PURGED);

      // Cannot restore or delete purged asset
      expect(() => record.restore()).toThrow('Can only restore from DELETED state');
      expect(() => record.softDelete()).toThrow('Asset is already deleted or purged');

      const events = record.getUncommittedEvents();
      expect(events.some((e) => e instanceof AssetArchivedEvent)).toBe(true);
      expect(events.some((e) => e instanceof AssetDeletedEvent)).toBe(true);
      expect(events.some((e) => e instanceof AssetRestoredEvent)).toBe(true);
    });
  });
  it('rejects promotion without a persisted scan and sanitization decision', () => {
    const id = new AssetId('asset-no-evidence');
    const record = new AssetRecord({
      id, reference: new AssetReference('ref-no-evidence'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'test.pdf'),
      metadata: new AssetMetadata('test.pdf', 'application/pdf', 'pdf', 123),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner-1', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.QUARANTINED,
    });
    expect(() => record.assertCanActivate()).toThrow('Cannot activate asset in');
    expect(() => record.startValidation()).toThrow('ASSET_UPLOAD_VERIFICATION_REQUIRED');
    record.confirmUploadedObject({
      locator: record.locator.value,
      byteSize: 123,
      verifiedMimeType: 'application/pdf',
      checksumSha256: 'a'.repeat(64),
      verifiedAt: new Date().toISOString(),
      signatureVerified: true,
    });
    record.startValidation();
    expect(() => record.startSanitizing()).toThrow('ASSET_MALWARE_SCAN_PASSED_EVIDENCE_REQUIRED');
    expect(() => record.activate(new AssetStorageLocator(AssetStorageZone.CLEAN, 'c', 'test.pdf')))
      .toThrow('Cannot activate asset in');
  });

  it('invalidates old scan evidence after sanitizer rewrites or relocates the object', () => {
    const record = new AssetRecord({
      id: new AssetId('asset-reset-evidence'),
      reference: new AssetReference('ref-reset-evidence'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'file.png'),
      metadata: new AssetMetadata('file.png', 'application/pdf', 'png', 1024),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner-1', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.QUARANTINED,
    });
    record.assignQuarantineLocator(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'file.png'));
    record.confirmUploadedObject({
      locator: record.locator.value, byteSize: 1024, verifiedMimeType: 'application/pdf',
      checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(), signatureVerified: true,
    });
    record.startValidation();
    record.passMalwareScan();
    record.startSanitizing();
    record.completeSanitization(
      new AssetSanitizationMetadata(true, new Date(), 'rewritten'),
      new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'sanitized/file.png'),
    );
    expect(record.uploadVerification).toBeUndefined();
    expect(record.malwareScan).toBeUndefined();
    expect(record.checksum).toBeUndefined();
    expect(() => record.assertCanActivate()).toThrow('ASSET_MALWARE_SCAN_PASSED_EVIDENCE_REQUIRED');
  });

  it('does not restore deleted quarantined objects into ACTIVE', () => {
    const record = new AssetRecord({
      id: new AssetId('asset-untrusted-restore'),
      reference: new AssetReference('ref-untrusted-restore'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'document.pdf'),
      metadata: new AssetMetadata('document.pdf', 'application/pdf', 'pdf', 42),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner-1', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.QUARANTINED,
    });
    record.softDelete();
    expect(() => record.restore()).toThrow('ASSET_DELIVERY_TRUST_EVIDENCE_REQUIRED');
    expect(record.state).toBe(AssetLifecycleState.DELETED);
  });

  it('rejects forged ACTIVE and CLEAN metadata without trusted upload and malware evidence', () => {
    const record = new AssetRecord({
      id: new AssetId('asset-forged-clean'),
      reference: new AssetReference('ref-forged-clean'),
      locator: new AssetStorageLocator(AssetStorageZone.CLEAN, 'clean', 'document.pdf'),
      metadata: new AssetMetadata('document.pdf', 'application/pdf', 'pdf', 42),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner-1', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.ACTIVE,
    });
    expect(() => record.assertCanDeliver()).toThrow('ASSET_DELIVERY_TRUST_EVIDENCE_REQUIRED');
  });

  it('does not emit quarantine events or scan until actual upload bytes are confirmed', () => {
    const asset = new AssetRecord({
      id: new AssetId('asset-init-event'),
      reference: new AssetReference('ref-init-event'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/pending.pdf'),
      metadata: new AssetMetadata('pending.pdf', 'application/pdf', 'pdf', 100),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.INITIATED,
    });
    const pendingLocator = new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/pending.pdf');
    asset.assignQuarantineLocator(pendingLocator);
    expect(asset.state).toBe(AssetLifecycleState.INITIATED);
    expect(asset.getUncommittedEvents()).toHaveLength(0);
    expect(() => asset.startValidation()).toThrow('Can only start validation from QUARANTINED state');
    asset.confirmUploadedObject({
      locator: pendingLocator.value, byteSize: 100, verifiedMimeType: 'application/pdf',
      checksumSha256: 'a'.repeat(64), verifiedAt: new Date().toISOString(),
      signatureVerified: true,
    });
    expect(asset.state).toBe(AssetLifecycleState.QUARANTINED);
    expect(asset.getUncommittedEvents().filter((evt) => evt instanceof AssetQuarantinedEvent)).toHaveLength(1);
    expect(() => asset.assignQuarantineLocator(pendingLocator))
      .toThrow('ASSET_UPLOAD_LOCATOR_ASSIGNMENT_INVALID_STATE');
  });

  it('emits quarantine event when an unverified legacy QUARANTINED row is finalized', () => {
    const record = new AssetRecord({
      id: new AssetId('asset-legacy-pending'),
      reference: new AssetReference('ref-legacy-pending'),
      locator: new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q', 'uploads/legacy.pdf'),
      metadata: new AssetMetadata('legacy.pdf', 'application/pdf', 'pdf', 100),
      retention: new AssetRetentionMetadata(AssetRetentionCategory.PERMANENT),
      owner: new AssetOwnerReference('owner', 'STUDENT'),
      classification: AssetSecurityClassification.INTERNAL,
      state: AssetLifecycleState.QUARANTINED,
    });
    record.confirmUploadedObject({
      locator: record.locator.value, byteSize: 100,
      verifiedMimeType: 'application/pdf', checksumSha256: 'a'.repeat(64),
      verifiedAt: new Date().toISOString(), signatureVerified: true,
    });
    expect(record.getUncommittedEvents().filter((event) => event instanceof AssetQuarantinedEvent))
      .toHaveLength(1);
  });

});
