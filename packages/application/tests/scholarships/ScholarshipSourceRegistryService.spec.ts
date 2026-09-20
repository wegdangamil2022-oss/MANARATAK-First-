import { describe, expect, it, vi } from 'vitest';
import {
  SourceAccessClassification,
  SourceConnectorCategory,
  SourceStatus,
  type ImportSourceDefinition,
} from '@manaratak/domain';
import type { ISourceRegistryGateway } from '../../src/import-foundation/contracts/ISourceRegistryGateway';
import {
  ScholarshipSourceRegistryService,
  type ScholarshipSourceConfiguration,
} from '../../src/scholarships/source-registry';

function source(overrides: Partial<ScholarshipSourceConfiguration> = {}): ScholarshipSourceConfiguration {
  return {
    sourceId: 'scholarships-gov-1',
    sourceName: 'Government Scholarships',
    baseUrl: 'https://scholarships.example.gov/programs',
    sourceType: 'GOVERNMENT_SCHOLARSHIP_PORTAL',
    status: 'ACTIVE',
    acquisitionMode: 'WEBSITE',
    allowedUrlScope: {
      allowedOrigins: ['https://scholarships.example.gov'],
      allowedPathPrefixes: ['/programs'],
    },
    rateLimitPolicy: { requestsPerMinute: 20, minimumDelayMs: 3000 },
    lastExecution: { state: 'NEVER_RUN' },
    ...overrides,
  };
}

function gateway(): ISourceRegistryGateway {
  const items = new Map<string, ImportSourceDefinition>();
  return {
    registerSource: vi.fn(async (item) => { items.set(item.sourceId, item); }),
    getSource: vi.fn(async (sourceId) => items.get(sourceId) ?? null),
    listSources: vi.fn(async () => [...items.values()]),
    updateSourceStatus: vi.fn(async (sourceId) => items.has(sourceId)),
  };
}

describe('WP12-6 ScholarshipSourceRegistryService', () => {
  it('maps Scholarship registry config onto the existing Phase 6 source contract', async () => {
    const genericGateway = gateway();
    const service = new ScholarshipSourceRegistryService(genericGateway);
    const plan = await service.register(source());

    expect(plan.source.category).toBe(SourceConnectorCategory.STATIC_HTML);
    expect(plan.source.connectorId).toBe('static-html');
    expect(plan.source.status).toBe(SourceStatus.ACTIVE);
    expect(plan.source.accessClassification).toBe(SourceAccessClassification.PUBLIC_ALLOWED);
    expect(plan.source.metadata?.ownerDomain).toBe('SCHOLARSHIPS');
    expect(plan.source.metadata?.scholarshipSourceStatus).toBe('ACTIVE');
    expect(plan.rawSnapshotRequiredBeforeSemanticTransform).toBe(true);
    expect(plan.liveConnectorProof).toBe('PENDING_RUNTIME');
  });

  it('maps NOT_CONFIGURED to a disabled Phase 6 state without losing Scholarship status metadata', () => {
    const service = new ScholarshipSourceRegistryService(gateway());
    const plan = service.toPhase6RegistrationPlan(source({ status: 'NOT_CONFIGURED' }));

    expect(plan.source.status).toBe(SourceStatus.DISABLED);
    expect(plan.source.metadata?.scholarshipSourceStatus).toBe('NOT_CONFIGURED');
  });

  it('maps manual files onto the existing manual upload connector and forbids network semantics', () => {
    const service = new ScholarshipSourceRegistryService(gateway());
    const plan = service.toPhase6RegistrationPlan(source({
      sourceId: 'manual-1',
      sourceName: 'Manual Scholarship File',
      sourceType: 'MANUAL_FILE',
      acquisitionMode: 'MANUAL_FILE',
      baseUrl: undefined,
      allowedUrlScope: undefined,
      rateLimitPolicy: undefined,
    }));

    expect(plan.source.category).toBe(SourceConnectorCategory.MANUAL_UPLOAD);
    expect(plan.source.connectorId).toBe('manual-upload');
    expect(plan.source.accessClassification).toBe(SourceAccessClassification.MANUAL_ONLY);
    expect(plan.source.baseUrl).toBe('manual://scholarship-source/manual-1');
  });
});
