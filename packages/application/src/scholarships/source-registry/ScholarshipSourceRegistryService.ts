import {
  ImportSourceDefinition,
  SourceAccessClassification,
  SourceConnectorCategory,
  SourceStatus,
} from '@manaratak/domain';
import type { ISourceRegistryGateway } from '../../import-foundation/contracts/ISourceRegistryGateway';
import type {
  ScholarshipAcquisitionMode,
  ScholarshipPhase6RegistrationPlan,
  ScholarshipSourceConfiguration,
} from './ScholarshipSourceRegistryContracts';
import { ScholarshipSourceScopePolicy } from './ScholarshipSourceScopePolicy';

const OWNER_DOMAIN = 'SCHOLARSHIPS';

const CONNECTOR_BY_MODE: Record<ScholarshipAcquisitionMode, {
  category: SourceConnectorCategory;
  connectorId: string;
  connectorVersion: string;
}> = {
  WEBSITE: {
    category: SourceConnectorCategory.STATIC_HTML,
    connectorId: 'static-html', connectorVersion: '2.0.0',
  },
  SITEMAP: {
    category: SourceConnectorCategory.SITEMAP,
    connectorId: 'sitemap', connectorVersion: '2.0.0',
  },
  FEED: {
    category: SourceConnectorCategory.OFFICIAL_FEED,
    connectorId: 'official-feed', connectorVersion: '2.0.0',
  },
  API: {
    category: SourceConnectorCategory.OFFICIAL_API,
    connectorId: 'official-api', connectorVersion: '2.0.0',
  },
  MANUAL_FILE: {
    category: SourceConnectorCategory.MANUAL_UPLOAD,
    connectorId: 'manual-upload', connectorVersion: '2.0.0',
  },
};

export class ScholarshipSourceRegistryService {
  constructor(private readonly registry: ISourceRegistryGateway) {}

  validate(config: ScholarshipSourceConfiguration): void {
    ScholarshipSourceScopePolicy.assertConfiguration(config);
  }

  toPhase6RegistrationPlan(config: ScholarshipSourceConfiguration): ScholarshipPhase6RegistrationPlan {
    this.validate(config);
    const connector = CONNECTOR_BY_MODE[config.acquisitionMode];
    const status = this.toPhase6Status(config.status);
    const baseUrl = config.baseUrl ?? `manual://scholarship-source/${encodeURIComponent(config.sourceId)}`;

    const source = new ImportSourceDefinition({
      sourceId: config.sourceId,
      displayName: config.sourceName,
      baseUrl,
      category: connector.category,
      accessClassification: config.acquisitionMode === 'MANUAL_FILE'
        ? SourceAccessClassification.MANUAL_ONLY
        : SourceAccessClassification.PUBLIC_ALLOWED,
      status,
      rateLimitPerMinute: config.rateLimitPolicy?.requestsPerMinute,
      connectorId: connector.connectorId,
      connectorVersion: connector.connectorVersion,
      metadata: {
        ownerDomain: OWNER_DOMAIN,
        scholarshipSourceType: config.sourceType,
        scholarshipSourceStatus: config.status,
        acquisitionMode: config.acquisitionMode,
        allowedUrlScope: config.allowedUrlScope ?? null,
        rateLimitPolicy: config.rateLimitPolicy ?? null,
        lastExecution: config.lastExecution,
        liveConnectorProof: 'PENDING_RUNTIME',
        rawSnapshotRequiredBeforeSemanticTransform: true,
      },
    });

    return {
      source,
      rawSnapshotRequiredBeforeSemanticTransform: true,
      phase6UrlAllowListRequired: true,
      liveConnectorProof: 'PENDING_RUNTIME',
    };
  }

  async register(config: ScholarshipSourceConfiguration): Promise<ScholarshipPhase6RegistrationPlan> {
    const plan = this.toPhase6RegistrationPlan(config);
    await this.registry.registerSource(plan.source);
    return plan;
  }

  async get(sourceId: string): Promise<ImportSourceDefinition | null> {
    const source = await this.registry.getSource(sourceId);
    return this.isScholarshipSource(source) ? source : null;
  }

  async list(): Promise<ImportSourceDefinition[]> {
    const sources = await this.registry.listSources();
    return sources.filter((source) => this.isScholarshipSource(source));
  }

  async updateStatus(sourceId: string, status: 'ACTIVE' | 'DISABLED'): Promise<boolean> {
    return this.registry.updateSourceStatus(sourceId, status === 'ACTIVE' ? SourceStatus.ACTIVE : SourceStatus.DISABLED);
  }

  private isScholarshipSource(source: ImportSourceDefinition | null): source is ImportSourceDefinition {
    return Boolean(source && source.metadata?.ownerDomain === OWNER_DOMAIN);
  }

  private toPhase6Status(status: ScholarshipSourceConfiguration['status']): SourceStatus {
    if (status === 'ACTIVE') return SourceStatus.ACTIVE;
    if (status === 'DISABLED') return SourceStatus.DISABLED;
    return SourceStatus.DISABLED;
  }
}

export { CONNECTOR_BY_MODE as SCHOLARSHIP_PHASE6_CONNECTOR_MAP };
