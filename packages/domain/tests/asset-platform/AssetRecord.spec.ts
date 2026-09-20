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
      expect(record.state).toBe(AssetLifecycleState.QUARANTINED);
      expect(record.locator.value).toBe('quarantine://quarantine-bucket/quarantine/ast-001.pdf');

      record.startValidation();
      expect(record.state).toBe(AssetLifecycleState.VALIDATING);

      record.startSanitizing();
      expect(record.state).toBe(AssetLifecycleState.SANITIZING);

      record.completeSanitization(new AssetSanitizationMetadata(true, new Date(), 'EXIF metadata stripped'));
      expect(record.sanitization?.exifStripped).toBe(true);

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

    it('prevents activation when malware scan fails', () => {
      const { record } = createInitialAsset();
      record.assignQuarantineLocator(new AssetStorageLocator(AssetStorageZone.QUARANTINE, 'q-bucket', 'file.exe'));
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
      record.startValidation();
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
});
