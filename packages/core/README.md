# @manaratak/core

## Core Architectural Foundation

**Purpose**: Provides the fundamental structural scaffolding, architectural patterns, and foundational interfaces required to build a MANARATAK application. It represents the "framework" level of the platform.

### Allowed Contents
- Architectural Base Classes (`Entity`, `ValueObject`, `AggregateRoot`).
- Infrastructure Abstractions (`IRepository`, `IUnitOfWork`, `IEventBus`, `ILogger`).
- Architectural Primitives (`Result`, `UseCase`, `IDomainEvent`).
- System-level Exceptions (`BaseException`, `AuthorizationException`, `ValidationException`).

### Forbidden Contents
- Domain-specific logic, business rules, or feature-specific code.
- Generic utilities (e.g., Date formatting, string manipulation).
- Cross-domain business DTOs or API envelopes.

### Dependency Rules
- Sits at the absolute bottom of the dependency graph.
- **MUST NOT** depend on `@manaratak/shared` or any bounded context.

*For the complete specification, see `docs/architecture/standards/std-arc-002-core-vs-shared-boundaries.md`.*
