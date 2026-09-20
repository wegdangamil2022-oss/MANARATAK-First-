# Enterprise Testing Architecture Report

## Overview
This report outlines the actual test coverage, locations, and reproducible verification scripts available in the repository. The project uses a standard Vitest workspace for unit/integration testing and Playwright for E2E.

## Scripts & Verification Lifecycle
The local verification lifecycle relies on several root `package.json` scripts. Prisma Client generation (`npm run db:generate`) is integrated into pre-hooks (e.g. `pretest`, `prebuild`, `pretypecheck`) ensuring reproducible builds from a clean checkout.

The following commands are available from the root:
- `npm run db:generate`: Generates the Prisma client.
- `npm run typecheck`: Runs TypeScript type checking across the workspace.
- `npm run lint`: Runs ESLint for code formatting and analysis.
- `npm run build`: Builds the applications and packages.
- `npm run test`: Runs the Vitest workspace test suite.
- `npm run test:coverage`: Runs the Vitest workspace test suite with coverage reporting (v8 provider, text/html reporters).
- `npm run e2e`: Runs Playwright E2E tests against the web application.
- `npm run verify:local`: The main local verification entrypoint. It runs typecheck, lint, build, test, and e2e in a deterministic sequence.

## Test Locations & Categories

### Unit / Domain Tests
- **Status:** Present
- **Location:** `packages/domain/tests/**/*.spec.ts`
- **Coverage Summary:** Covers core domain logic (e.g., aggregate root initialization and validation) ensuring isolated entity correctness.

### Application (Use Case) Tests
- **Status:** Present
- **Location:** `packages/application/tests/**/*.spec.ts`
- **Coverage Summary:** Verifies orchestrations, input parameters, and mocked repository integrations within business logic.

### Repository / Infrastructure Tests
- **Status:** Present
- **Location:** `packages/infrastructure/tests/**/*.spec.ts`
- **Coverage Summary:** Tests data storage behavior, search criteria, and persistence contracts against memory and Prisma adapters.

### API Tests
- **Status:** Present
- **Location:** `apps/api/tests/**/*.spec.ts`
- **Coverage Summary:** Uses supertest to validate router setup, controller invocation, and response payloads for endpoints.

### Web Application Tests
- **Status:** Present
- **Location:** `apps/web/src/**/*.spec.ts`
- **Coverage Summary:** Tests client-side routing, components, and logic.

### End-to-End (E2E) Tests
- **Status:** Present
- **Location:** `apps/web/e2e/**/*.spec.ts`
- **Coverage Summary:** Playwright tests for full browser-based workflow validation targeting the rendered web application.

# Coverage Matrix

| Category         | Status  | Location |
|------------------|---------|----------|
| Domain           | Present | `packages/domain/tests` |
| Application      | Present | `packages/application/tests` |
| Infrastructure   | Present | `packages/infrastructure/tests` |
| API              | Present | `apps/api/tests` |
| Web Unit         | Present | `apps/web/src` |
| E2E              | Present | `apps/web/e2e` |

## Conclusion
✅ VERIFIED — Testing strategy aligns with the established configuration and workspace architecture.
