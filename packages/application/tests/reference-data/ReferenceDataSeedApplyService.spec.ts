import { describe, it, expect, vi } from 'vitest';
import type { IReferenceDataRepository, ReferenceDataSeedBatch } from '@manaratak/domain';
import { ReferenceDataSeedStatus } from '@manaratak/domain';
import { ReferenceDataSeedApplyService } from '../../src';

describe('P7 legacy SeedApply fail-closed gate', () => {
  const repository = {
    upsertCountry: vi.fn(), upsertCurrency: vi.fn(),
    upsertLanguage: vi.fn(), upsertCity: vi.fn(),
  } as unknown as IReferenceDataRepository;

  const batch: ReferenceDataSeedBatch = {
    seedBatchId: 'untrusted-client-batch',
    sourceName: 'unverified',
    sourceVersion: '1',
    createdAt: new Date(),
    status: ReferenceDataSeedStatus.READY_TO_APPLY,
    records: [{
      entityType: 'COUNTRY',
      deterministicKey: 'YE',
      payload: { iso2Code: 'YE', iso3Code: 'YEM', name: 'Yemen' },
      validationReport: {
        entityType: 'COUNTRY', deterministicKey: 'YE',
        requiredFields: ['iso2Code', 'iso3Code', 'name'],
        presentFields: ['iso2Code', 'iso3Code', 'name'], missingFields: [],
        issues: [], isComplete: true, canBeImported: true,
      },
    }],
    validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 },
  };

  it('blocks even a forged green READY_TO_APPLY batch without calling any repository writer', async () => {
    const service = new ReferenceDataSeedApplyService(repository);
    await expect(service.applyBatch(batch, 'operator')).rejects.toThrow(
      'REFERENCE_DATA_SEED_APPLY_REQUIRES_DURABLE_OWNER_APPROVAL');
    expect(repository.upsertCountry).not.toHaveBeenCalled();
    expect(repository.upsertCurrency).not.toHaveBeenCalled();
    expect(repository.upsertLanguage).not.toHaveBeenCalled();
    expect(repository.upsertCity).not.toHaveBeenCalled();
  });

  it('blocks a second attempt regardless of status without executing canonical mutations', async () => {
    const service = new ReferenceDataSeedApplyService(repository);
    await expect(service.applyBatch({
      ...batch, status: ReferenceDataSeedStatus.VALIDATED,
    }, 'operator')).rejects.toThrow('REFERENCE_DATA_SEED_APPLY_REQUIRES_DURABLE_OWNER_APPROVAL');
    expect(repository.upsertCountry).not.toHaveBeenCalled();
  });
});
