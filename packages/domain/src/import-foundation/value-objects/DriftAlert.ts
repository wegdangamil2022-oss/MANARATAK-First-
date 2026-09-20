import { DriftType } from '../enums/DriftType';
import { DriftSeverity } from '../enums/DriftSeverity';
import { ConnectorSignature } from './ConnectorSignature';

export interface DriftAlertProps {
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  detectedAt: Date;
  driftType: DriftType;
  severity: DriftSeverity;
  previousSignature: ConnectorSignature;
  currentSignature: ConnectorSignature;
  sampleEvidence?: string;
  recommendedAction: string;
}

export class DriftAlert {
  public readonly sourceId: string;
  public readonly connectorId: string;
  public readonly connectorVersion: string;
  public readonly detectedAt: Date;
  public readonly driftType: DriftType;
  public readonly severity: DriftSeverity;
  public readonly previousSignature: ConnectorSignature;
  public readonly currentSignature: ConnectorSignature;
  public readonly sampleEvidence?: string;
  public readonly recommendedAction: string;

  constructor(props: DriftAlertProps) {
    if (!props.sourceId || props.sourceId.trim() === '') {
      throw new Error('sourceId is required');
    }
    if (!props.connectorId || props.connectorId.trim() === '') {
      throw new Error('connectorId is required');
    }
    if (!props.connectorVersion || props.connectorVersion.trim() === '') {
      throw new Error('connectorVersion is required');
    }
    if (!props.detectedAt) {
      throw new Error('detectedAt is required');
    }
    if (!props.driftType) {
      throw new Error('driftType is required');
    }
    if (!props.severity) {
      throw new Error('severity is required');
    }
    if (!props.previousSignature) {
      throw new Error('previousSignature is required');
    }
    if (!props.currentSignature) {
      throw new Error('currentSignature is required');
    }
    if (!props.recommendedAction || props.recommendedAction.trim() === '') {
      throw new Error('recommendedAction is required');
    }

    this.sourceId = props.sourceId;
    this.connectorId = props.connectorId;
    this.connectorVersion = props.connectorVersion;
    this.detectedAt = props.detectedAt;
    this.driftType = props.driftType;
    this.severity = props.severity;
    this.previousSignature = props.previousSignature;
    this.currentSignature = props.currentSignature;
    
    if (props.sampleEvidence && props.sampleEvidence.length > 1000) {
      this.sampleEvidence = props.sampleEvidence.substring(0, 1000);
    } else {
      this.sampleEvidence = props.sampleEvidence;
    }
    
    this.recommendedAction = props.recommendedAction;
  }
}
