# MANARATAK 2.0: Phase 5.17 Security Architecture Baseline

## Architecture Design Baseline Report

**Status:** APPROVED  
**Revision:** 5.17.0  
**Phase:** 5.17  
**Architecture Baseline:** FROZEN  
**Date:** 2026-07-16

---

## 1. Vision

To establish a provider-neutral, logical Single Source of Truth (SSoT) for security governance across MANARATAK 2.0. The Security Foundation provides a unified framework for defining security intents, policies, and rules, separating the "declaration of security requirements" from the "technical enforcement of security controls."

## 2. Purpose

The Security Foundation governs the logical modeling of security policies. It provides a consistent referencing mechanism (`SecurityPolicyReference`) for all bounded contexts to declare their security needs without coupling to specific authentication protocols, authorization engines, or encryption technologies. Business domains must reference Security Policies exclusively through `SecurityPolicyReference`. `SecurityPolicyId` remains strictly internal.

## 3. Scope

### 3.1 In-Scope

- **Logical Security Modeling:** Defining the abstract structure and intent of security policies.
- **Security Policy Identity & Referencing:** Global identification via immutable references (`SecurityPolicyReference`).
- **Security Rule Definition:** Modeling abstract rules that constitute a policy.
- **Security Classification:** Modeling logical security levels (e.g., PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED).
- **Security Version Management:** Semantic versioning of security definitions.
- **Security Lifecycle Governance:** Managing the lifecycle states of the security policy definition (e.g., Created, Activated, Archived).
- **Security Ownership Assignment:** Neutral referencing of security owners via `SecurityOwnerReference`.
- **Security Metadata:** Abstract structural metadata for policy enrichment intent.

### 3.2 Out-of-Scope (The Platform Must Never Know)

- **Authentication & Credential Validation:** No knowledge of login flows, identity providers, or verification of credentials.
- **Authorization Enforcement:** No knowledge of permission checks, access control execution (RBAC/ABAC), or runtime authorization data.
- **Encryption & Secret Management:** No knowledge of cryptographic algorithms, key management, vaults, or secret values.
- **Network & Runtime Security:** No knowledge of firewalls, WAFs, network security protocols, or runtime security state.
- **Infrastructure Security:** No knowledge of infrastructure-level policies.

Actual authentication, authorization, encryption, credential validation, secret management, access enforcement, and runtime security belong exclusively to Infrastructure.

## 4. Bounded Context

The Security Foundation operates as a **Generic Subdomain**. It provides the governance framework that other Bounded Contexts (Core and Supporting) utilize to reference authorized security behaviors. It does not contain business rules for specific entities like Students or Scholarships, but rather the abstract security containers those entities use.

---

## 5. Domain Model

### 5.1 Aggregate Roots

#### 5.1.1 SecurityPolicy

The Aggregate Root representing a logical security governing entity.

- **SecurityPolicyReference:** Official, immutable cross-context reference Value Object.
- **SecurityOwnerReference:** Provider-neutral owner identifier Value Object.
- **SecurityPolicyDefinition:** Immutable blueprint of the security intent.
- **SecurityRuleDefinition:** Immutable collection of logical rules governing the policy.
- **SecurityClassification:** Immutable declaration of logical sensitivity levels.
- **SecurityMetadata:** Immutable logical annotations for policy intent.
- **SecurityVersion:** Immutable semantic version of the policy.
- **SecurityLifecycle:** The current governing state of the security policy itself.
- **SecurityIntent:** Logical declaration of why the security requirement exists.

**Mandatory Purity Rules:**
SecurityPolicy must never contain:

- Business entities (Students, Users, etc.).
- Credentials, passwords, or identity information.
- Authentication tokens or authorization data.
- Encryption material (keys, certificates, etc.).
- Secret values or vault paths.
- Runtime security state or infrastructure execution details.

### 5.2 Value Objects

- **SecurityPolicyReference:** The exclusive cross-context identifier. All external layers must use this reference.
- **SecurityOwnerReference:** A generic abstraction for policy ownership. The Security Foundation must never own business entities. Every SecurityPolicy references its logical owner only through this generic Value Object. The platform must never understand the business meaning of the owner.
- **SecurityPolicyDefinition:** Permanently immutable declaration of policy purpose, scope, and structural intent.
- **SecurityRuleDefinition:** Permanently immutable declaration of logical "allow/deny" intents or "requirement" markers.
- **SecurityClassification:** Permanently immutable declaration of logical sensitivity (e.g., PUBLIC, CONFIDENTIAL).
- **SecurityVersion:** Permanently immutable semantic structural version (Major, Minor, Patch).
- **SecurityMetadata:** Map-based logical annotations for enrichment without infrastructure leakage.

### 5.3 Enums

- **SecurityLifecycleState:**
  - `CREATED`: Policy registered but not yet active.
  - `ACTIVATED`: Policy is official and available for cross-context referencing.
  - `DEPRECATED`: Policy remains available but its use is discouraged.
  - `ARCHIVED`: Policy is logically retired.

---

## 6. Domain Services

- **SecurityPolicyValidationService:** Ensures a security policy is logically sound and consistent with enterprise governance rules.
- **SecurityLifecycleService:** Orchestrates logical transitions between lifecycle states based on core domain rules.

## 7. Repository Contracts

Repositories must follow the **Specification Pattern** exclusively. No repository-specific lookup methods are permitted.

- **ISecurityPolicyRepository:**
  - `save(policy: SecurityPolicy): Promise<void>`
  - `findBy(specification: ISpecification<SecurityPolicy>): Promise<SecurityPolicy[]>`

---

## 8. Business Rules

- **Identity Secrecy:** External contexts must never expose or utilize the internal `SecurityPolicyId`.
- **Definition Immutability:** Once a `SecurityPolicyDefinition` or `SecurityRuleDefinition` is assigned to a `SecurityVersion`, it can never be changed.
- **Versioning Requirement:** Any modification to a policy's intent or rules requires the creation of a completely new `SecurityPolicy` aggregate with a new version.
- **Owner Neutrality:** Owners are treated as opaque identifiers; the foundation carries no business logic regarding specific business domains.
- **Lifecycle Integrity:** Transitions must follow authorized paths managed by the `SecurityLifecycleService`.

---

## 9. Domain Events

Events are restricted to business-significant lifecycle transitions only.

- **SecurityPolicyCreatedEvent:** Dispatched when a new security policy is registered.
- **SecurityPolicyActivatedEvent:** Dispatched when a policy becomes official and active.
- **SecurityVersionPublishedEvent:** Dispatched when a new version of a security policy is published.
- **SecurityPolicyDeprecatedEvent:** Dispatched when a policy is marked as deprecated.
- **SecurityPolicyArchivedEvent:** Dispatched when a policy is logically retired.

Operational events related to authentication, authorization, credential validation, encryption, secret management, identity providers, network security, or infrastructure enforcement are strictly forbidden.

---

## 10. Architecture Decision Records (ADR)

### ADR-1: Provider Neutrality

- **Decision:** The Domain and Application layers shall contain absolutely no references to security protocols, identity providers, or encryption libraries.
- **Rationale:** To maintain absolute decoupling from the technical security landscape and infrastructure-specific security services.

### ADR-2: Security Ownership

- **Decision:** Security policies are owned by logical organizational references via `SecurityOwnerReference`.
- **Rationale:** Decouples security governance from specific business entities or infrastructure-level access controls.

### ADR-3: Security Definition Immutability

- **Decision:** `SecurityPolicyDefinition`, `SecurityRuleDefinition`, and `SecurityVersion` are permanently immutable.
- **Rationale:** Any modification requires the creation of a completely new `SecurityPolicy` aggregate. This ensures reference stability and a definitive audit trail for security governance.

### ADR-4: Security Lifecycle Ownership

- **Decision:** The Domain owns ONLY the logical lifecycle of security policies.
- **Rationale:** Physical authentication, authorization, encryption, secret management, credential validation, access enforcement, and runtime security belong exclusively to Infrastructure.

### ADR-5: Security Boundary

- **Decision:** The Domain defines ONLY logical security intent.
- **Rationale:** Actual security enforcement (credential validation, access control evaluation, data encryption) remains entirely outside the Domain boundary to maintain layer isolation and provider neutrality.

### ADR-6: Classification Boundary

- **Decision:** The Domain defines only the **logical security classifications**. The mapping to infrastructure-specific controls belongs to the Infrastructure layer.
- **Rationale:** Ensures the domain remains focused on semantic governance rather than technical implementation details of sensitivity levels.

### ADR-7: Versioning Boundary

- **Decision:** Every change to security definitions requires a new immutable security version.
- **Rationale:** Supports enterprise-scale compliance and auditability by ensuring every policy state is uniquely identifiable.

---

## 11. Architectural Constraints

- **Dependency Rule:** `Domain <- Application <- Infrastructure <- API`.
- **Identifier Secrecy:** The `SecurityPolicyId` must never leak across context boundaries.
- **Zero Infrastructure Dependency:** No third-party security or identity types are permitted in the Domain.

## 12. Risks & Recommendations

- **Risk:** Developers might attempt to bake specific roles or permissions into the domain rules.
- **Recommendation:** Use the `SecurityRuleDefinition` as a generic container for intent, and ensure the Infrastructure layer is responsible for mapping these to actual roles/permissions.
- **Risk:** Confusion between a "Policy Definition" (logical) and a "Policy Enforcement Point" (technical).
- **Recommendation:** Maintain strict nomenclature—the foundation manages the "Policy Definition"; the infrastructure implements the "Enforcement Point."

---

## 13. Official ARB Approval & Certification

### Final Architecture Review & Certification

The Architecture Review Board (ARB) has completed the final review of the **Enterprise Security Foundation** architecture and certifies that:

- **Logical Identity:** `SecurityPolicyReference` is the official cross-context reference. `SecurityPolicyId` remains strictly internal.
- **Ownership Abstraction:** `SecurityOwnerReference` is the exclusive abstraction for referencing external ownership.
- **Aggregate Integrity:** `SecurityPolicy` contains only provider-neutral metadata, immutable definitions, classifications, versions, lifecycle metadata, and logical security intent.
- **Absolute Immutability:** `SecurityPolicyDefinition`, `SecurityRuleDefinition`, and `SecurityVersion` are permanently immutable. Any modification requires a new `SecurityPolicy`.
- **Clear Separation:** Security Definition is completely separated from Security Enforcement. The Domain defines logical intent; Infrastructure performs physical enforcement (authentication, authorization, encryption, etc.).
- **Pattern Compliance:** Repository contracts follow the Specification Pattern. Domain Events are restricted to business-significant transitions.
- **Provider Neutrality:** The platform contains no infrastructure assumptions or vendor-specific terminology.

---

## 14. Official ARB Decision

```
================================================================================
                       OFFICIAL ARB DECISION: APPROVED
================================================================================
Phase:                  5.17 — Enterprise Security Foundation
Revision:               5.17.0
Status:                 APPROVED
Architecture Baseline:  FROZEN
================================================================================
```

The Enterprise Security Foundation Architecture is hereby declared the permanent **Architecture Baseline** for Phase 5.17.

No further architectural modifications, redesigns, structural changes, feature additions, or scope expansions are permitted unless initiated through a formal Architecture Review Board (ARB) Change Request approved by the Project Owner.

---

## 15. Phase 06 Import Foundation Integration Note

- **Import Security Policies:** Security Foundation governs logical policy structures (`SecurityPolicy`, `SecurityRuleDefinition`, `SecurityClassification`) used for SSRF mitigation, file upload safety, and protected source access control.
- **Ownership Boundary:** Security Foundation defines logical policy models and classification rules only. Phase 06 Import Foundation enforces file intake safety and source connector authorization within its own import pipeline.

---

### Navigation

- **Previous**: [Phase 5.16 Logging Implementation Baseline](../Logging/phase-05-16-logging-implementation-baseline.md)
- **Next**: [Phase 5.17 Security Implementation Baseline](phase-05-17-security-implementation-baseline.md)
