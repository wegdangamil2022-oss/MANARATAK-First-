# ADR-025: Canonical Technology Stack Adoption

## 1. ADR Metadata

- **ADR ID:** ADR-025
- **Title:** Canonical Technology Stack Adoption
- **Status:** Accepted
- **Version:** 1.0.0
- **Date:** 2026-07-23
- **Decision Owner:** Chief Enterprise Software Architect
- **Reviewers:** Principal Domain Architects, Backend Architect, Frontend Architect
- **Approval Authority (ARB):** Architecture Review Board
- **Partial supersession:** ADR-029 supersedes the BullMQ-specific task-queue choice; PostgreSQL durable workers are the canonical cross-cutting background-job authority.

## 2. Decision Status

**Accepted**

---

## 3. Context

Under the initial MANARATAK 2.0 system architecture specifications, the platform was modeled and documented using a Microsoft .NET and C# enterprise ecosystem. This included technologies such as Entity Framework Core (EF Core) for object-relational mapping, MediatR for in-process messaging and mediator-pattern CQRS routing, SQL Server as the primary relational database, FluentValidation for structural input validation, and xUnit/Moq for testing.

During physical prototyping and implementation phases, the development team transitioned the codebase to a modern, highly responsive TypeScript/Node.js monorepo using Express.js and Prisma ORM. This transition was motivated by:

- **Unified Language Ecosystem:** Sharing TypeScript types, interface signatures, and libraries between the frontend (React/Vite) and the backend (Express/Node.js) to reduce architectural mismatch and serialization overhead.
- **Rapid Iteration and Hot reloading:** Faster container cold-start times and immediate development server reloading under the Cloud Run container runtime environment.
- **Developer Ecosystem:** Better alignment with cloud-native, serverless development paradigms.

This shift created a severe structural misalignment: the extensive repository documentation (e.g., specifications, domain contracts, and implementation guides) continued to describe C# namespaces, `.cs` interfaces, EF Core configurations, and MediatR handlers, while the actual running codebase was entirely TypeScript and Express. To resolve this structural contradiction, the Architecture Review Board has initiated the Architecture Repair Program (ARP).

---

## 4. Problem Statement

The co-existence of two divergent technology definitions (C#/.NET in documentation and TypeScript/Node.js in code) presents several critical enterprise concerns:

- **Documentation Irrelevance:** Implementing developers cannot use the existing specifications and implementation guides because they refer to non-existent C#/.NET packages, namespaces, and language constructs.
- **Development Friction:** Code generators, documentation synchronization scripts, and automated quality checks fail due to conflicting reference specifications.
- **Onboarding Barriers:** New engineers face a split-brain architecture where the code does not match the specifications, leading to guesswork and implementation errors.
- **Governance Gaps:** Code review criteria, linting rules, and architectural compliance checks are impossible to enforce consistently without a single recognized technology baseline.

---

## 5. Decision

The Architecture Review Board (ARB) has decided to establish a **single canonical technology stack** for all business domains and platform modules in the MANARATAK 2.0 ecosystem.

All documentation—including Specifications, Domain Contracts (`*-02-domain-contracts.md`), Implementation Guides (`*-03-implementation-guide.md`), and the Master Blueprint—shall be systematically updated to reflect this canonical stack.

### 5.1 The Canonical Tech Stack Definition

- **Runtime Environment:** Node.js (LTS) & TypeScript
- **Backend Web Framework:** Express.js (Fast, unopinionated, minimalist web framework)
- **Dependency Injection (DI) & IoC:** Awilix (high-performance dependency injection container for Node.js)
- **Object-Relational Mapping (ORM):** Prisma ORM (type-safe database client and auto-generated migrations)
- **Primary Database:** PostgreSQL (open-source relational database)
- **Task Queues & Background Processing:** PostgreSQL durable worker foundation per ADR-029. BullMQ is no longer mandatory and requires a future workload-specific ADR if introduced.
- **Testing Framework (Unit, Integration, and Component):** Vitest (high-performance unit test runner)
- **End-to-End (E2E) Testing:** Playwright (robust cross-browser web testing)

### 5.2 Retirement of Legacy Stack References

The following C#/.NET technologies are officially deprecated, retired from the active baseline, and prohibited in any new or updated documentation:

- **C# / .NET Runtime / Namespaces:** Replaced by TypeScript / ES Modules.
- **Entity Framework Core (EF Core):** Replaced by Prisma ORM.
- **MediatR / INotification / IRequest:** Replaced by clean application-layer services, Express routers, or event-driven BullMQ queues.
- **SQL Server:** Replaced by PostgreSQL.
- **FluentValidation:** Replaced by modern TypeScript validation schemas (e.g., Zod) or Express middleware validations.
- **Moq / xUnit:** Replaced by Vitest.

---

## 6. Considered Alternatives

### Alternative A: Revert Codebase to C# / .NET Core

- **Description:** Rewrite the current Node.js codebase back into C# to match the initial specifications.
- **Rationale for Rejection:** Rejected. The C# codebase would require several months of development, delaying the product release. The team has already successfully integrated the TypeScript backend with Vite and Cloud Run.

### Alternative B: Co-Existence (Polyglot Architecture)

- **Description:** Maintain both .NET and Node.js components as distinct microservices.
- **Rationale for Rejection:** Rejected. MANARATAK 2.0 is designed as a Modular Monolith. Running a dual-language runtime adds massive operational complexity, duplicates infrastructure requirements, and violates the single canonical design principles of the enterprise.

### Alternative C: Align Documentation with TypeScript / Node.js

- **Description:** Adopt the TypeScript/Node.js stack as the single source of truth (SSOT) and systematically update the documentation.
- **Rationale for Selection:** Accepted. This leverages the work already completed, aligns documentation perfectly with the running codebase, and maintains the modular monolith boundaries while ensuring type safety and extreme developer velocity.

---

## 7. Architecture Constraints

To preserve the integrity of the updated architecture, all future development and documentation must satisfy the following constraints:

1. **TypeScript-First Interface Definition:** All domain contracts must be written as pure, type-safe TypeScript interfaces using ES module syntax (`export interface ...`).
2. **Asynchronous Operations:** All potentially I/O-bound operations must return a TypeScript `Promise<T>` rather than the C# `Task<T>`.
3. **Identifier Format:** Unique identifiers must use standard TypeScript strings (UUIDv4) instead of the C# `Guid` type.
4. **Collection Types:** Array parameters and read-only return types must use TypeScript arrays (e.g., `readonly T[]` or `T[]`) instead of `IReadOnlyList<T>`.
5. **No ORM Leakage:** Domain interfaces must remain completely clean of infrastructure-specific attributes or decorators (e.g., no Prisma-specific types or annotations in the contract files).

---

## 8. Architectural Consequences

- **Positive - Ultimate Developer Velocity:** Developers can immediately copy-paste interface definitions from contracts directly into TypeScript files without manual translation.
- **Positive - Absolute Alignment:** The gap between design and reality is eliminated. Automated CI pipelines can validate documentation against the actual TypeScript codebase.
- **Positive - Seamless State Management:** Unifying the server-side and client-side on TypeScript enables shared schemas and type-safe API interactions.
- **Negative - Translation Effort:** Requires a one-time effort to translate several legacy specification files and interface definitions to TypeScript.

---

## 9. Dependency Impact

- **All Domain Phases (01 to 17):** Must conform to the canonical stack. All future domain contracts and specifications must be written in TypeScript.
- **Master Blueprint:** Must be updated to point to ADR-025 as the technology baseline.
- **Legacy Archive:** Any remaining `.cs` C# source files inside packages or specifications must be marked as "Legacy Reference" and moved to the `/docs/legacy` folder to prevent compiler or developer confusion.
