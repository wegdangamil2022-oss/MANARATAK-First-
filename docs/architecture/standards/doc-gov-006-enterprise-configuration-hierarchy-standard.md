# MANARATAK 2.0: Enterprise Configuration Hierarchy Standard

## 1. Purpose

The Enterprise Configuration Hierarchy Standard defines the official, unified approach for organizing, layering, inheriting, overriding, validating, securing, versioning, and documenting configuration data across the entire MANARATAK 2.0 platform. 

A unified configuration hierarchy is strictly required to ensure:
*   **Consistency:** Guaranteeing uniform configuration behavior across all domains and environments.
*   **Portability:** Allowing applications and services to be seamlessly promoted through different environments without code modification.
*   **Security:** Enforcing explicit, secure handling of secrets, credentials, and sensitive operational parameters.
*   **Maintainability:** Centralizing configuration rules to simplify troubleshooting and operational management.
*   **Governance:** Ensuring every configuration change is auditable, traceable, and strictly owned by an authorized architectural entity.
*   **Operational Reliability:** Preventing configuration drift, misconfiguration, and hidden overrides that lead to system instability.

---

## 2. Scope

This standard governs the configuration hierarchy for all components within the approved MANARATAK 2.0 architecture. 

**Included Configuration Scopes:**
*   **Enterprise:** Global project-wide policies, constants, and shared baseline configurations.
*   **Environment:** Environment-specific settings (Development, Testing, Staging, Production).
*   **Platform:** Core hosting, networking, and platform-level infrastructure parameters.
*   **Application:** Application-wide behaviors, global feature toggles, and global routing.
*   **Domain:** Bounded context-specific settings and business rules configurations.
*   **Module:** Module-level parameters within a specific domain.
*   **Service:** Microservice or component-specific execution parameters.
*   **Infrastructure:** Database connection strings, message broker URIs, and caching configurations.
*   **Integration:** External third-party API keys, webhooks, and partner connection settings.
*   **Security:** Cryptographic settings, token expiration lifespans, and CORS policies.
*   **AI:** Model parameters, API endpoints, token limits, and AI inference configurations.
*   **Search:** Search index settings, weighting configurations, and query limits.
*   **Import:** Data import chunk sizes, parsing limits, and mapping configurations.
*   **Notification:** Provider settings, retry policies, and delivery thresholds.
*   **Workflow:** State machine timeouts, retry counts, and orchestrator settings.
*   **Observability:** Log levels, metrics collection intervals, and tracing thresholds.

**Excluded Configuration Sources:**
*   Dynamic user-generated content or user preference data (stored in databases).
*   Local developer workstation overrides not deployed to centralized environments.
*   Ad-hoc, undocumented scripts bypassing the CI/CD configuration injection process.

---

## 3. Configuration Principles

All configurations within MANARATAK 2.0 must strictly adhere to the following enterprise principles:

1.  **Single Source of Truth:** Every configuration item must be defined in one authoritative location. Duplication of identical configuration keys across isolated repositories is strictly prohibited.
2.  **Explicit Override Rules:** Configuration inheritance and overrides must follow a strictly defined, predictable order. Implicit or undocumented overrides are forbidden.
3.  **Least Privilege:** Applications and services must only be granted access to the configurations and secrets they explicitly require to function.
4.  **Immutable Defaults:** Base default configurations must be immutable and packaged with the application artifact. 
5.  **Environment Isolation:** Configurations for different environments (e.g., Staging vs. Production) must be strictly isolated. An environment must never reference configuration values from a different environment.
6.  **No Hardcoded Configuration:** No operational, environmental, or business configuration shall be hardcoded within the application source code.
7.  **Secure Secret Management:** Sensitive data (passwords, API keys, certificates) must never be stored in plain text or committed to version control. They must be managed by an approved enterprise secret management provider and injected securely at runtime.
8.  **Deterministic Resolution:** The final resolved configuration state of any component must be mathematically deterministic and auditable at any point in time.
9.  **Auditability:** All changes to configuration values must be tracked, versioned, and auditable through centralized source control or governance platforms.
10. **Traceability:** Every configuration item must trace back to an approved architectural requirement, domain, or ADR.

---

## 4. Configuration Hierarchy

The official MANARATAK 2.0 configuration precedence dictates how configurations are layered and overridden. Resolution occurs from the lowest priority (Base) to the highest priority (Runtime Override). The highest priority value always wins.

**Hierarchy Order (Lowest to Highest Priority):**

1.  **Enterprise Defaults (Lowest Priority):** Global fallback values defined at the organizational level (e.g., standard global timeout = 30s).
2.  **Application / Domain Defaults:** Hard-coded default values packaged within the source code or application artifact `appsettings.json` / `application.yml` (e.g., Domain-specific retry limits).
3.  **Environment Configuration:** Settings applied to a specific hosting environment via CI/CD pipelines or environment configuration files (e.g., Staging database URI). Overrides Domain Defaults.
4.  **Platform / Infrastructure Injection:** Values injected dynamically by the hosting platform (e.g., Kubernetes ConfigMaps). Overrides Environment Configuration.
5.  **Secret Store Injection:** Highly secure values injected dynamically from the Enterprise Vault/Secret Manager. Overrides all previous levels for sensitive keys.
6.  **Runtime Variables / Environment Variables (Highest Priority):** Ephemeral overrides passed directly to the execution process at startup. Used strictly for emergency operational overrides or isolated container configurations. Overrides everything.

**Conflict Resolution:**
*   If a key is defined in multiple layers, the layer with the **highest priority** dictates the final value.
*   Cross-domain overrides are strictly forbidden. Domain A cannot override Domain B's configuration.

---

## 5. Configuration Metadata Standard

Every enterprise configuration item must be documented with the following mandatory metadata:

*   **Configuration Key:** The exact string identifier of the configuration (e.g., `MANARATAK.Notification.RetryCount`). Must follow the Enterprise Naming Convention.
*   **Description:** A clear explanation of what the configuration controls.
*   **Scope:** The layer to which the configuration applies (e.g., Environment, Domain, Integration).
*   **Owner:** The specific domain or team responsible for managing the configuration.
*   **Default Value:** The base immutable fallback value.
*   **Allowed Values:** Data type, min/max ranges, or explicit enum values allowed.
*   **Environment:** Specifies if the value differs across environments (e.g., Dev/Prod).
*   **Security Classification:** Non-Sensitive, Sensitive, or Highly Classified (Secret).
*   **Validation Rules:** Rules for validating the format (e.g., Regex for URLs, Integer > 0).
*   **Version:** The version of the architecture where this key was introduced.
*   **Status:** Draft, Proposed, Approved, Active, Deprecated, or Retired.
*   **Related ADR:** The Architecture Decision Record justifying this configuration (if applicable).
*   **Related Baseline:** The project baseline where this configuration became active.

---

## 6. Configuration Lifecycle

Configuration items must follow a strict governance lifecycle:

1.  **Draft:** Initial identification of a required configuration item during development.
2.  **Proposed:** The configuration item is submitted to the Architecture Review Board (ARB) for review.
3.  **Approved:** The ARB approves the key, format, default value, and security classification.
4.  **Active:** The configuration is implemented and actively used in production environments.
5.  **Deprecated:** The configuration is slated for removal. A migration path and replacement key must be documented. The key remains functional but generates warnings.
6.  **Retired:** The configuration key is permanently removed from the architecture and will be ignored or cause a failure if used.

**Transition Rules:**
*   An item cannot move to Active without ARB approval.
*   An Active item cannot be immediately Retired; it must spend at least one release cycle in the Deprecated state.

---

## 7. Governance

Configuration management is strictly governed by the Architecture Review Board (ARB):

*   **Ownership:** Every configuration key belongs to one and only one Domain or architectural layer.
*   **Review Process:** All new configurations, or changes to default values, must be reviewed during standard architectural pull requests.
*   **Approval Authority:** The ARB holds final approval authority over the Configuration Metadata Standard and highly sensitive integrations. Domain Leads hold approval authority for Domain-specific configurations.
*   **Change Management:** Modifying an Active configuration key's name, data type, or security classification is considered a breaking change and requires an ADR.
*   **Configuration Registration Policy:** All configurations must be registered in the official Enterprise Configuration Catalog prior to deployment.
*   **Exception Handling:** Any deviation from the Configuration Hierarchy (e.g., hardcoding a value for a legacy system) requires an explicit, time-bound ARB Exception.

---

## 8. Traceability

Strict traceability must be maintained for all configurations:

*   **Domain:** The configuration key format must prefix or explicitly indicate its owning Domain (e.g., `Identity.Token.Lifetime`).
*   **ADR:** Configurations dictating major architectural behaviors (e.g., `FeatureToggle.UseNewSearchEngine`) must link directly to the authorizing ADR.
*   **Architecture Baseline:** The introduction, deprecation, or retirement of configuration keys must be documented in the corresponding Architecture Baseline release notes.
*   **Enterprise Baseline:** Enterprise-wide configurations trace back to the Unified Project Baseline.
*   **Architecture Portal:** All configurations must be automatically published or manually cataloged in the centralized Architecture Portal.

---

## 9. Official Configuration Catalog Template

All configuration items must be registered using the following standard template in the Architecture Portal:

```yaml
Configuration_Item:
  Key: "Domain.Module.SettingName"
  Description: "Detailed description of the setting."
  Scope: "Domain"
  Owner: "IdentityDomain"
  Default_Value: "30"
  Allowed_Values: "Integer, between 10 and 60"
  Environment_Specific: true
  Security_Classification: "Non-Sensitive"
  Validation_Rules: "Must be numeric."
  Version: "v1.0"
  Status: "Active"
  Related_ADR: "ADR-0045"
  Related_Baseline: "MANARATAK 2.0 - Phase 4"
```

---

## 10. Configuration Compliance Checklist

Before any release, the following criteria must be verified for compliance:

- [ ] Every configuration item has exactly one documented owner.
- [ ] The override order strictly follows the defined Enterprise Configuration Hierarchy.
- [ ] Validation rules and allowed values are explicitly defined.
- [ ] The security classification is accurate and validated.
- [ ] A fallback/default value exists and is immutable within the artifact.
- [ ] Traceability to domains, ADRs, and Baselines is complete.
- [ ] Governance approval (ARB or Domain Lead) exists for the configuration item.
- [ ] Absolutely no hardcoded configuration exists within the application source code.
- [ ] Secret handling complies entirely with the enterprise security policy (no secrets in plain text).
- [ ] The lifecycle status of the configuration item is documented and accurate.
