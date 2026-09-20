# MANARATAK 2.0: Phase 5.12 Workflow Architecture Baseline

## Architecture Design Specification

**Revision:** 5.12.0
**Status:** APPROVED
**Architecture Baseline:** FROZEN
**Phase:** 5.12  
**Layer:** Domain / Enterprise Architecture

---

## 1. Vision

The Enterprise Basic Workflow Foundation provides a universal, provider-neutral abstraction for logical workflow state management across MANARATAK 2.0. It acts as the Single Source of Truth for defining what a workflow is, representing its states, valid transitions, and tracking its logical lifecycle, entirely decoupled from physical execution or business-specific processes.

## 2. Purpose

The platform answers exclusively:

- What is a workflow?
- What is a workflow definition?
- How are workflow states represented?
- How are transitions represented?
- How is the workflow lifecycle modeled?

## 3. Scope & Responsibilities

The Workflow Platform owns exclusively:

- **Workflow Identity:** Uniquely identifying workflows.
- **Workflow Reference:** Providing cross-context references without exposing internal IDs.
- **Workflow Definition:** The immutable definition of a workflow.
- **Workflow State:** The logical representation of the current state of a workflow.
- **Workflow Transition:** The definition of valid paths from one state to another.
- **Workflow Metadata:** Contextual, provider-neutral data attached to workflows.
- **Workflow Lifecycle:** The overarching logical lifecycle of the workflow (e.g., Created, Activated, Completed).
- **Workflow Version:** Tracking versions of workflow definitions.
- **Workflow Owner Metadata:** Identifying the external logical owner of the workflow.
- **Workflow Execution Intent:** Abstract tracking of execution intent without the implementation logic.

## 4. Non-Responsibilities

The Workflow Platform explicitly **DOES NOT** own or execute:

- **Workflow Execution:** Physical running of the workflow.
- **Business Process Automation:** Orchestrating logic across business domains.
- **Task Assignment:** Assigning work to users or systems.
- **Approval Logic:** Evaluating conditions for approval.
- **Notification Dispatch:** Sending alerts or messages.
- **Scheduling:** Time-based execution.
- **Retries:** Managing failures and retries.
- **Timers:** Waiting or pausing workflows.
- **Compensation:** Rolling back completed steps.
- **Infrastructure:** Adapters, or physical execution environments.

## 5. Bounded Context & Core Concepts

- **Workflow Context:** The isolated boundary encompassing workflow definitions, states, and transitions.
- **Workflow:** The aggregate root representing a logical workflow instance.
- **Definition:** The immutable blueprint of states and transitions.
- **State:** A distinct logical point in the workflow.
- **Transition:** A valid movement between states.

## 6. Domain Model

### 6.1. Aggregates

- **`Workflow`:** The sole Aggregate Root. It encapsulates the workflow identity, definition, current state, owner reference, metadata, and lifecycle. It protects the invariants of state transitions.
  It represents ONLY:
  - `WorkflowReference`
  - `WorkflowOwnerReference`
  - `WorkflowDefinition`
  - `WorkflowStateDefinition`
  - `WorkflowTransitionDefinition`
  - `WorkflowVersion`
  - `WorkflowMetadata`
  - `WorkflowExecutionIntent`

It must never contain:

- Business entities
- Tasks
- Approvers
- Business payloads
- Runtime execution state
- Infrastructure execution details

### 6.2. Entities

- Entities are strictly internal to the `Workflow` aggregate if required, but generally, the structure is managed via Value Objects.

### 6.3. Value Objects

- **`WorkflowId`:** The immutable internal identifier for the workflow. Remains strictly internal.
- **`WorkflowReference`:** The official cross-context Value Object. Business domains must reference workflows exclusively through `WorkflowReference`.
- **`WorkflowDefinition`:** The immutable logical blueprint defining the valid states and transitions.
- **`WorkflowStateDefinition`:** The immutable representation of a valid state within a definition.
- **`WorkflowTransitionDefinition`:** The immutable representation of a valid path between two `WorkflowStateDefinition`s.
- **`WorkflowVersion`:** The immutable version identifier of a workflow definition.
- **`WorkflowOwnerReference`:** The generic reference to the logical owner. The Workflow Platform must never own business entities; it only references its logical owner through this Value Object, never understanding the business meaning of the owner.
- **`WorkflowMetadata`:** Contextual information payload.
- **`WorkflowExecutionIntent`:** Abstract execution intent marker without runtime execution state.

## 7. Domain Services

- **`WorkflowTransitionValidator`:** A pure domain service that evaluates if a requested state change is valid according to the immutable `WorkflowDefinition` and the current state. The Domain validates ONLY whether a transition is logically allowed. The Domain never performs transition execution. Execution remains outside the Domain boundary.

## 8. Repository Contracts

Repository contracts use the Specification Pattern exclusively to ensure isolation from database technologies. Avoid repository-specific lookup methods.

- **`IWorkflowRepository`:**
  - `save(workflow: Workflow): Promise<void>`
  - `findBy(specification: ISpecification<Workflow>): Promise<Workflow[]>`

## 9. Business Rules

1. **Definition Immutability:** `WorkflowDefinition`, `WorkflowStateDefinition`, `WorkflowTransitionDefinition`, and `WorkflowVersion` are permanently immutable. Any modification requires creation of a completely new Workflow.
2. **State Validity:** A workflow can only be in a state explicitly defined in its `WorkflowDefinition`.
3. **Transition Validity:** A workflow can only transition to a new state if a valid `WorkflowTransitionDefinition` exists from the current state to the target state. The Domain validates ONLY whether a transition is logically allowed.
4. **Owner Reference Requirement:** Every workflow must be associated with a valid `WorkflowOwnerReference`.
5. **No Business Logic:** The workflow platform evaluates state transition validity based solely on the definition graph; it contains no business rules, approval logic, or task assignment logic. Actual execution, orchestration, task assignment, scheduling, automation, compensation, and timers belong exclusively to Infrastructure or external business domains.

## 10. Lifecycle

1. **CREATED:** The logical workflow is initialized and defined.
2. **ACTIVATED:** The workflow is active and can accept state transitions.
3. **COMPLETED:** The workflow has reached a terminal state and successfully finished.
4. **ARCHIVED:** The workflow is permanently retired and read-only.

The Domain owns only the logical lifecycle of workflows. Physical execution, orchestration, automation, retries, compensation, timers, and scheduling belong exclusively to Infrastructure.

## 11. Domain Events

Events represent logical, business-significant transitions only:

- **`WorkflowCreatedEvent`:** Emitted when a workflow is logically created.
- **`WorkflowActivatedEvent`:** Emitted when a workflow is activated.
- **`WorkflowStateChangedEvent`:** Emitted when a workflow successfully transitions from one valid state to another.
- **`WorkflowCompletedEvent`:** Emitted when a workflow reaches a terminal completed state.
- **`WorkflowArchivedEvent`:** Emitted when a workflow is permanently archived.

_(Operational events related to execution platforms, automation, schedulers, timers, retries, compensation, or infrastructure are strictly prohibited.)_

## 12. Cross-Context Relationships

- Business domains (e.g., core applications) hold a `WorkflowReference` to represent their association with a workflow.
- Business domains dictate the orchestration and invoke the application layer to request state transitions.
- The Workflow Platform holds a `WorkflowOwnerReference` but knows nothing about the underlying identity or the business data (it acts purely as a generic state machine).

## 13. Architectural Constraints

- **Strict Layering:** Domain <- Application <- Infrastructure <- API.
- **No External Business Knowledge:** The Workflow Domain must remain completely ignorant of business concepts (Users, Scholarships, Payments, etc.).
- **No Physical Execution Knowledge:** The domain must not reference physical execution environments or infrastructure implementations.

## 14. Risks & Recommendations

- **Risk:** Business logic leaking into the workflow definition.
  - **Recommendation:** Keep `WorkflowDefinition` strictly structural (nodes and edges). All conditional evaluations must be performed by the orchestrating business domains before requesting a transition.
- **Risk:** Infrastructure bleeding into the domain.
  - **Recommendation:** Maintain strict separation; physical execution or automation mechanisms belong entirely in Infrastructure or external systems. The Domain tracks logical state only.

## 15. Architecture Decision Records (ADRs)

### ADR-1: Provider Neutrality

- **Context:** The workflow platform must be agnostic to underlying technologies.
- **Decision:** Absolutely no references to external execution environments, cloud providers, or infrastructure SDKs are permitted in the domain.
- **Consequences:** Ensures the foundation can outlive any specific technology or cloud vendor implementation.

### ADR-2: Workflow Ownership

- **Context:** Decoupling the workflow from the business domain.
- **Decision:** The workflow platform owns only the abstract workflow structures. External business aggregates act as owners and are referenced purely via `WorkflowOwnerReference`.
- **Consequences:** Prevents circular dependencies and maintains pure separation of concerns.

### ADR-3: Workflow Definition Immutability

- **Context:** Modifying definitions of in-flight workflows introduces severe consistency issues.
- **Decision:** `WorkflowDefinition`, `WorkflowStateDefinition`, `WorkflowTransitionDefinition`, and `WorkflowVersion` are permanently immutable. Any modification requires creation of a completely new Workflow.
- **Consequences:** Changing a process requires deploying a new definition and migrating or creating new workflows. Ensures predictable state tracking.

### ADR-4: Workflow Lifecycle Ownership

- **Context:** Who controls the lifecycle of a workflow.
- **Decision:** The Domain owns only the logical lifecycle of workflows. Physical execution, orchestration, automation, retries, compensation, timers and scheduling belong exclusively to Infrastructure.
- **Consequences:** Ensures consistency of the logical state machine independent of physical execution state.

### ADR-5: Execution Boundary

- **Context:** Distinguishing between defining a workflow and running it.
- **Decision:** The Domain defines workflow intent and state exclusively. Infrastructure or external orchestrators perform the execution.
- **Consequences:** The domain remains clean, containing only logical models and rules, while physical execution complexities remain external.

### ADR-6: State Transition Boundary

- **Context:** Managing how a workflow progresses.
- **Decision:** The Domain validates ONLY whether a transition is logically allowed. The Domain never performs transition execution. Execution remains outside the Domain boundary.
- **Consequences:** Simplifies the domain to a structural state machine graph verification.

### ADR-7: Versioning Boundary

- **Context:** Managing evolution of processes.
- **Decision:** New definitions require new immutable workflow versions (`WorkflowVersion`). Version semantics are strictly structural.
- **Consequences:** Historical workflows retain their original definitions and remain consistent.

====================================================
FINAL ARCHITECTURE CERTIFICATION
====================================================

The ARB certifies that:

- WorkflowReference is the official cross-context Workflow reference.
- WorkflowId remains strictly internal to the Workflow Platform.
- WorkflowOwnerReference is the exclusive abstraction for referencing external ownership.
- Workflow contains only provider-neutral metadata, immutable workflow definitions, immutable state definitions, immutable transition definitions, immutable workflow version information and logical workflow lifecycle.
- WorkflowDefinition is permanently immutable.
- WorkflowStateDefinition is permanently immutable.
- WorkflowTransitionDefinition is permanently immutable.
- WorkflowVersion is permanently immutable.
- Any modification to a workflow definition, state definition, transition definition or workflow version requires creation of a completely new Workflow.
- Workflow Definition is completely separated from Workflow Execution.
- The Domain owns only the logical lifecycle of workflows.
- The Domain validates only whether a state transition is logically permitted.
- Physical execution, orchestration, automation, scheduling, retries, compensation, timers and runtime processing remain exclusively Infrastructure responsibilities.
- Repository contracts follow the Specification Pattern.
- Domain Events are restricted to business-significant lifecycle transitions only.
- The platform contains no infrastructure assumptions.
- The platform contains no vendor-specific terminology.

====================================================
OFFICIAL ARB DECISION
====================================================

The Enterprise Basic Workflow Foundation Architecture is hereby declared the permanent Architecture Baseline for Phase 5.12.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

### Navigation

- **Previous**: [Phase 5.11 Event Foundation Implementation Baseline](../EventFoundation/phase-05-11-eventfoundation-implementation-baseline.md)
- **Next**: [Phase 5.12 Workflow Implementation Baseline](phase-05-12-workflow-implementation-baseline.md)
