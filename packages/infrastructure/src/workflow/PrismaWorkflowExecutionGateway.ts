import { PrismaClient } from '@prisma/client';
import { WorkflowReference } from '@manaratak/domain';
import { IWorkflowExecutionGateway } from '@manaratak/application';

export class PrismaWorkflowExecutionGateway implements IWorkflowExecutionGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async execute(workflowReference: WorkflowReference): Promise<void> {
    const now = new Date();
    await (this.prisma as any).workflowExecutionProjection.upsert({
      where: { workflowReference: workflowReference.getValue() },
      update: { executionCount: { increment: 1 }, lastExecutedAt: now },
      create: { workflowReference: workflowReference.getValue(), executionCount: 1, lastExecutedAt: now },
    });
  }
}
