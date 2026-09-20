import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IStudentToolRegistryRepository, StudentToolLifecycleStatus } from '@manaratak/domain';
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
    await expect(useCases.transition(tool.toolKey, StudentToolLifecycleStatus.ACTIVE, 'admin-1')).rejects.toThrow('TOOL_NOT_READY:PHASE_17_NOT_CONFIGURED');
    expect(repository.updateDefinition).not.toHaveBeenCalled();
  });
});
