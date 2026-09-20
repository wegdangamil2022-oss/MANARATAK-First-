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
import { ReferenceDataCompletenessReport } from '../validation/ReferenceDataValidationTypes';

export enum ReferenceDataSeedStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  READY_TO_APPLY = 'READY_TO_APPLY',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED'
}

export interface ReferenceDataSeedRecord {
  entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY';
  deterministicKey?: string;
  payload:
    | ReferenceCountryDto
    | UpsertReferenceCountryDto
    | ReferenceCurrencyDto
    | UpsertReferenceCurrencyDto
    | ReferenceLanguageDto
    | UpsertReferenceLanguageDto
    | ReferenceCityDto
    | UpsertReferenceCityDto;
  validationReport?: ReferenceDataCompletenessReport;
}

export interface ReferenceDataSeedBatch {
  seedBatchId: string;
  sourceName: string;
  sourceVersion: string;
  status: ReferenceDataSeedStatus;
  records: ReferenceDataSeedRecord[];
  createdAt: Date;
  validatedAt?: Date;
  appliedAt?: Date;
  appliedBy?: string;
  validationSummary?: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
}
