import { 
  IWorkflowRepository,
  Workflow,
  WorkflowId,
  WorkflowReference,
  WorkflowOwnerReference,
  WorkflowDefinition,
  WorkflowStateDefinition,
  WorkflowTransitionDefinition,
  WorkflowVersion,
  WorkflowMetadata,
  WorkflowExecutionIntent,
  WorkflowSpecification,
  WorkflowTransitionValidator,
  WorkflowCreatedEvent,
  WorkflowActivatedEvent,
  WorkflowStateChangedEvent,
  WorkflowCompletedEvent,
  WorkflowArchivedEvent
} from '@manaratak/domain';
import { CreateWorkflowDto, TransitionWorkflowDto, WorkflowResponseDto } from '../dtos/WorkflowDtos';
import { IWorkflowExecutionGateway } from '../gateways/IWorkflowExecutionGateway';
import { v4 as uuidv4 } from 'uuid';

export class ManageWorkflowsUseCase {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowExecutionGateway?: IWorkflowExecutionGateway
  ) {}

  public async createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const states = dto.states.map(s => new WorkflowStateDefinition(s.name, s.isInitial, s.isTerminal));
    const transitions = dto.transitions.map(t => new WorkflowTransitionDefinition(t.fromState, t.toState, t.triggerCondition));
    
    const workflow = Workflow.create(
      new WorkflowId(uuidv4()),
      new WorkflowReference(dto.reference),
      new WorkflowOwnerReference(dto.ownerReference),
      new WorkflowDefinition(dto.definitionName, states, transitions),
      new WorkflowVersion(dto.version),
      new WorkflowMetadata(dto.metadata),
      new WorkflowExecutionIntent(dto.executionIntent)
    );

    await this.workflowRepository.save(workflow);
    
    // In a real application, event dispatching would happen here
    void new WorkflowCreatedEvent(workflow.getReference());

    return this.mapToResponse(workflow);
  }

  public async activateWorkflow(reference: string): Promise<WorkflowResponseDto> {
    const workflows = await this.workflowRepository.findBy(new WorkflowSpecification({ reference }));
    if (workflows.length === 0) {
      throw new Error('Workflow not found');
    }
    const workflow = workflows[0];
    
    workflow.activate();
    
    // Find initial state and transition to it
    const initialState = workflow.getDefinition().getStates().find((s: any) => s.getIsInitial());
    if (initialState) {
      if (WorkflowTransitionValidator.isValidTransition(workflow.getDefinition(), undefined, initialState)) {
         workflow.changeState(initialState);
      } else {
         throw new Error('Invalid initial state transition');
      }
    }

    await this.workflowRepository.save(workflow);
    
    if (this.workflowExecutionGateway) {
      await this.workflowExecutionGateway.execute(workflow.getReference());
    }
    
    void new WorkflowActivatedEvent(workflow.getReference());

    return this.mapToResponse(workflow);
  }

  public async transitionWorkflow(dto: TransitionWorkflowDto): Promise<WorkflowResponseDto> {
    const workflows = await this.workflowRepository.findBy(new WorkflowSpecification({ reference: dto.reference }));
    if (workflows.length === 0) {
      throw new Error('Workflow not found');
    }
    const workflow = workflows[0];

    const toStateDef = workflow.getDefinition().getStates().find((s: any) => s.getName() === dto.toState);
    if (!toStateDef) {
      throw new Error('Target state not found in definition');
    }

    if (!WorkflowTransitionValidator.isValidTransition(workflow.getDefinition(), workflow.getCurrentState(), toStateDef)) {
      throw new Error('Invalid state transition');
    }

    const fromState = workflow.getCurrentState();
    workflow.changeState(toStateDef);

    if (toStateDef.getIsTerminal()) {
      workflow.complete();
    }

    await this.workflowRepository.save(workflow);

    if (this.workflowExecutionGateway) {
      await this.workflowExecutionGateway.execute(workflow.getReference());
    }

    void new WorkflowStateChangedEvent(workflow.getReference(), fromState, toStateDef);
    if (toStateDef.getIsTerminal()) {
      void new WorkflowCompletedEvent(workflow.getReference());
    }

    return this.mapToResponse(workflow);
  }

  public async archiveWorkflow(reference: string): Promise<WorkflowResponseDto> {
    const workflows = await this.workflowRepository.findBy(new WorkflowSpecification({ reference }));
    if (workflows.length === 0) {
      throw new Error('Workflow not found');
    }
    const workflow = workflows[0];
    
    workflow.archive();
    await this.workflowRepository.save(workflow);
    
    void new WorkflowArchivedEvent(workflow.getReference());

    return this.mapToResponse(workflow);
  }

  private mapToResponse(workflow: Workflow): WorkflowResponseDto {
    return {
      id: workflow.getId().getValue(),
      reference: workflow.getReference().getValue(),
      ownerReference: workflow.getOwnerReference().getValue(),
      lifecycleState: workflow.getLifecycleState(),
      currentState: workflow.getCurrentState()?.getName()
    };
  }
}
