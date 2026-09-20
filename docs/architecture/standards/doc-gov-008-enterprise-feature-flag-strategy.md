# MANARATAK 2.0: Enterprise Feature Flag Strategy

## 1. Purpose

The Enterprise Feature Flag Strategy defines the official, unified approach for defining, managing, and retiring feature flags across the MANARATAK 2.0 platform. Feature flags (or toggles) are a critical mechanism for controlled rollout, experimentation, operational safety, and decoupling deployment from release. This strategy ensures that feature flags are used consistently, governed properly, and retired when no longer needed to prevent technical debt and operational ambiguity.

## 2. Scope

This strategy governs the use of feature flags across all components within the approved MANARATAK 2.0 architecture.

**Covered Areas:**
*   **Enterprise Features:** Global capabilities spanning multiple domains.
*   **Platform Features:** Core hosting, networking, and foundational infrastructure capabilities.
*   **Domain Features:** Business capabilities within specific bounded contexts.
*   **Module Features:** Sub-components within a specific domain.
*   **API Features:** Endpoints, routing rules, and API versioning controls.
*   **AI Features:** Model rollouts, inference paths, and AI capability toggles.
*   **Search Features:** Indexing strategies, weighting algorithms, and search UI components.
*   **Import Features:** Ingestion pipelines, parsing rules, and mapping toggles.
*   **Workflow Features:** State machine transitions, orchestrator steps, and retry logic.
*   **Notification Features:** Delivery channels, provider rollouts, and notification templates.
*   **Infrastructure Features:** Database migrations, cache providers, and messaging topologies.

**Excluded Use Cases:**
*   Application configuration (e.g., timeouts, connection strings) which are governed by the Enterprise Configuration Hierarchy Standard.
*   Role-based access control (RBAC) and user permissions that are part of the core authorization model, unless gating a completely new capability during rollout.
*   Dynamic user preferences stored in a database.

## 3. Feature Flag Principles

1.  **Temporary by Default:** Feature flags are technical debt. They must have an explicit expiration date and a plan for removal.
2.  **Business Justification:** Every flag must have a clear business or operational reason for existing (e.g., canary release, A/B testing, kill switch).
3.  **Single Ownership:** Every flag must be owned by exactly one Domain or architectural layer responsible for its lifecycle.
4.  **Explicit Lifecycle:** Flags must progress through a defined lifecycle from Draft to Removed.
5.  **No Permanent Flags:** Flags must not be used as a substitute for permanent configuration or role-based access control. (Exceptions are long-lived Operational/Emergency flags, which still require periodic review).
6.  **Safe Rollback:** The system must behave predictably and safely when a flag is disabled or rolled back.
7.  **Auditability:** All changes to flag states must be tracked, versioned, and auditable.
8.  **Traceability:** Every flag must trace back to an approved architectural requirement, domain, or ADR.
9.  **Least Privilege:** Flags should be scoped as narrowly as possible (e.g., to a specific tenant, user segment, or environment) during rollout.
10. **No Hidden Behavior:** Flag behavior must be explicitly documented; implicit or undocumented flag dependencies are prohibited.

## 4. Feature Flag Classification

Feature flags are classified based on their purpose and expected lifespan:

*   **Release Flags:** Used to decouple deployment from release. Allows code to be deployed to production but hidden until ready. Lifespan: Short (Days/Weeks).
*   **Operational Flags (Kill Switches):** Used to disable non-critical functionality during system degradation or incidents (e.g., disabling a heavy background job). Lifespan: Long (Months/Years, subject to ARB review).
*   **Experimental Flags:** Used for A/B testing or multivariate testing to validate business hypotheses. Lifespan: Medium (Weeks/Months).
*   **Permission Flags:** Used to grant early access to specific users or tenants (e.g., Beta programs) before general availability. Lifespan: Medium (Weeks/Months).
*   **Migration Flags:** Used to safely transition between two systems, databases, or API versions (e.g., dual-write toggles). Lifespan: Medium (Weeks/Months).
*   **Emergency Flags:** Rapidly introduced flags to mitigate a live production issue without requiring a full code deployment. Lifespan: Short (Days).

## 5. Feature Flag Metadata Standard

Every enterprise Feature Flag must be documented with the following mandatory metadata:

*   **Flag Name:** The exact string identifier (e.g., `enable-new-search-engine`). Must follow the Enterprise Naming Convention.
*   **Description:** Clear explanation of what the flag controls and its business/operational impact.
*   **Category:** Release, Operational, Experimental, Permission, Migration, or Emergency.
*   **Owner:** The specific domain or team responsible for managing the flag.
*   **Scope:** The layer to which the flag applies (e.g., Environment, Domain, Global).
*   **Default State:** The base state of the flag (usually `false` or `off`) if the evaluation engine fails or the flag is undefined.
*   **Allowed States:** Boolean (true/false), Multivariate (string/number), or JSON payload.
*   **Creation Date:** When the flag was introduced.
*   **Expiration Date:** The mandatory date by which the flag must be retired and removed from the codebase.
*   **Status:** Draft, Proposed, Approved, Active, Deprecated, or Removed.
*   **Rollout Strategy:** How the flag will be enabled (e.g., 10% canary, specific tenants, all users).
*   **Rollback Strategy:** The exact operational steps and system impact if the flag is disabled after being enabled.
*   **Related ADR:** The Architecture Decision Record justifying this flag (if applicable).
*   **Related Baseline:** The project baseline where this flag became active.

## 6. Lifecycle

Feature flags must follow a strict governance lifecycle:

1.  **Draft:** Initial identification of a required flag during development.
2.  **Proposed:** The flag metadata is submitted to the Architecture Review Board (ARB) or Domain Lead for review.
3.  **Approved:** The flag, its default state, rollout strategy, and expiration date are approved.
4.  **Active:** The flag is implemented and actively evaluated in production environments.
5.  **Deprecated:** The flag's purpose has been fulfilled (e.g., 100% rollout achieved). It is slated for removal in the next deployment cycle.
6.  **Removed:** The flag and all associated conditional logic have been completely excised from the codebase.

**Retirement Requirements:**
*   An Active flag that reaches its Expiration Date must automatically enter the Deprecated state.
*   Extensions to the Expiration Date require ARB approval.

## 7. Governance

Feature Flag management is governed by the Architecture Review Board (ARB):

*   **Ownership:** Every flag belongs to one and only one Domain or architectural layer.
*   **Review Process:** New flags and their expiration dates must be reviewed during standard architectural pull requests.
*   **Approval Authority:** Domain Leads hold approval authority for Domain-specific flags. The ARB holds approval authority for Global/Enterprise flags and Operational (long-lived) flags.
*   **Change Management:** Modifying a flag's evaluation rules in production requires standard operational change approval. Removing a flag requires a code deployment.
*   **Registration Policy:** All flags must be registered in the official Enterprise Feature Flag Catalog prior to deployment.
*   **Exception Handling:** Any extension to a flag's lifespan requires an explicit ARB Exception.

## 8. Traceability

Strict traceability must be maintained for all Feature Flags:

*   **Domain:** The flag format must explicitly indicate its owning Domain (e.g., `identity-mfa-migration`).
*   **ADR:** Flags dictating major architectural migrations (e.g., database transitions) must link directly to the authorizing ADR.
*   **Architecture Baseline:** The introduction and removal of flags must be documented in the corresponding Architecture Baseline release notes.
*   **Enterprise Baseline:** Enterprise-wide flags trace back to the Unified Project Baseline.
*   **Architecture Portal:** All flags must be automatically published or manually cataloged in the centralized Architecture Portal.

## 9. Official Feature Flag Catalog Template

All feature flags must be registered using the following standard template:

```yaml
Feature_Flag:
  Flag_Name: "domain-module-feature-name"
  Description: "Detailed description of the feature and its impact."
  Category: "Release Flag"
  Owner: "IdentityDomain"
  Scope: "Domain"
  Default_State: "false"
  Allowed_States: "Boolean"
  Creation_Date: "2023-10-25"
  Expiration_Date: "2023-11-25"
  Status: "Active"
  Rollout_Strategy: "Canary rollout, starting at 10% of traffic."
  Rollback_Strategy: "Disable flag via control plane. Reverts to legacy authentication flow. No data loss expected."
  Related_ADR: "ADR-0050"
  Related_Baseline: "MANARATAK 2.0 - Phase 4"
```

## 10. Compliance Checklist

Before any release, the following criteria must be verified:

- [ ] Every Feature Flag has exactly one documented owner.
- [ ] The flag category (Release, Operational, etc.) is documented.
- [ ] A clear, actionable rollout strategy exists.
- [ ] A safe, tested rollback strategy exists.
- [ ] An explicit expiration date exists and is justified.
- [ ] Traceability to domains, ADRs, and Baselines is complete.
- [ ] The lifecycle status of the flag is documented and accurate.
- [ ] Governance approval (ARB or Domain Lead) exists.
- [ ] No permanent, undocumented Feature Flags exist in the codebase.
- [ ] A default state is defined to handle evaluation engine failures.
