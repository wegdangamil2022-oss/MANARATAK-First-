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

  it('validates COUNTRY records but requires separate approval', () => {
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

    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.seedBatchId).toBe('batch-country-01');
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('US');
    expect(batch.records[1].deterministicKey).toBe('GB');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('validates CURRENCY records without applying', () => {
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

    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('USD');
    expect(batch.records[1].deterministicKey).toBe('EUR');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('validates LANGUAGE records without applying', () => {
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

    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('en');
    expect(batch.records[1].deterministicKey).toBe('ar');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('validates CITY records without applying', () => {
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

    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.records).toHaveLength(2);
    expect(batch.records[0].deterministicKey).toBe('US|new york|~');
    expect(batch.records[1].deterministicKey).toBe('GB|london|~');
    expect(batch.validationSummary?.validRecords).toBe(2);
    expect(batch.validationSummary?.invalidRecords).toBe(0);
  });

  it('distinguishes cities with identical names in different administrative regions', () => {
    const batch = service.prepareSeedBatch({
      seedBatchId: 'city-region-scope',
      sourceName: 'Local gazetteer',
      sourceVersion: '1',
      entityType: 'CITY',
      records: [
        { countryIso2Code: 'YE', name: 'إب', region: 'محافظة إب' },
        { countryIso2Code: 'YE', name: 'إب', region: 'مديرية مختلفة' }
      ]
    });
    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.records[0].deterministicKey).not.toBe(batch.records[1].deterministicKey);
  });

  it('marks both duplicate normalized identities for review', () => {
    const batch = service.prepareSeedBatch({
      seedBatchId: 'duplicate-city',
      sourceName: 'test', sourceVersion: '1', entityType: 'CITY',
      records: [
        { countryIso2Code: 'YE', name: 'صنعاء', region: 'أمانة العاصمة' },
        { countryIso2Code: 'YE', name: 'صنعاء', region: 'أمانة العاصمة' },
      ]
    });
    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(batch.validationSummary?.invalidRecords).toBe(2);
    expect(batch.records.every(r => r.validationReport?.issues.some(i => i.code === 'DUPLICATE_CANONICAL_IDENTITY_IN_BATCH'))).toBe(true);
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
    
    expect(batch.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(rawRecords[0]).toEqual({ iso2Code: 'US', iso3Code: 'USA', name: 'United States' });
    expect(batch.records[0].payload).not.toBe(rawRecords[0]); // Reference should be different
  });
});
