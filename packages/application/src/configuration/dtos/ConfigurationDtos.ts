import { ConfigurationScope } from '@manaratak/domain';

export interface CreateConfigurationDto {
  reference: string;
  ownerReference: string;
  definition: {
    purpose: string;
    structuralSchema: Record<string, any>;
  };
  valueDefinition: {
    defaultValue: any;
    typeConstraints: Record<string, any>;
  };
  classification: {
    scope: ConfigurationScope;
  };
  intent: {
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  metadata: Record<string, string>;
}

export interface UpdateConfigurationDto {
  definition: {
    purpose: string;
    structuralSchema: Record<string, any>;
  };
  valueDefinition: {
    defaultValue: any;
    typeConstraints: Record<string, any>;
  };
  classification: {
    scope: ConfigurationScope;
  };
  intent: {
    description: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface ConfigurationResponseDto {
  reference: string;
  ownerReference: string;
  version: string;
  lifecycleState: string;
  definition: {
    purpose: string;
    structuralSchema: Record<string, any>;
  };
  valueDefinition: {
    defaultValue: any;
    typeConstraints: Record<string, any>;
  };
  classification: {
    scope: string;
  };
  intent: {
    description: string;
    impact: string;
  };
  metadata: Record<string, string>;
}
