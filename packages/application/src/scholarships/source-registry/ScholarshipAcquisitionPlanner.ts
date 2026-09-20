import type { ScholarshipAcquisitionPlan, ScholarshipSourceConfiguration } from './ScholarshipSourceRegistryContracts';
import { ScholarshipSourceRegistryService, SCHOLARSHIP_PHASE6_CONNECTOR_MAP } from './ScholarshipSourceRegistryService';
import { ScholarshipSourceScopePolicy } from './ScholarshipSourceScopePolicy';

export class ScholarshipAcquisitionPlanner {
  constructor(private readonly registryService: ScholarshipSourceRegistryService) {}

  prepare(config: ScholarshipSourceConfiguration, requestedUrl?: string): ScholarshipAcquisitionPlan {
    this.registryService.validate(config);
    const connector = SCHOLARSHIP_PHASE6_CONNECTOR_MAP[config.acquisitionMode];

    if (config.status !== 'ACTIVE') {
      throw new Error(`SCHOLARSHIP_SOURCE_NOT_ACTIVE:${config.status}`);
    }

    if (config.acquisitionMode === 'MANUAL_FILE') {
      if (requestedUrl) {
        throw new Error('SCHOLARSHIP_SOURCE_MANUAL_FILE_URL_FORBIDDEN');
      }
      return this.plan(config, connector, null, true);
    }

    const targetUrl = requestedUrl ?? config.baseUrl;
    if (!targetUrl || !config.allowedUrlScope) {
      throw new Error('SCHOLARSHIP_SOURCE_NETWORK_SCOPE_REQUIRED');
    }
    ScholarshipSourceScopePolicy.assertAllowed(targetUrl, config.allowedUrlScope);
    return this.plan(config, connector, targetUrl, true);
  }

  private plan(
    config: ScholarshipSourceConfiguration,
    connector: { connectorId: string; connectorVersion: string },
    targetUrl: string | null,
    scopeValidated: boolean,
  ): ScholarshipAcquisitionPlan {
    return {
      sourceId: config.sourceId,
      acquisitionMode: config.acquisitionMode,
      targetUrl,
      phase6ConnectorId: connector.connectorId,
      phase6ConnectorVersion: connector.connectorVersion,
      rawSnapshot: {
        owner: 'PHASE6',
        requiredBeforeSemanticTransform: true,
        rawArtifactReferenceRequired: true,
      },
      security: {
        configuredScopeValidated: scopeValidated,
        phase6SsrfAndAllowListRequiredAtRuntime: true,
      },
      rateLimitPolicy: config.rateLimitPolicy ?? null,
      execution: 'SOURCE_READY_RUNTIME_NOT_PROVEN',
    };
  }
}
