# Barrel Export Architecture Standard

## 1. Executive Summary
This document establishes the official Barrel Export Architecture for the MANARATAK monorepo. It outlines the strategy for `index.ts` files (barrels) to ensure predictable module resolution, prevent circular dependencies, maintain a clean Public API, and govern re-export chains. An audit of the current repository state indicates significant deviations from best practices, requiring a structured migration.

## 2. Audit of Existing `index.ts` Files

An analysis of the current monorepo reveals the following structural issues regarding barrel files:

*   **Missing Barrel Files (Under-exporting at Feature Level):** 
    Currently, bounded contexts (e.g., `notification`, `audit`, `file-management`) do not have their own `index.ts` files. All exports are managed globally per package.
*   **Over-exporting (Root Barrel Bloat):** 
    The root `packages/domain/src/index.ts` contains over 500 lines of individual file exports. Similarly, `packages/application/src/index.ts` and `packages/infrastructure/src/index.ts` exceed 100 lines. The root barrel is acting as a monolithic directory rather than a delegator.
*   **Inconsistent Export Structures:** 
    Some packages use explicit named exports (`export { X } from './path'`), while others use wildcard exports (`export * from './path'`).
*   **Circular Re-export Risks:** 
    When hundreds of files are exported from a single root `index.ts`, developers are prone to importing sibling modules via the root barrel (e.g., `import { X } from '../index'`) instead of relative paths. This frequently triggers strict circular dependency errors in TypeScript and bundlers.

## 3. Official Barrel Export Standard

To resolve these issues and enforce the Public API Policy (STD-ARC-002), the following Barrel Architecture is mandated:

### 3.1 Root Barrel Policy
*   **Responsibility:** The root `src/index.ts` of any package serves strictly as the Public API entry point for external consumers.
*   **Rule:** The Root Barrel **MUST NOT** export individual files directly (e.g., `export * from './audit/aggregates/AuditRecord'`).
*   **Rule:** The Root Barrel **MUST** only re-export from Feature Barrels (e.g., `export * from './audit';`).

### 3.2 Feature Barrel Policy
*   **Responsibility:** Each top-level domain or module directory (e.g., `src/audit/`, `src/notification/`) **MUST** contain its own `index.ts` file.
*   **Rule:** The Feature Barrel defines the Public API of that specific bounded context. It selectively exports symbols that are allowed to be consumed by other bounded contexts or external packages.

### 3.3 Nested Barrel Policy
*   **Responsibility:** Sub-directories (e.g., `src/audit/value-objects/`) may optionally contain Nested Barrels if the directory contains highly cohesive elements that are always imported together.
*   **Rule:** Nested Barrels are permitted but not strictly required. Feature Barrels remain the primary mechanism for encapsulation. Note that due to Re-export Chain Governance (see 3.6), Nested Barrels should generally be imported directly by internal consumers rather than being endlessly re-exported.

### 3.4 Intra-Package Import Rules (Preventing Circularity)
*   **Rule:** Files within the same package **MUST NOT** import from their own package's Root Barrel (`src/index.ts`).
*   **Rule:** Intra-package cross-feature imports **SHOULD** target the sibling Feature Barrel (e.g., `import { X } from '../audit';`).
*   **Rule:** Intra-feature imports **MUST** use direct relative paths to the files (e.g., `import { ValueObject } from './value-objects/ValueObject';`).

### 3.5 Forbidden Export Patterns
*   **No Default Exports:** `export default` is **STRICTLY FORBIDDEN** in barrel files. Only named exports or `export *` are permitted.
*   **No Star Export Collisions:** When using `export *`, developers must ensure no naming collisions exist between feature barrels. If collisions exist, explicit named exports must be used.
*   **No Internal Exports:** Do not export internal helpers or database schemas from Feature or Root Barrels.

### 3.6 Re-export Chain Governance
To prevent module resolution performance degradation and unpredictable dependencies, re-export chains must be strictly governed.

*   **Maximum Allowed Depth:** The maximum allowed re-export depth is officially limited to **one level of delegation**.
*   **Allowed Chain:** The only officially permitted barrel chain is: `Feature Barrel` → `Root Barrel`. The `Root Barrel` exports the `Feature Barrel`, which exports the individual files.
*   **Explicitly Forbidden:** Multi-level chained barrel exports are strictly forbidden. 
*   **Anti-Patterns Prevented:**
    *   **Deep Chaining:** `Nested Barrel` → `Sub-feature Barrel` → `Feature Barrel` → `Root Barrel` is forbidden.
    *   **Cyclic Re-export Chains:** Re-exporting symbols in a way that introduces circular dependencies between barrels is strictly forbidden.
    *   **Hidden Transitive Exports:** Re-exporting a third-party or cross-package symbol implicitly through a feature barrel is forbidden.
*   **Traceability:** Developers must be able to trace any exported symbol from the `Root Barrel` to its source file in no more than two hops. Tools and IDEs should easily resolve `import { Symbol } from '@manaratak/package'` to `package/src/feature/Symbol.ts`.

## 4. Allowed Export Artifacts

Only specific architectural constructs are permitted to be exported through Feature and Root Barrels. 

**Allowed for Export:**
*   **Domain Layer:** Aggregate Roots, Value Objects, Domain Events, Repository Interfaces, Gateway Interfaces, Domain Exceptions, Enums.
*   **Application Layer:** Use Cases, Application Services, Application DTOs, Event Subscriptions.
*   **Infrastructure Layer:** Concrete Adapters, Repositories, DI Configurations (Note: often only exported for DI container registration).
*   **Presentation Layer:** Controllers (via interfaces), Route Definitions.
*   **Shared/Core Layers:** Interfaces, Base Types, DTOs, Enums, Utilities.

**Forbidden from Export:**
*   Private helper utilities (e.g., `StringHelper.ts` specific to one entity).
*   Database-specific models/schemas (e.g., raw Prisma or TypeORM entities).
*   Test mocks and fixtures (these belong in `@manaratak/testing` or local `__tests__` folders).

## 5. Migration Strategy

The migration to the new Barrel Standard will be executed in three phases to avoid breaking changes.

**Phase 1: Feature Barrel Creation**
1.  Identify all bounded contexts/modules in `domain`, `application`, and `infrastructure`.
2.  Create `index.ts` files inside each feature directory (e.g., `packages/domain/src/notification/index.ts`).
3.  Move the specific file exports from the Root Barrel into the respective Feature Barrels.

**Phase 2: Root Barrel Refactoring**
1.  Update the Root Barrels (`packages/*/src/index.ts`) to exclusively export the newly created Feature Barrels (`export * from './feature-name';`).
2.  Verify that no named collisions occur due to wildcard exports.

**Phase 3: Internal Import & Chain Remediation**
1.  Audit intra-package imports to ensure no file imports from `../index.ts` or `../../index.ts`.
2.  Refactor intra-feature imports to use direct relative paths.
3.  Identify and flatten any deep re-export chains to comply with the one-level delegation rule.
4.  Configure ESLint (`no-restricted-imports`) to prevent intra-package imports from hitting the Root Barrel and to flag deep barrel chains.
