import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OFFICIAL_STUDENT_TOOLS } from '../packages/application/src/student-tools/OfficialStudentToolRegistry';
import { StudentToolPublicAccessPolicy } from '../packages/domain/src/student-tools/services';

const mocks = vi.hoisted(() => ({
  gate: vi.fn(), construct: vi.fn(), disconnect: vi.fn(), upsert: vi.fn(),
}));

vi.mock('@prisma/client', () => ({ PrismaClient: class {
  constructor() { mocks.construct(); }
  $disconnect = mocks.disconnect;
} }));
vi.mock('./lib/require-database-mutation-gate', () => ({ requireDatabaseMutationGate: mocks.gate }));
vi.mock('@manaratak/infrastructure', () => ({ PrismaStudentToolRegistryRepository: class {
  upsertDefinition = mocks.upsert;
} }));
vi.mock('@manaratak/application', async () => ({
  ...await import('../packages/application/src/student-tools/use-cases/StudentToolRegistryUseCases'),
  OFFICIAL_STUDENT_TOOLS: (await import('../packages/application/src/student-tools/OfficialStudentToolRegistry')).OFFICIAL_STUDENT_TOOLS,
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.disconnect.mockResolvedValue(undefined);
  mocks.upsert.mockImplementation(async value => value);
});

describe('official student tool CLI bootstrap', () => {
  it('installs all source definitions behind owner release gates, including raw ACTIVE candidates', async () => {
    const source = structuredClone(OFFICIAL_STUDENT_TOOLS);
    expect(source.filter(StudentToolPublicAccessPolicy.isDiscoverable)).toHaveLength(4);
    await import('./bootstrap-phase18-student-tools');
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalledOnce());
    expect(mocks.gate).toHaveBeenCalledWith('seed-student-tools-registry', { allowedPurposes: ['seed'] });
    expect(mocks.upsert).toHaveBeenCalledTimes(83);
    const installed = mocks.upsert.mock.calls.map(([definition]) => definition);
    expect(installed.map(value => value.toolKey)).toEqual(source.map(value => value.toolKey));
    expect(installed.filter(StudentToolPublicAccessPolicy.isDiscoverable)).toEqual([]);
    for (let index = 0; index < source.length; index++) {
      expect(installed[index]).toEqual({ ...source[index], lifecycle: 'TESTING', visibility: 'HIDDEN_ADMIN_ONLY' });
      expect(mocks.upsert.mock.calls[index][1]).toBe('phase18-approved-runtime-bootstrap');
    }
    expect(OFFICIAL_STUDENT_TOOLS).toEqual(source);
  });

  it('refuses a blocked mutation gate before creating any database client or definition', async () => {
    mocks.gate.mockImplementation(() => { throw new Error('DATABASE_MUTATION_GATE_REQUIRED'); });
    await expect(import('./bootstrap-phase18-student-tools')).rejects.toThrow('DATABASE_MUTATION_GATE_REQUIRED');
    expect(mocks.construct).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
