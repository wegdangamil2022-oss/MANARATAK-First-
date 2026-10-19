import { 
  ImportSourceDefinition, 
  SourceStatus, 
  SourceConnectorCategory, 
  SourceAccessClassification 
} from '@absheer/domain';

export interface ISourceRegistryGateway {
  withTransaction?(context: import('@absheer/domain').AtomicPersistenceContext): ISourceRegistryGateway;
  replaceSource?(source: ImportSourceDefinition, expectedUpdatedAt: Date): Promise<void>;
  registerSource(source: ImportSourceDefinition): Promise<void>;
  
  getSource(sourceId: string): Promise<ImportSourceDefinition | null>;
  
  listSources(filters?: { 
    status?: SourceStatus; 
    category?: SourceConnectorCategory; 
    accessClassification?: SourceAccessClassification;
  }): Promise<ImportSourceDefinition[]>;
  
  updateSourceStatus(sourceId: string, status: SourceStatus, reason?: string): Promise<boolean>;
}
