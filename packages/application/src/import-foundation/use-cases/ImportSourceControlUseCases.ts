import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus } from '@manaratak/domain';
import type { ISourceRegistryGateway } from '../contracts/ISourceRegistryGateway';
import { SourceConnectorRegistry } from '../services/SourceConnectorRegistry';
import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export interface ImportSourceDefinitionInput {
  sourceId: string; displayName: string; baseUrl: string; category: SourceConnectorCategory;
  accessClassification: SourceAccessClassification; connectorId: string; connectorVersion: string;
  rateLimitPerMinute: number; robotsPolicyUrl?: string;
  allowedPathPrefixes: string[];
}
/** Only generic source authoring. Owning-domain registries keep their independent authority. */
export class ImportSourceControlUseCases {
  constructor(private readonly sources: ISourceRegistryGateway, private readonly connectors: SourceConnectorRegistry,
    private readonly atomic: AtomicDomainMutationCoordinator) {}
  async get(sourceId: string) { return this.sources.getSource(sourceId); }
  capabilities() { return this.connectors.listCapabilities(); }

  private definition(input: ImportSourceDefinitionInput): ImportSourceDefinition {
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(input.sourceId) || !input.displayName.trim() || input.displayName.length > 240 ||
        !Number.isSafeInteger(input.rateLimitPerMinute) || input.rateLimitPerMinute < 1 || input.rateLimitPerMinute > 60_000 ||
        !Object.values(SourceConnectorCategory).includes(input.category) ||
        !Object.values(SourceAccessClassification).includes(input.accessClassification)) throw new Error('IMPORT_SOURCE_DEFINITION_INVALID');
    const connector = this.capabilities().find(value => value.connectorId === input.connectorId &&
      value.connectorVersion === input.connectorVersion && value.category === input.category);
    if (!connector) throw new Error('IMPORT_SOURCE_CONNECTOR_UNAVAILABLE');
    const url = new URL(input.baseUrl);
    const manual = input.category === SourceConnectorCategory.MANUAL_UPLOAD;
    if (url.username || url.password || url.hash || url.search ||
        (manual ? url.protocol !== 'manual:' || input.accessClassification !== SourceAccessClassification.MANUAL_ONLY
          : url.protocol !== 'https:' || input.accessClassification === SourceAccessClassification.MANUAL_ONLY))
      throw new Error('IMPORT_SOURCE_URL_INVALID');
    if (!manual && (!input.allowedPathPrefixes.length || input.allowedPathPrefixes.length > 20 ||
        input.allowedPathPrefixes.some(prefix => !prefix.startsWith('/') || prefix.length > 500 ||
          prefix.includes('\\') || prefix.includes('?') || prefix.includes('#') || prefix.includes('%') ||
          prefix.startsWith('//') || /(?:^|\/)\.\.?(?:\/|$)/.test(prefix))))
      throw new Error('IMPORT_SOURCE_SCOPE_INVALID');
    if (input.robotsPolicyUrl) {
      const robots = new URL(input.robotsPolicyUrl);
      if (robots.origin !== url.origin || robots.protocol !== 'https:' || robots.username || robots.password || robots.hash)
        throw new Error('IMPORT_SOURCE_ROBOTS_URL_INVALID');
    }
    return new ImportSourceDefinition({ ...input, baseUrl: url.toString(), status: SourceStatus.DISABLED,
      metadata: { ownerDomain: 'GENERIC', allowedUrlScope: manual ? null : {
        allowedOrigins: [url.origin], allowedPathPrefixes: input.allowedPathPrefixes,
      }, rawSnapshotRequiredBeforeSemanticTransform: true } });
  }

  async save(input: ImportSourceDefinitionInput, expectedUpdatedAt: string | null, reason: string,
    context: AtomicMutationRequestContext) {
    if (!context.actorId?.trim() || !reason?.trim() || reason.length > 1000) throw new Error('IMPORT_SOURCE_REVIEW_REQUIRED');
    const source = this.definition(input);
    if (!this.sources.withTransaction) throw new Error('IMPORT_SOURCE_TRANSACTION_REQUIRED');
    if (expectedUpdatedAt !== null && !Number.isFinite(Date.parse(expectedUpdatedAt))) throw new Error('IMPORT_SOURCE_VERSION_INVALID');
    await this.atomic.execute({ domain: 'IMPORT', aggregateType: 'ImportSource', aggregateId: source.sourceId,
      action: expectedUpdatedAt === null ? 'IMPORT_SOURCE_CREATED' : 'IMPORT_SOURCE_UPDATED', context,
      auditMetadata: { reason, status: SourceStatus.DISABLED },
    }, async tx => {
      const repository = this.sources.withTransaction!(tx);
      const existing = await repository.getSource(source.sourceId);
      if (existing && existing.metadata?.ownerDomain !== 'GENERIC') throw new Error('IMPORT_SOURCE_OWNER_WORKSPACE_REQUIRED');
      if (expectedUpdatedAt === null) {
        if (existing) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
        await repository.registerSource(source);
      } else {
        if (!existing || !repository.replaceSource) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
        await repository.replaceSource(source, new Date(expectedUpdatedAt));
      }
    });
    return this.sources.getSource(source.sourceId);
  }
}
