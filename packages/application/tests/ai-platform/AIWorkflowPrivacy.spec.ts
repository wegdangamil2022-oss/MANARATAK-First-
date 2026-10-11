import { describe, expect, it, vi } from 'vitest';
import { AIExecutionStatus, AIRequestPurpose } from '@manaratak/domain';
import { AIWorkflowUseCases } from '../../src/ai-platform/use-cases/AIPlatformUseCases';

function fixture() {
  let savedRun: any;
  const repo = {
    find: vi
      .fn()
      .mockImplementation(async (resource: string) =>
        resource === 'workflows'
          ? { key: 'compose', status: 'ACTIVE', activeVersion: 1 }
          : resource === 'consumers'
            ? { status: 'ACTIVE', currency: 'USD', monthlyTokenLimit: 10_000, monthlyCostLimit: 5 }
            : { key: 'compose', purpose: AIRequestPurpose.TOOL_ASSISTANCE },
      ),
    findWorkflowVersion: vi.fn().mockResolvedValue({
      version: 1,
      definition: { steps: [{ key: 'draft', capabilityKey: 'ai.write', promptKey: 'compose' }] },
    }),
    createWorkflowRun: vi.fn().mockImplementation(async (value) => {
      savedRun = { ...value, id: 'run-1', createdAt: new Date(), updatedAt: new Date() };
      return savedRun;
    }),
    findWorkflowRun: vi.fn().mockImplementation(async () => savedRun),
    updateWorkflowRun: vi.fn().mockImplementation(async (_publicId, patch) => {
      savedRun = { ...savedRun, ...patch };
      return savedRun;
    }),
    listWorkflowStepRuns: vi.fn().mockResolvedValue([]),
    createWorkflowStepRun: vi.fn().mockResolvedValue({}),
    updateWorkflowStepRun: vi.fn().mockResolvedValue({}),
  };
  const execution = {
    freezeWorkflowBinding: vi
      .fn()
      .mockResolvedValue({
        promptVersion: 1,
        fingerprint: 'frozen-binding',
        purpose: AIRequestPurpose.TOOL_ASSISTANCE,
      }),
    execute: vi.fn().mockResolvedValue({
      executionPublicId: 'ai_exec',
      traceId: 'trace',
      status: AIExecutionStatus.COMPLETED,
      result: 'private academic transcript',
      usage: { inputTokens: 20, outputTokens: 5, cost: 0.001, currency: 'USD' },
    }),
  };
  const protector = {
    status: () => 'READY' as const,
    protect: vi.fn().mockReturnValue({
      ciphertext: 'encrypted-value',
      iv: 'iv',
      authTag: 'auth',
      keyVersion: 'v1',
    }),
    unprotect: vi.fn().mockReturnValue({ value: 'private academic transcript' }),
  };
  return { repo, execution, protector };
}

describe('P17 workflow data-safety boundary', () => {
  it('fails closed before queue admission without configured encrypted state', async () => {
    const { repo, execution } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any);
    await expect(
      workflows.start(
        'compose',
        { processingConsent: true, academicTranscript: 'private' },
        'admin-1',
      ),
    ).rejects.toThrow('AI_WORKFLOW_PROTECTED_STATE_NOT_CONFIGURED');
    expect(repo.createWorkflowRun).not.toHaveBeenCalled();
  });

  it('stores only an encrypted TTL step snapshot and uses confidential routing', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    const input = {
      processingConsent: true,
      academicTranscript: 'private student data',
      dataClassification: 'PUBLIC',
    };
    const submitted = await workflows.start('compose', input, 'admin-1');
    await workflows.run(submitted.publicId, input, 'admin-1');
    expect(execution.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        dataClassification: 'CONFIDENTIAL',
        requesterReferenceId: 'admin-1',
        consumerKey: 'workflow',
      }),
      expect.objectContaining({ bindingFingerprint: 'frozen-binding', maximumReservedCost: 5 }),
    );
    const patch = repo.updateWorkflowStepRun.mock.calls[0][3];
    expect(patch.status).toBe('COMPLETED');
    expect(patch.outputSnapshot.kind).toBe('AI_WORKFLOW_PROTECTED_STEP');
    expect(patch.outputSnapshot.ciphertext).toBe('encrypted-value');
    expect(JSON.stringify(patch.outputSnapshot)).not.toContain('private academic transcript');
    expect(Date.parse(patch.outputSnapshot.expiresAt)).toBeGreaterThan(Date.now());
    expect(protector.protect).toHaveBeenCalledWith(expect.objectContaining({ value: 'private academic transcript', workflowPublicId: submitted.publicId, requesterReferenceId: 'admin-1', stepKey: 'draft' }));
  });

  it('rejects raw legacy plaintext step snapshots on workflow resume', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    const input = { processingConsent: true, academicTranscript: 'private' };
    const submitted = await workflows.start('compose', input, 'admin-1');
    repo.findWorkflowRun.mockResolvedValue({ ...submitted, status: 'FAILED' });
    repo.listWorkflowStepRuns.mockResolvedValue([
      {
        stepKey: 'draft',
        status: 'COMPLETED',
        outputSnapshot: 'legacy plaintext that must not be reused',
      },
    ]);
    await expect(workflows.run(submitted.publicId, input, 'admin-1')).rejects.toThrow(
      'AI_WORKFLOW_STEP_SNAPSHOT_UNTRUSTED_OR_EXPIRED',
    );
    expect(execution.execute).not.toHaveBeenCalled();
  });

  it('rejects oversized arbitrary source payloads before creating durable runs', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    await expect(
      workflows.start(
        'compose',
        { processingConsent: true, input: 'x'.repeat(65 * 1024) },
        'admin-1',
      ),
    ).rejects.toThrow('AI_WORKFLOW_INPUT_TOO_LARGE');
    expect(repo.createWorkflowRun).not.toHaveBeenCalled();
  });

  it('rejects a different authenticated principal from replaying another workflow run', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    const input = { processingConsent: true, academicTranscript: 'private' };
    const submitted = await workflows.start('compose', input, 'admin-owner');
    await expect(workflows.run(submitted.publicId, input, 'different-admin')).rejects.toThrow(
      'AI_WORKFLOW_REQUESTER_OR_INPUT_MISMATCH',
    );
    expect(execution.execute).not.toHaveBeenCalled();
    expect(repo.createWorkflowStepRun).not.toHaveBeenCalled();
  });

  it('requires an authenticated workflow requester before creating billable work', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    await expect(workflows.start('compose', { input: 'text' }, '')).rejects.toThrow(
      'AI_WORKFLOW_AUTHENTICATED_REQUESTER_REQUIRED',
    );
    expect(repo.createWorkflowRun).not.toHaveBeenCalled();
  });

  it('requires explicit processing consent before billable workflow admission', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    await expect(
      workflows.start('compose', { input: 'private input' }, 'admin-owner'),
    ).rejects.toThrow('AI_WORKFLOW_PROCESSING_CONSENT_REQUIRED');
    expect(repo.createWorkflowRun).not.toHaveBeenCalled();
  });

  it('persists requester, frozen bindings and a per-run budget at admission', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    const run = await workflows.start(
      'compose',
      { processingConsent: true, input: 'owned input' },
      'owner',
    );
    expect(run.requesterReferenceId).toBe('owner');
    expect(run.executionPlan).toEqual({
      budget: { maxTokens: 10000, maxCost: 5, currency: 'USD' },
      bindings: {
        draft: {
          promptVersion: 1,
          fingerprint: 'frozen-binding',
          purpose: AIRequestPurpose.TOOL_ASSISTANCE,
        },
      },
    });
  });

  it('does not authorize arbitrary student-private data using a caller classification alone', async () => {
    const { repo, execution, protector } = fixture();
    const workflows = new AIWorkflowUseCases(repo as any, execution as any, protector);
    await expect(
      workflows.start(
        'compose',
        { processingConsent: true, dataClassification: 'STUDENT_PRIVATE' },
        'owner',
      ),
    ).rejects.toThrow('AI_WORKFLOW_OWNER_VERIFICATION_REQUIRED');
    expect(repo.createWorkflowRun).not.toHaveBeenCalled();
  });
});
