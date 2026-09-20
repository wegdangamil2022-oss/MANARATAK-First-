import { LogSeverity } from '@manaratak/domain';

export interface CreateLogEntryDto {
  reference: string;
  ownerReference: string;
  definition: {
    messageTemplate: string;
    requiredFields: string[];
    structuralIntent: Record<string, any>;
  };
  classification: {
    category: string;
    severity: LogSeverity;
  };
  intent: {
    purpose: string;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  metadata: Record<string, string>;
}

export interface UpdateLogDefinitionDto {
  definition: {
    messageTemplate: string;
    requiredFields: string[];
    structuralIntent: Record<string, any>;
  };
  classification: {
    category: string;
    severity: LogSeverity;
  };
  intent: {
    purpose: string;
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface LogEntryResponseDto {
  reference: string;
  ownerReference: string;
  version: string;
  lifecycleState: string;
  intent: {
    purpose: string;
    criticality: string;
  };
  definition: {
    messageTemplate: string;
    requiredFields: string[];
    structuralIntent: Record<string, any>;
  };
  classification: {
    category: string;
    severity: string;
  };
  metadata: Record<string, string>;
}
