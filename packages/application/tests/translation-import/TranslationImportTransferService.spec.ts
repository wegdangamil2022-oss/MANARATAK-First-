import { describe, expect, it, vi } from 'vitest';
import {
  ITranslationImportGateway,
  TranslationImportTransferService,
  TranslationStagedCandidate,
} from '../../src/translation-import';

function candidate(overrides: Partial<TranslationStagedCandidate> = {}): TranslationStagedCandidate {
  return {
    stagingKey: 'INS-ITA-0010|ar|displayName|-|-',
    target: {
      locator: {
        entityKind: 'UNIVERSITY',
        entityPublicId: 'INS-ITA-0010',
        locale: 'ar',
        fieldKind: 'DISPLAY_NAME',
        fieldKey: 'displayName',
      },
      internalEntityId: 'university-1',
      publicId: 'INS-ITA-0010',
      entityStatus: 'PUBLISHED',
      currentValue: null,
    },
    translatedValue: 'جامعة فلورنسا',
    expectedCurrentValue: null,
    reviewStatus: 'APPROVED',
    diffState: 'CREATE',
    evidence: {
      handoffId: 'handoff-1',
      artifact: {
        sourceId: 'translation-source',
        artifactId: 'artifact-1',
        rawArtifactReference: 'archive://artifact-1',
      },
      provenance: {
        sourceSystem: 'TRANSLATION_FILE',
        acquiredAt: new Date('2026-08-20T00:00:00.000Z'),
      },
      execution: {
        executionId: 'exec-1',
        dryRun: false,
        attempt: 1,
        idempotencyKey: 'translation-1',
      },
    },
    ...overrides,
  };
}

function gateway(): ITranslationImportGateway {
  return {
    resolveExact: vi.fn(),
    applyApproved: vi.fn().mockResolvedValue({
      state: 'APPLIED',
      internalEntityId: 'university-1',
      publicId: 'INS-ITA-0010',
      locale: 'ar',
      fieldKey: 'displayName',
      previousValue: null,
      currentValue: 'جامعة فلورنسا',
    }),
  };
}

describe('TranslationImportTransferService', () => {
  it('requires explicit approved review before transfer', async () => {
    const persistence = gateway();
    const service = new TranslationImportTransferService(persistence);

    await expect(service.transfer(candidate({ reviewStatus: 'NEEDS_REVIEW' }), {
      decision: 'APPLY',
      reviewedBy: 'reviewer-1',
    })).rejects.toThrow('TRANSLATION_REVIEW_REQUIRED_BEFORE_TRANSFER');
    expect(persistence.applyApproved).not.toHaveBeenCalled();
  });

  it('blocks transfer of a dry-run handoff', async () => {
    const persistence = gateway();
    const service = new TranslationImportTransferService(persistence);
    const staged = candidate();
    staged.evidence.execution = { ...staged.evidence.execution, dryRun: true };

    await expect(service.transfer(staged, {
      decision: 'APPLY',
      reviewedBy: 'reviewer-1',
    })).rejects.toThrow('TRANSLATION_DRY_RUN_TRANSFER_BLOCKED');
    expect(persistence.applyApproved).not.toHaveBeenCalled();
  });

  it('delegates only explicitly approved candidates to the atomic persistence gateway', async () => {
    const persistence = gateway();
    const service = new TranslationImportTransferService(persistence);
    const staged = candidate();
    const approval = { decision: 'APPLY' as const, reviewedBy: 'reviewer-1' };

    const result = await service.transfer(staged, approval);

    expect(persistence.applyApproved).toHaveBeenCalledWith(staged, approval);
    expect(result.publicId).toBe('INS-ITA-0010');
    expect(result.state).toBe('APPLIED');
  });
});
