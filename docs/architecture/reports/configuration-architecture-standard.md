# Configuration Architecture Standard

## 1. Executive Summary
This document establishes the official Configuration Architecture for the MANARATAK monorepo. It defines how configuration data, environment variables, and secrets are loaded, validated, cached, and consumed across all packages. Direct usage of `process.env` is strictly prohibited in business logic to ensure testability, type safety, and predictable environments. Furthermore, configuration is treated as a versioned architectural contract with a strict lifecycle to ensure operational stability. An audit has been conducted to identify existing `process.env` usages, accompanied by a migration plan.

## 2. Configuration Architecture

The configuration ecosystem is built on a provider-agnostic, strongly-typed foundation.

### 2.1 Component Responsibilities
*   **IConfigurationProvider:** An infrastructure-level abstraction responsible for fetching raw configuration key-value pairs from an external source (e.g., Environment Variables, AWS Secrets Manager, HashiCorp Vault, JSON file).
*   **IConfigurationService:** The core application-level service injected into Use Cases, Controllers, and Infrastructure adapters. It uses the provider to load raw data, applies validation schemas, caches the validated configuration, and exposes it through strictly typed getter methods.

### 2.2 Environment Variable Loading Policy
*   Application code **MUST NOT** directly access `process.env`.
*   All environment variables must be loaded via the `EnvironmentConfigurationProvider` (or equivalent provider) at application startup.
*   The raw configuration map is then passed to the `ConfigurationService` for parsing and validation.

### 2.3 Configuration Validation Strategy
*   Configuration is untyped at the source. It **MUST** be validated at startup before any business logic executes.
*   The `ConfigurationService` must use a schema validation library (e.g., Zod) to parse the raw configuration dictionary into strongly typed domain objects.
*   If validation fails, the application **MUST** fail fast and terminate (e.g., exit code 1) rather than running in an unpredictable state.

### 2.4 Secret Management Policy
*   Secrets (API keys, database passwords, cryptographic salts) must never be hardcoded or checked into version control.
*   Secrets must not be logged. The `ConfigurationService` should mask or redact sensitive values if it provides diagnostic logging.
*   In production, secrets should ideally be injected at runtime via orchestration (e.g., Kubernetes Secrets, Cloud Run environment variables) rather than persisted in local `.env` files.

### 2.5 Environment Profiles
Configuration varies based on the deployment target. The application recognizes the following standard profiles:
*   **Development:** Local developer machines. Relies on `.env` files and local mock services.
*   **Testing:** CI/CD and local test suites. Configuration is often overridden in-memory via `TestBootstrap` or specific `.env.test` files.
*   **Staging:** Pre-production environment. Mirrors production architecture but uses staging databases and sandbox API keys.
*   **Production:** The live environment. Highest security posture; relies on secure secret injection.

### 2.6 Configuration Caching Policy
*   Configuration values are typically static for the lifetime of the application process.
*   The `ConfigurationService` **MUST** cache the validated configuration payload in memory upon initialization to prevent redundant parsing, validation, or network calls (if using remote providers).
*   Dynamic configuration (feature flags) should be handled via a distinct mechanism or service, not the static startup configuration service.

## 3. Configuration Versioning & Lifecycle

To treat configuration as a governed architectural contract rather than a loose collection of environment variables, the system implements strict Configuration Schema Versioning. 

### 3.1 Configuration Schema Versioning & Validation
*   **Configuration Schema Version:** The overall configuration structure is versioned using semantic versioning. The application expects a specific major/minor version to operate correctly.
*   **Configuration Validation Version Check:** The raw configuration payload must contain a version identifier (e.g., `CONFIG_VERSION`). The `ConfigurationService` executes a pre-validation check matching the provided environment version against the application's required version.
*   **Startup Incompatibility Detection:** During application bootstrap, if an incompatible configuration version is detected (e.g., a major version mismatch between the environment and the application), the `ConfigurationService` **MUST** log a critical incompatibility error and immediately terminate the process (fail fast).

### 3.2 Configuration Key Lifecycle
Every configuration key follows a strict, documented lifecycle:
*   **Experimental:** Newly introduced keys testing new infrastructure features. They may be renamed, changed, or removed in minor releases without triggering a breaking change.
*   **Stable:** Official configuration keys representing the current architectural contract. Fully supported and relied upon in production.
*   **Deprecated:** Keys scheduled for removal. If a deprecated key is detected in the environment payload, the `ConfigurationService` **MUST** emit a startup warning in the logs.
*   **Removed:** Keys that are no longer supported. If a removed key is explicitly provided and marked as strictly required by older deployment manifests, schema validation must fail to alert operations of stale manifests.

### 3.3 Compatibility & Change Policies
*   **Backward Compatibility Policy:** Additive changes (e.g., adding new optional keys or establishing new configuration domains) must be backward compatible. Deployments without the new keys must continue to function normally.
*   **Breaking Change Policy:** Changing the semantic meaning of a stable key, making a previously optional key mandatory, or removing a stable key constitutes a breaking change. This strictly requires a major version bump of the Configuration Schema.

### 3.4 Configuration Migration Policy
When transitioning keys (e.g., migrating from `DB_HOST` to a unified `DATABASE_URI`), the application must temporarily support both keys during the deprecation window (typically one major release cycle). The `ConfigurationService` handles this mapping internally, reading the new key if present, and falling back to the deprecated key (with a warning) if not. This decouples code deployment from infrastructure configuration updates, allowing ops teams time to migrate environment variables safely.

## 4. Configuration Domains

To prevent a monolithic configuration object, configuration should be logically grouped into the following typed domains:

*   **Application:** Base URLs, port bindings, environment name, CORS origins, logging levels.
*   **Database:** Connection URIs, pool sizes, timeout thresholds.
*   **Authentication:** JWT secrets, expiration times, OAuth client IDs and secrets.
*   **Storage:** S3 bucket names, Cloud Storage credentials, local storage paths.
*   **Messaging:** Kafka brokers, RabbitMQ URLs, consumer group IDs.
*   **AI:** OpenAI/Gemini API keys, model parameters, timeout configurations.
*   **Email:** SMTP hosts, ports, credentials, default sender addresses.
*   **Cache:** Redis URLs, TTL defaults, cluster nodes.
*   **Monitoring:** APM endpoint URLs, Datadog/NewRelic keys, sampling rates.

## 5. `process.env` Audit & Inventory

An automated audit of the monorepo identified 7 direct usages of `process.env`. 

### 5.1 Audit Findings and Classification

| File Path | Usage | Classification | Justification |
| :--- | :--- | :--- | :--- |
| `packages/testing/src/bootstrap/TestBootstrap.ts:3` | `process.env.NODE_ENV = 'test';` | **Allowed** | Testing infrastructure is permitted to mutate the environment for test setup before the DI container boots. |
| `packages/testing/src/bootstrap/TestBootstrap.ts:7` | `process.env.NODE_ENV = 'test';` | **Allowed** | Same as above. |
| `packages/testing/src/bootstrap/TestBootstrap.ts:8` | `process.env.TEST_MODE = 'integration';` | **Allowed** | Same as above. |
| `packages/config/src/providers/EnvironmentConfigurationProvider.ts:5` | `return { ...process.env };` | **Allowed** | This is the official provider abstraction designed to encapsulate `process.env`. |
| `apps/api/src/infrastructure/di/container.ts:133` | `const isPrisma = !!process.env.DATABASE_URL;` | **Violation / Needs Migration** | The DI container should resolve the configuration service or rely on environment-specific DI factories rather than reading `process.env` directly to make wiring decisions. |
| `apps/web/vite.config.ts:16` | `hmr: process.env.DISABLE_HMR !== 'true'` | **Allowed** | Build/bundler configuration scripts must read environment variables before the application runtime exists. |
| `apps/web/vite.config.ts:17` | `watch: process.env.DISABLE_HMR === 'true' ? null : {}` | **Allowed** | Same as above. |

## 6. Migration Strategy

To bring the monorepo into full compliance with the Configuration Architecture Standard, the following migration steps will be executed:

### Phase 1: Tooling and Enforcement (Immediate)
1.  **Configure ESLint:** Implement an ESLint rule (e.g., `no-process-env`) across `packages/domain`, `packages/application`, `packages/infrastructure`, and `apps/*`.
2.  **Exclusions:** Explicitly exclude `packages/config/src/providers/EnvironmentConfigurationProvider.ts`, `packages/testing/*`, and build tools (e.g., `vite.config.ts`) from the ESLint rule.

### Phase 2: Schema Definition & Versioning (Iterative)
1.  Define Zod schemas in `@manaratak/config` (or `@manaratak/core`) representing the required Configuration Domains (Database, Authentication, Storage, etc.).
2.  Implement the Configuration Schema Versioning checks (`CONFIG_VERSION`) within the `ConfigurationService` bootstrap sequence.
3.  Update the concrete `ConfigurationService` to parse the payload from `EnvironmentConfigurationProvider` against these schemas.

### Phase 3: Remediation of Violations
1.  **Refactor DI Container:** Update `apps/api/src/infrastructure/di/container.ts`. Remove `!!process.env.DATABASE_URL`. Instead, resolve `IConfigurationService` first (which loads from the Provider), and retrieve the database type or URL strictly through the `configService.getDatabaseConfig()` method to determine which repository implementation to inject.

### Phase 4: Continuous Verification
1.  Ensure the CI/CD pipeline enforces the `no-process-env` rule to prevent developers from bypassing the `ConfigurationService` in the future.
