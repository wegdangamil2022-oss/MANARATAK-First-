import type { ImportSourceDefinition, SourceConnectorCategory } from '@absheer/domain';
/** Server-bound authority; never reconstructed from registry metadata or HTTP request bodies. */
export interface ISourceAccessAuthority {
  assertAllowed(source: ImportSourceDefinition, category: SourceConnectorCategory): void;
  headersFor(source: ImportSourceDefinition, target: URL): Record<string, string>;
}
