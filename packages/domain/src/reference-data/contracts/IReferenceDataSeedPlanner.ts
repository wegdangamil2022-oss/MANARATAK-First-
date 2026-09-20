import {
  ReferenceDataSeedBatch,
  ReferenceDataSeedRecord
} from '../seed/ReferenceDataSeedTypes';

export interface IReferenceDataSeedPlanner {
  createBatch(input: {
    seedBatchId: string;
    sourceName: string;
    sourceVersion: string;
    records: ReferenceDataSeedRecord[];
  }): ReferenceDataSeedBatch;

  validateBatch(batch: ReferenceDataSeedBatch): ReferenceDataSeedBatch;

  markReadyToApply(batch: ReferenceDataSeedBatch): ReferenceDataSeedBatch;
}
