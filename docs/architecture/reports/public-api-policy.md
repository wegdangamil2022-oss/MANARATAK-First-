# Public API Policy & Package Export Audit

> **STATUS: SUPERSEDED / REMEDIATED FINDING**
> 
> * **Notice:** The findings, violations, and deep import instances previously cataloged in this report are historical. Every identified deep import violation (all 26 instances across `@manaratak/application` and `apps/api`) has been completely refactored and resolved in accordance with standard architectural boundaries.
> * **Current Reference:** All package-boundary violations are now eliminated. Active package interfaces strictly resolve through root entry points (`index.ts`). This document is preserved solely for audit trails and compliance history.

## 1. Executive Summary
This document defines the official Public API boundary policy for all packages within the MANARATAK monorepo. It establishes strict rules for package exports and internal imports to ensure high cohesion, low coupling, and predictable dependency graphs. To ensure the Public API serves as a governed architectural contract, this policy implements explicit export lifecycle classifications. An audit has also revealed internal import violations which must be remediated.

## 2. Public API Policy

Every package in the monorepo must adhere to the following encapsulation policies:

### 2.1 The Entry Point Rule
*   Every package **MUST** have exactly one official entry point: `src/index.ts`.
*   All consumers external to the package **MUST** import symbols exclusively from the package root (e.g., `import { Entity } from '@manaratak/domain';`).
*   Deep imports (e.g., `import { Entity } from '@manaratak/domain/src/entities/Entity';`) are **STRICTLY FORBIDDEN**.

### 2.2 Public API vs. Internal API
*   **Public API:** Any interface, class, type, or function exported from `src/index.ts`. These symbols form the official contract of the package and are governed by lifecycle statuses.
*   **Internal API:** Any module or symbol inside the package that is *not* exported from `src/index.ts`. These are private implementation details and can be refactored or deleted without notice. External consumers must never depend on them.

### 2.3 Allowed vs. Forbidden Exports
*   **Allowed Exports:** Aggregate Roots, Domain Services, Use Cases, DTOs, global configuration interfaces, and shared architectural contracts.
*   **Forbidden Exports:** Internal helper functions, private factory methods, database-specific mapper implementations (unless explicitly part of a plugin architecture), and test mocks (test mocks should reside in testing or be exported via a dedicated test entry point, not the main `index.ts`).

### 2.4 Export Lifecycle Classifications
To govern the stability of our architectural contracts, every exported symbol must be classified into one of the following lifecycle states:

*   **Public:** Stable, official API. Guaranteed not to change in breaking ways without a major version bump.
*   **Experimental:** New features or architectural patterns still undergoing validation. May change or be removed at any time. Must be documented with an `@experimental` JSDoc tag.
*   **Deprecated:** Scheduled for removal. Must be documented with a `@deprecated` JSDoc tag indicating the recommended replacement and the planned removal version.
*   **Internal:** Exported only to facilitate monorepo cross-package compilation or DI registration, but strictly forbidden from direct use in cross-domain business logic. Must be marked with `@internal`.

### 2.5 Lifecycle Promotion Rules
*   **Promotion to Public:** An `Experimental` symbol may be promoted to `Public` after running successfully in the production environment for at least one release cycle without requiring breaking structural changes, following Architecture Review Board (ARB) approval.
*   **Deprecation of Public:** A `Public` symbol may only become `Deprecated` when a superior `Public` alternative is available and the deprecation is communicated in release notes. It must remain in the codebase for at least one full major release cycle before physical removal.
*   **Promotion of Experimental:** `Experimental` APIs bypass standard SemVer guarantees until they are officially marked as `Public`.

## 3. Package Export Matrix

The following matrix defines the lifecycle classification and status of key exported symbols across the monorepo:

| Symbol (Category or Specific) | Package | Export Status | Stability Level |
| :--- | :--- | :--- | :--- |
| `Entity`, `AggregateRoot` | `@manaratak/core` | Allowed | Public |
| `IController`, `IUseCase` | `@manaratak/core` | Allowed | Public |
| `BaseController` | `apps/api` | Forbidden | Deprecated |
| `IValidationContext` | `@manaratak/core` | Allowed | Public |
| `IValidationContext` | `@manaratak/domain` | Forbidden | Deprecated |
| `ApiResponse`, `ApiMetadata` | `@manaratak/shared` | Allowed | Experimental |
| Domain Aggregates (e.g., `Role`) | `@manaratak/domain` | Allowed | Public |
| Domain Events | `@manaratak/domain` | Allowed | Public |
| Repositories (e.g., `IRoleRepository`) | `@manaratak/domain` | Allowed | Public |
| Application Use Cases | `@manaratak/application`| Allowed | Public |
| Application DTOs | `@manaratak/application`| Allowed | Public |
| Infrastructure Adapters | `@manaratak/infrastructure`| Allowed | Public |
| `PrismaIdentityRepository` | `@manaratak/infrastructure`| Allowed | Internal (DI only) |
| `__SHARED_KERNEL__` | `@manaratak/shared` | Allowed | Internal |

## 4. Internal Import Audit

An automated audit of the workspace was conducted to detect violations of the Entry Point Rule (i.e., importing `package/src/...`). 

**Violation Severity:** **CRITICAL**. These imports break package encapsulation and create brittle dependencies on internal file structures.

**Identified Violations (26 Total):**

### 4.1 `@manaratak/application` Boundary Violations (17 instances)
The Application Layer is bypassing the Domain Layer's public API and importing directly from `src/`.
*   `packages/application/src/notification/use-cases/ManageNotificationIntentsUseCase.ts` (12 violations targeting `@manaratak/domain/src/...`)
*   `packages/application/src/notification/use-cases/ManageNotificationTemplatesUseCase.ts` (5 violations targeting `@manaratak/domain/src/...`)

### 4.2 `apps/api` Boundary Violations (9 instances)
The Presentation/App Layer is bypassing the Application Layer's public API.
*   `apps/api/src/server.ts` (3 violations targeting `@manaratak/application/src/...`)
*   `apps/api/src/presentation/api/router/NotificationRouter.ts` (2 violations targeting `@manaratak/application/src/...`)
*   `apps/api/src/presentation/api/router/AuditRouter.ts` (1 violation targeting `@manaratak/application/src/...`)
*   `apps/api/src/infrastructure/di/container.ts` (3 violations targeting `@manaratak/application/src/...`)

## 5. Migration Strategy

All identified violations can be resolved quickly as the targeted symbols are already exported by the respective packages' `index.ts`.

1.  **Refactor Imports:** Update all 26 identified files to change the deep import path to the package root.
    *   *Change:* `import { X } from '@manaratak/domain/src/notification/aggregates/X';`
    *   *To:* `import { X } from '@manaratak/domain';`
    *   *Change:* `import { Y } from '@manaratak/application/src/notification/use-cases/Y';`
    *   *To:* `import { Y } from '@manaratak/application';`
2.  **Linting Enforcement:** In the future, introduce an ESLint rule (e.g., `no-restricted-imports`) configured to block any imports matching `*/src/*` from external packages.
3.  **No New Deep Imports:** Effective immediately, PRs containing deep imports across package boundaries will be rejected.
4.  **Tag Application:** Apply `@public`, `@internal`, `@experimental`, and `@deprecated` JSDoc tags to all exported symbols over the next migration phase.
