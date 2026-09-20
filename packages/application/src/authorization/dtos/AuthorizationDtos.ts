export interface CreateRoleInput {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  policyIds: string[];
}

export interface AssignRoleInput {
  id: string;
  identityId: string;
  roleId: string;
}

export interface EvaluateAccessInput {
  identityId: string;
  resourceUrn: string;
  action: string;
  contextAttributes?: Record<string, any>;
}

export interface AccessDecisionDto {
  isGranted: boolean;
  result: string;
  reasons: string[];
}
