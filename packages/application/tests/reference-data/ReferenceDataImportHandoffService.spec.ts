import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReferenceDataImportHandoffService,
  ReferenceDataImportHandoffCommand
} from '../../src';
import { ReferenceDataSeedStatus } from '@manaratak/domain';

describe('ReferenceDataImportHandoffService', () => {
  let service: ReferenceDataImportHandoffService;

  beforeEach(() => {
    service = new ReferenceDataImportHandoffService();
  });

  it('converts COUNTRY records to READY_TO_APPLY batch when valid', () => {
    const command: ReferenceDataImportHandoffCommand = {
      seedBatchId: 'batch-country-01',
      sourceName: 'ISO-3166',
      sourceVersion: '1.0',
      entityType: 'COUNTRY',
      records: [
        { iso2Code: 'US', iso3Code: 'USA', name: 'United States' },
        { iso2Code: 'GB', iso3Code: 'GBR', name: 'United Kingdom' }
      ]
    };

    const batch = service.prepareSeedBatch(command);

    expect(batch.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(batch.seedBatchId).toBe('batch-country-01');
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('US');
    expect(batch.records[1].deterministicKey).toBe('GB');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('converts CURRENCY records to READY_TO_APPLY batch when valid', () => {
    const command: ReferenceDataImportHandoffCommand = {
      seedBatchId: 'batch-currency-01',
      sourceName: 'ISO-4217',
      sourceVersion: '1.0',
      entityType: 'CURRENCY',
      records: [
        { isoCode: 'USD', name: 'US Dollar' },
        { isoCode: 'EUR', name: 'Euro' }
      ]
    };

    const batch = service.prepareSeedBatch(command);

    expect(batch.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('USD');
    expect(batch.records[1].deterministicKey).toBe('EUR');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('converts LANGUAGE records to READY_TO_APPLY batch when valid', () => {
    const command: ReferenceDataImportHandoffCommand = {
      seedBatchId: 'batch-language-01',
      sourceName: 'ISO-639',
      sourceVersion: '1.0',
      entityType: 'LANGUAGE',
      records: [
        { isoCode: 'en', name: 'English', direction: 'LTR' },
        { isoCode: 'ar', name: 'Arabic', direction: 'RTL' }
      ]
    };

    const batch = service.prepareSeedBatch(command);

    expect(batch.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('en');
    expect(batch.records[1].deterministicKey).toBe('ar');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('converts CITY records to READY_TO_APPLY batch when valid', () => {
    const command: ReferenceDataImportHandoffCommand = {
      seedBatchId: 'batch-city-01',
      sourceName: 'GeoNames',
      sourceVersion: '1.0',
      entityType: 'CITY',
      records: [
        { countryIso2Code: 'US', name: 'New York' },
        { countryIso2Code: 'GB', name: 'London' }
      ]
    };

    const batch = service.prepareSeedBatch(command);

    expect(batch.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('US:New York');
    expect(batch.records[1].deterministicKey).toBe('GB:London');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('returns VALIDATED (not READY_TO_APPLY) when records are invalid', () => {
    const command: ReferenceDataImportHandoffCommand = {
      seedBatchId: 'batch-invalid-01',
      sourceName: 'BadSource',
      sourceVersion: '1.0',
      entityType: 'COUNTRY',
      records: [
        { iso2Code: 'U', iso3Code: 'USA', name: 'United States' }, // iso2Code too short
        { iso2Code: 'GB', iso3Code: 'GBR', name: 'United Kingdom' } // valid
      ]
    };

    const batch = service.prepareSeedBatch(command);

    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.records).toHaveLength(2);
    expect(batch.validationSummary?.validRecords).toBe(1);
    expect(batch.validationSummary?.invalidRecords).toBe(1);
    
    // original records preserved in payload
    expect(batch.records[0].payload).toEqual(command.records[0]);
    expect(batch.records[1].payload).toEqual(command.records[1]);
  });
  
  it('does not mutate the original command records', () => {
    const rawRecords = [{ iso2Code: 'US', iso3Code: 'USA', name: 'United States' }];
    const command: ReferenceDataImportHandoffCommand = {
      seedBatchId: 'batch-mut-01',
      sourceName: 'ISO',
      sourceVersion: '1.0',
      entityType: 'COUNTRY',
      records: rawRecords
    };
    
    const batch = service.prepareSeedBatch(command);
    
    expect(batch.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(rawRecords[0]).toEqual({ iso2Code: 'US', iso3Code: 'USA', name: 'United States' });
    expect(batch.records[0].payload).not.toBe(rawRecords[0]); // Reference should be different
  });
});
