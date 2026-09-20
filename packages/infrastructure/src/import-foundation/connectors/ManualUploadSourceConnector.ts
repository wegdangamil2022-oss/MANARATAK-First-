import { SourceConnectorCategory } from '@manaratak/domain';
import { BaseSourceConnector } from './BaseSourceConnector';
import type { SourceAcquisitionRequest, SourceAcquisitionResult } from '@manaratak/application';
import type { ImportSourceDefinition } from '@manaratak/domain';

export class ManualUploadSourceConnector extends BaseSourceConnector {
  readonly connectorId = 'manual-upload';
  readonly connectorVersion = '2.0.0';
  readonly category = SourceConnectorCategory.MANUAL_UPLOAD;
  async acquire(source: ImportSourceDefinition, request: SourceAcquisitionRequest = {}): Promise<SourceAcquisitionResult> {
    if (!this.supports(source)) throw new Error(`SOURCE_CONNECTOR_UNSUPPORTED:${source.sourceId}`);
    if (request.targetUrl) throw new Error('MANUAL_SOURCE_NETWORK_URL_FORBIDDEN');
    if (!request.manualInput?.rawBytes) throw new Error('MANUAL_SOURCE_INPUT_REQUIRED');
    return { sourceId: source.sourceId, connectorId: this.connectorId, connectorVersion: this.connectorVersion, rawBytes: request.manualInput.rawBytes, contentType: request.manualInput.contentType, contentLength: request.manualInput.rawBytes.byteLength, fetchedAt: new Date(), metadata: { fileName: request.manualInput.fileName ?? null, assetReference: request.manualInput.assetReference ?? null } };
  }
}
