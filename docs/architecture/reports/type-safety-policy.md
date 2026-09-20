# Type Safety Policy & Audit

## 1. Executive Summary
This document establishes the official Type Safety Standard for the MANARATAK monorepo. Type safety is critical for preventing runtime errors, ensuring domain integrity, and documenting developer intent. This standard defines strict rules for type assertions, utility types, and dynamic typing fallbacks. An automated audit of the codebase has been conducted to quantify existing violations and define a prioritized migration strategy based on architectural boundaries.

## 2. Type Safety Standard

Every package in the monorepo must adhere to the following type safety constraints.

### 2.1 Typing Primitives and Fallbacks

*   `any`
    *   **Status:** **GENERALLY FORBIDDEN (Subject to Usage Classification)**
    *   **Rule:** The use of `any` completely disables the TypeScript compiler for that symbol, circumventing all type safety guarantees. Its use is strictly governed by the Any Usage Classification (Section 2.1.1).
*   `unknown`
    *   **Status:** **ALLOWED**
    *   **Rule:** `unknown` is the type-safe counterpart to `any`. It is allowed and encouraged when handling external payloads (e.g., HTTP request bodies, third-party API responses, unparsed JSON). However, an `unknown` variable MUST be narrowed via type guards or validation (e.g., Zod schemas) before it can be interacted with.
*   `never`
    *   **Status:** **ALLOWED**
    *   **Rule:** `never` is used for exhaustive type checking in `switch` statements or to indicate functions that always throw exceptions or never return. Its use is encouraged for exhaustive type safety.

#### 2.1.1 Any Usage Classification
Every occurrence of `any` must be classified into one of the following categories, dictating its acceptability:

1.  **Domain/Application Layer**
    *   **Status:** **STRICTLY PROHIBITED**
    *   **Policy:** `any` is explicitly forbidden inside the Domain Layer and Application Layer. These layers contain core business logic and must be 100% type-safe. There are no exceptions.
2.  **External Integration**
    *   **Status:** **ALLOWED WITH EXCEPTIONS**
    *   **Policy:** Allowed only as a documented exception when interfacing with poorly-typed external libraries or dynamic runtime payloads (e.g., arbitrary JSON objects from external APIs) where strict typings cannot be reasonably inferred or maintained.
3.  **Infrastructure Boundary**
    *   **Status:** **ALLOWED WITH EXCEPTIONS**
    *   **Policy:** Allowed only as a documented exception at framework boundaries (e.g., wrapping generic Express middleware, database drivers lacking generic support) where the framework forces a loss of type context.
4.  **Temporary Development**
    *   **Status:** **FORBIDDEN IN PRODUCTION**
    *   **Policy:** `any` used as a quick workaround during initial prototyping must be flagged and resolved before any code is merged into the `main` branch.

### 2.2 Advanced Typing Constructs

*   **Generic Types (`<T>`)**
    *   **Status:** **ALLOWED**
    *   **Rule:** Generics are encouraged to create reusable, type-safe components (e.g., `Result<T>`, `IUseCase<TRequest, TResponse>`). However, generic constraints (`T extends SomeBase`) must be used to prevent overly broad inferences.
*   **Utility Types (e.g., `Partial<T>`, `Omit<T>`, `Pick<T>`)**
    *   **Status:** **DISCOURAGED** (for Domain layer), **ALLOWED** (for Application/Infrastructure)
    *   **Rule:** In the Domain layer, explicit interfaces are preferred over `Partial` or `Omit` to maintain clear ubiquitous language. In the Application layer (e.g., DTOs) and Infrastructure layer (e.g., ORM payloads), utility types are allowed to reduce duplication.

### 2.3 Assertions and Overrides

*   **Type Assertions (`as Type`)**
    *   **Status:** **DISCOURAGED**
    *   **Rule:** Type assertions override the compiler's inference. They are acceptable ONLY when interacting with poorly-typed external libraries or when the developer has provable external context the compiler lacks. They are forbidden when used simply to silence compiler errors.
*   **Non-null Assertions (`!`)**
    *   **Status:** **FORBIDDEN**
    *   **Rule:** The non-null assertion operator (`!`) bypasses strict null checks. If a value might be null or undefined, the code MUST handle it explicitly via control flow (e.g., `if (val === null) throw new Error(...)`).
*   **Compiler Directives (`@ts-ignore`, `@ts-expect-error`)**
    *   **Status:** **FORBIDDEN** (for `@ts-ignore`), **DISCOURAGED** (for `@ts-expect-error`)
    *   **Rule:** `@ts-ignore` is strictly forbidden. `@ts-expect-error` is permitted only in test suites to assert that invalid inputs correctly trigger type compilation failures.
*   **Global Augmentation (`declare global`)**
    *   **Status:** **NEEDS REVIEW**
    *   **Rule:** Modifying the global scope can lead to unpredictable side effects across the monorepo. It is allowed only in dedicated infrastructure entry points (e.g., extending the Express `Request` object with a user payload) and requires Architecture Review Board (ARB) approval.

## 3. Type Safety Audit Report

An automated static analysis audit of the MANARATAK monorepo (excluding `node_modules` and `dist`) was conducted to evaluate compliance with this standard.

### 3.1 Audit Findings

| Construct | Occurrences | Classification | Remediation Strategy |
| :--- | :--- | :--- | :--- |
| `any` | 241 | **Varies by Layer** | Must be prioritized based on architectural layer. Domain/Application occurrences are critical violations. |
| `unknown` | 106 | **Acceptable / Needs Review** | Generally acceptable. Requires manual review to ensure proper type narrowing (e.g., type guards) is performed before usage. |
| Type Assertions (`as`) | 70 | **Needs Review** | Must be audited to determine if they are bridging external library gaps (acceptable) or masking type mismatches (violation). |
| Global Augmentation (`declare global`) | 1 | **Needs Review** | Validate that the augmentation is isolated and strictly necessary for framework integration. |
| Non-null Assertions (`!`) | ~1 | **Violation** | Replace with explicit runtime null checks. |
| `@ts-ignore` | 0 | **Acceptable** | Monorepo is clean. Maintain strict ESLint enforcement. |
| `@ts-expect-error` | 0 | **Acceptable** | Monorepo is clean. |

## 4. Migration Strategy

To bring the monorepo into full compliance with the Type Safety Standard, remediation is prioritized by architectural layer rather than raw occurrence count, ensuring that core business logic is secured first.

### Phase 1: Enforcement & Tooling (Immediate)
1.  **Configure ESLint:** Update the monorepo ESLint configuration to set `@typescript-eslint/ban-ts-comment` and `@typescript-eslint/no-non-null-assertion` to `"error"`. Set `@typescript-eslint/no-explicit-any` to `"error"` but allow baseline exclusions during the migration.
2.  **Baseline Exclusions:** Introduce an ESLint override file or inline comments (`eslint-disable-next-line`) for the existing 241 `any` violations and 1 non-null assertion to allow the CI pipeline to pass while preventing new violations.

### Phase 2: Critical Layer Remediation (Highest Priority)
1.  **Domain Layer:** Eliminate 100% of `any` usages in `@manaratak/domain`. The domain must be perfectly type-safe.
2.  **Application Layer:** Eliminate 100% of `any` usages in `@manaratak/application`. Replace with explicit DTOs, generics, or `unknown` combined with Zod validation.
3.  **Remove Non-null Assertions:** Refactor the single occurrence of the non-null assertion by implementing a runtime check or throwing a domain-specific exception.

### Phase 3: Infrastructure and External Integration (Lower Priority)
1.  **Audit Type Assertions (`as`):** Review the 70 type assertions. Replace unnecessary assertions with type guards, generic instantiations, or structural interface alignment.
2.  **Infrastructure Boundary Review:** Review `any` occurrences in `@manaratak/infrastructure` and `apps/*`. Document exceptions for framework boundaries and external libraries. Where possible, replace `any` used in database mappers and external API clients with `unknown` or specific types.
3.  **Review Global Declarations:** Document and formally approve the 1 existing `declare global` usage.
4.  **Continuous Monitoring:** Rely on CI/CD strict type checking (`tsc --noEmit`) and ESLint to ensure no future regressions occur.
