import type { ConnectorSignature, ImportSourceDefinition, SourceConnectorCategory } from '@manaratak/domain';

export interface ManualSourceInput { rawBytes: Uint8Array; fileName?: string; contentType?: string; assetReference?: string; }
export interface SourceAcquisitionRequest { targetUrl?: string; manualInput?: ManualSourceInput; timeoutMs?: number; maxResponseBytes?: number; maxRedirects?: number; }
export interface SourceAcquisitionResult {
  sourceId: string; connectorId: string; connectorVersion: string;
  requestedUrl?: string; finalUrl?: string; statusCode?: number; contentType?: string; contentLength?: number;
  rawBytes: Uint8Array; fetchedAt: Date; etag?: string; lastModified?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
export interface SafeSourceHttpResponse { requestedUrl: string; finalUrl: string; statusCode: number; contentType?: string; rawBytes: Uint8Array; fetchedAt: Date; etag?: string; lastModified?: string; }
export interface ISafeSourceHttpTransport { get(source: ImportSourceDefinition, request: SourceAcquisitionRequest): Promise<SafeSourceHttpResponse>; }

export interface ISourceConnector {
  readonly connectorId: string;
  readonly connectorVersion: string;
  readonly category: SourceConnectorCategory;
  
  supports(source: ImportSourceDefinition): boolean;
  
  getSignature(source: ImportSourceDefinition): Promise<ConnectorSignature>;
  
  acquire(source: ImportSourceDefinition, request?: SourceAcquisitionRequest): Promise<SourceAcquisitionResult>;
}
