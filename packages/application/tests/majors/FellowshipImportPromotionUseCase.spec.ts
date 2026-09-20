import { describe, expect, it, vi } from 'vitest';
import {
  IFellowshipDefinitionRepository,
  ImportRecordDto,
  ImportRecordStatus,
  MajorImportCompletenessState,
  MajorStatus,
} from '@manaratak/domain';
import { FellowshipImportPromotionUseCase } from '../../src/majors/use-cases/FellowshipImportPromotionUseCase';

describe('FellowshipImportPromotionUseCase', () => {
  const createMockRepo = (): IFellowshipDefinitionRepository => ({
    create: vi.fn().mockImplementation(async (data) => ({ id: 'fellowship-1', createdAt: new Date(), updatedAt: new Date(), ...data })),
    update: vi.fn().mockImplementation(async (id, updates) => ({ id, ...updates })),
    findByDedupKey: vi.fn().mockResolvedValue(null),
  });

  const createRecord = (payload: Record<string, unknown>): ImportRecordDto => ({
    id: 'rec-fel-1',
    batchId: 'batch-fel-1',
    status: ImportRecordStatus.NEEDS_REVIEW,
    rawPayload: payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('creates a standalone fellowship definition instead of a major', async () => {
    const repo = createMockRepo();
    const useCase = new FellowshipImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord({
      canonicalMajorName: 'Clinical Cardiology Fellowship',
      sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG',
      classificationCode: 'FEL-0001',
      fellowshipType: 'Clinical Fellowship',
      professionalDomain: 'Medicine',
      localizedNames: { ar: 'زمالة أمراض القلب السريرية', en: 'Clinical Cardiology Fellowship' },
      sourceImportMode: 'CATALOG_IDENTITY_ONLY',
    }));

    expect(result.type).toBe('CREATED');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      publicId: 'FEL-0001',
      displayName: 'Clinical Cardiology Fellowship',
      canonicalDedupKey: 'clinical-cardiology-fellowship|clinical-fellowship|medicine',
      fellowshipType: 'Clinical Fellowship',
      professionalDomain: 'Medicine',
      status: MajorStatus.READY_TO_REVIEW,
      completenessStatus: MajorImportCompletenessState.NEEDS_REVIEW,
      optionalFields: expect.objectContaining({
        sourceImportRecordId: 'rec-fel-1',
        classificationCode: 'FEL-0001',
      }),
    }));
  });

  it('updates the existing fellowship when the dedup key already exists', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({
      id: 'existing-fellowship-1',
      optionalFields: { sourceImportRecordId: 'old-rec' },
    });
    const useCase = new FellowshipImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord({
      canonicalMajorName: 'Clinical Cardiology Fellowship',
      sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER',
      classificationCode: 'FEL-0001',
      fellowshipType: 'Clinical Fellowship',
      professionalDomain: 'Medicine',
      contentBlocks: [{ title: 'Overview', content: 'Updated fellowship details.' }],
      sourceImportMode: 'DETAIL_DOSSIER',
    }));

    expect(result).toEqual({ type: 'UPDATED', existingId: 'existing-fellowship-1' });
    expect(repo.update).toHaveBeenCalledWith('existing-fellowship-1', expect.objectContaining({
      displayName: 'Clinical Cardiology Fellowship',
      professionalDomain: 'Medicine',
      optionalFields: expect.objectContaining({
        previousImportRecordId: 'old-rec',
        sourceImportMode: 'DETAIL_DOSSIER',
      }),
    }));
  });
});
