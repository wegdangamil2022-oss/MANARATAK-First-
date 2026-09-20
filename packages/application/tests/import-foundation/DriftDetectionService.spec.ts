import { describe, it, expect, beforeEach } from 'vitest';
import { 
  ImportSourceDefinition, 
  SourceConnectorCategory, 
  SourceAccessClassification, 
  SourceStatus,
  ConnectorSignature,
  DriftType,
  DriftSeverity
} from '@manaratak/domain';
import { DriftDetectionService } from '../../src/import-foundation/services/DriftDetectionService';

describe('DriftDetectionService', () => {
  let service: DriftDetectionService;

  const sampleSource = new ImportSourceDefinition({
    sourceId: 'src-123',
    displayName: 'Sample Source',
    baseUrl: 'https://example.com',
    category: SourceConnectorCategory.OFFICIAL_API,
    accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
    status: SourceStatus.ACTIVE,
    connectorId: 'conn-1',
    connectorVersion: '1.0.0'
  });

  beforeEach(() => {
    service = new DriftDetectionService();
  });

  it('returns null for identical signatures', async () => {
    const signature = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredSelectors: ['.title', '.price'],
      requiredFields: ['title', 'price'],
      expectedSchemaShape: { title: 'string', price: 'number' },
      minimumExpectedRows: 100,
      contentHash: 'hash123'
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous: signature,
      current: signature
    });

    expect(alert).toBeNull();
  });

  it('detects missing selector => SELECTOR_MISSING / HIGH', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredSelectors: ['.title', '.price', '.description']
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredSelectors: ['.title', '.price']
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).not.toBeNull();
    expect(alert?.driftType).toBe(DriftType.SELECTOR_MISSING);
    expect(alert?.severity).toBe(DriftSeverity.HIGH);
    expect(alert?.sampleEvidence).toContain('.description');
  });

  it('detects missing required field => REQUIRED_FIELD_MISSING / HIGH', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredFields: ['id', 'title', 'sku']
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredFields: ['id', 'title']
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).not.toBeNull();
    expect(alert?.driftType).toBe(DriftType.REQUIRED_FIELD_MISSING);
    expect(alert?.severity).toBe(DriftSeverity.HIGH);
    expect(alert?.sampleEvidence).toContain('sku');
  });

  it('detects schema mismatch => SCHEMA_MISMATCH / CRITICAL', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      expectedSchemaShape: { title: 'string', price: 'number' }
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      expectedSchemaShape: { title: 'string', price: 'string' }
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).not.toBeNull();
    expect(alert?.driftType).toBe(DriftType.SCHEMA_MISMATCH);
    expect(alert?.severity).toBe(DriftSeverity.CRITICAL);
  });

  it('detects low yield drop below 50% => LOW_YIELD / MEDIUM', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      minimumExpectedRows: 100
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      minimumExpectedRows: 40
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).not.toBeNull();
    expect(alert?.driftType).toBe(DriftType.LOW_YIELD);
    expect(alert?.severity).toBe(DriftSeverity.MEDIUM);
  });

  it('does not trigger low yield if current is 50% or more of previous', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      minimumExpectedRows: 100
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      minimumExpectedRows: 50
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).toBeNull();
  });

  it('detects content hash change => CONTENT_STRUCTURE_CHANGED / LOW', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      contentHash: 'hash-v1'
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      contentHash: 'hash-v2'
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).not.toBeNull();
    expect(alert?.driftType).toBe(DriftType.CONTENT_STRUCTURE_CHANGED);
    expect(alert?.severity).toBe(DriftSeverity.LOW);
  });

  it('stronger drift takes precedence over content hash change', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredSelectors: ['.title'],
      contentHash: 'hash-v1'
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      requiredSelectors: [],
      contentHash: 'hash-v2'
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert).not.toBeNull();
    expect(alert?.driftType).toBe(DriftType.SELECTOR_MISSING);
    expect(alert?.severity).toBe(DriftSeverity.HIGH);
  });

  it('alert contains sourceId, connectorId, connectorVersion, detectedAt, recommendedAction', async () => {
    const previous = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      contentHash: 'hash-v1'
    });
    const current = new ConnectorSignature({
      connectorId: 'conn-1',
      connectorVersion: '1.0.1',
      contentHash: 'hash-v2'
    });

    const alert = await service.compareSignatures({
      source: sampleSource,
      previous,
      current
    });

    expect(alert?.sourceId).toBe('src-123');
    expect(alert?.connectorId).toBe('conn-1');
    expect(alert?.connectorVersion).toBe('1.0.1');
    expect(alert?.detectedAt).toBeInstanceOf(Date);
    expect(alert?.recommendedAction).toBeTruthy();
    expect(typeof alert?.recommendedAction).toBe('string');
  });
});
