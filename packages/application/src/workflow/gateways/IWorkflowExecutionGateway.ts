import { WorkflowReference } from '@manaratak/domain';

export interface IWorkflowExecutionGateway {
  execute(workflowReference: WorkflowReference): Promise<void>;
}
