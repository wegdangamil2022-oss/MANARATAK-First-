import { describe, expect, it, vi } from 'vitest';
import {
  assertBoundedStudentToolInput,
  StudentToolExecutionContext,
  StudentToolExecutionStatus,
  StudentToolHandlerRegistry,
} from '@manaratak/domain';
import {
  GpaCalculatorHandler,
  MotivationLetterGeneratorHandler,
  ScholarshipRecommendationHandler,
  UniversityComparisonHandler,
} from '../../src/student-tools/handlers/StudentToolHandlers';
import { StudentToolExecutionUseCases } from '../../src/student-tools/use-cases/StudentToolExecutionUseCases';
import { OFFICIAL_STUDENT_TOOLS } from '../../src/student-tools/OfficialStudentToolRegistry';
const context: StudentToolExecutionContext = {
  toolKey: 'scholarship-recommendation',
  executionId: 'stx',
  toolVersion: '1.0.0',
  correlationId: 'c',
  traceId: 't',
  requestId: 'r',
  locale: 'en',
  consumerType: 'AUTHENTICATED_STUDENT',
  authenticatedStudentReference: 'student',
  startedAt: new Date(),
  privacyConsent: true,
};
const candidate = {
  publicId: 's1',
  slug: 'one',
  displayName: 'One',
  degreeLevels: [],
  publicationStatus: 'PUBLISHED',
};
const setup = (response: unknown) => {
  const ai = { executeCapability: vi.fn().mockResolvedValue(response) };
  const profile = { getMinimalContext: vi.fn().mockResolvedValue({ targetDegree: 'PRIVATE' }) };
  const scholarships = { findPublishedCandidates: vi.fn().mockResolvedValue([candidate]) };
  return { ai, profile, handler: new ScholarshipRecommendationHandler(scholarships, ai, profile) };
};
describe('Section 19 personalized ranking boundary', () => {
  for (const consumerType of ['ANONYMOUS', 'AUTHENTICATED_STUDENT'] as const)
    it(`classifies ${consumerType} preferences as private`, async () => {
      const { ai, handler } = setup({
        status: 'COMPLETED',
        result: { rankings: [{ publicId: 's1', explanation: 'fit' }] },
        executionReference: 'ai1',
      });
      const result = await handler.execute(
        { ...context, consumerType },
        handler.validate({ preferredCountries: [], careerGoals: 'PRIVATE', allowAI: true }),
      );
      expect(result.mode).toBe('AI_ADVISORY');
      expect(ai.executeCapability).toHaveBeenCalledWith(
        expect.objectContaining({
          dataClassification: 'PRIVATE_STUDENT_DATA',
          privacyConsent: true,
        }),
      );
    });
  it('requires opt-in to stored profile and private AI separately', async () => {
    const { ai, profile, handler } = setup({ status: 'NOT_CONFIGURED' });
    await handler.execute(context, handler.validate({ preferredCountries: [] }));
    expect(profile.getMinimalContext).not.toHaveBeenCalled();
    expect(ai.executeCapability).not.toHaveBeenCalled();
    await handler.execute(
      { ...context, privacyConsent: false },
      handler.validate({ preferredCountries: [], useProfile: true, allowAI: true }),
    );
    expect(profile.getMinimalContext).not.toHaveBeenCalled();
    expect(ai.executeCapability).not.toHaveBeenCalled();
    await handler.execute(
      context,
      handler.validate({ preferredCountries: [], useProfile: true, allowAI: true }),
    );
    expect(profile.getMinimalContext).toHaveBeenCalledWith('student');
  });
  it('preserves safety blocks without recommendations', async () => {
    const { handler } = setup({ status: 'BLOCKED' });
    await expect(
      handler.execute(context, handler.validate({ preferredCountries: [], allowAI: true })),
    ).rejects.toThrow('TOOL_EXECUTION_BLOCKED');
  });
  it('never hides unknown provider failures as a successful fallback', async () => {
    const { handler } = setup({ status: 'FAILED' });
    await expect(
      handler.execute(context, handler.validate({ preferredCountries: [], allowAI: true })),
    ).rejects.toThrow('TOOL_AI_UNKNOWN_OUTCOME');
  });
  for (const rankings of [
    [],
    [{ publicId: 'unknown', explanation: 'x' }],
    [
      { publicId: 's1', explanation: 'x' },
      { publicId: 's1', explanation: 'x' },
    ],
    [{ publicId: 's1', explanation: 'x'.repeat(2001) }],
  ])
    it('rejects incomplete, noncanonical, duplicate or oversized ranking', async () => {
      const { handler } = setup({
        status: 'COMPLETED',
        result: { rankings },
        executionReference: 'ai1',
      });
      const result = await handler.execute(
        context,
        handler.validate({ preferredCountries: [], allowAI: true }),
      );
      expect(result.mode).toBe('DETERMINISTIC_FALLBACK');
      expect(result.fallbackReason).toBe('AI_RANKING_INVALID');
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].scholarship).toEqual(candidate);
    });
  it('requires consent before a private letter reaches the AI gateway', async () => {
    const ai = { executeCapability: vi.fn() };
    await expect(
      new MotivationLetterGeneratorHandler(ai).execute(
        { ...context, privacyConsent: false },
        {} as any,
      ),
    ).rejects.toThrow('TOOL_PRIVACY_CONSENT_REQUIRED');
    expect(ai.executeCapability).not.toHaveBeenCalled();
  });
});
describe('Section 19 input and execution admission', () => {
  it('rejects excessive depth, bytes, object count and unsupported root', () => {
    let deep: unknown = {};
    for (let i = 0; i < 10; i++) deep = { nested: deep };
    for (const value of [
      deep,
      { text: 'x'.repeat(64001) },
      Array(101).fill({}),
      'raw',
      { ['__proto__']: {} },
    ])
      expect(() => assertBoundedStudentToolInput(value)).toThrow('TOOL_INPUT_INVALID');
  });
  it('rejects unknown per-tool fields', () => {
    expect(() =>
      new GpaCalculatorHandler().validate({
        scale: 4,
        courses: [{ label: 'A', creditHours: 3, gradePoints: 4 }],
        adminOverride: true,
      }),
    ).toThrow('unknown_field');
    expect(() =>
      new UniversityComparisonHandler({} as any).validate({
        universityIds: ['u1', 'u2'],
        override: true,
      }),
    ).toThrow('unknown_field');
  });
  const harness = (key = 'gpa-calculator') => {
    const tool = structuredClone(OFFICIAL_STUDENT_TOOLS.find((t) => t.toolKey === key)!);
    const handler = {
      contract: { inputSchema: tool.inputSchema, outputSchema: tool.outputSchema },
      validate: vi.fn().mockReturnValue({}),
      execute: vi.fn(),
      validateOutput: vi.fn(),
    };
    const repo = {
      findByKey: vi.fn().mockResolvedValue(tool),
      pruneExpiredTransientResults: vi.fn(),
      findExecutionByIdempotency: vi.fn().mockResolvedValue(null),
      recordExecutionOrReplay: vi.fn(),
      completeExecution: vi.fn().mockImplementation((id, patch) => ({ executionId: id, ...patch })),
    };
    const health = { status: vi.fn().mockResolvedValue('READY') };
    const rate = {
      consume: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, resetAt: 1 }),
    };
    const useCases = new StudentToolExecutionUseCases(
      repo as any,
      { get: () => handler, has: () => true } as any,
      rate,
      health,
      { status: () => 'READY' } as any,
    );
    return { tool, repo, handler, rate, health, useCases };
  };
  it('validates before execution entitlement or dependency work', async () => {
    const { useCases, handler, rate, health } = harness();
    handler.validate.mockImplementation(() => {
      throw new Error('TOOL_INPUT_INVALID');
    });
    await expect(
      useCases.execute('gpa-calculator', {
        input: {},
        ...context,
        consumerType: 'AUTHENTICATED_STUDENT',
      }),
    ).rejects.toThrow('TOOL_INPUT_INVALID');
    expect(health.status).not.toHaveBeenCalled();
    expect(rate.consume).toHaveBeenCalledTimes(1);
    expect(rate.consume.mock.calls[0][0]).toContain('input-abuse');
  });
  it('blocks geographic claims until a trusted regional policy is available', async () => {
    const { useCases, tool, handler } = harness();
    tool.availability.allowedRegions = ['SA'];
    await expect(useCases.execute(tool.toolKey, { input: {}, ...context })).rejects.toThrow(
      'TOOL_REGION_POLICY_UNAVAILABLE',
    );
    expect(handler.execute).not.toHaveBeenCalled();
  });
  it('denies paid Admin tests without isolated test budget', async () => {
    const { useCases, handler } = harness('scholarship-recommendation');
    await expect(
      useCases.execute('scholarship-recommendation', {
        input: {},
        ...context,
        consumerType: 'ADMIN_TEST',
      }),
    ).rejects.toThrow('TOOL_TEST_BUDGET_NOT_CONFIGURED');
    expect(handler.execute).not.toHaveBeenCalled();
  });
  it('converts stale execution replay to unknown outcome without redispatch', async () => {
    const { useCases, repo, handler } = harness();
    const fingerprint = (await import('node:crypto')).createHash('sha256');
    // Fingerprint is canonical; invoke private replay through a typed test seam to isolate stale recovery.
    void fingerprint;
    const replay = (
      useCases as unknown as { replay(record: unknown): Promise<{ status: string }> }
    ).replay.bind(useCases);
    const result = await replay({
      executionId: 'old',
      status: StudentToolExecutionStatus.RUNNING,
      startedAt: new Date(Date.now() - 180000),
    });
    expect(result.status).toBe('UNKNOWN_OUTCOME');
    expect(repo.completeExecution).toHaveBeenCalledOnce();
    expect(handler.execute).not.toHaveBeenCalled();
  });
});

describe('Section 19 strict types and pinned contracts', () => {
  it('rejects coerced numeric/boolean inputs and unsupported funding preferences', () => {
    expect(() =>
      new GpaCalculatorHandler().validate({
        scale: '4',
        courses: [{ label: 'A', creditHours: 3, gradePoints: 4 }],
      }),
    ).toThrow('TOOL_INPUT_INVALID');
    expect(() =>
      new UniversityComparisonHandler({} as never).validate({
        universityIds: ['a', 'b'],
        hideUnavailableRows: 'true',
      }),
    ).toThrow('TOOL_INPUT_INVALID');
    expect(() =>
      new ScholarshipRecommendationHandler({} as never, {} as never, {} as never).validate({
        fundingPreference: 'invented',
      }),
    ).toThrow('TOOL_INPUT_INVALID');
  });
  it('never substitutes a newer handler for unavailable historical contracts', () => {
    const handler = new GpaCalculatorHandler();
    const registry = new StudentToolHandlerRegistry([handler]);
    expect(registry.getVersion('gpa-calculator', '2:2')).toBe(handler);
    expect(registry.getVersion('gpa-calculator', '1:1')).toBeNull();
    const tool = OFFICIAL_STUDENT_TOOLS.find((tool) => tool.toolKey === handler.toolKey)!;
    expect(tool.currentVersion.inputSchemaVersion).toBe(handler.contract.inputSchema.version);
    expect(tool.currentVersion.outputSchemaVersion).toBe(handler.contract.outputSchema.version);
    expect(handler.contract.inputSchema.jsonSchema).toMatchObject({
      additionalProperties: false,
      properties: { courses: { items: { additionalProperties: false } } },
    });
  });
});
