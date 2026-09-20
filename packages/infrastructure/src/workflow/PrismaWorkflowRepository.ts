import { PrismaClient } from '@prisma/client';
import {
  DomainSpecification,
  IWorkflowRepository,
  Workflow,
  WorkflowDefinition,
  WorkflowExecutionIntent,
  WorkflowId,
  WorkflowLifecycleState,
  WorkflowMetadata,
  WorkflowOwnerReference,
  WorkflowReference,
  WorkflowStateDefinition,
  WorkflowTransitionDefinition,
  WorkflowVersion,
} from '@manaratak/domain';

type WorkflowSnapshot = {
  id: string;
  reference: string;
  ownerReference: string;
  definitionName: string;
  states: Array<{ name: string; isInitial: boolean; isTerminal: boolean }>;
  transitions: Array<{ fromState: string; toState: string; triggerCondition: string }>;
  version: number;
  metadata: Record<string, unknown>;
  executionIntent: string;
  lifecycleState: WorkflowLifecycleState;
  currentState?: string;
};

export class PrismaWorkflowRepository implements IWorkflowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(workflow: Workflow): Promise<void> {
    const snapshot = this.toSnapshot(workflow);
    const client = this.prisma as any;
    await client.workflowControlRecord.upsert({
      where: { id: snapshot.id },
      update: {
        reference: snapshot.reference,
        ownerReference: snapshot.ownerReference,
        lifecycleState: snapshot.lifecycleState,
        version: String(snapshot.version),
        snapshot,
      },
      create: {
        id: snapshot.id,
        reference: snapshot.reference,
        ownerReference: snapshot.ownerReference,
        lifecycleState: snapshot.lifecycleState,
        version: String(snapshot.version),
        snapshot,
      },
    });
  }

  async findBy(specification: DomainSpecification<Workflow>): Promise<Workflow[]> {
    const rows = await (this.prisma as any).workflowControlRecord.findMany({ orderBy: { updatedAt: 'asc' } });
    return rows.map((row: any) => this.fromSnapshot(row.snapshot as WorkflowSnapshot)).filter((item: Workflow) => specification.isSatisfiedBy(item));
  }

  private toSnapshot(workflow: Workflow): WorkflowSnapshot {
    return {
      id: workflow.getId().getValue(),
      reference: workflow.getReference().getValue(),
      ownerReference: workflow.getOwnerReference().getValue(),
      definitionName: workflow.getDefinition().getName(),
      states: workflow.getDefinition().getStates().map((state) => ({
        name: state.getName(), isInitial: state.getIsInitial(), isTerminal: state.getIsTerminal(),
      })),
      transitions: workflow.getDefinition().getTransitions().map((transition) => ({
        fromState: transition.getFromState(), toState: transition.getToState(), triggerCondition: transition.getTriggerCondition(),
      })),
      version: Number(workflow.getVersion().getValue()),
      metadata: { ...workflow.getMetadata().getData() },
      executionIntent: workflow.getExecutionIntent().getValue(),
      lifecycleState: workflow.getLifecycleState(),
      currentState: workflow.getCurrentState()?.getName(),
    };
  }

  private fromSnapshot(snapshot: WorkflowSnapshot): Workflow {
    const states = snapshot.states.map((state) => new WorkflowStateDefinition(state.name, state.isInitial, state.isTerminal));
    const transitions = snapshot.transitions.map((transition) => new WorkflowTransitionDefinition(transition.fromState, transition.toState, transition.triggerCondition));
    const workflow = Workflow.create(
      new WorkflowId(snapshot.id),
      new WorkflowReference(snapshot.reference),
      new WorkflowOwnerReference(snapshot.ownerReference),
      new WorkflowDefinition(snapshot.definitionName, states, transitions),
      new WorkflowVersion(snapshot.version),
      new WorkflowMetadata(snapshot.metadata),
      new WorkflowExecutionIntent(snapshot.executionIntent),
    );
    if (snapshot.lifecycleState === WorkflowLifecycleState.CREATED) return workflow;
    if (snapshot.lifecycleState === WorkflowLifecycleState.ARCHIVED && !snapshot.currentState) {
      workflow.archive();
      return workflow;
    }
    workflow.activate();
    if (snapshot.currentState) {
      const current = states.find((state) => state.getName() === snapshot.currentState);
      if (!current) throw new Error(`WORKFLOW_SNAPSHOT_STATE_MISSING:${snapshot.currentState}`);
      workflow.changeState(current);
    }
    if (snapshot.lifecycleState === WorkflowLifecycleState.COMPLETED) workflow.complete();
    if (snapshot.lifecycleState === WorkflowLifecycleState.ARCHIVED) workflow.archive();
    return workflow;
  }
}
