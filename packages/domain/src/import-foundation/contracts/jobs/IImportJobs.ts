import { ImportTargetDomain } from '../../enums/ImportTargetDomain';

export interface IBaseImportJob {
  batchId: string;
  sourceId: string;
  targetDomain: ImportTargetDomain;
  correlationId?: string;
  initiatedBy?: string;
  attempt?: number;
}

export interface IImportIngestionJob extends IBaseImportJob {
  // specific metadata for ingestion, e.g. file path or URL
  sourceUri?: string;
}

export interface IImportValidationJob extends IBaseImportJob {
  // batch validation parameters
}

export interface IImportRecordProcessingJob extends IBaseImportJob {
  recordId: string;
}

export interface IImportBatchFinalizationJob extends IBaseImportJob {
  // finalization instructions
}
