import type { ImportSourceDefinition } from '@manaratak/domain';
import type { ISourceConnector } from '../contracts/ISourceConnector';
export class SourceConnectorRegistry {
  private readonly connectors = new Map<string, ISourceConnector>();
  constructor(connectors: readonly ISourceConnector[]) { for (const connector of connectors) { if (this.connectors.has(connector.connectorId)) throw new Error(`SOURCE_CONNECTOR_DUPLICATE:${connector.connectorId}`); this.connectors.set(connector.connectorId, connector); } }
  resolve(source: ImportSourceDefinition): ISourceConnector { const connector = this.connectors.get(source.connectorId); if (!connector) throw new Error(`SOURCE_CONNECTOR_NOT_REGISTERED:${source.connectorId}`); if (connector.connectorVersion !== source.connectorVersion) throw new Error(`SOURCE_CONNECTOR_VERSION_MISMATCH:${source.connectorId}`); if (!connector.supports(source)) throw new Error(`SOURCE_CONNECTOR_UNSUPPORTED:${source.sourceId}`); return connector; }
}
