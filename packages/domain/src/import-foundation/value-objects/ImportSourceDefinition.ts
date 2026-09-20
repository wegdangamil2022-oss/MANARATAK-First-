import { SourceConnectorCategory } from '../enums/SourceConnectorCategory';
import { SourceAccessClassification } from '../enums/SourceAccessClassification';
import { SourceStatus } from '../enums/SourceStatus';

export interface ImportSourceDefinitionProps {
  sourceId: string;
  displayName: string;
  baseUrl: string;
  category: SourceConnectorCategory;
  accessClassification: SourceAccessClassification;
  status: SourceStatus;
  rateLimitPerMinute?: number;
  robotsPolicyUrl?: string;
  connectorId: string;
  connectorVersion: string;
  metadata?: Record<string, any>;
}

export class ImportSourceDefinition {
  public readonly sourceId: string;
  public readonly displayName: string;
  public readonly baseUrl: string;
  public readonly category: SourceConnectorCategory;
  public readonly accessClassification: SourceAccessClassification;
  public readonly status: SourceStatus;
  public readonly rateLimitPerMinute?: number;
  public readonly robotsPolicyUrl?: string;
  public readonly connectorId: string;
  public readonly connectorVersion: string;
  public readonly metadata?: Record<string, any>;

  constructor(props: ImportSourceDefinitionProps) {
    if (!props.sourceId || props.sourceId.trim() === '') {
      throw new Error('sourceId is required');
    }
    if (!props.displayName || props.displayName.trim() === '') {
      throw new Error('displayName is required');
    }
    if (!props.baseUrl || props.baseUrl.trim() === '') {
      throw new Error('baseUrl is required');
    }
    if (!props.connectorId || props.connectorId.trim() === '') {
      throw new Error('connectorId is required');
    }
    if (!props.connectorVersion || props.connectorVersion.trim() === '') {
      throw new Error('connectorVersion is required');
    }

    if (
      props.accessClassification === SourceAccessClassification.BLOCKED &&
      props.status === SourceStatus.ACTIVE
    ) {
      throw new Error('A BLOCKED source cannot have an ACTIVE status');
    }

    this.sourceId = props.sourceId;
    this.displayName = props.displayName;
    this.baseUrl = props.baseUrl;
    this.category = props.category;
    this.accessClassification = props.accessClassification;
    this.status = props.status;
    this.rateLimitPerMinute = props.rateLimitPerMinute;
    this.robotsPolicyUrl = props.robotsPolicyUrl;
    this.connectorId = props.connectorId;
    this.connectorVersion = props.connectorVersion;
    this.metadata = props.metadata;
  }
}
