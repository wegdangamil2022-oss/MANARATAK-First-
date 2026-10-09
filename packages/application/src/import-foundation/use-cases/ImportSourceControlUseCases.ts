import { ImportSourceDefinition, SourceAccessClassification, SourceConnectorCategory, SourceStatus, SourceAccessExecutionPolicy } from '@manaratak/domain';
import type { ISourceRegistryGateway } from '../contracts/ISourceRegistryGateway';
import { SourceConnectorRegistry } from '../services/SourceConnectorRegistry';
import type { AcquireImportSourceUseCase } from './AcquireImportSourceUseCase';
import type { ImportAdminUseCases } from './ImportAdminUseCases';
import type { ImportParserRegistry } from '../parsers/ImportParserRegistry';
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
    private readonly atomic: AtomicDomainMutationCoordinator,
    private readonly runtime?: { acquire: AcquireImportSourceUseCase; imports: ImportAdminUseCases; parsers: ImportParserRegistry }) {}
  async get(sourceId: string) { return this.sources.getSource(sourceId); }
  capabilities() { return this.connectors.listCapabilities(); }

  async changeStatus(sourceId: string, status: SourceStatus, expectedUpdatedAt: string, reason: string,
    context: AtomicMutationRequestContext) {
    if (!context.actorId?.trim() || !reason?.trim() || reason.length > 1000) throw new Error('IMPORT_SOURCE_REVIEW_REQUIRED');
    if (!this.sources.withTransaction) throw new Error('IMPORT_SOURCE_TRANSACTION_REQUIRED');
    await this.atomic.execute({ domain: 'IMPORT', aggregateType: 'ImportSource', aggregateId: sourceId,
      action: 'IMPORT_SOURCE_STATUS_CHANGED', context, auditMetadata: { reason, status } }, async tx => {
      const repository = this.sources.withTransaction!(tx);
      const source = await repository.getSource(sourceId);
      if (!source) throw new Error('IMPORT_SOURCE_NOT_FOUND');
      if (source.metadata?.ownerDomain !== 'GENERIC') throw new Error('IMPORT_SOURCE_OWNER_WORKSPACE_REQUIRED');
      if (source.updatedAt?.toISOString() !== expectedUpdatedAt) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
      if (status === SourceStatus.ACTIVE) this.connectors.resolve(new ImportSourceDefinition({ ...source, status }));
      if (!await repository.updateSourceStatus(sourceId, status, reason)) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
    });
    return this.sources.getSource(sourceId);
  }

  async testConfiguration(sourceId: string) {
    const source = await this.sources.getSource(sourceId);
    if (!source) throw new Error('IMPORT_SOURCE_NOT_FOUND');
    const capability = this.capabilities().find(value => value.connectorId === source.connectorId &&
      value.connectorVersion === source.connectorVersion && value.category === source.category);
    let executionBlocker: string | null = null;
    try {
      const scope = source.metadata?.allowedUrlScope as { allowedPathPrefixes?: string[] } | undefined;
      this.definition({ ...source, rateLimitPerMinute: source.rateLimitPerMinute ?? 60,
        allowedPathPrefixes: scope?.allowedPathPrefixes ?? ['/'] });
      this.connectors.resolve(source);
    } catch (error) {
      executionBlocker = error instanceof Error && /^[A-Z][A-Z0-9_]{0,120}(?::[a-zA-Z0-9_-]{1,120})?$/.test(error.message)
        ? error.message : 'SOURCE_CONFIGURATION_INVALID';
    }
    return { sourceId, connectorAvailable: Boolean(capability), executionAllowed: !executionBlocker,
      executionBlocker, networkTestPerformed: false, testKind: 'CONFIGURATION_ONLY', updatedAt: source.updatedAt };
  }

  async run(sourceId: string, input: { expectedUpdatedAt: string; ownerDomain: string; format: 'csv' | 'ndjson'; reason: string },
    context: AtomicMutationRequestContext) {
    if (!context.actorId?.trim() || !input.reason?.trim() || input.reason.length > 1000) throw new Error('IMPORT_SOURCE_REVIEW_REQUIRED');
    if (!this.runtime) throw new Error('IMPORT_SOURCE_RUN_UNAVAILABLE');
    const source = await this.sources.getSource(sourceId);
    if (!source) throw new Error('IMPORT_SOURCE_NOT_FOUND');
    if (source.metadata?.ownerDomain !== 'GENERIC') throw new Error('IMPORT_SOURCE_OWNER_WORKSPACE_REQUIRED');
    if (!source.updatedAt || source.updatedAt.toISOString() !== input.expectedUpdatedAt) throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
    SourceAccessExecutionPolicy.assertNetworkAllowed(source);
    const parser = this.runtime.parsers.resolve({ formatHint: input.format });
    if (!parser) throw new Error('IMPORT_FORMAT_UNSUPPORTED');
    await this.atomic.execute({ domain: 'IMPORT', aggregateType: 'ImportSource', aggregateId: sourceId,
      action: 'IMPORT_SOURCE_RUN_REQUESTED', context, auditMetadata: { reason: input.reason, sourceRevision: input.expectedUpdatedAt } },
      async () => undefined);
    const acquired = await this.runtime.acquire.execute(source, { timeoutMs: 10_000, maxResponseBytes: 5 * 1024 * 1024 });
    const current = await this.sources.getSource(sourceId);
    if (!current || current.status !== SourceStatus.ACTIVE || current.updatedAt?.toISOString() !== input.expectedUpdatedAt)
      throw new Error('IMPORT_SOURCE_STATUS_CONFLICT');
    const snapshot = acquired.snapshot;
    async function* bytes() { yield acquired.acquisition.rawBytes; }
    return this.runtime.imports.stageNormalizedStream({ ownerDomain: input.ownerDomain, sourceSystem: sourceId,
      rows: parser.parse(bytes(), { batchId: '', chunkSize: 500 }), handoffContext: {
        artifactId: snapshot.artifactId, rawArtifactReference: snapshot.rawArtifactReference,
        referenceMetadata: { sourceId, connectorId: source.connectorId, connectorVersion: source.connectorVersion,
          contentHash: snapshot.contentHash, sourceRevision: input.expectedUpdatedAt, acquisitionKind: 'REGISTERED_SOURCE' },
      } });
  }

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
