import { Policy } from '../aggregates/Policy';
import { ResourceUrn } from '../value-objects/ResourceUrn';
import { Action } from '../value-objects/Action';
import { AccessDecision } from '../value-objects/AccessDecision';

export interface EvaluationContext {
  identityId: string;
  resourceUrn: ResourceUrn;
  action: Action;
  [key: string]: unknown;
}

export interface IPolicyEvaluator {
  evaluate(policy: Policy, context: EvaluationContext): Promise<AccessDecision>;
}
