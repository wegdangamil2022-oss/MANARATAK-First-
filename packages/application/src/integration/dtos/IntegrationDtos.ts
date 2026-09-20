import { IntegrationScopeType, IntegrationCategory } from '@manaratak/domain';

export interface CreateIntegrationDto {
  reference: string;
  ownerReference: string;
  definition: {
    purpose: string;
    scope: string;
  };
  capabilityDefinition: {
    capabilities: string[];
  };
  classification: {
    type: IntegrationScopeType;
    category: IntegrationCategory;
  };
  intent: {
    goal: string;
    businessJustification: string;
  };
  metadata: Record<string, string>;
}

export interface UpdateIntegrationDto {
  definition: {
    purpose: string;
    scope: string;
  };
  capabilityDefinition: {
    capabilities: string[];
  };
  classification: {
    type: IntegrationScopeType;
    category: IntegrationCategory;
  };
  intent: {
    goal: string;
    businessJustification: string;
  };
}

export interface IntegrationResponseDto {
  reference: string;
  ownerReference: string;
  version: string;
  lifecycleState: string;
  definition: {
    purpose: string;
    scope: string;
  };
  capabilityDefinition: {
    capabilities: string[];
  };
  classification: {
    type: string;
    category: string;
  };
  intent: {
    goal: string;
    businessJustification: string;
  };
  metadata: Record<string, string>;
}
