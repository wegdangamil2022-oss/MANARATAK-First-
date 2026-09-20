import { 
  ImportSourceDefinition, 
  SourceStatus, 
  SourceConnectorCategory, 
  SourceAccessClassification 
} from '@manaratak/domain';

export interface ISourceRegistryGateway {
  registerSource(source: ImportSourceDefinition): Promise<void>;
  
  getSource(sourceId: string): Promise<ImportSourceDefinition | null>;
  
  listSources(filters?: { 
    status?: SourceStatus; 
    category?: SourceConnectorCategory; 
    accessClassification?: SourceAccessClassification;
  }): Promise<ImportSourceDefinition[]>;
  
  updateSourceStatus(sourceId: string, status: SourceStatus, reason?: string): Promise<boolean>;
}
