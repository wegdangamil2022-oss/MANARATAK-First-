import {
  ReferenceDataSeedBatch,
  ReferenceDataSeedRecord,
  ReferenceDataSeedStatus
} from '../seed/ReferenceDataSeedTypes';
import { IReferenceDataSeedPlanner } from '../contracts/IReferenceDataSeedPlanner';
import { IReferenceDataValidationService } from '../contracts/IReferenceDataValidationService';
import { ReferenceDataValidationService } from './ReferenceDataValidationService';
import { ReferenceDataValidationSeverity } from '../validation/ReferenceDataValidationTypes';
import {
  ReferenceCountryDto,
  UpsertReferenceCountryDto,
  ReferenceCurrencyDto,
  UpsertReferenceCurrencyDto,
  ReferenceLanguageDto,
  UpsertReferenceLanguageDto,
  ReferenceCityDto,
  UpsertReferenceCityDto
} from '../dto/ReferenceDataContracts';

export class ReferenceDataSeedPlanner implements IReferenceDataSeedPlanner {
  constructor(
    private readonly validationService: IReferenceDataValidationService = new ReferenceDataValidationService()
  ) {}

  public createBatch(input: {
    seedBatchId: string;
    sourceName: string;
    sourceVersion: string;
    records: ReferenceDataSeedRecord[];
  }): ReferenceDataSeedBatch {
    return {
      seedBatchId: input.seedBatchId,
      sourceName: input.sourceName,
      sourceVersion: input.sourceVersion,
      status: ReferenceDataSeedStatus.DRAFT,
      records: input.records.map(rec => ({ ...rec })),
      createdAt: new Date()
    };
  }

  public validateBatch(batch: ReferenceDataSeedBatch): ReferenceDataSeedBatch {
    const validatedRecords: ReferenceDataSeedRecord[] = batch.records.map(record => {
      let report;
      switch (record.entityType) {
        case 'COUNTRY':
          report = this.validationService.validateCountry(
            record.payload as ReferenceCountryDto | UpsertReferenceCountryDto
          );
          break;
        case 'CURRENCY':
          report = this.validationService.validateCurrency(
            record.payload as ReferenceCurrencyDto | UpsertReferenceCurrencyDto
          );
          break;
        case 'LANGUAGE':
          report = this.validationService.validateLanguage(
            record.payload as ReferenceLanguageDto | UpsertReferenceLanguageDto
          );
          break;
        case 'CITY':
          report = this.validationService.validateCity(
            record.payload as ReferenceCityDto | UpsertReferenceCityDto
          );
          break;
        default:
          throw new Error(`Unsupported entityType: ${(record as any).entityType}`);
      }

      return {
        ...record,
        deterministicKey: report.deterministicKey,
        validationReport: report
      };
    });

    // Reject *all* occurrences of a staged duplicate, not merely whichever
    // row happens to appear after the first. City keys include region scope.
    const occurrences = new Map<string, number>();
    for (const rec of validatedRecords) {
      if (!rec.deterministicKey || !rec.validationReport?.canBeImported) continue;
      const key = rec.entityType + '|' + rec.deterministicKey;
      occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
    }
    const uniqueRecords = validatedRecords.map(rec => {
      const key = rec.entityType + '|' + (rec.deterministicKey ?? '');
      if (!rec.deterministicKey || (occurrences.get(key) ?? 0) < 2 || !rec.validationReport) return rec;
      return {
        ...rec,
        validationReport: {
          ...rec.validationReport,
          canBeImported: false,
          issues: [...rec.validationReport.issues, {
            code: 'DUPLICATE_CANONICAL_IDENTITY_IN_BATCH',
            message: 'Several source records resolve to the same canonical identity; manual review is required',
            severity: ReferenceDataValidationSeverity.ERROR,
          }],
        },
      };
    });
    const validRecords = uniqueRecords.filter(rec => rec.validationReport?.canBeImported).length;
    const invalidRecords = uniqueRecords.length - validRecords;
    return {
      ...batch,
      status: ReferenceDataSeedStatus.VALIDATED,
      records: uniqueRecords,
      validatedAt: new Date(),
      validationSummary: {
        totalRecords: uniqueRecords.length,
        validRecords,
        invalidRecords
      }
    };
  }

  public markReadyToApply(batch: ReferenceDataSeedBatch): ReferenceDataSeedBatch {
    if (batch.records.length === 0) {
      throw new Error('Empty seed batches cannot be approved for apply');
    }
    if (batch.status === ReferenceDataSeedStatus.DRAFT) {
      throw new Error('Batch must be validated before marking ready to apply');
    }

    if (!batch.validationSummary || batch.validationSummary.invalidRecords > 0) {
      throw new Error('Cannot mark batch ready to apply: batch contains invalid records');
    }

    const hasInvalid = batch.records.some(r => !r.validationReport || !r.validationReport.canBeImported);
    if (hasInvalid) {
      throw new Error('Cannot mark batch ready to apply: one or more records cannot be imported');
    }

    return {
      ...batch,
      status: ReferenceDataSeedStatus.READY_TO_APPLY
    };
  }
}
