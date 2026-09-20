# MANARATAK 2.0: Phase 19 (Enterprise Finance & Payments Platform) Enterprise Architecture

**Document ID:** PHASE-19-01-ARCH-SPEC
**Status:** Baselined Architecture Specification
**Phase:** 19
**Domain:** Enterprise Finance & Payments
**Artifact:** Part A - Architecture Specification

---

## 19.A.1 Executive Summary

The **Enterprise Finance & Payments Platform (Phase 19)** establishes the centralized, authoritative engine for all financial capabilities within the MANARATAK 2.0 ecosystem. It serves as the Single Source of Truth (SSoT) for billing, commercial transactions, money transfers, currency conversions, wallet management, and financial governance.

Historically, complex platforms suffer from financial logic bleeding into domain contexts (e.g., a "Scholarship" module trying to manage payment installments). Phase 19 eradicates this technical debt by centralizing all financial ledgers, calculations, and payment gateways into a strict, secure Bounded Context. Whether a student in Yemen is paying tuition to a university in China, or an agent is receiving a referral commission, every fractional movement of capital is orchestrated, audited, and settled exclusively by Phase 19.

---

## 19.A.2 Architectural Vision & Position

**Architectural Commentary**
_In a distributed enterprise architecture, financial data requires absolute transactional integrity. Phase 19 is positioned as a foundational core capability, sitting horizontally across the enterprise. It is a highly protected domain that other platforms (Phase 15 — Enterprise Student Platform, Phase 12 — Scholarships) integrate with to realize commercial workflows, but which never bends its own structure to accommodate external domain logic._

### 19.A.2.1 The Financial Ownership Boundary

Phase 19 owns the commercial lifecycle and the ledger.

- **The Business Domain (e.g., Phase 11 Universities):** Determines _what_ a course is, _how much_ it costs fundamentally, and _who_ is enrolled.
- **The Financial Domain (Phase 19):** Determines _how_ that cost is quoted, _when_ it is invoiced, _what_ currency is used for settlement, and _how_ the funds are securely transferred across borders.

---

## 19.A.3 Enterprise Principles

Phase 19 adheres to the core MANARATAK 2.0 enterprise principles while introducing critical tenets specific to the financial domain:

1.  **Financial Integrity:** All transactions MUST be processed using double-entry accounting principles to ensure the fundamental accounting equation always balances.
2.  **Financial Traceability:** Every financial mutation MUST be strictly correlated to the originating business transaction (e.g., an Invoice must trace back to a specific originating business reference or correlationId).
3.  **Immutable Audit:** Financial records (Ledgers, Invoices, Receipts) are append-only. Mistakes are corrected via formal reversal or refund transactions, never by mutating historical records.
4.  **Multi-Currency Support:** The platform MUST be natively multi-currency. Every financial value must explicitly carry its currency ISO code (e.g., `USD`, `SAR`) to prevent catastrophic conversion errors.
5.  **Approval Before Settlement:** High-risk money transfers and high-value payouts MUST require orchestrated, multi-level human or automated approvals prior to initiating external banking integrations.
6.  **High Availability & Scalability:** As the commercial backbone of the ecosystem, the platform must guarantee zero dropped transactions during peak enrollment and payment windows.

---

## 19.A.4 Domain Scope & Boundaries

### 19.A.4.1 In Scope

- **Billing Lifecycle:** Invoices, Quotes, Receipts, Installment Plans, and Refunds.
- **Wallet & Accounts:** Student Financial Accounts, Digital Wallets, and Company Bank Account registries.
- **Money Movement:** International Money Transfers, internal P2P transfers, and payment approvals.
- **Currency Operations:** Real-time Exchange Rates, Historical Rates, Manual/Auto rate configurations, and Currency Conversions.
- **Commissions:** Agent Commissions, Referral Commissions, and Settlement workflows.
- **Financial Reporting:** Enterprise revenue, expense, profit, and outstanding balance analytics.
- **Cost Projections:** The Financial Estimation Engine.

### 19.A.4.2 Out of Scope

- **Core Educational Pricing Rules:** The base price of a degree is owned by Phase 11 (Universities), though Phase 19 generates the resulting quote.
- **General Ledger (ERP):** Phase 19 is the operational ledger; it synchronizes with external corporate ERPs (e.g., SAP, Oracle) for formal institutional tax accounting.
- **Banking Infrastructure:** Phase 19 orchestrates transfers but relies on external Payment Gateways and Banks to execute the physical clearing of funds.

### 19.A.4.3 Explicit Non-Responsibilities

To prevent architectural contamination, Phase 19 explicitly **DOES NOT OWN**:

- Students or Student Academic Profiles (Owned by Phase 15 — Enterprise Student Platform).
- Universities, Campuses, or Academic Programs (Owned by Phase 11 — Universities & Institutions).
- Scholarships or Grants Definitions & Award Logic (Owned by Phase 12 — Scholarships).
- Careers, Alumni, or Organizations (Owned by Phase 21 — Enterprise Career & Alumni Platform).
- Course Delivery, Learning Content, or Test-Prep Catalog (Owned by Phase 13 — Learning Platform).
- Student Tools or Service Fulfillment (Owned by Phase 18 — Enterprise Student Tools Platform / Phase 20 — Enterprise Services Platform).
- Public Page Composition (Owned by Phase 24 — Enterprise Public Platform).
- Admin UI Screens (Owned by Phase 23 — Enterprise Administration Portal).
- Notification Dispatch, Enterprise Search, or AI Models (Owned by Phase 05 — Core Implementation baselines, Phase 17, and foundation capabilities).
- Free Global Course Catalog data or course learning content (Owned by Phase 13 — Learning Platform).
- Course delivery, curriculum metadata, student learning records, or certification flags.
- **Paid Auxiliary Courses and Services Operations**: Paid offerings (such as international test-preparation courses, statement or letter preparation services, and similar educational assistance) use Phase 19 strictly for commercial checkout, payment, billing, invoices, refunds, ledger reconciliation, and transaction execution. Phase 19 does not own their educational content, delivery, or service fulfillment (which are delegated to Phase 13/18/20). It has no ownership of the course discovery or catalog classification data.

---

## 19.A.5 Enterprise Capability Catalog

The platform is compartmentalized into specialized financial sub-domains, each exposing rigorous contracts to the enterprise.

### 19.A.5.1 Student Financial Account

Every student possesses a unified financial ledger providing a 360-degree view of their commercial standing.

- **Outstanding Balances:** Aggregated debt across all university applications and service fees.
- **Financial Documents:** Consolidated Invoices, Quotes, and Receipts.
- **Wallet Balance:** Stored value funds available for future transactions.
- **Money Transfers & Installments:** Active transfer states and active payment plans.

### 19.A.5.2 Billing Engine

The lifecycle engine for commercial requests and proof of payment.

- **Quote Lifecycle:** Generating binding/non-binding estimates for services.
- **Invoice Lifecycle:** Issuing, voiding, and marking invoices as paid.
- **Receipt Lifecycle:** Issuing immutable proof of fund capture.
- **Installment Plans:** Orchestrating scheduled, recurring payment mandates.
- **Refunds:** Managed clawbacks and fund returns.

### 19.A.5.3 Currency Management

A highly resilient, time-aware currency evaluation subsystem.

- **Currency Reference Boundary:** Phase 07 — Enterprise Reference Data owns canonical currency codes (ISO 4217), currency symbols, and country-to-currency reference definitions. Phase 19 consumes Phase 07 reference definitions to manage operational exchange rates, conversions, fees, and financial ledgers.
- **Supported Currencies:** Natively tracks exchange rates for global currencies (e.g., USD, EUR, CNY, SAR, YER, IQD).
- **Exchange Rates:** Supports Automatic (API-driven), Manual (overridden by Finance Admins), and Historical (point-in-time) rates.
- **Country-Specific Rates:** Manages localized conversion margins and fixed regional exchange policies.

### 19.A.5.4 Commission Management

The financial settlement engine for external referral partners, recruiters, and commission recipients.

- **Agent & Referral Commission:** Automated calculation of fees owed to external recruiters or referral partners based on successful enrollments or payments.
- **Settlement:** Orchestrating the payout of accrued commissions to financial recipient bank accounts.
- **Commission Reports:** Reconciliations and dispute management data.
- *(Note: Phase 19 settles commissions and payouts based on external beneficiary references, but does NOT own partner relationships, employers, organizations, agents as business entities, or B2B contracts.)*

### 19.A.5.5 Payment Gateways (Integration Reserve)

The Anti-Corruption Layer (ACL) for external payment processors.

- **Supported Modalities:** Visa, MasterCard, Apple Pay, Google Pay, PayPal, Stripe, local Bank Transfers, and regional Payment Providers.
- _Note: Phase 19 stores secure reference tokens, never raw PCI-DSS credit card PANs._

---

## 19.A.6 Financial Estimation Engine

**Architectural Commentary**
_One of the most complex friction points for international students is understanding the true total cost of studying abroad. The Financial Estimation Engine is a dedicated enterprise capability that aggregates fragmented costs into a single, multi-currency projection._

The engine dynamically compiles a holistic cost estimate, encompassing:

- **Academic Costs:** Tuition Fees (from Phase 11).
- **Logistics & Living:** Accommodation, Living Expenses, Air Tickets (derived from Phase 07/11 Data).
- **Legal & Administrative:** Insurance, Visa fees.
- **Platform Operations:** Platform Service Fees, Transfer Fees, and Currency Conversion margins.

The engine guarantees that this total estimated cost can be requested and accurately displayed in any supported currency, providing absolute transparency to the applicant.

---

## 19.A.7 International Money Transfer Workflow

**Architectural Commentary**
_MANARATAK 2.0 frequently acts as the financial bridge between high-friction remittance corridors (e.g., Yemen to China, Sudan to China). This requires an explicit, highly governed state machine to manage the asynchronous, multi-day lifecycle of cross-border capital movement._

The architecture enforces the following mandatory progression for International Money Transfers:

1.  **Transfer Request:** Initiated by the user or system, specifying source funds and target destination.
2.  **Currency Conversion:** Locking in the exchange rate and identifying required margins.
3.  **Transfer Fee Calculation:** Appending platform, gateway, and intermediary bank fees.
4.  **Approval Workflow:** Halting the transaction for mandatory AML/KYC checks and financial admin authorization.
5.  **Transfer Processing:** Dispatching the intent to external banking or payment providers.
6.  **Settlement:** Acknowledging the physical clearing of funds at the destination.
7.  **Completed:** Releasing holds, issuing receipts, and updating ledger balances.

---

## 19.A.8 Integration Model

Phase 19 integrates tightly across the enterprise, primarily as a downstream consumer of business data and an upstream provider of financial state.

- **Upstream Consumers (Platforms interacting with Finance):**
  - **Phase 15 — Enterprise Student Platform:** Retrieves wallet balances and outstanding invoices for the Student Portal.
  - **Phase 11 — Universities & Institutions:** Requests Quotes/Estimates based on specific degree pricing and academic program fees.
  - **Phase 12 — Scholarships:** Triggers wallet top-ups or invoice offsets when a grant is awarded (without delegating scholarship eligibility or award rules to Phase 19).
  - **Phase 20 — Enterprise Services Platform:** Invoices for specific logistical or administrative assistance.
  - **Phase 21 — Enterprise Career & Alumni Platform:** Subscribes to payment events if premium career services are monetized.
  - **Phase 13 — Learning Platform:** Triggers checkout and invoicing for paid courses or auxiliary learning products.
  - **Phase 23 — Enterprise Administration Portal:** Consumes finance domain endpoints to render financial administration dashboards.
  - **Phase 24 — Enterprise Public Platform:** Consumes the Financial Estimation Engine anonymously for prospective students.
  - **Analytics / Read-Model Consumers:** Consumes financial events to build enterprise data warehouse projections.
- **Downstream Dependencies (What Finance consumes):**
  - **Phase 05 — Core Implementation:** For strict user/account mapping (IAM baseline) and secure asset reference (Enterprise Asset Platform / EAP baseline).
  - **Phase 07 — Enterprise Reference Data:** For canonical currency definitions (ISO 4217), country codes, and macroeconomic taxonomies.

---

## 19.A.9 Consumer Model

The capabilities of Phase 19 are exposed to various presentation layers through specialized API endpoints and domain contracts:

- **Phase 15 — Enterprise Student Platform:** Allows students to view their Financial Account, download invoices, execute payments via gateways, and track International Money Transfers.
- **Phase 23 — Enterprise Administration Portal (Finance Module):** Empowers Financial Controllers to approve transfers, override exchange rates, issue manual invoices, and process commission settlements via Phase 19 domain APIs.
- **Partner/Agent Workflows:** Enables external recruiters to view accrued commissions and request payouts via Phase 19 commission settlement endpoints.
- **Phase 24 — Enterprise Public Platform:** Consumes the Financial Estimation Engine anonymously to provide prospective students with instant tuition/living cost calculations.

---

## 19.A.10 Security & Compliance Blueprint

**Architectural Commentary**
_Financial systems are the primary target for malicious actors. Phase 19 demands the highest classification of security controls within the enterprise._

- **Financial Authorization:** RBAC (Role-Based Access Control) is insufficient; Phase 19 utilizes strict ABAC (Attribute-Based Access Control) enforcing dual-control ("Maker-Checker") principles for any manual ledger adjustment.
- **Multi-Level Approval:** Hardcoded workflows requiring varying levels of executive sign-off based on transaction value thresholds.
- **Encryption & Sensitive Data Protection:** All financial rest-state data is encrypted. Bank account routing details and identity records are tokenized.
- **Fraud Prevention:** Heuristic velocity checks (e.g., detecting rapid, anomalous transfer requests) integrated at the boundary.
- **Immutable Audit Trail:** Integration with Phase 05 — Core Implementation audit baselines guarantees that every mutation is chronologically hashed.

---

## 19.A.11 Future Evolution

The architecture of Phase 19 is explicitly designed to support downstream financial maturity:

- **ERP Integration:** Read-models are structured to easily output daily batch reconciliations to enterprise systems like SAP, Oracle, or Microsoft Dynamics.
- **Global Banking Integration:** The architecture anticipates direct SWIFT/ISO 20022 integrations for automated treasury management.
- **Advanced Payment Providers:** The gateway interfaces are pluggable, allowing the seamless addition of emerging regional wallets (e.g., WeChat Pay, Alipay, STC Pay) as MANARATAK expands to new countries and currencies.

---

## 19.A.12 Architectural Constraints

- **No Direct Database Access:** No other enterprise platform may read from or write to the Phase 19 database. All interactions MUST occur via API contracts or Event Bus subscriptions.
- **No Cross-Domain Ownership:** Phase 19 MUST NOT cache or duplicate student academic records or university application statuses. It relies strictly on its own `AccountId` mapped via correlation to the global `StudentId`.
- **State Machine Rigidity:** An Invoice or Transfer MUST NEVER bypass a required state (e.g., moving from `Draft` directly to `Completed` without passing through `Approved` and `Processing`).

---

## 19.A.13 Enterprise Review & Acceptance

### 19.A.13.1 Architecture Validation

This specification firmly resolves the historical ambiguity between commercial interactions and academic operations, ensuring MANARATAK 2.0 possesses a robust, auditable, and internationally compliant financial core.

### 19.A.13.2 Acceptance Criteria

- [x] Absolute centralization of all financial logic is established.
- [x] The complete catalog of capabilities (Billing, Transfers, Estimations, Wallets) is documented.
- [x] The International Money Transfer state machine is explicitly defined.
- [x] The multi-currency and exchange rate architecture is mapped.
- [x] Financial integrity and immutability principles are enforced.

### 19.A.13.3 Architecture Review Checklist

- **Clean Architecture Compliant:** Yes. The domain represents pure financial logic isolated from delivery mechanisms.
- **Zero Upward Dependency:** Yes. Phase 19 consumes reference data but acts as the authoritative source for downstream analytics.
- **SSoT Maintained:** Yes. Phase 19 is the sole owner of the financial ledger.

### 19.A.13.4 ARB Decision

- **Decision:** APPROVED
- **Status:** BASELINED
- **Next Steps:** Proceed to Phase 19 Part B (Enterprise Domain Contracts).

---

## Navigation

- **Previous Phase:** [Phase 18 — Enterprise Student Tools Platform](../phase-18-enterprise-student-tools-platform/phase-18-01-enterprise-student-tools-platform-architecture-specification.md)
- **Current Artifact:** **Phase 19 Part A - Architecture Specification** (This File)
- **Next Artifact:** [Phase 19 Part B - Domain Contracts](phase-19-02-enterprise-finance-payments-platform-domain-contracts.md)
