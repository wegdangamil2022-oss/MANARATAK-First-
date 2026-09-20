# MANARATAK 2.0: Phase 5.10 BackgroundJobs Architecture Baseline

## Architecture Design Specification

**Status:** APPROVED  
**Revision:** 5.10.0  
**Architecture Baseline:** FROZEN  
**Phase:** 5.10  
**Layer:** Domain / Enterprise Architecture

---

## 1. Vision & Purpose

The Enterprise Background Jobs Foundation serves as the definitive Single Source of Truth for logical background work and asynchronous task modeling across the MANARATAK 2.0 ecosystem. Its primary purpose is to decouple the _logical definition_ of a background job (what needs to be done, when, and under what policies) from the _physical execution_ of that job (how workers, queues, threads, or external schedulers handle the workload).

## 2. Scope & Bounded Context

This architecture describes the **Background Jobs Bounded Context**. It is a generic, cross-cutting foundation utilized by other bounded contexts strictly through provider-neutral interfaces.

### 2.1 Responsibilities

The Background Jobs Platform is exclusively responsible for modeling:

- Job Identity and official references.
- Job Definitions as aggregate roots.
- Job Types, Parameters, and Priorities.
- Job Schedule Metadata (logical intent for when a job should run).
- Job Execution and Retry Policies.
- Job Ownership Metadata.
- Job Logical Lifecycle and Status tracking.

### 2.2 Non-Responsibilities

The Background Jobs Platform must **NEVER** handle:

- Physical Job Execution.
- Schedulers.
- Worker allocations.
- Queue implementations or Event Streams.
- Distributed Execution or Load Balancing.
- Physical Retry Execution mechanisms.
- Infrastructure integrations.

## 3. Provider Neutrality & Business Ignorance

The Background Jobs Foundation is entirely agnostic of both business domains and infrastructure.

- **No Business Knowledge:** It knows nothing of students, users, scholarships, universities, courses, organizations, CRM, CMS, AI workflows, or specific business rules.
- **No Infrastructure Knowledge:** It knows nothing of specific schedulers, queues, execution engines, database systems, or cloud services.

---

## 4. Domain Model

### 4.1 Aggregate Root

- **`BackgroundJob`**: The central Aggregate Root representing the logical intent of a scheduled or queued job. It encapsulates only its `JobReference`, `JobDefinition`, `JobParameters`, `JobMetadata`, `JobExecutionPolicy`, `JobRetryPolicy`, `JobScheduleMetadata`, and `JobOwnerReference`. It must never contain business entities, physical queue payloads, worker allocations, or infrastructure-specific execution details.

### 4.2 Value Objects

All Value Objects are strictly immutable.

- **`BackgroundJobId`**: The internal immutable identifier of the job. Never exposed outside the domain.
- **`JobReference`**: The official, cross-context value object used by other domains to interact with the job. Business domains must reference background jobs exclusively through `JobReference`.
- **`JobOwnerReference`**: A generic abstraction referencing the logical owner or source system. The Background Jobs Platform never owns business entities and never understands the business meaning of this owner reference.
- **`JobDefinition`**: The immutable, logical definition of the job type.
- **`JobParameters`**: The immutable metadata containing the logical arguments required for the job execution.
- **`JobMetadata`**: General logical metadata describing job context.
- **`JobPriority`**: An indicator of the relative urgency of the job.
- **`JobScheduleMetadata`**: Logical intent for scheduling. Actual scheduling, queueing, and timer management belong exclusively to Infrastructure.
- **`JobExecutionPolicy`**: Provider-neutral execution intent. Actual worker allocation and execution belong exclusively to Infrastructure.
- **`JobRetryPolicy`**: Metadata detailing the retry intent. Physical requeueing and retries belong exclusively to Infrastructure.

---

## 5. Repository Contracts

Repositories strictly follow the **Specification Pattern**. No custom lookup methods are permitted.

- **`IBackgroundJobRepository`**:
  - `save(job: BackgroundJob): Promise<void>`
  - `findBy(specification: ISpecification<BackgroundJob>): Promise<BackgroundJob[]>`

---

## 6. Business Rules & Lifecycle

### 6.1 Lifecycle States

The `BackgroundJob` progresses through a strict logical lifecycle:

1. **Created**: The job is logically defined and accepted.
2. **Scheduled**: The logical intent to run the job at a future time is established.
3. **Started**: The job is actively being processed by a physical worker.
4. **Completed**: The job finished execution successfully.
5. **Failed**: The job encountered an unrecoverable error or exhausted its retries.
6. **Cancelled**: The job was explicitly aborted before or during execution.

### 6.2 Core Business Rules

- **Rule 1:** A `BackgroundJob` must possess a valid `JobDefinition` and `JobReference` at creation.
- **Rule 2:** Modification to `JobDefinition` or `JobParameters` is permanently forbidden after creation.
- **Rule 3:** Business domains must reference jobs via `JobReference` exclusively. `BackgroundJobId` must not be leaked.
- **Rule 4:** The Domain only records status changes (e.g., Started, Completed) based on feedback; it never initiates physical processes.

---

## 7. Domain Events

Domain events are strictly limited to business-significant lifecycle transitions. They must not reflect operational details, queue internals, worker allocations, or infrastructure events.

- **`BackgroundJobCreatedEvent`**: Emitted when a new job is logically defined.
- **`BackgroundJobScheduledEvent`**: Emitted when the job's schedule is logically set.
- **`BackgroundJobStartedEvent`**: Emitted when the domain is notified that execution has commenced.
- **`BackgroundJobCompletedEvent`**: Emitted when the job finishes successfully.
- **`BackgroundJobFailedEvent`**: Emitted when the job fails permanently.
- **`BackgroundJobCancelledEvent`**: Emitted when the job is logically aborted.

---

## 8. Cross-Context Relationships

- **Upstream:** Business contexts interact with the Background Jobs Foundation to enqueue logical work or check statuses, passing provider-neutral metadata via `JobReference`.
- **Downstream:** The Application layer coordinates with Infrastructure adapters that translate `BackgroundJob` intents into physical queue messages, database records, or scheduler configurations.

---

## 9. Architectural Constraints

- **Dependency Rule:** Domain depends on nothing. Application depends on Domain. Infrastructure depends on Application and Domain. API depends on Application.
- **Purity Constraint:** The Domain must not import or reference any infrastructure SDKs, queues, or scheduling libraries.
- **No Reverse Coupling:** The Background Jobs domain must not import specific business domain models.

---

## 10. Risks & Recommendations

- **Risk:** Developers might attempt to put the actual business execution logic (the "work") inside the `BackgroundJob` aggregate or Application use cases.
  - **Recommendation:** Strictly enforce that `BackgroundJob` is only a _record of intent_. The actual processing of the job belongs to isolated workers in other bounded contexts or infrastructure listeners.
- **Risk:** Infrastructure scheduling details bleeding into Domain logic.
  - **Recommendation:** Maintain abstract `JobScheduleMetadata` and `JobRetryPolicy` expressed in standard logical concepts, which Infrastructure interprets independently.

---

## 11. Architecture Decision Records (ADRs)

### ADR-1: Provider Neutrality

- **Context:** The system needs background job capabilities without locking into specific message queues or task schedulers.
- **Decision:** The Background Jobs Foundation will be entirely provider-neutral. It will not reference any specific queueing technology or vendor.
- **Consequences:** Ensures long-term flexibility, protects the domain from technology churn, and prevents infrastructure vendor lock-in.

### ADR-2: Job Ownership

- **Context:** Deciding where job rules and metadata are managed.
- **Decision:** The Background Jobs Platform acts as the sole owner of all job metadata (definitions, policies, status). It will never own the business logic of the tasks being executed.
- **Consequences:** Centralizes job governance and auditability, ensuring clear boundary separation.

### ADR-3: Job Definition Immutability

- **Context:** Managing job integrity across distributed asynchronous environments.
- **Decision:** `JobDefinition` and `JobParameters` Value Objects are permanently immutable upon creation. Any modification requires the creation of a completely new `BackgroundJob`.
- **Consequences:** Eliminates race conditions, ensuring that what was requested is exactly what gets executed.

### ADR-4: Logical Lifecycle Ownership

- **Context:** Determining the boundary for job lifecycle transitions.
- **Decision:** The Domain layer dictates and owns exclusively the logical lifecycle transitions (Created, Scheduled, Started, Completed, Failed, Cancelled). Physical scheduling, execution, physical retries, cancellation processing, and cleanup belong exclusively to Infrastructure.
- **Consequences:** Protects job business rules from being scattered across Application or Infrastructure layers.

### ADR-5: Scheduling Boundary

- **Context:** Delineating scheduling intent from physical timer execution.
- **Decision:** The Domain defines the logical scheduling intent (`JobScheduleMetadata`). Infrastructure performs the physical scheduling and timer tracking.
- **Consequences:** Keeps the domain pure and testable while allowing infrastructure to use native timing mechanisms.

### ADR-6: Execution Boundary

- **Context:** Handling the actual processing of jobs.
- **Decision:** The Domain defines the execution policy. Infrastructure manages the physical queueing, worker assignment, and execution invocation.
- **Consequences:** Ensures execution logic remains a physical concern independent of the logical job definition.

### ADR-7: Retry Boundary

- **Context:** Managing failed job retries.
- **Decision:** The Domain defines the retry policy (e.g., max attempts, backoff type). Infrastructure performs the physical requeueing and delaying of retries.
- **Consequences:** Prevents the Domain from needing to understand execution delay mechanics or message re-deliveries.

---

## 12. Official Architecture Review Board (ARB) Decision & Certification

```text
========================================================================
                 FINAL ARCHITECTURE CERTIFICATION
========================================================================
```

The Architecture Review Board (ARB) has completed the final review of the Enterprise Background Jobs Foundation architecture. The architecture has been verified against the Official Roadmap Baseline v4.0, Clean Architecture, Domain-Driven Design (DDD), SOLID Principles, Enterprise Architecture, Dependency Rule, and Provider Neutrality.

**The ARB certifies that:**

- `JobReference` is the official cross-context Background Job reference.
- `BackgroundJobId` remains strictly internal to the Background Jobs Platform.
- `JobOwnerReference` is the exclusive abstraction for referencing external ownership.
- `BackgroundJob` contains only provider-neutral metadata, immutable job definitions, immutable job parameters and logical execution intent.
- `JobDefinition` is permanently immutable.
- `JobParameters` are permanently immutable.
- Any modification to a job definition or its parameters requires creation of a completely new `BackgroundJob`.
- Background Job Definition is completely separated from Background Job Execution.
- The Domain owns only the logical lifecycle of background jobs.
- Physical scheduling, queueing, execution, retries, cancellation processing and cleanup remain exclusively Infrastructure responsibilities.
- Repository contracts follow the Specification Pattern.
- Domain Events are restricted to business-significant lifecycle transitions only.
- The platform contains no infrastructure assumptions.
- The platform contains no vendor-specific terminology.

```text
========================================================================
                         ARCHITECTURE FREEZE
========================================================================
```

The Enterprise Background Jobs Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.10.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

## 13. Phase 06 Import Foundation Integration Note

- **Execution Contracts:** Background Jobs Platform defines provider-neutral queue/worker execution contracts (`JobReference`, `BackgroundJob`) used to execute background tasks.
- **Ownership Boundary:** Background Jobs provides task definition and execution contracts only. Phase 06 Import Foundation retains full ownership of import job state machines, queue orchestration, staging pipelines, and domain handoff policies.

---

### Navigation

- **Previous**: [Phase 5.9 Cache Implementation Baseline](../Cache/phase-05-09-cache-implementation-baseline.md)
- **Next**: [Phase 5.10 Background Jobs Implementation Baseline](phase-05-10-backgroundjobs-implementation-baseline.md)
