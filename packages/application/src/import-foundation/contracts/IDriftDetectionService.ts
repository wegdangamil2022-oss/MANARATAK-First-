import { 
  ImportSourceDefinition, 
  ConnectorSignature, 
  DriftAlert 
} from '@absheer/domain';

export interface IDriftDetectionService {
  compareSignatures(input: { 
    source: ImportSourceDefinition; 
    previous: ConnectorSignature; 
    current: ConnectorSignature;
  }): Promise<DriftAlert | null>;
}
