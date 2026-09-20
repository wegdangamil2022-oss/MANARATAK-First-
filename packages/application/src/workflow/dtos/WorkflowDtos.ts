export interface CreateWorkflowDto {
  reference: string;
  ownerReference: string;
  definitionName: string;
  states: Array<{ name: string; isInitial?: boolean; isTerminal?: boolean }>;
  transitions: Array<{ fromState: string; toState: string; triggerCondition: string }>;
  version: number;
  metadata: Record<string, any>;
  executionIntent: string;
}

export interface TransitionWorkflowDto {
  reference: string;
  toState: string;
}

export interface WorkflowResponseDto {
  id: string;
  reference: string;
  ownerReference: string;
  lifecycleState: string;
  currentState?: string;
}
