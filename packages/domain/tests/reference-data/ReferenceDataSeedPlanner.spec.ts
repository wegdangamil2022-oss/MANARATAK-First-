import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReferenceDataSeedPlanner,
  ReferenceDataSeedStatus,
  ReferenceDataSeedRecord,
  ReferenceCountryDto,
  ReferenceCurrencyDto,
  ReferenceLanguageDto,
  ReferenceCityDto
} from '../../src';

describe('ReferenceDataSeedPlanner', () => {
  let planner: ReferenceDataSeedPlanner;

  beforeEach(() => {
    planner = new ReferenceDataSeedPlanner();
  });

  it('creates a seed batch starting in DRAFT status', () => {
    const records: ReferenceDataSeedRecord[] = [
      {
        entityType: 'COUNTRY',
        payload: {
          iso2Code: 'EG',
          iso3Code: 'EGY',
          name: 'Egypt',
          region: 'Africa',
          isActive: true
        } as ReferenceCountryDto
      }
    ];

    const batch = planner.createBatch({
      seedBatchId: 'batch-001',
      sourceName: 'ISO-3166-1-Official',
      sourceVersion: '2026.1',
      records
    });

    expect(batch.seedBatchId).toBe('batch-001');
    expect(batch.sourceName).toBe('ISO-3166-1-Official');
    expect(batch.sourceVersion).toBe('2026.1');
    expect(batch.status).toBe(ReferenceDataSeedStatus.DRAFT);
    expect(batch.records).toHaveLength(1);
    expect(batch.createdAt).toBeInstanceOf(Date);
    expect(batch.validatedAt).toBeUndefined();
    expect(batch.appliedAt).toBeUndefined();
  });

  it('validateBatch attaches validation reports and summary', () => {
    const batch = planner.createBatch({
      seedBatchId: 'batch-002',
      sourceName: 'Official-Data',
      sourceVersion: '1.0',
      records: [
        {
          entityType: 'COUNTRY',
          payload: {
            iso2Code: 'EG',
            iso3Code: 'EGY',
            name: 'Egypt',
            isActive: true
          } as ReferenceCountryDto
        },
        {
          entityType: 'CURRENCY',
          payload: {
            isoCode: 'USD',
            name: 'US Dollar',
            isActive: true
          } as ReferenceCurrencyDto
        },
        {
          entityType: 'LANGUAGE',
          payload: {
            isoCode: 'ar',
            name: 'Arabic',
            direction: 'RTL',
            isActive: true
          } as ReferenceLanguageDto
        },
        {
          entityType: 'CITY',
          payload: {
            countryIso2Code: 'EG',
            name: 'Cairo',
            isActive: true
          } as ReferenceCityDto
        }
      ]
    });

    const validated = planner.validateBatch(batch);

    expect(validated.status).toBe(ReferenceDataSeedStatus.VALIDATED);
    expect(validated.validatedAt).toBeInstanceOf(Date);
    expect(validated.validationSummary).toEqual({
      totalRecords: 4,
      validRecords: 4,
      invalidRecords: 0
    });

    expect(validated.records[0].deterministicKey).toBe('EG');
    expect(validated.records[0].validationReport?.canBeImported).toBe(true);

    expect(validated.records[1].deterministicKey).toBe('USD');
    expect(validated.records[1].validationReport?.canBeImported).toBe(true);

    expect(validated.records[2].deterministicKey).toBe('ar');
    expect(validated.records[2].validationReport?.canBeImported).toBe(true);

    expect(validated.records[3].deterministicKey).toBe('EG:Cairo');
    expect(validated.records[3].validationReport?.canBeImported).toBe(true);
  });

  it('prevents marking DRAFT batches as READY_TO_APPLY', () => {
    const batch = planner.createBatch({
      seedBatchId: 'batch-003',
      sourceName: 'Raw-Source',
      sourceVersion: '1.0',
      records: []
    });

    expect(() => planner.markReadyToApply(batch)).toThrow(
      'Batch must be validated before marking ready to apply'
    );
  });

  it('prevents marking batches with invalid records as READY_TO_APPLY', () => {
    const batch = planner.createBatch({
      seedBatchId: 'batch-004',
      sourceName: 'Source-With-Errors',
      sourceVersion: '1.0',
      records: [
        {
          entityType: 'COUNTRY',
          payload: {
            iso2Code: 'EGY', // Invalid, should be 2 uppercase letters
            iso3Code: 'EGY',
            name: 'Egypt'
          } as any
        }
      ]
    });

    const validated = planner.validateBatch(batch);

    expect(validated.validationSummary?.invalidRecords).toBe(1);
    expect(() => planner.markReadyToApply(validated)).toThrow(
      'Cannot mark batch ready to apply: batch contains invalid records'
    );
  });

  it('marks valid batches as READY_TO_APPLY', () => {
    const batch = planner.createBatch({
      seedBatchId: 'batch-005',
      sourceName: 'Clean-Source',
      sourceVersion: '1.0',
      records: [
        {
          entityType: 'COUNTRY',
          payload: {
            iso2Code: 'FR',
            iso3Code: 'FRA',
            name: 'France',
            isActive: true
          } as ReferenceCountryDto
        }
      ]
    });

    const validated = planner.validateBatch(batch);
    const ready = planner.markReadyToApply(validated);

    expect(ready.status).toBe(ReferenceDataSeedStatus.READY_TO_APPLY);
    expect(ready.appliedAt).toBeUndefined(); // APPLIED is not set by planner; actual apply is deferred
  });
});
