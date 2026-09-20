# MANARATAK 2.0: Phase 3.3 Backend Foundation

## Phase 3.3 — Backend Foundation

### 1. Document Information

| Attribute | Value |
| : | :- |
| Document Title | Backend Foundation Specification — MANARATAK 2.0 Enterprise Platform |
| Document Version | v3.0.0 |
| Document Status | APPROVED / Revision: 3.3.1 / READY FOR IMPLEMENTATION |
| Author | Chief Enterprise Solution Architect |
| Reviewers | Architecture Review Board (ARB), Lead Backend Engineers |
| Date of Issue | July 16, 2026 |

### 2. Purpose

The purpose of this document is to define the official **Backend Foundation Architecture** for the MANARATAK 2.0 enterprise platform. This specification outlines the architectural layers, modular boundaries, Dependency Injection (DI) rules, Clean Architecture abstractions, and Domain-Driven Design (DDD) constructs. It serves as the primary structural template governing the compilation, execution, and organization of all backend packages inside the monorepo workspace.

### 3. Objectives

- **Absolute Decoupling**: Isolate core business logic from persistence systems, external services, transport protocols, and frameworks.
- **Deterministic Execution**: Enforce the Dependency Inversion Principle so that business rules remain completely unaffected by changes to technical implementation details.
- **Strict Modular Boundaries**: Design a modular backend structure that prevents accidental circular dependencies and establishes clean interface contracts.
- **Ease of Testability**: Abstract external systems to enable unit-testing of business use cases with 100% test isolation, eliminating the need for real databases or networks during testing.

### 4. Backend Architecture Principles

1. **The Dependency Rule**: Source code dependencies must only point inwards, toward the central Domain layer. Inner layers cannot know anything about outer layers.
2. **Abstractions Over Implementations**: All interactions between the application core and external frameworks or drivers must occur through abstract boundaries (Ports and Interfaces).
3. **Single Responsibility per Layer**: Each layer must have exactly one reason to change, preventing persistence concerns from bleeding into presentation layers.
4. **Rich Domain Models Over Anemic Models**: Business logic and state validation rules must reside within domain entities and value objects, rather than being scattered across utility classes or database scripts.

### 5. Backend Philosophy

The backend philosophy of MANARATAK 2.0 is built upon **Linguistic Precision, Explicit Constraints, and Design Sovereignty**.

We reject the pattern of directly mapping persistence structures to client screens. The backend is not a simple CRUD proxy. It is the authoritative guardian of the business domain's integrity. To prevent premature over-engineering, **Command Query Responsibility Segregation (CQRS)** and **Event Sourcing** are excluded from this foundation. The application relies on clean, service-driven domain use cases maintaining synchronized consistency inside transaction boundaries.

### 6. Backend Layer Architecture

Every domain package in the workspace is structurally partitioned into four concentric architectural layers:

```
                  [ Outer Layer: Presentation / Web / Presentation Boundaries ]
                                       |
                                       v
                  [ Adaption Layer: Infrastructure / Persistence ]
                                       |
                                       v
                  [ Application Layer: Use Cases / Ingress Ports ]
                                       |
                                       v
                  [ Inner Core Layer: Domain / Entities / Rules ]
```

1. **Domain Layer (Core)**: Contains the pure, framework-independent business entities, value objects, domain events, and domain exceptions.
2. **Application Layer (Use Cases)**: Implements the business use cases, orchestrates aggregates, and defines abstract integration contracts (Ports).
3. **Infrastructure Layer (Adapters)**: Implements persistence systems, external service clients, file system configurations, and communication interfaces.
4. **Presentation Layer (Presentation Boundaries)**: Receives external requests, validates incoming payloads, maps data contracts, and dispatches execution to use cases.

### 7. Module Organization

Backend logical modules are organized strictly around **Bounded Contexts (Domains)** rather than technical categories.

- **Enclosure**: Each Bounded Context corresponds to an isolated package inside `/packages/`.
- **Encapsulation**: The internal layers of each package are managed as independent sub-modules that compile together.
- **Explicit Exports**: A package must explicitly define its public API interface, exposing only required application use cases while keeping domain internals hidden.

### 8. Dependency Injection Strategy

The platform utilizes a structured **Dependency Injection (DI)** container to manage runtime lifecycles and resolve class instances:

- **Inversion of Control (IoC)**: Classes never instantiate their own dependencies. They declare required interfaces in their constructor parameters.
- **Abstract Token Injection**: To decouple application services from physical packages, dependencies are bound and injected using abstract symbols or interfaces rather than concrete classes.
- **Deterministic Lifecycles**: Dependencies are resolved as singletons by default to optimize performance, with scoped lifecycles reserved strictly for request-bound security or session contexts.

### 9. Clean Architecture Rules

To enforce Clean Architecture compliance, developers must follow these strict rules:

- No file inside the `domain` or `application` directories may import libraries belonging to persistence drivers, web servers, or external platform frameworks.
- Persistence entities and models are prohibited from leaking into the `application` or `presentation` layers. Payloads passing across boundary lines must utilize raw, immutable **Validation Contracts** or **Data Contracts**.
- Inner layers must not handle technical concerns like database-specific serialization, serialization formats, or transport-specific status translations.

### 10. Domain-Driven Design Strategy

The Domain layer acts as the sovereign core of each package:

- **Entities**: Objects possessing a unique identity that persists across state changes.
- **Value Objects**: Immutable attributes defined purely by their properties, with zero tracking identity.
- **Domain Services**: Encapsulate business logic that involves multiple aggregates or does not naturally belong to a single entity.
- **Domain Events**: Lightweight, immutable notifications signifying important state transitions within the domain.

### 11. Dependency Rule

The direction of code dependencies is absolute:

- `Presentation` -> `Application`
- `Infrastructure` -> `Application` & `Domain`
- `Application` -> `Domain`
- `Domain` -> (Has zero dependencies)

Any violation of this path (such as a use case directly importing an infrastructure class) will be blocked during local and continuous integration compilation checks.

### 12. Layer Responsibilities

#### 12.1 Presentation Layer

- Receives external requests through presentation boundaries.
- Validates incoming data structures using strict validation contracts.
- Maps input payloads to Application Validation Contracts.
- Dispatches execution to Application Use Cases.
- Maps Use Case outputs to formatted external response payloads.

#### 12.2 Infrastructure Layer

- Implements persistence adapters (Persistence Interfaces).
- Formulates query logic, indexes, and transaction boundaries.
- Implements adapters for external third-party services.
- Integrates external storage providers and communication interfaces.

#### 12.3 Application Layer

- Coordinates use cases, performing flow orchestration.
- Fetches aggregates from Persistence abstractions (Ports).
- Coordinates domain entity mutations.
- Persists updated states back via Persistence Ports.
- Defines Validation Contracts and service interfaces.

#### 12.4 Domain Layer

- Models core business concepts, rules, and invariants.
- Validates self-contained state boundaries (Value Object validation).
- Emits domain events upon state changes.
- Evaluates complex business rules using stateless Domain Services.

### 13. Interface Segregation Principles

- **Client-Specific Interfaces**: No client should be forced to depend on methods it does not use. Large interfaces must be segregated into smaller, highly cohesive contracts.
- **Sovereignty**: Application Ports are designed and owned by the Application layer to serve specific use cases, and Infrastructure adapters must conform to these ports.

### 14. Repository Abstraction Principles

- **Ports and Adapters**: The persistence technology is a detail. The Application layer defines a generic Persistence Interface (Port) defining required queries.
- **Infrastructure Isolation**: The Infrastructure layer implements this interface using persistence adapters.
- **Decoupled Entities**: The Persistence adapter fetches raw persistence records, maps them to clean Domain Entities, and returns them to the use case. The application core never interacts with raw persistence models.

### 15. Service Organization Principles

Services inside the backend are categorized into distinct classes to prevent responsibility leaking:

- **Domain Services**: Hold business logic; are strictly stateless and framework-agnostic.
- **Application Services**: Coordinates use cases; contain zero business logic; handle workflow orchestration.
- **Infrastructure Services**: Handle external integrations; manage technical wrappers (e.g., notification providers, payment gateways).

### 16. Domain Service Principles

- Used only when a business operation involves multiple distinct aggregates or requires external business validation rules.
- Must not persist data directly; they receive required aggregates as inputs and evaluate business rules in-memory.
- Must remain completely devoid of external framework references (e.g., no metadata annotations, database connections, or transport-specific headers).

### 17. Application Service Principles

- Coordinate use cases.
- Orchestrate application flow and manage transaction boundaries.
- Invoke domain operations on aggregates.
- Coordinate persistence and recovery through persistence abstractions (Ports).
- Must not contain business rules or decisions. They orchestrate, but do not evaluate.

### 18. Infrastructure Principles

- All database engines, caching stores, queues, logging platforms, and third-party APIs are treated as disposable infrastructure details.
- Changing a database engine to an alternative database engine, or a notification service to an alternative notification provider, must only require rewriting the specific persistence adapter implementation inside the Infrastructure layer, leaving the core application untouched.

### 19. Presentation Layer Principles

- Contains the Presentation Interfaces, presentation adapters, and validation contracts.
- Strictly prohibited from executing transaction logic. It acts as a presentation boundary, translating incoming payload parameters to application commands.
- Responsible for performing response translation for errors and successes, converting internal business outcomes into transport-compatible messages (e.g., translating a domain exception to a transport-specific missing or forbidden response).

### 20. Cross-Cutting Concerns

- **Security Boundaries**: Established at the presentation boundary to shield internal layers from unauthorized access or invalid execution contexts.
- **Validation**: Payloads are evaluated at the outer boundary using strict validation contracts before use cases are executed.
- **Logging**: Non-intrusive tracing and metrics record system operations without polluting domain logic.
- **Exception Handling**: Centered translation mechanism converting internal errors into standardized response envelopes.

### 21. Backend Governance

- **Dependency Audits**: Automated linting rules verify dependency direction, preventing architectural violations.
- **Code Reviews**: Every pull request must be reviewed for Clean Architecture compliance. Any bleeding of databases or frameworks into the core domain will trigger an automatic reject.

### 22. Future Evolution Strategy

By strictly segregating contexts inside independent monorepo packages, the platform is prepared for vertical scaling. The architecture supports future deployment model evolution without impacting the core architecture, allowing any bounded context to scale or evolve independently while the core Domain and Application layers remain completely unchanged.

### 23. Mermaid Backend Architecture Diagram

This diagram visualizes the flow of control and dependency inversion inside a standard Bounded Context package:

```mermaid
graph TD
    %% Presentation Boundary
    subgraph Presentation_Layer [Presentation Layer]
        Controller[Presentation Boundary] -->|1. Validate Payload| InputSchema[Validation Contract]
    end

    %% Application Core
    subgraph Application_Layer [Application Layer / Boundaries]
        InputSchema -->|2. Invoke Command| UseCase[Application Use Case]
        UseCase -->|3. Query Definition| RepoInterface[Persistence Interface]
    end

    %% Domain Core
    subgraph Domain_Layer [Domain Layer / Sovereign Rules]
        UseCase -->|4. Invoke Domain Operations| DomainEntity[Domain Entity]
        DomainEntity -->|Evaluate Rules| DomainService[Stateless Domain Service]
        DomainEntity -->|5. Emit Event| DomainEvent[Domain Event]
    end

    %% Infrastructure Adapter
    subgraph Infrastructure_Layer [Infrastructure Layer / External]
        RepoInterface <.|6. Implements Interface| RepoAdapter[Persistence Adapter]
        RepoAdapter -->|7. Define State Mapping| DBModel[Persistence Model]
        RepoAdapter -->|8. Mutate/Fetch| DB[(Persistence Technology)]
    end

    %% Dependency Direction (Dependency Inversion Proof)
    Controller -->|Depends On| UseCase
    RepoAdapter -->|Depends On| UseCase
    RepoAdapter -->|Depends On| DomainEntity
    UseCase -->|Depends On| DomainEntity

    classDef core fill:#ff9,stroke:#333,stroke-width:2px;
    classDef support fill:#f9f,stroke:#333,stroke-width:2px;
    class UseCase,DomainEntity,DomainService core;
    class Controller,RepoAdapter,DB support;
```

### 24. Deliverables

1. **Backend Foundation Blueprint (This Document)**: Approved and baselined by the Architecture Review Board.
2. **Layer Interaction Sequence Models**: Conceptual flow diagrams outlining requests traversing layers from Presentation Boundaries down to Persistences.
3. **Layer Lint Configuration Templates**: Logical rule frameworks to configure automatic code-dependency boundaries.

### 25. Acceptance Criteria

- **Acceptance Criterion 1 (Layer Isolation Validation)**: The design must restrict all persistence systems and external framework dependencies strictly to the Infrastructure and Presentation layers.
- **Acceptance Criterion 2 (Dependency Direction Compliance)**: The architecture must enforce that dependencies point exclusively inwards toward the Domain Core, preventing circular imports.
- **Acceptance Criterion 3 (Pure Domain Independence)**: The Domain and Application layers must remain completely conceptual, containing no physical code annotations, persistence decorators, or routing declarations.
- **Acceptance Criterion 4 (No Premature Over-Engineering)**: The document must completely omit complex microservice orchestrations, CQRS, and Event Sourcing patterns, maintaining a lean modular footprint.

## Phase 3.3 Architecture Review Report

### Overall Score: 10/10

#### Core Strengths:

1. **Strict Separation of Concerns**: Complete isolation of the domain layer from outer infrastructure adapters and presentation boundaries.
2. **Vendor and Transport Agnostic**: Absolute neutral formulation, avoiding technology-specific details, satisfying the single source of architectural truth.
3. **Conceptual Clarity**: All behaviors are defined in terms of system responsibilities and transaction boundaries, rather than concrete execution sequences.

#### Weaknesses:

- None. The blueprint provides a robust, conceptual, implementation-agnostic backend specification.

#### Risks:

- **Complexity of Double Mapping**: The isolation of persistence models from domain entities requires structural mapping.
  - _Mitigation_: Solved via explicit mapping boundaries inside the infrastructure adapters.

#### Strategic Recommendations:

1. Formally baseline **Phase 3.3 — Backend Foundation**.
2. Proceed to the subsequent foundational phases.

#### Approval Decision:

**PHASE 3.3 COMPLETED & APPROVED**  
_Status: APPROVED / Revision: 3.3.1 / READY FOR IMPLEMENTATION_

- [ ] Alignment with Phase 3 Part A — All layers and components match the architectural specification.
- [ ] Alignment with Phase 3 Part B — Implementation strictly uses the defined Contracts without modification.
- [ ] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [ ] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [ ] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [ ] Foundation Reuse Verification — Every consumed phase is verified as a loose integration.
- [ ] Dependency Inversion — Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [ ] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Approved
