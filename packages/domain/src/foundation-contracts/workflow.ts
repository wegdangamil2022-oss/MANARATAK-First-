import { DomainSpecification, GeneratedId, NumericVersion, ReferenceSpecification, StringValue, UnknownRecord } from './common';

export enum WorkflowLifecycleState { CREATED='CREATED', ACTIVATED='ACTIVATED', COMPLETED='COMPLETED', ARCHIVED='ARCHIVED' }
export class WorkflowId extends GeneratedId { constructor(value?: string) { super(value, 'workflow'); } }
export class WorkflowReference extends StringValue { constructor(value: string) { super(value, 'Workflow reference'); } }
export class WorkflowOwnerReference extends StringValue { constructor(value: string) { super(value, 'Workflow owner reference'); } }
export class WorkflowStateDefinition {
  constructor(private readonly name: string, private readonly isInitial = false, private readonly isTerminal = false) { if (!name.trim()) throw new Error('Workflow state name is required'); }
  getName(): string { return this.name; } getIsInitial(): boolean { return this.isInitial; } getIsTerminal(): boolean { return this.isTerminal; }
}
export class WorkflowTransitionDefinition {
  constructor(private readonly fromState: string, private readonly toState: string, private readonly triggerCondition: string) { if (!fromState.trim() || !toState.trim()) throw new Error('Workflow transition states are required'); }
  getFromState(): string { return this.fromState; } getToState(): string { return this.toState; } getTriggerCondition(): string { return this.triggerCondition; }
}
export class WorkflowDefinition {
  private readonly states: readonly WorkflowStateDefinition[];
  private readonly transitions: readonly WorkflowTransitionDefinition[];
  constructor(private readonly name: string, states: readonly WorkflowStateDefinition[], transitions: readonly WorkflowTransitionDefinition[]) {
    if (!name.trim() || states.length === 0) throw new Error('Workflow name and states are required');
    const initialCount = states.filter(s => s.getIsInitial()).length;
    if (initialCount !== 1) throw new Error('Workflow must define exactly one initial state');
    this.states = Object.freeze([...states]); this.transitions = Object.freeze([...transitions]);
  }
  getName(): string { return this.name; } getStates(): readonly WorkflowStateDefinition[] { return this.states; } getTransitions(): readonly WorkflowTransitionDefinition[] { return this.transitions; }
}
export class WorkflowVersion {
  private readonly version: NumericVersion;
  constructor(value: number) { this.version = new NumericVersion(value); }
  getValue(): string { return this.version.getValue(); }
}
export class WorkflowMetadata {
  constructor(private readonly data: UnknownRecord) {}
  getData(): UnknownRecord { return this.data; }
}
export class WorkflowExecutionIntent extends StringValue { constructor(value: string) { super(value, 'Workflow execution intent'); } }
export class Workflow {
  private lifecycleState: WorkflowLifecycleState;
  private currentState?: WorkflowStateDefinition;
  private constructor(private readonly id: WorkflowId, private readonly reference: WorkflowReference, private readonly ownerReference: WorkflowOwnerReference, private readonly definition: WorkflowDefinition, private readonly version: WorkflowVersion, private readonly metadata: WorkflowMetadata, private readonly executionIntent: WorkflowExecutionIntent, lifecycleState: WorkflowLifecycleState = WorkflowLifecycleState.CREATED) { this.lifecycleState = lifecycleState; }
  static create(id: WorkflowId, reference: WorkflowReference, ownerReference: WorkflowOwnerReference, definition: WorkflowDefinition, version: WorkflowVersion, metadata: WorkflowMetadata, executionIntent: WorkflowExecutionIntent): Workflow { return new Workflow(id, reference, ownerReference, definition, version, metadata, executionIntent); }
  getId(): WorkflowId { return this.id; } getReference(): WorkflowReference { return this.reference; } getOwnerReference(): WorkflowOwnerReference { return this.ownerReference; } getDefinition(): WorkflowDefinition { return this.definition; } getVersion(): WorkflowVersion { return this.version; } getMetadata(): WorkflowMetadata { return this.metadata; } getExecutionIntent(): WorkflowExecutionIntent { return this.executionIntent; } getLifecycleState(): WorkflowLifecycleState { return this.lifecycleState; } getCurrentState(): WorkflowStateDefinition | undefined { return this.currentState; }
  activate(): void { if (this.lifecycleState === WorkflowLifecycleState.ARCHIVED) throw new Error('Archived workflow cannot activate'); this.lifecycleState = WorkflowLifecycleState.ACTIVATED; }
  changeState(state: WorkflowStateDefinition): void { if (this.lifecycleState !== WorkflowLifecycleState.ACTIVATED) throw new Error('Workflow must be active before state transition'); this.currentState = state; }
  complete(): void { if (!this.currentState?.getIsTerminal()) throw new Error('Workflow can complete only in a terminal state'); this.lifecycleState = WorkflowLifecycleState.COMPLETED; }
  archive(): void { this.lifecycleState = WorkflowLifecycleState.ARCHIVED; }
}
export interface IWorkflowRepository { save(workflow: Workflow): Promise<void>; findBy(specification: DomainSpecification<Workflow>): Promise<Workflow[]>; }
export class WorkflowSpecification extends ReferenceSpecification<Workflow> { constructor(input: Readonly<{ reference: string }>) { super(input.reference); } }
export class WorkflowTransitionValidator {
  static isValidTransition(definition: WorkflowDefinition, from: WorkflowStateDefinition | undefined, to: WorkflowStateDefinition): boolean {
    if (!from) return to.getIsInitial();
    return definition.getTransitions().some(t => t.getFromState() === from.getName() && t.getToState() === to.getName());
  }
}
export class WorkflowCreatedEvent { constructor(public readonly reference: WorkflowReference) {} }
export class WorkflowActivatedEvent { constructor(public readonly reference: WorkflowReference) {} }
export class WorkflowStateChangedEvent { constructor(public readonly reference: WorkflowReference, public readonly fromState: WorkflowStateDefinition | undefined, public readonly toState: WorkflowStateDefinition) {} }
export class WorkflowCompletedEvent { constructor(public readonly reference: WorkflowReference) {} }
export class WorkflowArchivedEvent { constructor(public readonly reference: WorkflowReference) {} }
