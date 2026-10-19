import { ImportRecordDto } from '@absheer/domain';

export interface IScholarshipImportUseCase {
  processImportRecord(record: ImportRecordDto): Promise<void>;
}
