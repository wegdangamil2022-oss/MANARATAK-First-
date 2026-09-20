# MANARATAK 2.0: Phase 18 (Enterprise Student Tools Platform) Enterprise Architecture

**Document ID:** PHASE-18-01-ARCH-SPEC
**Status:** Baselined & Approved
**Phase:** 18
**Domain:** Enterprise Student Tools
**Artifact:** Part A - Architecture Specification

---

## 18.A.1 Executive Summary

The **Enterprise Student Tools Platform (Phase 18)** establishes the centralized suite of intelligent utilities, academic calculators, decision support wizards, and productivity tools for the MANARATAK 2.0 ecosystem. It is an Enterprise Consumer Platform designed to empower students and applicants with high-value, outcome-driven features ranging from GPA forecasting to AI-driven personal statement generation.

Phase 18 acts as the absolute functional boundary for student-facing utilities. It orchestrates the user experience, aggregates necessary domain data, and provisions the tool logic. Critically, it operates under a strict architectural mandate regarding Artificial Intelligence: **Phase 18 consumes AI; it never executes AI.** All generative, semantic, and machine learning capabilities are delegated strictly to the **Enterprise AI Platform (Phase 17)** via immutable enterprise contracts.

By centralizing all student utilities within Phase 18, MANARATAK 2.0 ensures a cohesive, standardized, and infinitely extensible toolset that can be embedded across the Student Portal, Public Website, and mobile applications without fragmenting business logic across disparate front-end channels.

---

## 18.A.2 Architectural Vision & Position

The architectural position of Phase 18 is defined by its role as an aggregator and orchestrator of academic tools, strictly separated from the foundational engines that power those tools.

### 18.A.2.1 The Phase 17 (AI Platform) Boundary

Phase 18 is built directly on top of Phase 17. The ownership boundary between these two platforms is absolute and immutable.

- **Phase 17 (Enterprise AI Platform):** Owns the AI infrastructure, Large Language Models (LLMs), prompt engineering, prompt templates, model routing, embedding engines, vector databases, and token ledgers.
- **Phase 18 (Enterprise Student Tools Platform):** Owns the student-facing tools, UI wizards, tool configuration, step-by-step academic calculators, and the aggregation of student parameters required to utilize a tool.

> **Architectural Commentary:**
> _The "AI Consumer Pattern" is strictly enforced here. Phase 18 NEVER communicates directly with OpenAI, Gemini, Claude, Llama, DeepSeek, or any other external provider. It NEVER owns, stores, or manages prompt templates. When a student uses the "Personal Statement Generator" in Phase 18, Phase 18 compiles the student's parameters (e.g., target major, key achievements) into a structured DTO and dispatches it to Phase 17. Phase 17 applies the engineered prompt, selects the optimal LLM, executes the generation, and returns the result to Phase 18._

**Execution Flow Vector:**
`Student UI` -> `Enterprise Student Tools Platform (Phase 18)` -> `Enterprise AI Platform (Phase 17)` -> `External AI Provider`

---

## 18.A.3 Enterprise Principles

Phase 18 adheres to the core MANARATAK 2.0 enterprise principles (Clean Architecture, SSoT, Zero Upward Dependency) while introducing principles specific to the Student Tools domain:

1.  **Zero AI Ownership:** The platform SHALL NOT own, integrate with, or configure any AI models, providers, or prompt templates. It acts strictly as an AI consumer.
2.  **Stateless Execution (Tool Isolation):** Tools are fundamentally stateless calculation or generation engines. While a tool may read from a student's profile (Phase 15) to pre-fill data, the tool's execution engine does not mutate the core student profile unless explicitly orchestrated by an independent saving workflow.
3.  **AI Consumer Pattern:** All generative and semantic requests MUST be delegated to Phase 17 using strongly typed domain contracts.
4.  **Pluggable Tool Architecture (Workflow Independence):** The platform MUST be designed to allow the seamless addition of hundreds of new tools (e.g., adding a "Living Cost Calculator") without requiring modifications to the core routing, execution, or presentation foundations.
5.  **Shared Foundation Reuse:** Tools MUST consume existing Enterprise Platforms (e.g., Universities from Phase 11, Scholarships from Phase 12, Majors from Phase 10) to ensure zero data duplication.
6.  **Enterprise Consistency:** Every tool, regardless of its underlying complexity (deterministic calculator vs. AI generator), MUST expose a standardized execution interface and lifecycle to the consuming front-end applications.

---

## 18.A.4 Domain Scope & Boundaries

### 18.A.4.1 In Scope

- **Student Productivity Tools:** Calculators, timeline planners, and validation checkers.
- **AI Tool Orchestration:** Interfaces and parameter aggregation for AI-driven generators, reviewers, and advisors.
- **Decision Support Tools:** Comparison engines for universities, scholarships, and countries.
- **Academic Utilities:** GPA, credit, and grade conversion engines based on canonical enterprise rules.
- **Tool Execution Workflows:** Multi-step wizard state management for complex tool interactions.

### 18.A.4.2 Out of Scope

- **AI Infrastructure:** Model connections, prompt management, vector embeddings, and AI chargebacks (Owned by Phase 17).
- **Canonical Academic Data:** Definitions of universities, majors, or scholarships (Owned by Phases 10, 11, 12).
- **Core Student Profile:** The permanent record of a student's academic history (Owned by Phase 15).
- **Application Processing:** The actual submission and evaluation of university or scholarship applications.
- **Enterprise Search:** The global search bar and indexing engine (Owned by foundation search capability).

### 18.A.4.3 Explicit Non-Responsibilities

To prevent architectural drift, Phase 18 explicitly **DOES NOT OWN**:

- AI Models or AI Providers.
- Prompt Templates or Prompt Engineering.
- Embeddings or Semantic Routing.
- Search Engines.
- Content Management Systems (CMS).
- Notification Dispatching.
- Authentication or Authorization logic.
- Core Admissions Business Rules.

---

## 18.A.5 Enterprise Capability Catalog

Phase 18 governs an extensive suite of academic tools, broadly categorized into AI Tools and Student Utilities. The architecture must natively support the registration, discovery, and execution of all the following capabilities.

### 18.A.5.1 AI Tools (Delegated to Phase 17)

These tools aggregate user input and context, delegating the generative processing to the Enterprise AI Platform.

- **Writing & Documents:**
  - Personal Statement Generator & Personal Statement Reviewer
  - Motivation Letter Generator & Motivation Letter Reviewer
  - Recommendation Letter Generator & Recommendation Letter Reviewer
  - Scholarship Essay Generator & Scholarship Essay Reviewer
  - Research Proposal Generator & Research Proposal Reviewer
  - CV Builder, CV Analyzer, & CV Reviewer
  - Academic Translator & Academic Proofreader
  - Grammar Assistant & Academic Writing Assistant
  - Email Generator & Email Improver
- **Advisory & Coaching:**
  - Career Advisor & Major Advisor
  - University Advisor & Scholarship Advisor
  - Interview Coach & Interview Simulator
  - Research Assistant
- **Planning:**
  - Study Strategy Generator & Study Planner

### 18.A.5.2 Student Utilities (Deterministic / Algorithmic)

These tools execute deterministic business logic, calculations, and aggregations using canonical data from across the enterprise.

- **Academic Calculators:**
  - GPA Calculator, GPA Planner, & Graduation GPA Predictor
  - Grade Converter (e.g., converting UK classifications to US 4.0 scale)
  - Credit Hour Calculator & Semester Planner
- **Admissions & Readiness:**
  - Admission Chance Calculator & Eligibility Checker
  - Application Readiness Score & Required Documents Checklist
  - Deadline Tracker & Timeline Planner
- **Discovery & Comparison Engines:**
  - University Comparison, University Finder, & University Recommendation
  - Scholarship Comparison & Scholarship Recommendation
  - Country Comparison, Living Cost Comparison, Tuition Comparison, & Country Recommendation
  - Major Recommendation & Career Recommendation
- **Financial Planning:**
  - Currency Converter & Tuition Calculator
  - Living Cost Calculator, Budget Planner, & ROI Calculator
- **Document Management:**
  - Document Validator (Structural/Format validation)

---

## 18.A.6 Integration Model

Phase 18 is a highly connected consumer platform. It operates by orchestrating data from authoritative enterprise sources to fuel its tools.

### 18.A.6.1 Upstream Integrations (Consuming)

- **Enterprise AI Platform (Phase 17):** The absolute sole executor for all generative, conversational, and semantic tool requests.
- **Phase 11 - Universities & Institutions:** Consumed by comparison tools, tuition calculators, and admission chance engines.
- **Phase 12 - Scholarships:** Consumed by scholarship advisors and comparison matrices.
- **Phase 15 - Enterprise Student Platform:** Consumed to auto-fill tool parameters (e.g., pulling a student's current GPA into the Graduation GPA Predictor).
- **Phase 10 - Major Platform:** Consumed by the Major Advisor and career recommendation tools.
- **Phase 07 - Enterprise Reference Data:** Consumed for language definitions, locale mapping, currency conversion rates, country comparison metrics, and reference metadata. Crucially, all translation execution logic is delegated to Phase 17 - Enterprise AI Platform, while Phase 07 supplies static language/reference data only.

### 18.A.6.2 Downstream Integrations (Producing)

- **Enterprise Event Bus:** Phase 18 publishes analytical events (e.g., `ToolExecutedEvent`, `GpaCalculatedEvent`) to allow analytics/read-model consumers (or Phase 20 - Enterprise Services Platform) to track tool utilization and user engagement without coupling the systems.

---

## 18.A.7 Consumer Model

The tools governed by Phase 18 are consumed by multiple actor types across diverse presentation layers:

- **Students & Applicants:** The primary actors utilizing the tools to plan their academic journey, generate application materials, and forecast their success.
- **Academic Advisors:** Utilizing the tools (e.g., University Comparison, Study Planner) on behalf of students during counseling sessions.
- **Student Portal (Authenticated):** Tools executed within the secure portal can seamlessly read from and save to the student's permanent Phase 15 profile.
- **Public Website (Anonymous):** Selected tools (e.g., Tuition Calculator, generic GPA Calculator) are exposed anonymously as marketing and lead-generation assets.
- **Admin Portal:** System administrators utilizing tool telemetry to monitor usage, adjust calculator parameters, and oversee tool health.

---

## 18.A.8 Future Evolution

The Phase 18 architecture is fundamentally designed for horizontal extensibility.

- **Infinite Tool Expansion:** The platform utilizes a "Tool Registry" pattern. Adding a new tool (e.g., a "Visa Requirement Checker") requires only the registration of a new Tool definition and its specific execution handler. It does not require modifying the underlying platform framework.
- **Pluggable Execution:** Future tools may orchestrate multiple domains simultaneously. The architecture ensures that tools act as stateless orchestrators, preventing the accumulation of technical debt as the catalog expands to hundreds of utilities.

---

## 18.A.9 Architectural Constraints

To guarantee enterprise stability, Phase 18 must adhere to the following strict constraints:

1.  **No Direct LLM Access:** Under no circumstances shall Phase 18 hold API keys, SDKs, or network configurations for external AI providers.
2.  **No Prompt Storage:** Under no circumstances shall Phase 18 store system prompts, engineered templates, or AI behavioral instructions in its database.
3.  **Transient Data Policy:** By default, tool execution data (e.g., the inputs to a GPA calculator) is transient. If a student wishes to "Save" a generated Personal Statement, Phase 18 must hand that payload off to the appropriate persistent domain (e.g., Phase 15 - Enterprise Student Platform or Phase 05 - Enterprise Asset Platform (EAP)).
4.  **No Duplicate Business Logic:** If a tool calculates "Admission Eligibility", it MUST query the canonical rules engine in the Universities/Admissions domains, rather than hardcoding parallel eligibility logic within Phase 18.

---

## 18.A.10 Enterprise Tool Taxonomy

An official enterprise classification governs all student tools within Phase 18. This taxonomy ensures that as the catalog expands, tools are structurally categorized for discovery, analytics, and operational management.

Every current and future tool must belong to one official enterprise category:

- **AI Writing Tools:** Generators, reviewers, and improvers for academic and application documents.
- **AI Advisory Tools:** Interactive coaching, career guidance, and interview simulation engines.
- **Academic Calculators:** GPA, credit hour, and grade conversion utilities.
- **Financial Calculators:** Tuition, living cost, ROI, and budget planning utilities.
- **Comparison Tools:** Side-by-side matrices for universities, scholarships, and countries.
- **Recommendation Tools:** Matchmaking engines for majors, careers, and academic paths.
- **Planning Tools:** Study strategy, timeline, and deadline tracking utilities.
- **Validation Tools:** Format and structural checkers for application readiness.
- **Productivity Tools:** Translation, proofreading, and grammar assistance utilities.
- **Educational Utilities:** General-purpose academic aids not fitting the above constraints.

---

## 18.A.11 Tool Metadata Standard

To ensure enterprise-grade management, every tool within the platform must maintain a strict, standardized metadata profile. This metadata is fundamentally part of enterprise governance and catalog management, entirely independent of UI implementation.

The mandated metadata standard for every tool includes:

- **Tool ID:** Unique, immutable enterprise identifier.
- **Display Name:** The localized, human-readable name of the tool.
- **Description:** A concise explanation of the tool's purpose and output.
- **Category:** The official Enterprise Tool Taxonomy classification.
- **Version:** Current active semantic version (e.g., 2.1.0).
- **Supported Languages:** Array of locale codes supported by the tool.
- **Visibility:** Defines whether the tool is public, portal-only, or hidden.
- **Authentication Requirement:** Boolean flag dictating if a session is required to execute the tool.
- **Estimated Completion Time:** Analytical estimate of the time required to complete the tool workflow.
- **Tags:** Semantic markers for search and discovery.
- **Icon:** Reference to the enterprise asset representing the tool.
- **Status:** Current lifecycle status.

---

## 18.A.12 Tool Lifecycle

The platform enforces a strict enterprise lifecycle for the creation, deployment, and eventual retirement of every tool.

- **Draft:** The tool is under definition, configuration, or active engineering. Not available for execution.
- **Testing:** The tool is deployed to staging environments or exposed to a restricted QA group for validation.
- **Active:** The tool is fully operational, publicly discoverable (based on visibility rules), and executing production workloads.
- **Deprecated:** The tool is operational but marked for impending removal. New executions may be discouraged, and users are routed to successors if available.
- **Retired:** The tool is permanently disabled. It is removed from discovery registries, and execution endpoints return a terminal status.

This lifecycle ensures that the platform never accumulates abandoned or undocumented utilities.

---

## 18.A.13 Tool Versioning Strategy

Tools inevitably evolve as academic rules change or AI orchestration logic improves. The architecture mandates strict version management for all tools to guarantee execution stability.

- **Major Version (e.g., v2.0):** Indicates structural changes to the tool's required inputs, payload schemas, or core execution behavior. Breaks backward compatibility.
- **Minor Version (e.g., v1.1):** Introduces new optional parameters or internal processing optimizations without breaking existing integration contracts.
- **Patch Version (e.g., v1.0.1):** Bug fixes, copy changes, or minor algorithmic adjustments.

The architecture must support the **coexistence of multiple major versions** when necessary. For instance, if an updated GPA Calculator requires an entirely new academic framework, `v1.0` and `v2.0` may run concurrently to allow a phased migration of existing users or partner integrations without disruption.

---

## 18.A.14 Feature Flag Strategy

Absolute operational control over the tool catalog requires a robust feature flag strategy. Every tool, regardless of its lifecycle status, may be enabled or disabled dynamically at runtime without requiring code deployments.

Feature management is strictly controlled by the Administration Portal and supports the following scenarios:

- **Enable/Disable:** Global binary toggle for instantaneous tool activation or suspension.
- **Region-based Availability:** Restricting tool access to specific geographic origins (e.g., specific scholarship compliance tools).
- **Language-based Availability:** Disabling a tool if localized models or content are temporarily unavailable.
- **Role-based Availability:** Exposing tools exclusively to specific user cohorts (e.g., VIP students, Academic Advisors).
- **Maintenance Mode:** Gracefully suspending execution while displaying a scheduled downtime notice to users.

---

## 18.A.15 Tool Dependency Matrix

Tools are orchestrators; they rarely exist in isolation. To guarantee systemic stability, the architecture mandates that tools explicitly declare their enterprise dependencies.

The dependency philosophy tracks the operational chain required to execute a tool. For example, a CV Builder tool's dependency matrix would explicitly declare:

**CV Builder**
↓
**Enterprise Student Platform (Phase 15):** To fetch the user's base profile.
↓
**Enterprise AI Platform (Phase 17):** To generate professional summaries and perform multilingual translation execution.
↓
**Phase 07 - Enterprise Reference Data:** To supply country, currency, and language code reference schemas.
↓
**Phase 05 - Enterprise Asset Platform (EAP):** To save and reference the generated PDF/document outputs as a persistent asset utilizing AssetId and AssetReference.

Explicit declaration of this matrix ensures that if a downstream platform experiences an outage (e.g., Enterprise Reference Data), the Administration Portal can instantly identify and gracefully degrade the dependent tools.

---

## 18.A.16 Tool Cost Classification

To support advanced operational monitoring, financial forecasting, and system optimization, the architecture introduces an operational execution classification for all tools.

- **Pure Calculation:** Executes entirely within the application layer using deterministic math (e.g., GPA Calculator). Near-zero cost, instantaneous execution.
- **External API:** Requires fetching data from a third-party non-AI service. Low cost, subject to external latency.
- **AI Delegation:** Dispatches a generative payload to Phase 17. High computational cost, variable latency, incurs token ledger charges.
- **Hybrid Execution:** Combines deterministic calculation with localized AI enrichment.
- **Heavy Processing:** Requires significant asynchronous background computation (e.g., generating and rendering a massive PDF portfolio).

This classification allows administrators to align tool availability with infrastructure scaling policies and financial budgets.

---

## 18.A.17 Tool Registry Governance

The Tool Registry is the authoritative, centralized catalog for all enterprise tools governed by Phase 18. It expands upon basic tool lists to enforce strict governance protocols.

The Registry governs:

- **Tool Registration:** The formal onboarding of a new tool definition into the ecosystem.
- **Tool Discovery:** Exposing the catalog to presentation layers (Student Portal, Public Site) via dynamic queries.
- **Tool Activation/Deactivation:** The enforcement engine for the Feature Flag Strategy.
- **Tool Configuration:** Managing environment variables, rate limits, and threshold parameters specific to a tool.
- **Tool Ownership:** Documenting the internal product or engineering team responsible for the tool's lifecycle.
- **Tool Retirement:** The systematic process of offboarding a tool from the registry.

---

## 18.A.18 Tool Health Model

To assist administrators in monitoring platform reliability, the architecture defines a standardized operational health model for all tools. A tool's health status is dynamically calculated based on its dependency matrix and execution telemetry.

- **Healthy:** The tool and all its declared dependencies are operating normally with acceptable latency.
- **Warning:** The tool is functioning, but experiencing elevated latency, minor execution errors, or degradation in non-critical dependencies.
- **Degraded:** Core functionality is impaired. The tool executes, but critical capabilities (e.g., AI delegation) are failing, triggering fallback behaviors.
- **Maintenance:** The tool has been administratively forced into a scheduled downtime state.
- **Offline:** The tool is completely unreachable, heavily failing, or has been administratively disabled due to a critical incident.

This health model integrates directly with the Administration Portal's operational dashboards, providing immediate visibility into the real-time stability of the Student Tools ecosystem.

---

## 18.A.19 Official Tool Registry Backlog

Phase 18 owns the official registry of student tools. This registry is a planning and governance backlog, not an implementation commitment for immediate coding. Tools may be visible to users as Active, Coming Soon, Under Development, Disabled, or Retired depending on lifecycle and feature flags.

Phase 18 owns tool definitions, tool metadata, input/output schemas, execution orchestration, lifecycle, visibility, and dependency declarations.
Phase 17 - Enterprise AI Platform owns all AI execution, prompts, models, provider routing, semantic reasoning, embeddings, safety filters, and token/cost governance.
Phase 24 - Enterprise Public Platform owns public tool page composition and visitor-facing presentation only.
Phase 15 - Enterprise Student Platform owns authenticated student workspace display, saved results, private history, and dashboard embedding.
Phase 23 - Enterprise Administration Portal owns admin screens for enabling/disabling tools, prioritization, moderation status, lifecycle status, visibility, and operational review.
Phase 05 - Core Implementation / Enterprise Asset Platform owns persisted generated files through AssetId / AssetReference.
Phase 19 - Enterprise Finance & Payments Platform owns payment execution if a tool becomes paid.
No new phase, Search Platform, Organizations Platform, Employers Platform, or Phase 25 may be introduced.

Admin/Internal tools in Phase 18 are support utilities only. Phase 18 does not own domain import schemas, domain validation rules, deduplication authority, enrichment authority, or publish-readiness decisions. Phase 06 - Import Foundation owns generic import mechanics only. Each downstream domain phase owns its own import schemas and business rules: Phase 10 - Major Platform owns major import rules, Phase 11 - Universities & Institutions owns university import rules, Phase 12 - Scholarships owns scholarship import rules, Phase 13 - Learning Platform owns course import rules. Phase 18 may assist through quality-check tools, duplicate review helpers, missing-data advisory tools, and admin-facing completeness checkers, but final authority remains with the owning domain and the admin governance flow.

| Tool Name | Tool Category | Execution Type | Primary Owner | AI Dependency | Public Availability | Authenticated Availability | Output Type | Data Dependencies | Launch Visibility | Implementation Priority | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Personal Statement Generator | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Document | Phase 10 | Active | P1 Core Launch | |
| Personal Statement Reviewer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 10 | Active | P1 Core Launch | |
| Motivation Letter Generator | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Document | Phase 11 | Active | P1 Core Launch | |
| Motivation Letter Reviewer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 11 | Active | P1 Core Launch | |
| Recommendation Letter Generator | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Document | None | Active | P1 Core Launch | |
| Recommendation Letter Reviewer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | None | Active | P1 Core Launch | |
| Scholarship Essay Generator | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Document | Phase 12 | Active | P1 Core Launch | |
| Scholarship Essay Reviewer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 12 | Active | P1 Core Launch | |
| Research Proposal Generator | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Document | Phase 10 | Active | P2 Expansion | |
| Research Proposal Reviewer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 10 | Active | P2 Expansion | |
| CV Builder | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Document/PDF | Phase 15 | Active | P1 Core Launch | |
| CV Analyzer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 15 | Active | P1 Core Launch | |
| CV Reviewer | AI Writing Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 15 | Active | P1 Core Launch | |
| Academic Translator | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text/Document | Phase 07 | Active | P1 Core Launch | |
| Academic Proofreader | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text | None | Active | P1 Core Launch | |
| Grammar Assistant | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text | None | Active | P1 Core Launch | |
| Academic Writing Assistant | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text | None | Active | P1 Core Launch | |
| Email Generator | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text | None | Active | P2 Expansion | |
| Email Improver | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text | None | Active | P2 Expansion | |
| Career Advisor | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 10 | Active | P1 Core Launch | |
| Major Advisor | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 10 | Active | P1 Core Launch | |
| University Advisor | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 11 | Active | P1 Core Launch | |
| Scholarship Advisor | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 12 | Active | P1 Core Launch | |
| Interview Coach | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | None | Under Development | P2 Expansion | |
| Interview Simulator | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Interactive | None | Under Development | P2 Expansion | |
| Research Assistant | AI Advisory Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | None | Under Development | P2 Expansion | |
| Study Strategy Generator | Planning Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Plan | None | Active | P2 Expansion | |
| Study Planner | Planning Tools | Deterministic | Phase 18 | None | Yes | Yes | Schedule | None | Active | P1 Core Launch | |
| Deadline Tracker | Planning Tools | Deterministic | Phase 18 | None | No | Yes | Dashboard | Phase 11/12 | Active | P1 Core Launch | |
| Timeline Planner | Planning Tools | Deterministic | Phase 18 | None | Yes | Yes | Plan | None | Active | P1 Core Launch | |
| Semester Planner | Planning Tools | Deterministic | Phase 18 | None | Yes | Yes | Plan | None | Active | P2 Expansion | |
| GPA Calculator | Academic Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | None | Active | P1 Core Launch | |
| GPA Planner | Academic Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | None | Active | P1 Core Launch | |
| Graduation GPA Predictor | Academic Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | None | Active | P1 Core Launch | |
| Grade Converter | Academic Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | Phase 07 | Active | P1 Core Launch | |
| Credit Hour Calculator | Academic Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | None | Active | P2 Expansion | |
| Admission Chance Calculator | Admissions & Readiness Tools | Deterministic | Phase 18 | None | Yes | Yes | Percentage/Score | Phase 11 | Active | P1 Core Launch | |
| Eligibility Checker | Admissions & Readiness Tools | Deterministic | Phase 18 | None | Yes | Yes | Status | Phase 11/12 | Active | P1 Core Launch | |
| Application Readiness Score | Admissions & Readiness Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | Score/Advisory | Phase 11/12 | Under Development | P2 Expansion | |
| Required Documents Checklist | Admissions & Readiness Tools | Deterministic | Phase 18 | None | Yes | Yes | Checklist | Phase 11/12 | Active | P1 Core Launch | |
| Document Validator | Validation Tools | Deterministic | Phase 18 | None | Yes | Yes | Status | None | Active | P1 Core Launch | |
| University Comparison | Comparison Tools | Deterministic | Phase 18 | None | Yes | Yes | Matrix | Phase 11 | Active | P1 Core Launch | |
| University Finder | Comparison Tools | Deterministic | Phase 18 | None | Yes | Yes | List | Phase 11 | Active | P1 Core Launch | |
| University Recommendation | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List/Advisory | Phase 11 | Active | P1 Core Launch | |
| Scholarship Comparison | Comparison Tools | Deterministic | Phase 18 | None | Yes | Yes | Matrix | Phase 12 | Active | P1 Core Launch | |
| Scholarship Recommendation | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List/Advisory | Phase 12 | Active | P1 Core Launch | |
| Country Comparison | Comparison Tools | Deterministic | Phase 18 | None | Yes | Yes | Matrix | Phase 07 | Active | P1 Core Launch | |
| Country Recommendation | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List/Advisory | Phase 07 | Active | P2 Expansion | |
| Living Cost Comparison | Comparison Tools | Deterministic | Phase 18 | None | Yes | Yes | Matrix | Phase 07 | Active | P1 Core Launch | |
| Tuition Comparison | Comparison Tools | Deterministic | Phase 18 | None | Yes | Yes | Matrix | Phase 11 | Active | P1 Core Launch | |
| Major Recommendation | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List/Advisory | Phase 10 | Active | P1 Core Launch | |
| Career Recommendation | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List/Advisory | Phase 10 | Active | P1 Core Launch | |
| Currency Converter | Financial Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | Phase 07 | Active | P1 Core Launch | |
| Tuition Calculator | Financial Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | Phase 11 | Active | P1 Core Launch | |
| Living Cost Calculator | Financial Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | Phase 07 | Active | P1 Core Launch | |
| Budget Planner | Financial Calculators | Deterministic | Phase 18 | None | Yes | Yes | Plan | Phase 07 | Active | P2 Expansion | |
| ROI Calculator | Financial Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | Phase 11 | Under Development | P2 Expansion | |
| Visa Requirement Checker | Educational Utilities | Deterministic | Phase 18 | None | Yes | Yes | Checklist | Phase 07 | Coming Soon | P2 Expansion | |
| Country Study Readiness Checklist | Educational Utilities | Deterministic | Phase 18 | None | Yes | Yes | Checklist | Phase 07 | Coming Soon | P2 Expansion | |
| Study Abroad Budget Estimator | Financial Calculators | Deterministic | Phase 18 | None | Yes | Yes | Calculation | Phase 07 | Coming Soon | P2 Expansion | |
| Travel Preparation Checklist | Educational Utilities | Deterministic | Phase 18 | None | Yes | Yes | Checklist | Phase 07 | Coming Soon | P2 Expansion | |
| Work While Studying Checker | Educational Utilities | Deterministic | Phase 18 | None | Yes | Yes | Status | Phase 07 | Coming Soon | P2 Expansion | |
| Scholarship Name Cleaner | Admin/Internal Quality Tools | Hybrid | Phase 18 | Phase 17 | No | No | String/Review | Phase 12 | Hidden/Admin Only | P2 Expansion | |
| Scholarship Duplicate Detector | Admin/Internal Quality Tools | Hybrid | Phase 18 | Phase 17 | No | No | Review List | Phase 12 | Hidden/Admin Only | P2 Expansion | |
| University Duplicate Detector | Admin/Internal Quality Tools | Hybrid | Phase 18 | Phase 17 | No | No | Review List | Phase 11 | Hidden/Admin Only | P2 Expansion | |
| Major Matching Tool | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List/Advisory | Phase 10 | Coming Soon | P2 Expansion | |
| Major Skill Fit Checker | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | Score/Advisory | Phase 10 | Coming Soon | P2 Expansion | |
| University Admission Requirement Matcher | Admissions & Readiness Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | Matrix | Phase 11 | Coming Soon | P2 Expansion | |
| Course Path Builder | Planning Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | Plan | Phase 13 | Coming Soon | P2 Expansion | |
| Free Course Certificate Checker | Validation Tools | Deterministic | Phase 18 | None | Yes | Yes | Status | Phase 13 | Coming Soon | P2 Expansion | |
| Course Language Filter Assistant | Recommendation Tools | Hybrid | Phase 18 | Phase 17 | Yes | Yes | List | Phase 13 | Coming Soon | P2 Expansion | |
| Learning Goal Planner | Planning Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Plan | Phase 13 | Coming Soon | P3 Later | |
| Document Completeness Checker | Validation Tools | Deterministic | Phase 18 | None | Yes | Yes | Status | Phase 05 | Coming Soon | P2 Expansion | |
| Application Package Builder | Productivity Tools | Deterministic | Phase 18 | None | Yes | Yes | Document | Phase 05 | Coming Soon | P2 Expansion | |
| Translation Quality Checker | Validation Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Advisory Text | Phase 07 | Coming Soon | P2 Expansion | |
| Interview Question Generator | Productivity Tools | AI-Delegated | Phase 18 | Phase 17 | Yes | Yes | Text | None | Coming Soon | P2 Expansion | |
| Scholarship Import Completeness Checker | Admin/Internal Quality Tools | Admin/Internal | Phase 18 | None | No | No | Review List | Phase 12 | Hidden/Admin Only | P2 Expansion | |
| University Import Completeness Checker | Admin/Internal Quality Tools | Admin/Internal | Phase 18 | None | No | No | Review List | Phase 11 | Hidden/Admin Only | P2 Expansion | |
| Major Import Completeness Checker | Admin/Internal Quality Tools | Admin/Internal | Phase 18 | None | No | No | Review List | Phase 10 | Hidden/Admin Only | P2 Expansion | |
| Course Import Completeness Checker | Admin/Internal Quality Tools | Admin/Internal | Phase 18 | None | No | No | Review List | Phase 13 | Hidden/Admin Only | P2 Expansion | |
| Imported Record Deduplication Reviewer | Admin/Internal Quality Tools | Admin/Internal | Phase 18 | None | No | No | Review List | All Domains | Hidden/Admin Only | P2 Expansion | |
| Missing Data Fetch Assistant | Admin/Internal Quality Tools | Hybrid | Phase 18 | Phase 17 | No | No | Advisory Data | All Domains | Hidden/Admin Only | P2 Expansion | |
| Source Trust Score Reviewer | Admin/Internal Quality Tools | Admin/Internal | Phase 18 | None | No | No | Review List | All Domains | Hidden/Admin Only | P2 Expansion | |

---

## 18.A.20 Enterprise Review & Acceptance

### 18.A.20.1 Architecture Review

This specification has been reviewed against the MANARATAK 2.0 Master Blueprint and the Phase 17 Enterprise AI Platform boundaries. It successfully resolves the requirement for a unified, highly scalable student tooling suite while strictly respecting the enterprise's centralized AI ownership model.

### 18.A.20.2 Acceptance Criteria

- [x] Absolute decoupling of Student Tools from AI Infrastructure (Phase 17) is defined.
- [x] The complete catalog of AI and Utility tools is documented.
- [x] The AI Consumer Pattern is formally established.
- [x] In-Scope and Out-of-Scope boundaries are explicitly defined.
- [x] The stateless, pluggable architecture pattern is established.
- [x] Enterprise Tool Taxonomy and Tool Metadata Standards are formally defined.
- [x] Lifecycle, versioning, feature flags, and health models guarantee strict governance.

### 18.A.20.3 Architecture Review Checklist

- **Clean Architecture Compliant:** Yes. Phase 18 sits as an application/orchestration layer consuming core domain platforms.
- **Zero Upward Dependency:** Yes. No lower-level core domain depends on Phase 18.
- **SSoT Maintained:** Yes. Phase 18 owns the Tool definitions, but consumes academic data from established SSoT domains.

### 18.A.20.4 ARB Decision

- **Decision:** APPROVED
- **Status:** BASELINED
- **Next Steps:** Proceed to Phase 18 Part B (Domain Contracts) and Part C (Implementation Guide).

---

## Navigation

- **Previous Phase:** [Phase 17 - Enterprise AI Platform Architecture Specification](../phase-17-enterprise-ai-platform/phase-17-01-enterprise-ai-platform-architecture-specification.md)
- **Current Artifact:** **Phase 18 Part A - Architecture Specification** (This File)
- **Next Artifact:** [Phase 18 Part B - Domain Contracts](phase-18-02-enterprise-student-tools-platform-domain-contracts.md)
