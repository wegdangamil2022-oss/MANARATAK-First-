# Standard: Core vs Shared Architecture Boundaries

**Document ID:** STD-ARC-002
**Status:** Approved & Baselined
**Title:** Core vs. Shared Architecture Boundaries Specification

## 1. Purpose and Scope
This document establishes the official architectural boundaries, responsibilities, and placement rules between `packages/core` and `packages/shared` within the MANARATAK 2.0 platform. As the system scales, maintaining strict separation between architectural primitives (Core) and cross-domain utilities (Shared) is critical to prevent circular dependencies, reduce technical debt, and ensure a stable, predictable foundation.

## 2. Package Responsibilities

### 2.1 `packages/core` (The Architectural Foundation)
*   **Purpose:** Provides the fundamental structural scaffolding, architectural patterns, and foundational interfaces required to build a MANARATAK application. It represents the "framework" level of the platform.
*   **Allowed Contents:** 
    *   Architectural Base Classes (`Entity`, `ValueObject`, `AggregateRoot`).
    *   Infrastructure Abstractions (`IRepository`, `IUnitOfWork`, `IEventBus`, `ILogger`).
    *   Architectural Primitives (`Result`, `UseCase`, `IDomainEvent`).
    *   System-level Exceptions (`BaseException`, `AuthorizationException`, `ValidationException`).
*   **Forbidden Contents:** 
    *   Domain-specific logic, business rules, or feature-specific code.
    *   Generic utilities (e.g., Date formatting, string manipulation).
    *   Cross-domain business DTOs or API envelopes.
*   **Dependency Rules:** 
    *   `core` sits at the absolute bottom of the dependency graph.
    *   It **MUST NOT** depend on `packages/shared` or any bounded context.
*   **Ownership Rules:** 
    *   Owned by the Enterprise Architecture Team. Changes require strict architectural review.

### 2.2 `packages/shared` (The Cross-Cutting Utility Kernel)
*   **Purpose:** Provides common domain-agnostic utilities, shared data types, generic DTOs, and global constants that are consumed by multiple bounded contexts but do not dictate system architecture.
*   **Allowed Contents:**
    *   Cross-domain Value Objects (e.g., `EmailAddress`, `Money`, `PhoneNumber`).
    *   Shared Utilities (`DateUtils`, `StringUtils`, Cryptography helpers).
    *   Standard DTOs and API Envelopes (`ApiResponse`, `PaginationDto`).
    *   Global Business Constants and Common Types (`CurrencyCode`, `CountryCode`).
*   **Forbidden Contents:**
    *   Architectural Base Classes (e.g., redefining `Entity` or `AggregateRoot`).
    *   Database access abstractions or system-level infrastructure contracts.
    *   Logic bounded to a single, specific business domain.
*   **Dependency Rules:**
    *   `shared` **MAY** depend on `packages/core` to utilize architectural primitives (e.g., implementing a generic `EmailAddress` using the core `ValueObject` base class).
    *   Bounded contexts depend on both `core` and `shared`.
*   **Ownership Rules:**
    *   Sharedly owned by platform and feature teams, governed by the Architecture Review Board (ARB) to prevent domain-leakage.

## 3. Clear Placement Rules

The following table defines the exact canonical location for various artifacts to enforce strict isolation:

| Artifact Type | Canonical Location | Rule / Description |
| :--- | :--- | :--- |
| **Base Classes** | `packages/core` | All foundational abstract classes (`Entity`, `AggregateRoot`, `DomainEvent`) belong in core. |
| **Entities** | Bounded Contexts | Domain entities live in their specific context. NO concrete business entities exist in `core` or `shared`. |
| **Value Objects** | `core` / `shared` / Context | The `ValueObject` base class goes in `core`. Generic, cross-domain Value Objects (e.g., `Money`) go in `shared`. Domain-specific VOs go in their bounded context. |
| **Contracts** | `core` / `shared` | Architectural interfaces (`IRepository`, `ILogger`) go in `core`. Cross-domain integration contracts or standard payload interfaces go in `shared`. |
| **DTOs** | `shared` / Context | Standard API envelopes (`ApiResponse`, `PaginationRequest`) go in `shared`. Feature-specific DTOs go in their bounded contexts. `core` MUST NOT contain DTOs. |
| **Shared Utilities**| `shared` | Helper functions (Date manipulation, regex parsers, string formatting) belong exclusively in `shared`. |
| **Common Types** | `shared` | Types shared across multiple domains (e.g., `ContactInfo`, `AddressLayout`) belong in `shared`. |
| **Constants** | `core` / `shared` | Architectural constants (e.g., System Error Codes) go in `core`. Cross-domain business constants (e.g., Validation Regexes) go in `shared`. |
| **Enums** | `core` / `shared` | Architectural enums (e.g., `LogLevel`) go in `core`. Cross-domain business enums (e.g., `UserRole`, `AuditAction`) go in `shared`. |
| **Exceptions** | `core` / Context | `BaseException` and system-level structural exceptions (`AuthException`, `StorageException`) go in `core`. Domain-specific exceptions belong in their contexts. |

## 4. Single Source of Truth Policy

To eliminate redundancy and prevent divergence:
1. **No Duplication:** Every class, interface, type, constant, or utility **MUST** exist in exactly one canonical location. Duplication of contracts between `core` and `shared` is strictly forbidden.
2. **Conflict Resolution:** If an artifact overlaps boundaries, apply this test: 
   * *Does this artifact define how the system operates at an architectural or infrastructural level?* → Move to `core`.
   * *Is this artifact merely a piece of reusable data, a helper function, or a cross-domain data shape?* → Move to `shared`.
3. **Refactoring Mandate:** Any existing duplicate interfaces or classes across packages must be consolidated into their designated canonical location without changing their internal structure.
4. **Import Rules:** Bounded contexts must import architectural primitives from `@manaratak/core` and cross-cutting utilities from `@manaratak/shared`. `shared` may import from `core`, but `core` must never import from `shared`.

## 5. Future Extension Rules

*   **Proposing New Core Primitives:** Adding to `packages/core` requires ARB approval, as changes impact the entire system topology.
*   **Promoting to Shared:** Code from a bounded context can be promoted to `packages/shared` if it is required by two or more disparate domains, provided it does not contain context-specific business rules.
