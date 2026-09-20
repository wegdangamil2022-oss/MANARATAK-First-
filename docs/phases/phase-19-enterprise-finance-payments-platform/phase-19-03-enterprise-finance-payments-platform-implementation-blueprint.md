# MANARATAK 2.0: Phase 19 (Enterprise Finance & Payments Platform) Enterprise Implementation Blueprint

**Document ID:** PHASE-19-03-IMPL-BLUEPRINT
**Status:** Baselined Architecture Specification
**Phase:** 19
**Domain:** Enterprise Finance & Payments
**Artifact:** Part C - Implementation Guide

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.
> **Note:** This phase acts as the Single Source of Truth for all financial capabilities, enforcing absolute transactional integrity across the enterprise.

---

## 19.C.1 Implementation Overview & ADR-025 Stack Alignment

**Architectural Commentary**
The Enterprise Finance & Payments Platform (Phase 19) requires the highest degree of implementation rigor within MANARATAK 2.0. Unlike informational domains, errors here result in direct financial loss or regulatory non-compliance. This Implementation Blueprint translates the architectural contracts into concrete structural guidelines, ensuring all financial states, from billing to international cross-border settlements, are executed with atomic precision, immutable auditing, and strict consistency.

In accordance with enterprise **ADR-025 Technology Stack Standardization**, Phase 19 is implemented on the standard Node.js / TypeScript stack:
- **Language / Runtime:** TypeScript (Node.js LTS, ES Modules)
- **Web & API Framework:** Express.js with Zod runtime validation
- **Persistence & ORM:** PostgreSQL with Prisma ORM (exact `Decimal` / `BigInt` monetary storage)
- **Asynchronous Queues:** BullMQ with Redis for background settlements and reconciliation
- **Observability:** OpenTelemetry with Pino structured JSON logging
- **Testing:** Vitest for unit, integration, and contract tests

---

## 19.C.2 Implementation Principles

**Architectural Commentary**
These principles govern the physical coding and structural decisions for Phase 19 engineers.

1.  **Immutability First:** Financial records (transactions, invoices, receipts) are strictly append-only. Modifying historical data is physically prohibited; all adjustments MUST be executed via compensating transactions (e.g., Credit Notes, Refunds).
2.  **Absolute Multi-Currency & Money Precision:** No numeric amount can exist in memory or storage without its associated ISO 4217 currency code and safe minor-unit representation (`MoneyAmount`). Implementations MUST prevent arithmetic operations between differing currencies without explicit conversion and must never use floating-point numbers for financial values.
3.  **Atomic Transactions:** Workflows involving multiple ledger entries (e.g., deducting a wallet and paying an invoice) MUST execute within a single transactional boundary to prevent phantom balances.
4.  **Strict State Machines:** Workflows (like Money Transfers) MUST enforce linear, predefined state transitions. Bypassing an approval step must be structurally impossible.
5.  **Zero Trust Execution:** Every command modifying financial state MUST undergo rigorous RBAC/ABAC authorization checks, often requiring dual-approval mechanisms.

---

## 19.C.3 Implementation Layers & Folder Structure

**Architectural Commentary**
The platform strictly adheres to the enterprise Clean Architecture blueprint, guaranteeing that financial business rules remain completely isolated from infrastructure, APIs, and external banking dependencies.

```text
src/
├── domain/                  # Core financial aggregates, ledgers, events, and MoneyAmount value objects
│   ├── models/
│   ├── contracts/
│   └── events/
├── application/             # CQRS commands, use cases, workflow handlers, and calculation engines
│   ├── services/
│   ├── use-cases/
│   └── dto/
├── infrastructure/          # Payment Gateway ACLs, Prisma/PostgreSQL DB context, BullMQ/Redis queues
│   ├── db/                  # Prisma models & schema
│   ├── queues/              # BullMQ queue processors & job definitions
│   ├── gateways/            # Stripe, PayPal, banking ACL
│   └── telemetry/           # OpenTelemetry & structured JSON logging (Pino)
├── api/                     # Express.js REST controllers, Zod validation, authentication middleware
│   ├── controllers/
│   ├── middleware/
│   └── routes/
└── workers/                 # Asynchronous settlements, recurring installments, report generation
    └── transfer-processor.ts
```

---

## 19.C.4 Module Organization

**Architectural Commentary**
The platform is internally divided into highly cohesive, loosely coupled modules to manage the immense complexity of international finance.

- **Billing Module:** Orchestrates Quotes, Invoices, Receipts, and Refunds.
- **Payments Module:** Interfaces with external gateways, tracks payment attempts, and handles callbacks.
- **Wallet Module:** Manages stored value accounts, top-ups, and balance holds.
- **Money Transfer Module:** Executes the heavy orchestration of cross-border capital movement.
- **Exchange Rate Module:** Maintains the canonical repository of current and historical conversion rates.
- **Commission Module:** Calculates referral and recruiter commission payouts based on successful financial events. *(Note: Phase 19 calculates and settles financial commissions based on external recipient references, but does NOT manage or own partner relationships, employers, organizations, agents as business entities, or B2B contracts.)*
- **Financial Reporting Module:** Aggregates ledger data into operational and executive analytics.
- **Financial Estimation Engine:** Projects complex, multi-variable costs into unified estimates.
- **Approval Workflow Module:** Enforces Maker-Checker logic and administrative sign-offs.

---

## 19.C.5 CQRS & Internal Communication Blueprint

**Architectural Commentary**
Phase 19 utilizes strict Command Query Responsibility Segregation (CQRS) via the Mediator pattern to decouple read-heavy operations (like checking a wallet balance) from write-heavy operations (like processing a payment).

- **Commands:** All operations modifying financial state (e.g., `IssueInvoiceCommand`, `RequestTransferCommand`). Handlers for these MUST wrap executions in database transactions and publish domain events upon success.
- **Queries:** All operations retrieving data (e.g., `GetStudentBalanceQuery`, `GetExchangeRateQuery`). Handlers read from optimized, read-only projections to guarantee high performance.
- **Pipeline Behaviors:**
  - **Validation Pipeline:** Enforces structural and business rules (e.g., cannot refund more than the original payment).
  - **Authorization Pipeline:** Confirms the executing identity possesses the required financial roles.
  - **Audit Pipeline:** Automatically intercepts commands to log intent and execution status into the Phase 05 — Core Implementation audit ledger.

---

## 19.C.6 Repository Implementation Blueprint

**Architectural Commentary**
Repositories in Phase 19 are the absolute gatekeepers to the immutable financial ledger.

- **Financial Repository:** Manages the core Ledger and Transactions. Implements strict concurrency tokens to prevent race conditions during simultaneous ledger updates.
- **Invoice Repository:** Manages the lifecycle of billing documents.
- **Payment Repository:** Stores payment intents and external gateway reference tokens.
- **Wallet Repository:** Manages available and locked balances.
- **Transfer Repository:** Persists the state machine of international money movements.
- **Exchange Rate Repository:** Utilizes highly optimized, time-series querying to fetch exact point-in-time rates.
- **Commission & Report Repositories:** Manages the persistence of referral/commission accruals and generated analytical snapshots.

---

## 19.C.7 Application Services Blueprint

**Architectural Commentary**
Application Services orchestrate complex interactions spanning multiple aggregates and domains.

- **Billing Service:** Converts Quotes into Invoices, and handles the generation of Receipts upon successful payment.
- **Payment Service:** Coordinates between the Invoice aggregate and external Gateway integration layers.
- **Money Transfer Service:** The primary orchestrator for the high-friction transfer workflow.
- **Exchange Rate Service:** Evaluates requests against manual overrides vs. automated feeds.
- **Wallet Service:** Ensures atomic operations when funds move between Wallets and Invoices.
- **Financial Estimation Service:** Gathers variables from Phase 11 — Universities & Institutions and Phase 07 — Enterprise Reference Data to construct predictive cost models without mutating upstream source records.
- **Commission Service:** Listens to `PaymentCompletedEvent`s to trigger agent/recruiter accrual logic.

---

## 19.C.8 Money Transfer Implementation Blueprint

**Architectural Commentary**
International Money Transfers (e.g., Yemen to China, Saudi Arabia to China) involve extreme complexity due to regulatory compliance, intermediary fees, and fluctuating conversion rates. The implementation MUST strictly follow this linear orchestration:

**Implementation Flow:**

1.  **Transfer Request:** System receives intent, specifying source funds, origin country, and destination.
2.  **Validation:** Verifies sufficient wallet balance and checks against Anti-Money Laundering (AML) velocity limits.
3.  **Exchange Rate Lookup:** Locks in the precise conversion rate from the Exchange Rate Engine.
4.  **Transfer Fee Calculation:** Determines platform fees, gateway margins, and intermediary bank routing costs.
5.  **Approval (Hold Phase):** Funds in the user's wallet are locked (`lockedBalance`). Transfer enters `PendingApproval` state requiring Financial Admin sign-off.
6.  **Processing:** Upon approval, instructions are dispatched to external banking networks.
7.  **Settlement:** Confirmation is received from the destination bank. Locked funds are permanently debited.
8.  **Completed:** The transfer is marked complete, and a Receipt is generated.

---

## 19.C.9 Exchange Rate Engine Blueprint

**Architectural Commentary**
The Exchange Rate Engine prevents systemic financial loss by guaranteeing conversion accuracy across the entire platform.

- **Supported Currencies:** USD, EUR, CNY, SAR, YER, IQD, with native extensibility for future fiat or digital currencies.
- **Manual Rates:** Priority 1. Allows Finance Controllers to lock specific corridors (e.g., YER to USD) to internal fiat policies, overriding market rates.
- **Automatic Rates:** Priority 2. Fetches real-time baseline rates from external financial data providers.
- **Historical Rates:** Provides point-in-time lookups required for auditing past transactions or processing refunds at the original rate.
- **Country Specific Rates:** Applies localized margin adjustments based on the origin or destination country of the user.

---

## 19.C.10 Financial Estimation Engine Blueprint

**Architectural Commentary**
This engine provides transparency by compiling total estimated costs across diverse categories, presented in the user's preferred currency.

**Implementation Flow:**

1.  **Aggregation:** Fetches Tuition (Phase 11), Accommodation/Living Expenses (Phase 07/11), Insurance, Visa, and Travel estimates.
2.  **Service Fees:** Appends Platform Service Fees and anticipated Transfer Fees.
3.  **Currency Conversion:** Iterates through every expense line item, converting it from its native currency (e.g., CNY for Chinese tuition) into the requested display currency (e.g., SAR) using the Exchange Rate Engine.
4.  **Projection:** Generates the `IFinancialEstimate` containing the exact breakdown, establishing user expectations before formal invoicing begins.

---

## 19.C.11 Workflow Implementation Blueprint

**Architectural Commentary**
State transitions must be explicitly managed by state machine implementations, never by ad-hoc flag updates.

- **Invoice Workflow:** Draft ➔ Issued ➔ PartiallyPaid ➔ Paid (or Voided).
- **Payment Workflow:** Pending ➔ Authorized ➔ Captured (or Failed/Refunded).
- **Transfer Workflow:** Requested ➔ PendingApproval ➔ Processing ➔ Settled.
- **Approval Workflow:** Tracks multi-signature requirements (e.g., transfers over $10,000 require two distinct controller approvals).

---

## 19.C.12 Validation Strategy Blueprint

**Architectural Commentary**
Financial validation requires extreme rigor.

- **Payments:** Validation of amount matching, gateway activity status, and duplicate transaction prevention (idempotency keys).
- **Transfers:** Verification of sufficient funds and destination routing compliance.
- **Currencies:** Validation that the requested conversion pair is active and supported.
- **Invoices:** Strict recalculation of all `IInvoiceItem` lines to ensure the `totalAmount` is mathematically sound before issuance.

---

## 19.C.13 Integration Guidance Blueprint

**Architectural Commentary**
Phase 19 integrates via strictly defined APIs and Enterprise Service Bus (ESB) events.

- **Phase 15 — Enterprise Student Platform:** Retrieves financial posture via API to render the Student Portal; does not store financial state.
- **Phase 12 — Scholarships:** Emits events that Phase 19 consumes to create `WalletAdjustments` or apply credits to `Invoices` (without delegating scholarship eligibility or award rules to Phase 19).
- **Phase 11 — Universities & Institutions:** Consumes the Financial Estimation Engine to display pricing on degree catalogs.
- **Phase 20 — Enterprise Services Platform:** Triggers Billing APIs to issue quotes and invoices for logistical assistance or auxiliary service offerings.
- **Phase 21 — Enterprise Career & Alumni Platform:** Triggers Billing APIs for monetization of premium career services.
- **Phase 13 — Learning Platform:** Triggers Billing APIs for paid courses or test-preparation products.
- **Notification / Event Consumers:** Consumes Phase 19 events (e.g., `PaymentCompletedEvent`) to dispatch emails/SMS to users.
- **Analytics / Read-Model Consumers:** Ingests all financial events for enterprise data warehousing.

---

## 19.C.14 Security Implementation Blueprint

**Architectural Commentary**
Phase 19 represents the highest security tier in MANARATAK 2.0.

- **Authorization & Access:** Strict ABAC (Attribute-Based Access Control) isolating capabilities. A user who can draft an invoice cannot necessarily approve a transfer.
- **Multi-Level Approval:** Hard-coded Maker-Checker workflows for sensitive actions.
- **Encryption:** All PII and financial routing data is encrypted at rest (AES-256).
- **Sensitive Data Protection:** The system stores only tokens; raw Credit Card PANs must never touch Phase 19 databases, adhering to PCI-DSS standards.
- **Audit Trail:** Immutable, cryptographically verifiable logs for every ledger mutation.

---

## 19.C.15 Scalability Strategy Blueprint

**Architectural Commentary**

- **High Transaction Volume:** The CQRS architecture allows the read-replicas (serving balance inquiries to portals) to scale independently from the write-master (processing payments).
- **Multi-Tenancy:** The ledger is designed to support multiple branches and companies by scoping accounts securely to specific institutional tenants.
- **Concurrency:** Optimistic concurrency control (row-versioning) ensures that simultaneous payment attempts on the same invoice do not result in double-charging.

---

## 19.C.16 Monitoring Blueprint

**Architectural Commentary**

- **Financial Monitoring:** Real-time dashboards tracking outstanding enterprise debt, daily transaction volume, and wallet liabilities.
- **Payment Monitoring:** Tracking gateway latency, decline rates, and webhook failure anomalies.
- **Exchange Rate Monitoring:** Alerts for sudden spikes or drops in automated currency feeds.
- **Audit Monitoring:** Immediate alerts triggered if a ledger imbalance is detected by background reconciliation workers.

---

## 19.C.17 Logging Strategy Blueprint

**Architectural Commentary**

- **Structured Format:** JSON-based logs including exact ISO currency codes and amounts (`MoneyAmount`).
- **Correlation IDs:** Absolute requirement. A `PaymentCompletedEvent` log MUST carry the correlation ID back to the originating `Invoice` and the originating business reference or correlationId.
- **Redaction:** Strict filtering to ensure no sensitive banking details or tokens are written to plaintext logs.

---

## 19.C.18 Performance Guidance Blueprint

**Architectural Commentary**

- **Caching:** Exchange rates and static currency taxonomies MUST be heavily cached in Redis to prevent latency during massive estimation loops.
- **Asynchronous Settlement:** Finalizing ledgers and dispatching commission logic occurs on background workers to ensure the main payment thread returns rapidly to the user.

---

## 19.C.19 Future Evolution & Payment Gateways

**Architectural Commentary**
The Infrastructure layer is explicitly designed as a pluggable Anti-Corruption Layer (ACL) to seamlessly onboard future global and regional integrations.

- **Payment Gateways:** Architected to support Visa, MasterCard, Apple Pay, Google Pay, PayPal, Stripe, and localized mobile money providers without altering core Domain logic.
- **Banking Integration:** Reserved structures for future SWIFT / ISO 20022 direct banking API integration.
- **ERP/Accounting Systems:** Event structures are designed to be batch-exported into formal institutional ERPs (e.g., SAP, Oracle, Microsoft Dynamics) for tax and corporate reporting.

---

## 19.C.20 Architecture Constraints

**Architectural Commentary**
Any Pull Request violating the following constraints MUST be automatically rejected:

- **NO FLOATING POINT ARITHMETIC:** Financial values MUST be stored and calculated using exact minor units (e.g., `amountMinorUnits: string` or Prisma `Decimal` / `BigInt`) to prevent fractional loss.
- **NO EXTERNAL DATABASE WRITES:** No other platform may insert records into the Phase 19 database.
- **NO RAW PAN STORAGE:** Credit card numbers must never be stored.
- **NO STATE BYPASS:** Transfer and Payment workflows must execute every required state transition.

---

## 19.C.Final Implementation Review Checklist

- [x] **Implementation Validation:** Blueprint successfully maps all Part A and Part B requirements into concrete structural layers.
- [x] **Architecture Compliance:** Strict adherence to Clean Architecture and SSoT principles.
- [x] **Module Validation:** Billing, Payments, Transfers, Exchange Rates, and Estimations are fully modularized.
- [x] **Repository Validation:** Persistence is abstracted, securing the immutable ledger.
- [x] **Workflow Validation:** Complex cross-border transfers and multi-level approvals are heavily governed.
- [x] **Integration Validation:** Clean API and Event interfaces are established for all downstream consumers.
- [x] **Performance Validation:** CQRS and caching strategies guarantee enterprise responsiveness.
- [x] **Security Validation:** PCI-DSS preparation, encryption, and ABAC are mandated.
- [x] **Readiness Review:** The guide provides unambiguous direction for engineering teams to begin construction.
- [x] **Acceptance Criteria:** Met in full.

**Status:** Baselined Architecture Specification
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)

---

## Navigation

- **Previous Artifact:** [Phase 19 Part B - Domain Contracts](phase-19-02-enterprise-finance-payments-platform-domain-contracts.md)
- **Current Artifact:** **Phase 19 Part C - Implementation Guide** (This File)
- **Next Phase:** Phase 20 — Enterprise Services Platform

