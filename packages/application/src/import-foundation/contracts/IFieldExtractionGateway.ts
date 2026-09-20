import { ExtractFieldsCommand, ExtractFieldsResult } from '../dtos/ExtractionDtos';

export interface IFieldExtractionGateway {
  extractFields(command: ExtractFieldsCommand): Promise<ExtractFieldsResult>;
}
