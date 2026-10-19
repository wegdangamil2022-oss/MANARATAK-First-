import { WorkflowReference } from '@absheer/domain';

export interface IWorkflowExecutionGateway {
  execute(workflowReference: WorkflowReference): Promise<void>;
}
