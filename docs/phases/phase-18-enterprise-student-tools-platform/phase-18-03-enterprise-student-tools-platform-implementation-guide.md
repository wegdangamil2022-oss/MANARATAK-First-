# MANARATAK 2.0: Phase 18 (Enterprise Student Tools Platform) Enterprise Implementation Guide

**Document ID:** PHASE-18-03-IMPL-GUIDE
**Status:** Baselined & Approved
**Phase:** 18
**Domain:** Enterprise Student Tools
**Artifact:** Part C - Implementation Guide

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.
> **Note:** This phase complies fully with ADR-004, establishing the Enterprise AI Platform as the single owner of AI capabilities. Phase 18 acts strictly as an AI consumer.

---

## 18.C.1 Implementation Overview

**Architectural Commentary**
The Enterprise Student Tools Platform (Phase 18) is an integration-heavy, stateless orchestration engine. Its implementation focuses entirely on governing, structuring, and executing a diverse catalog of student-facing academic tools. It does not generate data; it orchestrates deterministic algorithms and delegates intelligent generation to established enterprise services. This Implementation Blueprint defines the strict physical boundaries and execution patterns required to realize the platform without violating enterprise Single Source of Truth (SSoT) mandates.

---

## 18.C.2 Implementation Principles

**Architectural Commentary**
These principles govern the physical coding and structural decisions for Phase 18 engineers.

1.  **Absolute AI Delegation:** Developers SHALL NOT install AI vendor SDKs (e.g., OpenAI, Vertex AI) within this platform. All intelligent processing must be routed through the Enterprise AI Platform (Phase 17) via inter-service contracts.
2.  **Stateless Tooling:** Tools MUST NOT maintain localized state between steps unless explicitly persisting to a durable, cross-request Session cache or delegating to the Phase 15 Student Profile.
3.  **Strict Context Aggregation:** A tool's primary implementation responsibility is safely aggregating user inputs and enterprise canonical data (e.g., University details) to form a complete `IToolContext` for execution.
4.  **Defensive Execution:** Every tool invocation MUST be wrapped in enterprise resilience patterns (circuit breakers, bulkheads) as tools natively fan out to multiple upstream domains (Phase 17 AI, Universities, Scholarships, Phase 07 Reference Data).

---

## 18.C.3 Implementation Layers & Folder Structure

**Architectural Commentary**
The platform strictly adheres to the enterprise Clean Architecture blueprint adapted for a modern Node.js and TypeScript environment, ensuring that tool orchestration logic is decoupled from HTTP delivery mechanisms or external integrations.

```text
src/
├── domain/            # (Core) Tool aggregates, value objects, execution lifecycles, and domain contracts
├── application/       # (Use Cases) Tool dispatchers, execution engines, and core business logic
├── infrastructure/    # (Adapters) Prisma database access, Redis caching, BullMQ queues, Phase 17 AI delegation, external service clients
├── presentation/      # (Delivery) Express.js REST API controllers, middleware, and request/response mapping
│   └── api/
└── workers/           # (Background) BullMQ asynchronous workers for long-running jobs (e.g. CV reviews, study plans, and PDF generation, with document outputs saved to Phase 05 - Enterprise Asset Platform (EAP) using AssetId and AssetReference)
prisma/                # (Database) Prisma schema definitions and database migrations
```

---

## 18.C.4 Internal Components

**Architectural Commentary**
The platform consists of specialized internal engines designed to manage the full lifecycle of a tool request, from discovery to final formatting.

- **Tool Registry:** The centralized directory of all active tools, their configurations, and capabilities, backed by Prisma and Redis.
- **Tool Dispatcher:** The routing mechanism that directs an incoming `IToolRequest` to the correct specific execution engine.
- **Tool Execution Engine:** The base stateless processor that orchestrates a tool's steps.
- **Tool Context Builder:** Aggregates required data from Phase 15 - Enterprise Student Platform (Student Profile), Phase 11 - Universities & Institutions (University details), etc., before tool execution begins.
- **Recommendation Engine:** Executes deterministic filtering and sorting for recommendations.
- **Validation Engine:** Processes deterministic eligibility and application rules.
- **Calculation Engine:** The mathematical core for GPA, ROI, and credit algorithms.
- **Planning Engine:** Generates timelines and milestone trajectories based on parameters.
- **Result Formatter:** Normalizes varying tool outputs into the standard `IToolResponse`.
- **Tool Policy Engine:** Enforces usage quotas, regional restrictions, and visibility rules.
- **Tool Authorization:** Validates if the requesting consumer (student vs. anonymous) has permission to execute the tool.
- **Execution Tracker:** Generates the telemetry for tool usage and performance.
- **Usage Tracker:** Enforces platform rate limits.
- **Audit Integration:** Pipes execution compliance data to the Phase 05 Audit ledger.
- **Configuration Manager:** Handles dynamic tuning of tool parameters (e.g., updating currency conversion rates).
- **Tool Catalog:** Exposes the available tools for the front-end to build dynamic UI menus.

---

## 18.C.5 Component Responsibilities

**Architectural Commentary**
Responsibilities must remain highly cohesive. The `Tool Dispatcher` does not validate data; it only routes. The `Context Builder` does not execute calculations; it only fetches data. This ensures high testability and prevents bloated files from forming as the tool catalog expands. Unit and integration tests are written in **Vitest** to verify stateless calculation logic and router behavior with high execution speed and zero external database dependencies.

---

## 18.C.6 Internal Communication Model

**Architectural Commentary**
Internal communication within Phase 18 relies on Command-Query Responsibility Segregation (CQRS) implemented via lightweight, strongly typed TypeScript dispatchers, combined with Express.js routing middleware pipelines and Zod schema validations.

- **Command/Query Separation:** Tool executions that modify external state (e.g., saving a generated CV to a profile) are Commands. Tool executions that purely calculate or project (e.g., GPA Calculator) are Queries.
- **Express.js Middleware Pipelines & Zod Validation:** Every tool request passes through a sequence of Express middlewares and custom TypeScript pipelines:
  - **Validation Middleware:** Uses Zod schemas to validate the structural integrity of the incoming request body and query parameters.
  - **Authorization Middleware:** Enforces authentication state and user roles (Student, Advisor, Admin).
  - **Tool Resolution Handler:** Dynamically retrieves the active Tool version from the Prisma database/Redis cache.
  - **Execution Controller:** Dispatches execution to the specific tool implementation or delegates to Phase 17.
  - **Result Formatting & Analytics Pipeline:** Normalizes the output into the standard payload, updates OpenTelemetry metrics, and dispatches analytical events.

---

## 18.C.7 Consumer Integration Blueprint

**Architectural Commentary**
The platform exposes distinct API gateways tailored to different enterprise consumers.

- **Student Portal:** Consumes authenticated endpoints. Tool requests implicitly carry the `StudentId`, allowing the `Context Builder` to seamlessly inject permanent academic records into the tool execution without asking the user for duplicate input.
- **Phase 24 - Enterprise Public Platform:** Consumes anonymous, rate-limited endpoints. Tools operating here must rely entirely on user-provided parameters within the `IToolRequest`.
- **Admin Portal:** Consumes governance endpoints for updating tool availability, tweaking recommendation weights, and viewing telemetry.
- **Mobile Apps:** Consumes tailored REST endpoints that deliver optimized, heavily paginated, or streamlined `IToolResponse` objects suited for small screens.

---

## 18.C.8 AI Platform Integration Blueprint

**Architectural Commentary**
**CRITICAL BOUNDARY ENFORCEMENT:** Phase 18 is strictly an AI Consumer. It possesses absolutely no prompt engineering, no LLM SDKs, and no model routing logic.

**Integration Workflow:**

1.  **Request:** A student asks the "Personal Statement Generator" in Phase 18 for a draft.
2.  **Aggregation:** Phase 18's `Context Builder` pulls the student's CV (from Phase 15 - Enterprise Student Platform) and target University requirements (from Phase 11 - Universities & Institutions).
3.  **Delegation:** Phase 18 constructs a strongly typed `IAIRequest` (e.g., `Intent: GeneratePersonalStatement`, `Parameters: [CV, UnivReqs]`) and transmits it via secure HTTP REST API endpoints using JSON payloads to the **Enterprise AI Platform (Phase 17)**.
4.  **Execution (Phase 17):** Phase 17 receives the request, identifies the correct prompt template from its Prompt Registry, selects the optimal LLM (e.g., GPT-4), executes the inference, runs safety checks, and formats the output.
5.  **Response:** Phase 18 receives the `IAIResponse`, unpacks the payload, wraps it in an `IToolResponse`, and delivers it to the student.

**Zero AI Ownership:** There are no prompts inside Phase 18 codebases. There are no AI model selections. Everything passes through the Enterprise AI Platform.

---

## 18.C.9 Tool Execution Blueprint

**Architectural Commentary**
The execution lifecycle of any tool (AI, Calculator, or Planner) MUST follow this immutable pipeline sequence to ensure enterprise security and auditability.

**Lifecycle:**
`Request` -> `Validation` (Zod Schema Check) -> `Authorization` (JWT & Role Check) -> `Context Building` (Fetching cross-domain dependencies via Prisma/APIs) -> `Tool Resolution` (Checking Registry via Redis/Prisma) -> `Execution` (Algorithm or Delegation) -> `Response Formatting` -> `Audit` (Telemetry via OpenTelemetry & Structured Logging).

---

## 18.C.10 Recommendation Blueprint

**Architectural Commentary**
The Recommendation Engine provides curated outcomes (Universities, Scholarships, Careers, Countries).

- **Deterministic Filtering:** Simple recommendations use Phase 18 algorithms matching student parameters against canonical data (e.g., "Find Universities in UK with Tuition < $20k").
- **Semantic Matching:** Complex, behavioral, or profile-based recommendations are delegated to Phase 17 or approved search/read-model capabilities, with Phase 18 acting purely to orchestrate the handoff and format the resulting lists.

---

## 18.C.11 Validation Blueprint

**Architectural Commentary**
Validation tools execute strict, deterministic rulesets.

- **Eligibility Validation:** Checks student attributes against University requirements (Phase 11 - Universities & Institutions).
- **Document Validation:** Analyzes document structures (delegating OCR/Semantic checks to Phase 17 if necessary).
- **Application Validation & Readiness:** Computes a completeness score based on required vs. provided application artifacts.

---

## 18.C.12 Planning Blueprint

**Architectural Commentary**
Planning engines generate forward-looking projections.

- **Timeline Builder:** Calculates academic milestones based on target intake dates.
- **Budget Planner:** Aggregates tuition, living costs (Phase 07 - Enterprise Reference Data and Phase 11 - Universities & Institutions), and currency conversions into projected cash flows.
- **Study Planner:** Generates semester-by-semester credit loading trajectories.

---

## 18.C.13 Governance Blueprint

**Architectural Commentary**
Tool Governance is implemented via decorators and pipeline behaviors to ensure policies are applied uniformly without polluting tool business logic.

- **Tool Policies:** Can a tool be executed? Is it in maintenance mode?
- **Consumer Policies:** Is the Phase 24 - Enterprise Public Platform allowed to execute expensive AI Generators? (Anonymous access should be strictly rate-limited or disabled via Redis-based queues to prevent cost abuse).
- **Usage Policies & Rate Limits:** Implemented via distributed caching (Redis) and BullMQ throttling to prevent denial-of-wallet attacks against expensive delegated tools.
- **Tool Registry Maintenance Workflow:** The official Tool Registry Backlog defined in Part A dictates the launch visibility and implementation priority of all tools. The implementation team must follow this workflow to maintain the registry during active development:
  - **Registry Initialization:** The system boots by loading the baseline definitions from the `IToolRegistryEntry` seed configurations.
  - **State Hydration:** Tool visibility (`ACTIVE`, `COMING_SOON`, `UNDER_DEVELOPMENT`, `HIDDEN_ADMIN_ONLY`, `DISABLED`, `RETIRED`) is resolved at runtime via the Phase 23 admin feature flags, defaulting to the registry baseline.
  - **Implementation Prioritization:** Engineering sprints must pull tools in the order of the `ToolImplementationPriority` (e.g., `P1_CORE_LAUNCH` before `P2_EXPANSION`).
  - **Dependency Handshake:** Tools with declared dependencies on external domains (Phase 10, Phase 11, Phase 12, etc.) must fail gracefully if the target domain API is unreachable, logging the missing `IToolDependencyDeclaration` constraint.

---

## 18.C.14 Security Blueprint

**Architectural Commentary**
Security implementations focus on input sanitation and execution boundaries.

- **Authentication/Authorization:** Managed by Phase 02 / Phase 05 Identity services using Express.js JSON Web Token (JWT) validation middleware; Phase 18 merely enforces the extracted claims.
- **Input Sanitization:** Extreme rigor MUST be applied to student text inputs before delegating them to Phase 17 to prevent prompt injection attacks. (Note: Phase 17 has a Safety Engine, but defense-in-depth requires Phase 18 to perform structural sanitization).

---

## 18.C.15 Monitoring Blueprint

**Architectural Commentary**
Phase 18 implements comprehensive enterprise observability.

- **Metrics:** Tools executed per minute, average execution latency (differentiating internal calc time vs. Phase 17 delegation time), error rates by tool category.
- **Telemetry & Tracing:** OpenTelemetry SDK for Node.js is utilized to track spans across Express.js requests, database queries, and outbound HTTP/REST requests to Phase 17.

---

## 18.C.16 Logging Blueprint

**Architectural Commentary**

- **Structured Logging:** All logs use JSON formatting.
- **Correlation IDs:** The `requestId` and `correlationId` MUST be propagated to all downstream enterprise services (AI, foundation search capability, Phase 11 - Universities & Institutions) to trace a tool's full execution path. Structured JSON logging is implemented using Pino or Winston for high-performance log parsing.

---

## 18.C.17 Scalability Blueprint

**Architectural Commentary**

- **Horizontal Scaling:** The Express.js API and application logic layers are 100% stateless, allowing infinite horizontal scaling. Asynchronous long-running tools are handled via BullMQ worker instances backed by Redis.
- **Independent Execution:** If the GPA Calculator experiences a massive spike in traffic, it MUST NOT degrade the performance of the CV Builder. Tools are logically bulkheaded, and complex workflows are queued in Redis via BullMQ.

---

## 18.C.18 High Availability Blueprint

**Architectural Commentary**

- **Redundancy:** Deployed across multiple availability zones.
- **Graceful Degradation:** If the Phase 17 Enterprise AI Platform experiences an outage, Phase 18 MUST catch the exception, dynamically disable AI tool options in the UI Catalog, and allow deterministic utilities (Calculators, Planners) to continue functioning normally.

---

## 18.C.19 Fault Tolerance Blueprint

**Architectural Commentary**

- **Circuit Breakers:** Implemented on all outbound HTTP calls to Phase 17, Phase 11 - Universities & Institutions, and Phase 12 - Scholarships.
- **Timeouts:** Strict timeouts on delegated tool executions to prevent resource exhaustion.
- **Fallback Strategies:** Where possible, return cached canonical data if a downstream taxonomy service is unavailable.

---

## 18.C.20 Performance Blueprint

**Architectural Commentary**

- **Caching:** Aggressive Redis caching for country reference metrics and university catalog data (Phase 11 - Universities & Institutions) required for Context Building.
- **Parallel Execution:** When Context Building requires fetching data from multiple domains (e.g., pulling from Phase 11 - Universities & Institutions and Phase 12 - Scholarships), the requests MUST be executed in parallel using standard asynchronous patterns (e.g., `Promise.all` in TypeScript).

---

## 18.C.21 Deployment Readiness

**Architectural Commentary**
Prior to deployment, the following enterprise prerequisites must be met:

1. Phase 17 (Enterprise AI Platform) REST APIs must be deployed and stable.
2. Canonical Data Platforms (Phase 11 - Universities & Institutions, Phase 12 - Scholarships) must have available read-replicas, Prisma clients, or API endpoints.
3. Tool Registry configuration must be seeded with baseline execution policies.

---

## 18.C.22 Implementation Constraints

**Architectural Commentary**
Any Pull Request violating the following constraints MUST be automatically rejected by the architectural review process:

- **NO DIRECT AI PROVIDERS:** No OpenAI, Gemini, or external LLM SDKs may be imported into any part of the Phase 18 codebase.
- **NO BUSINESS LOGIC OWNERSHIP:** Phase 18 cannot dictate how a Scholarship is awarded; it can only orchestrate the comparison of existing Scholarship rules.
- **NO DATABASE OWNERSHIP VIOLATIONS:** Phase 18 cannot persist student application statuses or permanent CVs. It must route profile save commands to Phase 15 - Enterprise Student Platform, and hand off generated PDFs, document outputs, and previews to Phase 05 - Enterprise Asset Platform (EAP) utilizing AssetId and AssetReference.
- **NO CROSS-DOMAIN OWNERSHIP:** Phase 18 must not modify Phase 11 - Universities & Institutions, Phase 12 - Scholarships, or other core records.
- **NO DIRECT CMS MODIFICATIONS:** Phase 18 does not own content delivery.
- **NO DUPLICATED ENGINES:** It must not build its own Search or Translation engines. It must consume enterprise foundation capabilities (Phase 17 for translation, foundation search capability for search).

---

## 18.C.Final Implementation Review Checklist

- [x] **Alignment with Part A:** Tool orchestration vision is physically realized without violating scope.
- [x] **Alignment with Part B:** All Domain Contracts map directly to Clean Architecture implementation layers.
- [x] **Ownership Validation:** The platform owns only Tool Definitions, Executions, and orchestrations.
- [x] **Foundation Reuse:** Standardized caching, logging, and security pipelines are utilized.
- [x] **Dependency Validation:** TypeScript Clean Architecture patterns, Zod validation pipelines, and dependency injection guarantee zero upward dependencies.
- [x] **AI Boundary Validation:** Strict enforcement of the AI Consumer Pattern; all intelligence is securely delegated to Phase 17.
- [x] **Implementation Readiness:** The guide provides sufficient detail for engineering teams to commence Domain and Application layer construction using Node.js, Express, Prisma, BullMQ, Redis, and Vitest.
- [x] **Architecture Compliance:** Fully compliant with MANARATAK 2.0 master directives.

**Status:** Approved for Implementation
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)

---

## Navigation

- **Previous Artifact:** [Phase 18 Part B - Domain Contracts](phase-18-02-enterprise-student-tools-platform-domain-contracts.md)
- **Current Artifact:** **Phase 18 Part C - Implementation Guide** (This File)
- **Next Phase:** [Phase 19 - Enterprise Finance & Payments Platform](../phase-19-enterprise-finance-payments-platform/phase-19-01-enterprise-finance-payments-platform-architecture-specification.md)
