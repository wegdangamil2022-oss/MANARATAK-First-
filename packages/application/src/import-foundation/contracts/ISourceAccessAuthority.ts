import type { ImportSourceDefinition, SourceConnectorCategory } from '@manaratak/domain';
/** Server-bound authority; never reconstructed from registry metadata or HTTP request bodies. */
export interface ISourceAccessAuthority {
  assertAllowed(source: ImportSourceDefinition, category: SourceConnectorCategory): void;
  headersFor(source: ImportSourceDefinition, target: URL): Record<string, string>;
}
