# MANARATAK 2.0
# Enterprise Transactional Outbox
# Post-Propagation Risk Assessment
# Final Risk Closure Review

## 1. Executive Summary
The Architecture Review Board (ARB) has conducted a final enterprise risk assessment for the Transactional Outbox strategy (P0-4). The assessment focused on the architectural, operational, and governance implications of propagating the Outbox Baseline across Phases 07–13. The Outbox successfully mitigates the critical dual-write and data loss vulnerabilities. Remaining risks are primarily operational (e.g., table growth, polling latency) and require standard engineering diligence during implementation rather than architectural redesign. No critical blockers remain.

## 2. Risk Register

### 2.1 Critical Risks
*(None. The baseline explicitly mitigates critical architectural risks like permanent data loss.)*

### 2.2 High Risks

**Risk ID:** RSK-OUT-001
**Risk Name:** Consumer Idempotency Failures
**Description:** Downstream consumers fail to implement proper idempotency, leading to duplicate processing (e.g., sending two emails) when the Outbox Relay or Message Broker retries delivery.
**Root Cause:** "At-Least-Once" delivery semantics inherently produce duplicates during network timeouts or dispatcher restarts.
**Likelihood:** Medium
**Impact:** High
**Current Mitigation:** The baseline mandates consumer idempotency.
**Recommended Mitigation:** Provide a centralized Idempotency SDK/Library for consumer microservices to simplify deduplication using `MessageId`.
**Residual Risk:** Low
**Status:** Requires Action

**Risk ID:** RSK-OUT-002
**Risk Name:** Dispatcher Concurrency Conflicts
**Description:** Multiple instances of the Outbox Dispatcher lock the same rows, causing database deadlocks or duplicate dispatching.
**Root Cause:** Horizontal scaling of the polling background worker without proper partition locking.
**Likelihood:** Medium
**Impact:** High
**Current Mitigation:** The operational specification mandates partitioned locking (e.g., `SKIP LOCKED` in PostgreSQL).
**Recommended Mitigation:** Mandate load testing of the dispatcher cluster under peak volume prior to production release.
**Residual Risk:** Low
**Status:** Accepted

### 2.3 Medium Risks

**Risk ID:** RSK-OUT-003
**Risk Name:** Outbox Table Bloat
**Description:** The `OutboxMessages` table grows indefinitely, degrading database insertion and polling performance over time.
**Root Cause:** High volume of events coupled with an ineffective or disabled cleanup service.
**Likelihood:** High
**Impact:** Medium
**Current Mitigation:** The baseline specifies a Cleanup Service and archiving policy.
**Recommended Mitigation:** Implement database partitioning on the `OutboxMessages` table (e.g., partitioned by date) to allow fast dropping of old partitions. Configure alerts for table size thresholds.
**Residual Risk:** Low
**Status:** Requires Action

**Risk ID:** RSK-OUT-004
**Risk Name:** Polling Latency and Database Contention
**Description:** The Dispatcher introduces latency between the transaction commit and event publication, and aggressive polling stresses the primary database.
**Root Cause:** Polling interval configuration and relational database I/O limits.
**Likelihood:** Medium
**Impact:** Medium
**Current Mitigation:** Polling strategy defined; CDC recommended for high-throughput domains.
**Recommended Mitigation:** Monitor Dispatcher Lag via Grafana. Formally evaluate Debezium (CDC) for Phase 13 (Learning Platform) prior to scaling.
**Residual Risk:** Medium
**Status:** Requires Action

### 2.4 Low Risks

**Risk ID:** RSK-OUT-005
**Risk Name:** Poison Message Accumulation
**Description:** A malformed payload constantly fails processing, eventually filling the Dead Letter Queue (DLQ).
**Root Cause:** Schema mismatch or serialization errors between publisher and broker.
**Likelihood:** Low
**Impact:** Low
**Current Mitigation:** DLQ routing and alerting policy defined in the baseline.
**Recommended Mitigation:** Maintain operational runbooks for DLQ payload patching and requeuing.
**Residual Risk:** Low
**Status:** Accepted

## 3. Accepted Risks
- **RSK-OUT-002**: Dispatcher Concurrency Conflicts (Mitigated by database-level locking).
- **RSK-OUT-005**: Poison Message Accumulation (Mitigated by DLQ policies).

## 4. Risks Requiring Future Backlog Items
- **RSK-OUT-001**: Develop Enterprise Idempotency Library/SDK.
- **RSK-OUT-003**: Implement Table Partitioning for `OutboxMessages`.
- **RSK-OUT-004**: Evaluate CDC (Debezium) for high-throughput domains.

## 5. Risks Blocking P0-4 Closure
*(None identified.)*

## 6. Final Recommendation
The Enterprise Transactional Outbox Baseline successfully resolves the core architectural contradictions associated with distributed event publishing. The remaining risks are well understood, actively mitigated by the specification, and addressable via standard operational backlog items.

P0-4 Enterprise Transactional Outbox is approved for final closure.
