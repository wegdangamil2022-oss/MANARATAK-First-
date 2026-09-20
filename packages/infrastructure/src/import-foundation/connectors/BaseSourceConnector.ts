import type { ISafeSourceHttpTransport, ISourceConnector, SourceAcquisitionRequest, SourceAcquisitionResult } from '@manaratak/application';
import { 
  ImportSourceDefinition, 
  ConnectorSignature, 
  SourceConnectorCategory,
  SourceStatus,
  SourceAccessClassification
} from '@manaratak/domain';

export abstract class BaseSourceConnector implements ISourceConnector {
  abstract readonly connectorId: string;
  abstract readonly connectorVersion: string;
  abstract readonly category: SourceConnectorCategory;
  constructor(protected readonly transport?: ISafeSourceHttpTransport) {}

  supports(source: ImportSourceDefinition): boolean {
    if (source.category !== this.category) return false;
    if (source.status === SourceStatus.BLOCKED || source.status === SourceStatus.DISABLED) return false;
    if (source.accessClassification === SourceAccessClassification.BLOCKED) return false;
    return true;
  }

  async getSignature(_source: ImportSourceDefinition): Promise<ConnectorSignature> {
    return new ConnectorSignature({
      connectorId: this.connectorId,
      connectorVersion: this.connectorVersion,
      expectedSchemaShape: { type: 'raw-source-bytes', category: this.category }
    });
  }

  async acquire(source: ImportSourceDefinition, request: SourceAcquisitionRequest = {}): Promise<SourceAcquisitionResult> {
    if (!this.supports(source)) throw new Error(`SOURCE_CONNECTOR_UNSUPPORTED:${source.sourceId}`);
    if (!this.transport) throw new Error(`SOURCE_CONNECTOR_NOT_ENABLED:${this.connectorId}`);
    const response = await this.transport.get(source, { ...request, targetUrl: request.targetUrl ?? source.baseUrl });
    if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`SOURCE_HTTP_${response.statusCode}`);
    return { sourceId: source.sourceId, connectorId: this.connectorId, connectorVersion: this.connectorVersion, requestedUrl: response.requestedUrl, finalUrl: response.finalUrl, statusCode: response.statusCode, contentType: response.contentType, contentLength: response.rawBytes.byteLength, rawBytes: response.rawBytes, fetchedAt: response.fetchedAt, etag: response.etag, lastModified: response.lastModified };
  }
}
