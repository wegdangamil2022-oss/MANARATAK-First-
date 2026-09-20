import { ImportRecordDto } from '@manaratak/domain';

export interface IScholarshipImportUseCase {
  processImportRecord(record: ImportRecordDto): Promise<void>;
}
