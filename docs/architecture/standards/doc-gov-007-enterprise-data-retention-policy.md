# MANARATAK 2.0: Enterprise Data Retention Policy

## 1. Purpose

The Enterprise Data Retention Policy defines the official, unified approach for the classification, retention, archival, protection, disposal, and governance of all data within the MANARATAK 2.0 platform. 

This policy exists to ensure:
*   **Governance:** Enforcing strict, authorized ownership and lifecycle management for all data assets.
*   **Auditability:** Providing a clear, verifiable record of data retention practices for compliance and regulatory purposes.
*   **Compliance:** Meeting all required legal, industry, and organizational data handling requirements.
*   **Operational Efficiency:** Preventing unbounded database growth and optimizing query performance by retiring stale data.
*   **Storage Optimization:** Reducing infrastructure costs by moving rarely accessed data to cold storage tiers.
*   **Security:** Minimizing the attack surface by actively disposing of sensitive data that is no longer required.
*   **Business Continuity:** Ensuring critical data is retained and recoverable according to defined service level agreements (SLAs).

## 2. Scope

This policy governs all data managed within the approved MANARATAK 2.0 architecture.

**Covered Data Categories:**
*   **Domain Data:** Core transactional and business entity data managed by specific bounded contexts.
*   **Reference Data:** Taxonomies, lookup tables, and static system data (e.g., from Phase 7).
*   **User Data:** Identity profiles, authentication records, and user preferences.
*   **CMS Data:** Content, media assets, and localized text.
*   **Import Data:** Raw ingestion files, intermediate transformation states, and import history.
*   **Search Data:** Search indexes, cached query results, and search analytics.
*   **AI-related Data:** Prompts, completions, vector embeddings, and training telemetry.
*   **Workflow Data:** State machine instances, orchestrator payloads, and execution history.
*   **Notification Data:** Delivery logs, message templates, and read receipts.
*   **Audit Data:** Security audit logs, user activity trails, and system change records.
*   **Logs:** Application logs, infrastructure metrics, and distributed traces.
*   **Backups:** Database snapshots, disaster recovery replicas, and volume backups.
*   **Configuration Metadata:** Historical configuration states and deployment manifests.

**Excluded Data:**
*   Ephemeral in-memory data that is never persisted to disk.
*   Third-party data that is strictly pass-through and not retained or cached within the MANARATAK boundary.

## 3. Data Classification

Data retention is classified into the following official enterprise categories:

*   **Permanent:** Data that must be kept indefinitely for the lifetime of the system (e.g., Core Reference Data, immutable historical ledgers). Governance: Highest level of protection and redundancy.
*   **Long-Term:** Data retained for compliance, legal, or deep historical analysis (e.g., 7-year financial audit logs). Governance: Moved to cold/archive storage after active period.
*   **Medium-Term:** Standard operational data required for ongoing business processes (e.g., active user profiles, recent import histories). Governance: Stored in active operational databases.
*   **Short-Term:** Transient data used for temporary processing, debugging, or caching (e.g., application logs (30 days), temporary search indexes). Governance: Aggressive automated cleanup/TTL.
*   **Ephemeral:** Highly transient data that exists only for the duration of a specific session or request (e.g., temporary upload chunks, cache entries). Governance: Automated deletion upon process completion or strict short TTL.

## 4. Retention Standard

Every retained data category must be documented with the following mandatory metadata:

*   **Data Category:** The name of the data set or entity (e.g., `Audit.SecurityLogs`).
*   **Description:** Clear explanation of what the data represents.
*   **Classification:** Permanent, Long-Term, Medium-Term, Short-Term, or Ephemeral.
*   **Owner:** The specific domain or team responsible for the data.
*   **Retention Period:** The exact duration the data must be kept (e.g., 90 Days, 7 Years, Indefinite).
*   **Archive Policy:** The process for moving data from hot/active storage to cold/archive storage (e.g., Move to cold storage after 1 year).
*   **Disposal Policy:** The specific mechanism for destroying the data at the end of its retention period (e.g., Hard delete, cryptographic erasure).
*   **Recovery Requirements:** Required RTO (Recovery Time Objective) and RPO (Recovery Point Objective).
*   **Security Classification:** Public, Internal, Confidential, or Restricted.
*   **Related ADR:** The Architecture Decision Record justifying the retention strategy (if applicable).
*   **Related Baseline:** The project baseline where this policy was established.
*   **Status:** Draft, Active, Deprecated, or Retired.

## 5. Lifecycle

Data retention policies follow a defined lifecycle:

*   **Created:** The policy is defined and data begins accumulating under its rules.
*   **Active:** The data is within its primary operational retention window.
*   **Archived:** The data has exceeded its active window and is moved to cheaper, read-only storage according to the Archive Policy.
*   **Scheduled for Disposal:** The data has reached the absolute end of its retention period and is queued for automated destruction.
*   **Disposed:** The data has been permanently and verifiably destroyed according to the Disposal Policy.

## 6. Governance

Data Retention is strictly governed by the Architecture Review Board (ARB) and Data Governance leads:

*   **Ownership:** Every data category belongs to one and only one Domain. The Domain Lead is accountable for enforcing retention.
*   **Review Process:** Retention metadata must be defined and reviewed during the architectural design of any new feature or domain.
*   **Approval Authority:** The ARB approves the overall policy. Domain Leads approve Medium/Short-Term data rules. Legal/Compliance approval is required for Long-Term and Permanent data policies.
*   **Change Management:** Modifying a retention period (especially reducing it) requires an ADR and formal ARB approval.
*   **Exception Process:** Legal holds or specific compliance exceptions require a formal override documented and approved by the ARB.

## 7. Traceability

Strict traceability must be maintained for all data retention rules:

*   **Domain:** The policy must explicitly map to the owning bounded context.
*   **ADR:** Critical storage architectural choices (e.g., choosing a cold storage vendor, defining compliance boundaries) must link to an ADR.
*   **Architecture Baseline:** Changes to retention policies must be noted in baseline release notes.
*   **Enterprise Baseline:** The overarching policy aligns with the Unified Project Baseline.
*   **Architecture Portal:** The complete Data Retention Catalog must be published in the Architecture Portal.

## 8. Official Data Retention Catalog Template

All data retention rules must be registered using the following standard template:

```yaml
Data_Retention_Rule:
  Data_Category: "Domain.EntityName"
  Description: "Detailed description of the data being retained."
  Classification: "Long-Term"
  Owner: "AuditDomain"
  Retention_Period: "7 Years"
  Archive_Policy: "Move to cold object storage after 12 months."
  Disposal_Policy: "Automated hard delete script running monthly. Cryptographic erasure."
  Recovery_Requirements: "RTO: 24 hours. RPO: 1 hour."
  Security_Classification: "Restricted"
  Related_ADR: "ADR-0034"
  Related_Baseline: "MANARATAK 2.0 - Phase 4"
  Status: "Active"
```

## 9. Compliance Checklist

Before any domain or feature is approved for production, the following criteria must be verified:

- [ ] Every data category has exactly one documented owner.
- [ ] A specific, measurable Retention Period exists.
- [ ] An explicit Archive Policy exists (or is explicitly noted as N/A).
- [ ] An explicit, automated Disposal Policy exists.
- [ ] The Security Classification is accurate and matches enterprise security standards.
- [ ] Recovery Requirements (RTO/RPO) are defined.
- [ ] Traceability to ADRs and Baselines is complete.
- [ ] Governance approval (ARB, Domain Lead, Compliance) exists for the retention rule.
- [ ] The lifecycle of the policy itself is documented.
