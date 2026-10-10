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
      // An invalid source row can still compete for the same identity as a
      // valid one (e.g. an incomplete alternate country record). Neither can
      // be promoted until an owner explicitly resolves the source conflict.
      if (!rec.deterministicKey) continue;
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

  public markReadyToApply(_batch: ReferenceDataSeedBatch): ReferenceDataSeedBatch {
    // Validation cannot authorize canonical publication. Without a durable
    // source-hash-bound, actor-reviewed P7 receipt this transition is forbidden.
    throw new Error('REFERENCE_DATA_SEED_APPROVAL_RECEIPT_REQUIRED');

  }
}
