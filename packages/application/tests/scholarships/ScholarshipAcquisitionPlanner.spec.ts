import { describe, expect, it, vi } from 'vitest';
import type { ISourceRegistryGateway } from '../../src/import-foundation/contracts/ISourceRegistryGateway';
import {
  ScholarshipAcquisitionPlanner,
  ScholarshipSourceRegistryService,
  type ScholarshipSourceConfiguration,
} from '../../src/scholarships/source-registry';

const noopGateway: ISourceRegistryGateway = {
  registerSource: vi.fn(),
  getSource: vi.fn(async () => null),
  listSources: vi.fn(async () => []),
  updateSourceStatus: vi.fn(async () => false),
};

function activeWebSource(): ScholarshipSourceConfiguration {
  return {
    sourceId: 'source-1',
    sourceName: 'Scholarship Portal',
    baseUrl: 'https://scholarships.example.org/opportunities',
    sourceType: 'SCHOLARSHIP_WEBSITE',
    status: 'ACTIVE',
    acquisitionMode: 'WEBSITE',
    allowedUrlScope: {
      allowedOrigins: ['https://scholarships.example.org'],
      allowedPathPrefixes: ['/opportunities'],
    },
    rateLimitPolicy: { requestsPerMinute: 12 },
    lastExecution: { state: 'NEVER_RUN' },
  };
}

describe('WP12-6 ScholarshipAcquisitionPlanner', () => {
  it('prepares a source-only Phase 6 plan with raw snapshot before semantic transformation', () => {
    const planner = new ScholarshipAcquisitionPlanner(new ScholarshipSourceRegistryService(noopGateway));
    const plan = planner.prepare(activeWebSource(), 'https://scholarships.example.org/opportunities/123');

    expect(plan.phase6ConnectorId).toBe('static-html');
    expect(plan.rawSnapshot.requiredBeforeSemanticTransform).toBe(true);
    expect(plan.rawSnapshot.rawArtifactReferenceRequired).toBe(true);
    expect(plan.security.phase6SsrfAndAllowListRequiredAtRuntime).toBe(true);
    expect(plan.execution).toBe('SOURCE_READY_RUNTIME_NOT_PROVEN');
  });

  it('does not treat disabled/not-configured sources as executable acquisition', () => {
    const planner = new ScholarshipAcquisitionPlanner(new ScholarshipSourceRegistryService(noopGateway));
    expect(() => planner.prepare({ ...activeWebSource(), status: 'DISABLED' }))
      .toThrow('SCHOLARSHIP_SOURCE_NOT_ACTIVE:DISABLED');
    expect(() => planner.prepare({ ...activeWebSource(), status: 'NOT_CONFIGURED' }))
      .toThrow('SCHOLARSHIP_SOURCE_NOT_ACTIVE:NOT_CONFIGURED');
  });

  it('prepares an active manual file without a URL and blocks a disabled manual file', () => {
    const planner = new ScholarshipAcquisitionPlanner(new ScholarshipSourceRegistryService(noopGateway));
    const manual: ScholarshipSourceConfiguration = {
      sourceId: 'manual-1',
      sourceName: 'Manual Scholarship File',
      sourceType: 'MANUAL_FILE',
      status: 'ACTIVE',
      acquisitionMode: 'MANUAL_FILE',
      lastExecution: { state: 'NEVER_RUN' },
    };
    const plan = planner.prepare(manual);

    expect(plan.phase6ConnectorId).toBe('manual-upload');
    expect(plan.targetUrl).toBeNull();
    expect(plan.rawSnapshot.owner).toBe('PHASE6');
    expect(() => planner.prepare({ ...manual, status: 'DISABLED' }))
      .toThrow('SCHOLARSHIP_SOURCE_NOT_ACTIVE:DISABLED');
  });
});
