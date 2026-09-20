import { describe, expect, it, vi } from 'vitest';
import type { UniversalImportHandoff } from '@manaratak/domain';
import {
  ITranslationImportGateway,
  TranslationImportPreparationService,
  TranslationTargetSnapshot,
} from '../../src/translation-import';

function handoff(payload: Record<string, unknown>): UniversalImportHandoff {
  return {
    handoffId: 'handoff-1',
    ownerDomain: 'TRANSLATIONS',
    artifact: {
      sourceId: 'translation-source',
      artifactId: 'artifact-1',
      rawArtifactReference: 'archive://artifact-1',
    },
    normalizedPayload: payload,
    provenance: {
      sourceSystem: 'TRANSLATION_FILE',
      acquiredAt: new Date('2026-08-20T00:00:00.000Z'),
      sourceRowNumber: 7,
      contentHash: 'sha256:abc',
    },
    validation: { state: 'VALID', issues: [] },
    execution: {
      executionId: 'exec-1',
      importSessionId: 'session-1',
      dryRun: false,
      attempt: 1,
      idempotencyKey: 'translation|INS-ITA-0010|ar|displayName',
    },
  };
}

function snapshot(overrides: Partial<TranslationTargetSnapshot> = {}): TranslationTargetSnapshot {
  return {
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
    ...overrides,
  };
}

function gateway(target: TranslationTargetSnapshot | null): ITranslationImportGateway {
  return {
    resolveExact: vi.fn().mockResolvedValue(target),
    applyApproved: vi.fn(),
  };
}

describe('TranslationImportPreparationService', () => {
  it('resolves the canonical target by the exact protected public ID', async () => {
    const target = snapshot();
    const persistence = gateway(target);
    const service = new TranslationImportPreparationService(persistence);

    const candidate = await service.accept(handoff({
      entityPublicId: 'INS-ITA-0010',
      locale: 'ar',
      fieldKey: 'displayName',
      translatedValue: 'جامعة فلورنسا',
      reviewStatus: 'APPROVED',
    }));

    expect(persistence.resolveExact).toHaveBeenCalledWith({
      entityKind: 'UNIVERSITY',
      entityPublicId: 'INS-ITA-0010',
      locale: 'ar',
      fieldKind: 'DISPLAY_NAME',
      fieldKey: 'displayName',
      sectionKey: undefined,
      sectionOwner: undefined,
    });
    expect(candidate.target.internalEntityId).toBe('university-1');
    expect(candidate.target.publicId).toBe('INS-ITA-0010');
    expect(candidate.diffState).toBe('CREATE');
  });

  it('rejects unsupported locale before target resolution', async () => {
    const persistence = gateway(snapshot());
    const service = new TranslationImportPreparationService(persistence);

    await expect(service.accept(handoff({
      entityPublicId: 'MJR-0001',
      locale: 'fr',
      fieldKey: 'displayName',
      translatedValue: 'Informatique',
      reviewStatus: 'APPROVED',
    }))).rejects.toThrow('TRANSLATION_LOCALE_UNSUPPORTED:fr');
    expect(persistence.resolveExact).not.toHaveBeenCalled();
  });

  it('rejects fuzzy or unknown canonical identifiers', async () => {
    const persistence = gateway(snapshot());
    const service = new TranslationImportPreparationService(persistence);

    await expect(service.accept(handoff({
      entityPublicId: 'University of Florence',
      locale: 'en',
      fieldKey: 'displayName',
      translatedValue: 'University of Florence',
      reviewStatus: 'APPROVED',
    }))).rejects.toThrow('TRANSLATION_CANONICAL_ID_UNSUPPORTED');
    expect(persistence.resolveExact).not.toHaveBeenCalled();
  });

  it('requires an exact section owner for Major content sections', async () => {
    const persistence = gateway(null);
    const service = new TranslationImportPreparationService(persistence);

    await expect(service.accept(handoff({
      entityPublicId: 'MJR-0001',
      locale: 'en',
      fieldKey: 'section:overview',
      translatedValue: 'Computer science overview',
      reviewStatus: 'APPROVED',
    }))).rejects.toThrow('TRANSLATION_SECTION_OWNER_REQUIRED');
    expect(persistence.resolveExact).not.toHaveBeenCalled();
  });

  it('does not create a missing canonical entity', async () => {
    const persistence = gateway(null);
    const service = new TranslationImportPreparationService(persistence);

    await expect(service.accept(handoff({
      entityPublicId: 'DOC-9999',
      locale: 'ar',
      fieldKey: 'displayName',
      translatedValue: 'اسم مترجم',
      reviewStatus: 'APPROVED',
    }))).rejects.toThrow('TRANSLATION_CANONICAL_TARGET_NOT_FOUND:DOC-9999');
  });

  it('marks replay-equivalent values as NO_CHANGE', async () => {
    const persistence = gateway(snapshot({ currentValue: 'جامعة فلورنسا' }));
    const service = new TranslationImportPreparationService(persistence);

    const candidate = await service.accept(handoff({
      entityPublicId: 'INS-ITA-0010',
      locale: 'ar',
      fieldKey: 'displayName',
      translatedValue: 'جامعة فلورنسا',
      reviewStatus: 'APPROVED',
    }));

    expect(candidate.diffState).toBe('NO_CHANGE');
    expect(candidate.expectedCurrentValue).toBe('جامعة فلورنسا');
  });
});
