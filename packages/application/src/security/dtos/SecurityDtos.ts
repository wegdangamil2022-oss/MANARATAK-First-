import { SecuritySensitivity } from '@manaratak/domain';

export interface CreateSecurityRuleDto {
  name: string;
  intent: 'ALLOW' | 'DENY' | 'REQUIRE';
  parameters: Record<string, any>;
}

export interface CreateSecurityPolicyDto {
  reference: string;
  ownerReference: string;
  definition: {
    purpose: string;
    scope: string;
    structuralIntent: Record<string, any>;
  };
  rules: CreateSecurityRuleDto[];
  classification: {
    level: SecuritySensitivity;
  };
  intent: {
    reason: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  metadata: Record<string, string>;
}

export interface UpdateSecurityPolicyDto {
  definition: {
    purpose: string;
    scope: string;
    structuralIntent: Record<string, any>;
  };
  rules: CreateSecurityRuleDto[];
  classification: {
    level: SecuritySensitivity;
  };
  intent: {
    reason: string;
    impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

export interface SecurityPolicyResponseDto {
  reference: string;
  ownerReference: string;
  version: string;
  lifecycleState: string;
  definition: {
    purpose: string;
    scope: string;
    structuralIntent: Record<string, any>;
  };
  rules: {
    name: string;
    intent: string;
    parameters: Record<string, any>;
  }[];
  classification: {
    level: string;
  };
  intent: {
    reason: string;
    impact: string;
  };
  metadata: Record<string, string>;
}
