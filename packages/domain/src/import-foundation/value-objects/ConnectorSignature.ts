export interface ConnectorSignatureProps {
  connectorId: string;
  connectorVersion: string;
  requiredSelectors?: string[];
  requiredFields?: string[];
  expectedSchemaShape?: Record<string, string>;
  contentHash?: string;
  minimumExpectedRows?: number;
}

export class ConnectorSignature {
  public readonly connectorId: string;
  public readonly connectorVersion: string;
  public readonly requiredSelectors?: string[];
  public readonly requiredFields?: string[];
  public readonly expectedSchemaShape?: Record<string, string>;
  public readonly contentHash?: string;
  public readonly minimumExpectedRows?: number;

  constructor(props: ConnectorSignatureProps) {
    if (!props.connectorId || props.connectorId.trim() === '') {
      throw new Error('connectorId is required');
    }
    if (!props.connectorVersion || props.connectorVersion.trim() === '') {
      throw new Error('connectorVersion is required');
    }

    this.connectorId = props.connectorId;
    this.connectorVersion = props.connectorVersion;
    this.requiredSelectors = props.requiredSelectors;
    this.requiredFields = props.requiredFields;
    this.expectedSchemaShape = props.expectedSchemaShape;
    this.contentHash = props.contentHash;
    this.minimumExpectedRows = props.minimumExpectedRows;
  }
}
