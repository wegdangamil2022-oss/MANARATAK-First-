import {
  ReferenceDataSeedBatch,
  ReferenceDataSeedRecord,
  ReferenceDataSeedStatus
} from '../seed/ReferenceDataSeedTypes';
import { IReferenceDataSeedPlanner } from '../contracts/IReferenceDataSeedPlanner';
import { IReferenceDataValidationService } from '../contracts/IReferenceDataValidationService';
import { ReferenceDataValidationService } from './ReferenceDataValidationService';
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
    let validRecords = 0;
    let invalidRecords = 0;

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

      if (report.canBeImported) {
        validRecords++;
      } else {
        invalidRecords++;
      }

      return {
        ...record,
        deterministicKey: report.deterministicKey,
        validationReport: report
      };
    });

    return {
      ...batch,
      status: ReferenceDataSeedStatus.VALIDATED,
      records: validatedRecords,
      validatedAt: new Date(),
      validationSummary: {
        totalRecords: validatedRecords.length,
        validRecords,
        invalidRecords
      }
    };
  }

  public markReadyToApply(batch: ReferenceDataSeedBatch): ReferenceDataSeedBatch {
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
