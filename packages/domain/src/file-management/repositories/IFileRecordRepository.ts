import { FileRecord } from '../aggregates/FileRecord';
import { ISpecification } from '@absheer/core';

export interface IFileRecordRepository {
  save(record: FileRecord): Promise<void>;
  findBy(specification: ISpecification<FileRecord>): Promise<FileRecord[]>;
}
