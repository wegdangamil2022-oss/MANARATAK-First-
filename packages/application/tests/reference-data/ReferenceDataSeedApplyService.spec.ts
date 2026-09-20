import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  IReferenceDataRepository,
  ReferenceDataSeedStatus,
  ReferenceDataSeedBatch,
  UpsertReferenceCountryDto,
  UpsertReferenceCurrencyDto,
  UpsertReferenceLanguageDto,
  UpsertReferenceCityDto
} from '@manaratak/domain';
import { ReferenceDataSeedApplyService } from '../../src';

describe('ReferenceDataSeedApplyService', () => {
  let mockRepo: IReferenceDataRepository;
  let service: ReferenceDataSeedApplyService;

  beforeEach(() => {
    mockRepo = {
      listCountries: vi.fn(),
      listCurrencies: vi.fn(),
      listLanguages: vi.fn(),
      listCities: vi.fn(),
      listRegions: vi.fn(),
      getCountry: vi.fn(),
      getCurrency: vi.fn(),
      getLanguage: vi.fn(),
      getRegionById: vi.fn(),
      upsertCountry: vi.fn().mockImplementation(async (data) => ({ ...data, isActive: true })),
      upsertCurrency: vi.fn().mockImplementation(async (data) => ({ ...data, isActive: true })),
      upsertLanguage: vi.fn().mockImplementation(async (data) => ({ ...data, isActive: true })),
      upsertCity: vi.fn().mockImplementation(async (data) => ({ ...data, isActive: true }))
    };
    service = new ReferenceDataSeedApplyService(mockRepo);
  });

  it('rejects DRAFT batch', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-1',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.DRAFT,
      records: [],
      createdAt: new Date()
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: status must be READY_TO_APPLY, but got DRAFT'
    );
  });

  it('rejects VALIDATED batch that is not READY_TO_APPLY', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-2',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.VALIDATED,
      records: [],
      createdAt: new Date(),
      validationSummary: { totalRecords: 0, validRecords: 0, invalidRecords: 0 }
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: status must be READY_TO_APPLY, but got VALIDATED'
    );
  });

  it('rejects READY_TO_APPLY batch with invalidRecords > 0', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-3',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [],
      createdAt: new Date(),
      validationSummary: { totalRecords: 2, validRecords: 1, invalidRecords: 1 }
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: validationSummary contains invalid records'
    );
  });

  it('rejects READY_TO_APPLY batch missing validationSummary', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-3b',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [],
      createdAt: new Date()
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: missing validationSummary'
    );
  });

  it('rejects records missing validationReport', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-4',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [
        {
          entityType: 'COUNTRY',
          deterministicKey: 'EG',
          payload: { iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt' }
        }
      ],
      createdAt: new Date(),
      validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 }
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: one or more records are missing validationReport'
    );
  });

  it('rejects records with canBeImported false', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-5',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [
        {
          entityType: 'COUNTRY',
          deterministicKey: 'EG',
          payload: { iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt' },
          validationReport: {
            entityType: 'COUNTRY',
            deterministicKey: 'EG',
            requiredFields: ['iso2Code', 'iso3Code', 'name'],
            presentFields: ['iso2Code', 'iso3Code', 'name'],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: false
          }
        }
      ],
      createdAt: new Date(),
      validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 }
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: one or more records cannot be imported'
    );
  });

  it('rejects records missing deterministicKey', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-6',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [
        {
          entityType: 'COUNTRY',
          payload: { iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt' },
          validationReport: {
            entityType: 'COUNTRY',
            deterministicKey: 'EG',
            requiredFields: ['iso2Code', 'iso3Code', 'name'],
            presentFields: ['iso2Code', 'iso3Code', 'name'],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        }
      ],
      createdAt: new Date(),
      validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 }
    };

    await expect(service.applyBatch(batch, 'admin@example.com')).rejects.toThrow(
      'Cannot apply batch: one or more records are missing deterministicKey'
    );
  });

  it('re-validates payload at apply time and rejects stale green validation reports', async () => {
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-stale-green',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [
        {
          entityType: 'COUNTRY',
          deterministicKey: 'eg',
          payload: { iso2Code: 'eg', iso3Code: 'EGY', name: 'Egypt' } as UpsertReferenceCountryDto,
          validationReport: {
            entityType: 'COUNTRY',
            deterministicKey: 'eg',
            requiredFields: ['iso2Code', 'iso3Code', 'name'],
            presentFields: ['iso2Code', 'iso3Code', 'name'],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        }
      ],
      createdAt: new Date(),
      validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 }
    };

    await expect(service.applyBatch(batch, 'operator')).rejects.toThrow('REFERENCE_DATA_SEED_CANONICAL_VALIDATION_FAILED');
    expect(mockRepo.upsertCountry).not.toHaveBeenCalled();
  });

  it('applies COUNTRY, CURRENCY, LANGUAGE, CITY through repository upsert methods', async () => {
    const countryPayload: UpsertReferenceCountryDto = { iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt' };
    const currencyPayload: UpsertReferenceCurrencyDto = { isoCode: 'EGP', name: 'Egyptian Pound' };
    const languagePayload: UpsertReferenceLanguageDto = { isoCode: 'ar', name: 'Arabic', direction: 'RTL' };
    const cityPayload: UpsertReferenceCityDto = { countryIso2Code: 'EG', name: 'Cairo' };

    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-7',
      sourceName: 'ISO-Full',
      sourceVersion: '2026.1',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [
        {
          entityType: 'COUNTRY',
          deterministicKey: 'EG',
          payload: countryPayload,
          validationReport: {
            entityType: 'COUNTRY',
            deterministicKey: 'EG',
            requiredFields: [],
            presentFields: [],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        },
        {
          entityType: 'CURRENCY',
          deterministicKey: 'EGP',
          payload: currencyPayload,
          validationReport: {
            entityType: 'CURRENCY',
            deterministicKey: 'EGP',
            requiredFields: [],
            presentFields: [],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        },
        {
          entityType: 'LANGUAGE',
          deterministicKey: 'ar',
          payload: languagePayload,
          validationReport: {
            entityType: 'LANGUAGE',
            deterministicKey: 'ar',
            requiredFields: [],
            presentFields: [],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        },
        {
          entityType: 'CITY',
          deterministicKey: 'EG:Cairo',
          payload: cityPayload,
          validationReport: {
            entityType: 'CITY',
            deterministicKey: 'EG:Cairo',
            requiredFields: [],
            presentFields: [],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        }
      ],
      createdAt: new Date('2026-01-01'),
      validationSummary: { totalRecords: 4, validRecords: 4, invalidRecords: 0 }
    };

    vi.mocked(mockRepo.getCountry).mockResolvedValue({
      id: 'country-eg', iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true,
    });
    const result = await service.applyBatch(batch, 'system-admin');

    expect(mockRepo.upsertCountry).toHaveBeenCalledWith(countryPayload);
    expect(mockRepo.upsertCurrency).toHaveBeenCalledWith(currencyPayload);
    expect(mockRepo.upsertLanguage).toHaveBeenCalledWith(languagePayload);
    expect(mockRepo.upsertCity).toHaveBeenCalledWith({ ...cityPayload, countryReferenceId: 'country-eg' });

    expect(result.status).toBe(ReferenceDataSeedStatus.APPLIED);
    expect(result.appliedBy).toBe('system-admin');
    expect(result.appliedAt).toBeInstanceOf(Date);
  });

  it('rejects a CITY seed whose canonical administrative region belongs to another country', async () => {
    vi.mocked(mockRepo.getCountry).mockResolvedValue({
      id: 'country-eg', iso2Code: 'EG', iso3Code: 'EGY', name: 'Egypt', isActive: true,
    });
    vi.mocked(mockRepo.getRegionById).mockResolvedValue({
      id: 'region-us-ca', countryIso2Code: 'US', regionCode: 'US-CA', name: 'California',
    });
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-city-region-mismatch',
      sourceName: 'geo',
      sourceVersion: '1',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [{
        entityType: 'CITY',
        deterministicKey: 'EG:Cairo',
        payload: { countryIso2Code: 'EG', name: 'Cairo', administrativeRegionId: 'region-us-ca' },
        validationReport: {
          entityType: 'CITY', deterministicKey: 'EG:Cairo', requiredFields: [], presentFields: [],
          missingFields: [], issues: [], isComplete: true, canBeImported: true,
        },
      }],
      createdAt: new Date(),
      validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 },
    };

    await expect(service.applyBatch(batch, 'operator'))
      .rejects.toThrow('REFERENCE_DATA_SEED_CITY_REGION_COUNTRY_MISMATCH');
    expect(mockRepo.upsertCity).not.toHaveBeenCalled();
  });

  it('does not mutate the original batch object', async () => {
    const countryPayload: UpsertReferenceCountryDto = { iso2Code: 'FR', iso3Code: 'FRA', name: 'France' };
    const batch: ReferenceDataSeedBatch = {
      seedBatchId: 'b-8',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      status: ReferenceDataSeedStatus.READY_TO_APPLY,
      records: [
        {
          entityType: 'COUNTRY',
          deterministicKey: 'FR',
          payload: countryPayload,
          validationReport: {
            entityType: 'COUNTRY',
            deterministicKey: 'FR',
            requiredFields: [],
            presentFields: [],
            missingFields: [],
            issues: [],
            isComplete: true,
            canBeImported: true
          }
        }
      ],
      createdAt: new Date('2026-01-01'),
      validationSummary: { totalRecords: 1, validRecords: 1, invalidRecords: 0 }
    };

    const result = await service.applyBatch(batch, 'operator');

    expect(batch.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(batch.appliedAt).toBeUndefined();
    expect(batch.appliedBy).toBeUndefined();

    expect(result.status).toBe(ReferenceDataSeedStatus.APPLIED);
    expect(result.appliedBy).toBe('operator');
    expect(result.appliedAt).toBeDefined();
    expect(result).not.toBe(batch);
  });
});
