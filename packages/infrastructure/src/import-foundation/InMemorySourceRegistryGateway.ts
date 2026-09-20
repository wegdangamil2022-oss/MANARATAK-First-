import { 
  ISourceRegistryGateway 
} from '@manaratak/application';
import { 
  ImportSourceDefinition, 
  SourceStatus, 
  SourceConnectorCategory, 
  SourceAccessClassification 
} from '@manaratak/domain';

export class InMemorySourceRegistryGateway implements ISourceRegistryGateway {
  public readonly persistenceClassification = 'DEVELOPMENT_ONLY' as const;
  private readonly registry: Map<string, ImportSourceDefinition> = new Map();

  async registerSource(source: ImportSourceDefinition): Promise<void> {
    if (this.registry.has(source.sourceId)) {
      throw new Error(`Source with ID ${source.sourceId} is already registered.`);
    }
    this.registry.set(source.sourceId, source);
  }

  async getSource(sourceId: string): Promise<ImportSourceDefinition | null> {
    const source = this.registry.get(sourceId);
    return source ? this.clone(source) : null;
  }

  async listSources(filters?: { 
    status?: SourceStatus; 
    category?: SourceConnectorCategory; 
    accessClassification?: SourceAccessClassification;
  }): Promise<ImportSourceDefinition[]> {
    let sources = Array.from(this.registry.values());

    if (filters) {
      if (filters.status) {
        sources = sources.filter(s => s.status === filters.status);
      }
      if (filters.category) {
        sources = sources.filter(s => s.category === filters.category);
      }
      if (filters.accessClassification) {
        sources = sources.filter(s => s.accessClassification === filters.accessClassification);
      }
    }

    return sources.map(s => this.clone(s));
  }

  async updateSourceStatus(sourceId: string, status: SourceStatus, _reason?: string): Promise<boolean> {
    const source = this.registry.get(sourceId);
    if (!source) {
      return false;
    }

    if (source.accessClassification === SourceAccessClassification.BLOCKED && status === SourceStatus.ACTIVE) {
      throw new Error('A BLOCKED source cannot have an ACTIVE status');
    }

    const updatedSource = new ImportSourceDefinition({
      sourceId: source.sourceId,
      displayName: source.displayName,
      baseUrl: source.baseUrl,
      category: source.category,
      accessClassification: source.accessClassification,
      status: status,
      rateLimitPerMinute: source.rateLimitPerMinute,
      robotsPolicyUrl: source.robotsPolicyUrl,
      connectorId: source.connectorId,
      connectorVersion: source.connectorVersion,
      metadata: { ...(source.metadata ?? {}), ...(source.metadata?.ownerDomain === 'SCHOLARSHIPS' ? { scholarshipSourceStatus: status === SourceStatus.ACTIVE ? 'ACTIVE' : 'DISABLED' } : {}) }
    });

    this.registry.set(sourceId, updatedSource);
    return true;
  }

  private clone(source: ImportSourceDefinition): ImportSourceDefinition {
    return new ImportSourceDefinition({
      sourceId: source.sourceId,
      displayName: source.displayName,
      baseUrl: source.baseUrl,
      category: source.category,
      accessClassification: source.accessClassification,
      status: source.status,
      rateLimitPerMinute: source.rateLimitPerMinute,
      robotsPolicyUrl: source.robotsPolicyUrl,
      connectorId: source.connectorId,
      connectorVersion: source.connectorVersion,
      metadata: source.metadata ? { ...source.metadata } : undefined
    });
  }
}
