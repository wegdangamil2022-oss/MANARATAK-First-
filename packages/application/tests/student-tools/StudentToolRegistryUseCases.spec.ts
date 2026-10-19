import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IStudentToolRegistryRepository, StudentToolLifecycleStatus } from '@absheer/domain';
import { OFFICIAL_STUDENT_TOOLS } from '../../src/student-tools/OfficialStudentToolRegistry';
import { StudentToolRegistryUseCases } from '../../src/student-tools/use-cases/StudentToolRegistryUseCases';

describe('StudentToolRegistryUseCases', () => {
  let repository: IStudentToolRegistryRepository;
  const readiness = { evaluate: vi.fn() };
  const health = { compute: vi.fn() };
  const dependencyHealth = { status: vi.fn() };
  let useCases: StudentToolRegistryUseCases;

  beforeEach(() => {
    repository = {
      list: vi.fn(), listPublic: vi.fn(), findByKey: vi.fn(),
      upsertDefinition: vi.fn().mockImplementation((value) => Promise.resolve(value)),
      updateDefinition: vi.fn(), recordExecution: vi.fn(), completeExecution: vi.fn(),
      findExecution: vi.fn(), findExecutionByIdempotency: vi.fn(), listExecutions: vi.fn(),
      telemetry: vi.fn(), audit: vi.fn(),
    };
    readiness.evaluate.mockReset();
    health.compute.mockReset();
    dependencyHealth.status.mockReset();
    useCases = new StudentToolRegistryUseCases(repository, readiness as any, health as any, dependencyHealth as any);
  });

  it('installs the complete official registry with an accountable actor', async () => {
    const result = await useCases.installOfficialRegistry('admin-1');
    expect(result).toHaveLength(83);
    expect(repository.upsertDefinition).toHaveBeenCalledTimes(83);
    expect(repository.upsertDefinition).toHaveBeenCalledWith(expect.objectContaining({ toolKey: 'scholarship-recommendation' }), 'admin-1');
  });

  it('refuses activation when the readiness service reports a blocker', async () => {
    const tool = OFFICIAL_STUDENT_TOOLS.find((item) => item.toolKey === 'gpa-calculator')!;
    vi.mocked(repository.findByKey).mockResolvedValue(tool);
    readiness.evaluate.mockResolvedValue({ ready: false, blockers: ['PHASE_17_NOT_CONFIGURED'] });
    await expect(useCases.transition(tool.toolKey, StudentToolLifecycleStatus.ACTIVE, 'admin-1')).rejects.toThrow('TOOL_RELEASE_APPROVAL_REQUIRED');
    expect(repository.updateDefinition).not.toHaveBeenCalled();
  });
});

// Security contracts for the separate public projection and non-mutating preview.
describe('Section 19 public and eligibility boundaries', () => {
  const fixture = () => {
    const tool = structuredClone(OFFICIAL_STUDENT_TOOLS.find(value => value.toolKey === 'gpa-calculator')!);
    const repository = { findByKey: vi.fn().mockResolvedValue(tool), listPublic: vi.fn().mockResolvedValue([tool]), recordExecution: vi.fn(), telemetry: vi.fn() };
    const readiness = { evaluate: vi.fn().mockResolvedValue({ ready: true, blockers: [] }) };
    return { tool, repository, useCases: new StudentToolRegistryUseCases(repository as never, readiness as never, {} as never, {} as never) };
  };
  it('strips operator identities, dependencies and immutable version snapshots from public definitions', async () => {
    const { tool, useCases } = fixture();
    tool.lastModifiedBy = 'private-editor';
    const value = await useCases.findPublicTool(tool.toolKey);
    expect(value).not.toHaveProperty('owner'); expect(value).not.toHaveProperty('lastModifiedBy'); expect(value).not.toHaveProperty('dependencies'); expect(value).not.toHaveProperty('versions'); expect(value).not.toHaveProperty('releaseApproval');
    expect(value?.currentVersion).toEqual({ semanticVersion: tool.currentVersion.semanticVersion });
  });
  it('explains locale/flag/region policy without executing or changing counters', async () => {
    const { tool, repository, useCases } = fixture();
    expect((await useCases.eligibility(tool.toolKey, { consumerType: 'ANONYMOUS', locale: 'en' })).status).toBe('WOULD_ALLOW');
    tool.featureFlags.anonymousEnabled = false; tool.supportedLocales = ['ar']; tool.availability.allowedRegions = ['SA'];
    const value = await useCases.eligibility(tool.toolKey, { consumerType: 'ANONYMOUS', locale: 'en', region: 'US' });
    expect(value.status).toBe('BLOCKED'); expect(value.reasons).toEqual(expect.arrayContaining(['FLAG_DISABLED','LOCALE_DENIED','REGION_DENIED','REGION_POLICY_UNAVAILABLE']));
    expect(repository.recordExecution).not.toHaveBeenCalled(); expect(repository.telemetry).not.toHaveBeenCalled();
  });
});
