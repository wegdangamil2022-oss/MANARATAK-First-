import type { ISourceAccessAuthority } from '../contracts/ISourceAccessAuthority';
import { SourceAccessExecutionPolicy, type ImportSourceDefinition } from '@manaratak/domain';
import type { ISourceConnector } from '../contracts/ISourceConnector';
export class SourceConnectorRegistry {
  private readonly connectors = new Map<string, ISourceConnector>();
  constructor(connectors: readonly ISourceConnector[], private readonly authority?: ISourceAccessAuthority) { for (const connector of connectors) { if (this.connectors.has(connector.connectorId)) throw new Error(`SOURCE_CONNECTOR_DUPLICATE:${connector.connectorId}`); this.connectors.set(connector.connectorId, connector); } }
  listCapabilities() { return [...this.connectors.values()].map(c => ({ connectorId: c.connectorId, connectorVersion: c.connectorVersion, category: c.category })); }
  assertAccess(source: ImportSourceDefinition, category = source.category) {
    if (this.authority) this.authority.assertAllowed(source, category);
    else SourceAccessExecutionPolicy.assertAllowed(source, category);
  }
  resolve(source: ImportSourceDefinition): ISourceConnector { const connector = this.connectors.get(source.connectorId); if (!connector) throw new Error(`SOURCE_CONNECTOR_NOT_REGISTERED:${source.connectorId}`); if (connector.connectorVersion !== source.connectorVersion) throw new Error(`SOURCE_CONNECTOR_VERSION_MISMATCH:${source.connectorId}`); this.assertAccess(source, connector.category); if (!connector.supports(source)) throw new Error(`SOURCE_CONNECTOR_UNSUPPORTED:${source.sourceId}`); return connector; }
}
