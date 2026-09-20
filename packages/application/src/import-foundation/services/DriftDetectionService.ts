import { IDriftDetectionService } from '../contracts/IDriftDetectionService';
import { 
  ImportSourceDefinition, 
  ConnectorSignature, 
  DriftAlert, 
  DriftType, 
  DriftSeverity 
} from '@manaratak/domain';

export class DriftDetectionService implements IDriftDetectionService {
  async compareSignatures(input: {
    source: ImportSourceDefinition;
    previous: ConnectorSignature;
    current: ConnectorSignature;
  }): Promise<DriftAlert | null> {
    const { source, previous, current } = input;

    // 1. Selector Missing
    if (previous.requiredSelectors && previous.requiredSelectors.length > 0) {
      const currentSelectors = new Set(current.requiredSelectors || []);
      const missingSelectors = previous.requiredSelectors.filter(s => !currentSelectors.has(s));
      if (missingSelectors.length > 0) {
        return new DriftAlert({
          sourceId: source.sourceId,
          connectorId: current.connectorId,
          connectorVersion: current.connectorVersion,
          detectedAt: new Date(),
          driftType: DriftType.SELECTOR_MISSING,
          severity: DriftSeverity.HIGH,
          previousSignature: previous,
          currentSignature: current,
          sampleEvidence: `Missing required selectors: ${missingSelectors.join(', ')}`,
          recommendedAction: 'Update connector selectors or restore missing source selectors.'
        });
      }
    }

    // 2. Required Field Missing
    if (previous.requiredFields && previous.requiredFields.length > 0) {
      const currentFields = new Set(current.requiredFields || []);
      const missingFields = previous.requiredFields.filter(f => !currentFields.has(f));
      if (missingFields.length > 0) {
        return new DriftAlert({
          sourceId: source.sourceId,
          connectorId: current.connectorId,
          connectorVersion: current.connectorVersion,
          detectedAt: new Date(),
          driftType: DriftType.REQUIRED_FIELD_MISSING,
          severity: DriftSeverity.HIGH,
          previousSignature: previous,
          currentSignature: current,
          sampleEvidence: `Missing required fields: ${missingFields.join(', ')}`,
          recommendedAction: 'Update mapping configuration or restore missing required fields.'
        });
      }
    }

    // 3. Schema Mismatch
    if (this.hasSchemaMismatch(previous.expectedSchemaShape, current.expectedSchemaShape)) {
      return new DriftAlert({
        sourceId: source.sourceId,
        connectorId: current.connectorId,
        connectorVersion: current.connectorVersion,
        detectedAt: new Date(),
        driftType: DriftType.SCHEMA_MISMATCH,
        severity: DriftSeverity.CRITICAL,
        previousSignature: previous,
        currentSignature: current,
        sampleEvidence: 'Expected schema shape differs from current schema shape.',
        recommendedAction: 'Update schema mapping or connector adapter version.'
      });
    }

    // 4. Low Yield
    if (
      previous.minimumExpectedRows !== undefined &&
      current.minimumExpectedRows !== undefined &&
      current.minimumExpectedRows < previous.minimumExpectedRows * 0.5
    ) {
      return new DriftAlert({
        sourceId: source.sourceId,
        connectorId: current.connectorId,
        connectorVersion: current.connectorVersion,
        detectedAt: new Date(),
        driftType: DriftType.LOW_YIELD,
        severity: DriftSeverity.MEDIUM,
        previousSignature: previous,
        currentSignature: current,
        sampleEvidence: `Expected minimum rows dropped from ${previous.minimumExpectedRows} to ${current.minimumExpectedRows}.`,
        recommendedAction: 'Check source pagination, rate limiting, or source availability.'
      });
    }

    // 5. Content Structure Changed
    if (
      previous.contentHash &&
      current.contentHash &&
      previous.contentHash !== current.contentHash
    ) {
      return new DriftAlert({
        sourceId: source.sourceId,
        connectorId: current.connectorId,
        connectorVersion: current.connectorVersion,
        detectedAt: new Date(),
        driftType: DriftType.CONTENT_STRUCTURE_CHANGED,
        severity: DriftSeverity.LOW,
        previousSignature: previous,
        currentSignature: current,
        sampleEvidence: `Content hash changed from ${previous.contentHash} to ${current.contentHash}.`,
        recommendedAction: 'Review layout/structural changes on source.'
      });
    }

    return null;
  }

  private hasSchemaMismatch(
    prevShape?: Record<string, string>,
    currShape?: Record<string, string>
  ): boolean {
    if (!prevShape && !currShape) return false;
    if (!prevShape || !currShape) return true;

    const prevKeys = Object.keys(prevShape);
    const currKeys = Object.keys(currShape);

    if (prevKeys.length !== currKeys.length) return true;

    for (const key of prevKeys) {
      if (prevShape[key] !== currShape[key]) {
        return true;
      }
    }

    return false;
  }
}
