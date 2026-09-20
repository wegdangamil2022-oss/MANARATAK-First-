import { describe, it, expect } from 'vitest';
import { 
  ImportSourceDefinition, 
  SourceConnectorCategory, 
  SourceAccessClassification, 
  SourceStatus,
  ConnectorSignature,
  DriftAlert,
  DriftType,
  DriftSeverity
} from '../../../src/index';

describe('Source Connector Value Objects', () => {
  describe('ImportSourceDefinition', () => {
    const validProps = {
      sourceId: 'source-1',
      displayName: 'Test Source',
      baseUrl: 'https://example.com',
      category: SourceConnectorCategory.OFFICIAL_API,
      accessClassification: SourceAccessClassification.PUBLIC_ALLOWED,
      status: SourceStatus.ACTIVE,
      connectorId: 'conn-1',
      connectorVersion: '1.0.0'
    };

    it('creates successfully with valid props', () => {
      const source = new ImportSourceDefinition(validProps);
      expect(source.sourceId).toBe('source-1');
      expect(source.displayName).toBe('Test Source');
    });

    it('rejects empty sourceId', () => {
      expect(() => new ImportSourceDefinition({ ...validProps, sourceId: '' })).toThrow('sourceId is required');
    });

    it('rejects ACTIVE status for BLOCKED classification', () => {
      expect(() => new ImportSourceDefinition({ 
        ...validProps, 
        accessClassification: SourceAccessClassification.BLOCKED,
        status: SourceStatus.ACTIVE 
      })).toThrow('A BLOCKED source cannot have an ACTIVE status');
    });
  });

  describe('ConnectorSignature', () => {
    it('creates successfully with valid props', () => {
      const sig = new ConnectorSignature({
        connectorId: 'conn-1',
        connectorVersion: '1.0.0'
      });
      expect(sig.connectorId).toBe('conn-1');
    });

    it('rejects empty connectorId', () => {
      expect(() => new ConnectorSignature({ connectorId: '', connectorVersion: '1.0.0' })).toThrow('connectorId is required');
    });

    it('rejects empty connectorVersion', () => {
      expect(() => new ConnectorSignature({ connectorId: 'conn-1', connectorVersion: '' })).toThrow('connectorVersion is required');
    });
  });

  describe('DriftAlert', () => {
    const validProps = {
      sourceId: 'source-1',
      connectorId: 'conn-1',
      connectorVersion: '1.0.0',
      detectedAt: new Date(),
      driftType: DriftType.SELECTOR_MISSING,
      severity: DriftSeverity.HIGH,
      previousSignature: new ConnectorSignature({ connectorId: 'conn-1', connectorVersion: '1.0.0' }),
      currentSignature: new ConnectorSignature({ connectorId: 'conn-1', connectorVersion: '1.0.0' }),
      recommendedAction: 'Check selectors'
    };

    it('creates successfully with valid props', () => {
      const alert = new DriftAlert(validProps);
      expect(alert.sourceId).toBe('source-1');
    });

    it('truncates sampleEvidence to 1000 characters', () => {
      const longEvidence = 'a'.repeat(1500);
      const alert = new DriftAlert({ ...validProps, sampleEvidence: longEvidence });
      expect(alert.sampleEvidence?.length).toBe(1000);
      expect(alert.sampleEvidence).toBe('a'.repeat(1000));
    });

    it('does not truncate sampleEvidence if <= 1000 characters', () => {
      const shortEvidence = 'a'.repeat(500);
      const alert = new DriftAlert({ ...validProps, sampleEvidence: shortEvidence });
      expect(alert.sampleEvidence?.length).toBe(500);
    });
  });
});
