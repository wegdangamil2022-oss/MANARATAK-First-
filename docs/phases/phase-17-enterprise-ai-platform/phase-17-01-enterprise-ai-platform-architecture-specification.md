# Phase 17

### Executive Summary

A concise architectural overview explaining:

- **Why this phase exists:** Provides the foundational capabilities required for this domain within the MANARATAK ecosystem.
- **What enterprise capability it introduces:** Establishes the core enterprise contracts, services, and integration boundaries for this specific platform.
- **How it fits into the overall architecture:** Acts as a strictly decoupled domain platform that consumes upstream foundations and provides standardized contracts to downstream consumers without violating ownership boundaries.

# Part A

# Enterprise AI Platform Architecture Specification

## 17.A.1 Executive Summary

The Enterprise AI Platform (Phase 17) represents a fundamental pillar of the MANARATAK 2.0 ecosystem, designed to centrally govern, manage, and execute all Artificial Intelligence capabilities across the enterprise. In strict compliance with ADR-004, this platform acts as the single, exclusive owner of AI infrastructure, prompt management, model orchestration, and AI-driven workflows. By isolating AI concerns from core business domains, the architecture guarantees consistent governance, robust security, provider independence, and scalable inference management, while enabling business platforms to seamlessly consume advanced intelligent services through standardized, read-only enterprise contracts.

## 17.A.2 Vision

To establish a resilient, provider-agnostic, and centrally governed Enterprise AI Foundation that empowers the entire MANARATAK ecosystem with state-of-the-art intelligence while rigorously protecting data privacy, architectural boundaries, and enterprise compliance.

## 17.A.3 Mission

To deliver a secure, highly available, and easily consumable suite of Artificial Intelligence services that abstract the complexities of Large Language Models (LLMs), semantic embeddings, and machine learning inferences away from business domains, ensuring that AI acts as a reliable, governed utility across the enterprise.

## 17.A.4 Enterprise Objectives

- **Centralized AI Governance**: Enforce unified security, privacy, and responsible AI policies across all intelligent operations.
- **Architectural Purity**: Protect business domains from technical debt and vendor lock-in associated with rapidly evolving AI technologies.
- **Cost & Usage Optimization**: Provide holistic visibility and control over enterprise AI token consumption and infrastructure costs.
- **Rapid Capability Deployment**: Enable the rapid integration of new AI capabilities (e.g., semantic search, automated translation) without requiring modifications to consuming business platforms.
- **Seamless Extensibility**: Architect a foundation that can effortlessly adapt to future advancements in AI models and methodologies.

## 17.A.5 Scope

The Enterprise AI Platform is responsible for the complete lifecycle of Artificial Intelligence execution. The scope includes:

- The Enterprise AI Gateway.
- Provider Abstraction and Routing mechanisms.
- Prompt Lifecycle Management (creation, versioning, storage, and cataloging).
- Model Registry and dynamic selection logic.
- AI Workflow orchestration.
- Safety, Guardrails, and PII (Personally Identifiable Information) Redaction.
- Auditing, Monitoring, Rate Limiting, and Cost Tracking for all AI operations.
- Core AI Capabilities: Summarization, Translation, Semantic Embedding, Classification, and Recommendation generation.

## 17.A.6 Out of Scope

To maintain strict domain boundaries, the following are explicitly out of scope for the Enterprise AI Platform:

- **Business Rules**: The AI platform does not own or evaluate Scholarship eligibility, University accreditation, or Course prerequisites.
- **Domain Data Ownership**: The AI platform does not own canonical student profiles, learning histories, or CMS content. It operates on transient payloads or projected read models.
- **Human Workflows**: The AI platform does not implement editorial approval pipelines (Maker-Checker). It provides advisory outputs that are approved within the consuming domains.
- **Direct UI Integration**: The AI platform does not serve user interfaces directly to students or administrators. It exposes headless APIs consumed by backend business platforms.

## 17.A.7 Architecture Principles

- **Single AI Ownership**: All AI infrastructure and logic reside exclusively within this platform (ADR-004).
- **AI as Enterprise Capability**: AI is treated as a shared, highly available enterprise utility.
- **Provider Independence**: The platform must abstract all external AI providers to prevent vendor lock-in and enable seamless failover.
- **Technology Neutrality**: The architectural design remains independent of specific frameworks, databases, or model implementations.
- **Human Governance**: All AI-generated transactional or published content remains strictly advisory until validated by human-in-the-loop workflows within the consuming domains.
- **Security by Design**: Every AI request is subject to strict authentication, authorization, and data redaction before processing.
- **Auditability**: Every AI inference, including the exact prompt used, model version, and output, must be immutable and fully auditable.
- **Scalability**: The platform must horizontally scale to handle fluctuating enterprise-wide inference demands.
- **Extensibility**: The architecture must support the dynamic addition of new models, capabilities, and prompt templates.
- **Prompt Standardization**: Prompts are treated as first-class, versioned enterprise assets.
- **Responsible AI**: Built-in mechanisms to detect bias, prevent hallucinations, and ensure ethical AI usage.

## 17.A.8 Responsibilities

The Enterprise AI Platform exercises absolute ownership over the following components and services:

- **AI Gateway**: The central ingress point routing all enterprise AI requests.
- **Provider Abstraction**: Adapters that normalize interactions with disparate external AI providers.
- **Prompt Management**: The overarching governance of prompt engineering.
- **Prompt Templates**: The canonical storage of parameterized prompt structures.
- **Prompt Versioning**: Immutable tracking of prompt modifications.
- **Prompt Catalog**: A searchable registry of approved enterprise prompts.
- **Model Registry**: A catalog of available AI models, their capabilities, and approved use cases.
- **Model Selection**: Dynamic routing to the optimal model based on capability requirements, cost constraints, and availability.
- **Inference Management**: Execution, timeout handling, and retry logic for AI requests.
- **Embedding Services**: Generation and management of vector representations for text and media.
- **Semantic Services**: Orchestration of similarity matching and semantic retrieval.
- **Translation Services**: Enterprise-grade automated localization and multi-language text generation.
- **Summarization Services**: Distillation of large text payloads into concise formats.
- **Content Generation**: Drafting of unstructured and structured textual content.
- **Classification**: Taxonomy mapping, tagging, and sentiment analysis.
- **Recommendation Execution**: The computational execution of personalized matching algorithms.
- **AI Workflows**: Orchestration of multi-step, complex AI tasks (e.g., summarize then translate).
- **AI Evaluation**: Systemic validation of model output quality against expected schemas.
- **AI Safety**: Implementation of guardrails, PII redaction, and toxicity filtering.
- **AI Policies**: Enforcement of enterprise rules governing AI usage and data transmission.
- **Usage Tracking**: Centralized telemetry for token consumption across all models.
- **Cost Monitoring**: Budget tracking and allocation per consuming business domain.
- **Audit Logs**: Immutable recording of all AI interactions for compliance and debugging.
- **Rate Limiting**: Protection of external API quotas and internal infrastructure through request throttling.
- **Caching**: Semantic and exact-match caching of AI responses to reduce latency and cost.
- **Fallback Strategy**: Automated degradation and failover to secondary models during primary outages.
- **Monitoring**: Real-time observability of AI platform health, latency, and error rates.
- **Health Checks**: Continuous verification of both internal services and external provider availability.

## 17.A.9 Non-Responsibilities

The Enterprise AI Platform strictly does NOT own:

- **Scholarship Business Logic**: Rules defining who receives financial aid.
- **University Business Logic**: Criteria for institutional partnerships.
- **CMS Workflows**: The editorial publishing lifecycle and content state management.
- **Search Business Rules**: The primary indexing logic or presentation of search results.
- **Recommendation Business Rules**: The contextual logic determining _when_ or _where_ a recommendation is displayed to a user.
- **Import Logic**: The mapping of legacy external data schemas to the enterprise taxonomy.
- **Taxonomy Logic**: The structural governance of academic disciplines and majors.
- **Student Logic**: The management of student profiles, privacy settings, and applications.
- **Learning Logic**: The tracking of course progress, assessments, and curriculum structure.

## 17.A.10 Ownership Boundaries

The architectural boundaries are absolute. The Enterprise AI Platform operates as a distinct Bounded Context interacting with the rest of the enterprise:

- **Enterprise AI Platform vs. Phase 12 — Scholarships**: The AI Platform computes profile matching, likelihood scoring, and advisory recommendations. Phase 12 — Scholarships owns the scholarship definitions, canonical eligibility rules, application states, and final evaluation decisions. Consuming domains decide how advisory recommendations are applied.
- **Enterprise AI Platform vs. Phase 11 — Universities & Institutions**: The AI Platform provides semantic institutional mapping and institutional suggestions. Phase 11 — Universities & Institutions owns the canonical institutional data, ranking structures, tuition records, and academic program definitions.
- **Enterprise AI Platform vs. Phase 13 — Learning Platform**: The AI Platform generates tags, extracts skills, and generates advisory course suggestions. Phase 13 — Learning Platform owns canonical course entities, lessons, learning progress, curriculum structure, enrollment, syllabus metadata, and final course state.
- **Enterprise AI Platform vs. Phase 16 — Enterprise CMS**: The AI Platform drafts translations, summaries, and tags. Phase 16 — Enterprise CMS strictly owns the editorial review, Maker-Checker approval pipelines, publishing, archival, and final CMS content state. AI outputs are advisory until approved inside the consuming domain workflow.
- **Enterprise AI Platform vs. Phase 24 — Enterprise Public Platform**: Phase 17 may provide content suggestions or advisory recommendations, but Phase 24 — Enterprise Public Platform strictly owns final public page assembly, visitor-facing routing, and composes public page layouts. It may display public recommendation sections only through approved public read models.
- **Enterprise AI Platform vs. Search and Indexing Consumers**: The AI Platform generates vector embeddings and semantic search vectors. Phase 17 does not own global search UI, global search routing, or final search result presentation. Search consumers are described generically or reside in their respective functional domains.
- **Enterprise AI Platform vs. Phase 15 — Enterprise Student Platform**: The AI Platform computes behavioral telemetry and personalized recommendation scores. Phase 15 — Enterprise Student Platform owns student profiles, student workspace data, the student timeline, and displays personalized recommendations inside the authenticated student workspace.
- **Enterprise AI Platform vs. Phase 06 — Import Foundation**: The AI Platform may suggest classifications or schema mappings during imports. Phase 06 — Import Foundation owns generic import orchestration and mechanics, while each downstream domain owns its own import schema, mapping, and validation rules.
- **Enterprise AI Platform vs. Enterprise Analytics**: The AI Platform provides raw inference telemetry; generic enterprise analytics systems aggregate it for business intelligence and reporting without passing sensitive user payloads.
- **Enterprise AI Platform vs. Notification Delivery**: The AI Platform may draft automated notification content (advisory); generic notification systems own delivery, scheduling, and channel routing.

## 17.A.11 Privacy and Data Ownership Rules

- **Payload Minimization**: Phase 17 processes the minimum necessary payload required for inference execution and strictly must not persist canonical business records.
- **Sanitized Audit Trails**: Audit logs and usage tracking databases must avoid storing raw sensitive payloads or PII unless they are explicitly redacted, tokenized, and governed.
- **No Direct Vendor Bypass**: No business domain may bypass the AI Gateway to call external AI providers directly. All intelligent inferences must route through Phase 17 for safety filtering and policy enforcement.

## 17.A.12 Consumer Model

Business domains interact with the Enterprise AI Platform exclusively as Consumers.

- **Consumers**: Any enterprise platform requiring intelligent capabilities.
- **Service Boundaries**: Interactions occur exclusively over network boundaries using standardized protocols (e.g., gRPC, REST, or Async Events).
- **Public Interfaces**: The AI platform exposes explicit, versioned contracts defining request schemas and guaranteed response structures.
- **Isolation**: Consumers have no visibility into the underlying models, prompts, or orchestration logic. They treat the AI platform as a black box.
- **Dependency Direction**: The dependency is strictly unidirectional. Business platforms depend on the AI platform. The AI platform does NOT depend on business platforms; it relies solely on the data provided in the request payload or pre-approved Read Models.

## 17.A.13 AI Capability Catalog

The platform provides a standardized catalog of capabilities, abstracted from the underlying models:

- **Generative Text (Drafting)**: Creation of prose, articles, and descriptions based on contextual parameters.
- **Semantic Translation**: High-fidelity, context-aware translation across supported enterprise locales.
- **Document Summarization**: Extractive and abstractive summarization of long-form content.
- **Data Classification**: Categorization of unstructured text into predefined enterprise taxonomies.
- **Entity Extraction**: Identification of skills, dates, locations, and proper nouns from raw text.
- **Vectorization (Embeddings)**: Transformation of text into mathematical vectors for semantic comparison.
- **Predictive Recommendations**: Scoring and ranking of entities (courses, scholarships) against user profiles.
- **Content Moderation**: Automated detection of PII, toxicity, and policy violations in textual inputs.

## 17.A.14 AI Governance

- **Governance Model**: A federated model where the AI Platform owns the infrastructure and safety enforcement, while business domains govern the final application of AI outputs.
- **Approval Model**: All transactional or user-facing AI outputs are classified as _Advisory_ and mandate explicit human or domain-workflow approval before canonical persistence.
- **Prompt Governance**: Prompts are treated as source code. Changes require peer review, testing against regression suites, and formal deployment pipelines.
- **Model Governance**: The introduction of new AI models requires architectural review, security assessment, and compliance sign-off.
- **Security Governance**: Mandatory PII redaction and enterprise IAM validation on every request.
- **Risk Governance**: Continuous monitoring for model drift, hallucination rates, and bias propagation.
- **Compliance Governance**: Strict adherence to data residency requirements, ensuring sensitive data is not transmitted to unauthorized geographical regions.

## 17.A.15 Enterprise Security Model

The Enterprise AI Platform operates on a Zero-Trust architecture.

- **Authentication**: All requests must be authenticated via the Enterprise Identity Platform using service-to-service tokens.
- **Authorization**: Granular RBAC (Role-Based Access Control) ensures platforms can only access the specific AI capabilities they are provisioned for.
- **Data Masking**: Automatic, pre-inference redaction of sensitive information to prevent data leakage to external model providers.
- **Network Isolation**: The AI Platform resides in a protected subnet, incapable of being accessed directly from the public internet.

## 17.A.16 Privacy Principles

- **Data Minimization**: The platform only transmits the absolute minimum data required for inference.
- **No Training on Customer Data**: Explicit contractual enforcement ensuring external AI providers do not use enterprise payloads for model training.
- **Ephemeral Processing**: Request payloads are held in memory only for the duration of the inference and are not permanently stored outside of secure audit logs.

## 17.A.17 Responsible AI Principles

- **Transparency**: AI-generated content must be tagged with metadata indicating its origin.
- **Accountability**: A clear audit trail linking every AI output to the requesting domain, the specific prompt version, and the model used.
- **Fairness**: Implementation of bias-detection guardrails to prevent discriminatory recommendations.
- **Reliability**: Robust fallback mechanisms to guarantee consistent service even when primary models fail.

## 17.A.18 AI Lifecycle

The lifecycle of an AI asset (Model or Prompt) encompasses:

1.  **Ideation & Prototyping**: Development in isolated sandbox environments.
2.  **Validation**: Testing against standardized benchmark datasets for accuracy and safety.
3.  **Registration**: Formal cataloging in the Model Registry or Prompt Catalog.
4.  **Deployment**: Controlled rollout (e.g., shadow mode, canary releases).
5.  **Monitoring**: Continuous observation of performance, cost, and drift.
6.  **Retirement**: Graceful deprecation of obsolete models or prompts with automated routing to successors.

## 17.A.19 Request Processing Lifecycle

A standard synchronous AI request follows this strict lifecycle:

1.  **Ingress & Authentication**: The AI Gateway receives the request and validates the consumer's identity.
2.  **Authorization & Throttling**: Verifies the consumer's quota and rate limits.
3.  **Validation & Redaction**: The request payload is validated against schemas, and PII is scrubbed.
4.  **Prompt Resolution**: The Gateway fetches the appropriate Prompt Template and injects the sanitized payload.
5.  **Model Routing**: The system selects the optimal external provider or internal model based on registry configuration.
6.  **Inference Execution**: The request is dispatched via the Provider Abstraction layer.
7.  **Guardrail Verification**: The raw response is evaluated for schema conformity, toxicity, and hallucinations.
8.  **Post-Processing**: Redacted PII tokens are re-injected, and the response is formatted.
9.  **Auditing & Telemetry**: Token usage, latency, and the transaction record are logged asynchronously.
10. **Egress**: The finalized, safe response is returned to the consuming domain.

## 17.A.20 Provider Independence Strategy

The architecture mandates a strict isolation layer (Provider Abstraction) between enterprise logic and external AI vendors. The platform communicates through generic interfaces (e.g., `IGenerativeModel`, `IEmbeddingModel`). Vendor-specific SDKs and API quirks are encapsulated entirely within dedicated adapter modules, allowing the enterprise to switch providers seamlessly via configuration without recompiling core platform logic.

## 17.A.21 Scalability Strategy

The platform is designed for horizontal scalability. Stateless gateway nodes, isolated adapter instances, and decentralized caching mechanisms allow the system to elastically expand compute resources in response to inference spikes, ensuring consistent throughput across the enterprise.

## 17.A.22 High Availability Strategy

To guarantee uninterrupted service, the platform employs:

- Multi-region deployment of stateless components.
- Active-active load balancing.
- Redundant external provider configurations (Primary/Secondary/Tertiary).
- Circuit breakers to prevent cascading failures during provider outages.

## 17.A.23 Fault Tolerance Strategy

- **Graceful Degradation**: If advanced reasoning models are unavailable, the platform automatically falls back to faster, lower-tier models or heuristic algorithms.
- **Retry Mechanisms**: Transient network failures to external providers are handled with exponential backoff and jitter.
- **Semantic Caching**: In the event of a total provider outage, the platform serves historically cached semantic responses where applicable.

## 17.A.24 Observability Strategy

The platform provides deep transparency into AI operations:

- **Distributed Tracing**: Every AI request is tagged with a unique correlation ID, tracing its path from the consumer through the gateway to the external provider and back.
- **Structured Logging**: Comprehensive logs detailing prompt versions, model selections, and guardrail interventions.

## 17.A.25 Monitoring Strategy

Continuous monitoring focuses on critical AI-specific metrics:

- **Latency Distributions**: Tracking time-to-first-token and total inference time.
- **Error Rates**: Identifying schema validation failures, provider timeouts, and guardrail rejections.
- **Drift Detection**: Alerting on statistical deviations in model output confidence over time.

## 17.A.26 Performance Principles

- **Cache First**: The platform aggressively caches frequent queries (e.g., taxonomy classifications, common translations) using vector similarity thresholds to bypass expensive inferences.
- **Stream by Default**: For long-form generative tasks, the platform supports streaming responses to improve perceived latency for end-users.
- **Payload Optimization**: Prompts are continuously engineered to maximize information density while minimizing token count.

## 17.A.27 Cost Governance

AI compute and token consumption represent significant enterprise expenses. The platform ensures:

- **Hard Budgets**: Enforceable spending limits per business domain.
- **Tiered Routing**: Low-complexity tasks (e.g., basic classification) are routed to inexpensive, fast models, reserving high-cost, advanced models strictly for complex reasoning tasks (e.g., personalized career pathing).
- **Telemetry Dashboards**: Real-time visibility into token usage, broken down by consumer, capability, and model.

## 17.A.28 Extensibility Strategy

The platform utilizes a plugin-based architecture for Provider Adapters and Guardrail Validators. New models, providers, or compliance filters can be dynamically registered into the pipeline without modifying the core AI Gateway or disrupting existing consumer contracts.

## 17.A.29 Versioning Strategy

- **Contract Versioning**: Public APIs consumed by business domains follow strict semantic versioning.
- **Prompt Versioning**: Every modification to a prompt creates a new immutable version. Consumers can specify exact prompt versions or subscribe to the "latest stable" alias.
- **Model Versioning**: Explicit pinning to specific model versions (preventing silent provider updates from altering enterprise behavior) with planned migration windows for deprecations.

## 17.A.30 Enterprise Compliance

The architecture is designed to comply with global data protection regulations. The PII redaction engine ensures that sensitive student or enterprise data is anonymized before leaving the enterprise boundary. All audit logs are retained in accordance with legal data lifecycle policies.

## 17.A.31 Architecture Constraints

- The AI Platform MUST NOT persist business state.
- Business domains MUST NOT bypass the AI Gateway to access models directly.
- All AI interactions MUST be asynchronous or decoupled via timeouts to prevent external provider latency from blocking transactional business threads.

## 17.A.32 Future Evolution

The architecture lays the groundwork for future advancements:

- Integration of Multi-Modal capabilities (Image/Video generation and analysis).

## 17.A.33 Risks

- **External Dependency**: High reliance on third-party provider availability and pricing stability (Mitigated by Provider Independence Strategy).
- **Non-Deterministic Outputs**: The inherent unpredictability of generative models (Mitigated by strict Guardrails and Human-in-the-Loop workflows).
- **Latency Spikes**: Unpredictable inference times from external APIs (Mitigated by asynchronous processing and strict circuit breakers).

## 17.A.34 Assumptions

- Enterprise Identity and Event Bus platforms are fully operational and accessible.
- Business domains are architected to handle eventual consistency and asynchronous advisory responses.
- Sufficient enterprise network bandwidth exists to support high-volume textual and vector data transfer.

## 17.A.35 Architecture Review

- **Status**: Baselined Architecture Specification
- **Review Authority**: Architecture Review Board (ARB)
- **Compliance Alignment**: Fully aligned with ADR-003 and ADR-004.

## Enterprise Integration

This section describes how this platform exposes its capabilities and interacts with the broader enterprise.

- **Integration Model:** Synchronous APIs (REST/gRPC) and Asynchronous messaging (BullMQ/Redis/Events).
- **Published Contracts:** The official interfaces, DTOs, and APIs exposed to consumers.
- **Consumed Contracts:** The official interfaces and APIs this phase consumes from upstream platforms.
- **Events:** The domain and integration events published to the Enterprise Event Bus.
- **Read Models:** The optimized data structures provided for high-performance querying (CQRS).
- **Enterprise Communication Rules:** Guidelines for reliable, resilient, and secure communication.

### Architecture Constraints

- **No Business Logic (if applicable):** Must not contain tenant-specific business rules unless explicitly defined as a business domain.
- **No Ownership Violations:** Strict adherence to aggregate roots; entities must not bypass defined boundaries.
- **No Circular Dependencies:** Circular references between modules or phases are strictly prohibited.
- **No Direct Database Access:** All data access must occur through defined domain repositories.
- **No Upward Dependencies:** The platform must remain ignorant of downstream consumers.
- **Technology Neutrality:** Domain contracts must remain agnostic to underlying physical technologies.
- **ADR Compliance:** All deviations must be documented and approved via Architecture Decision Records.

### Acceptance Criteria

- All architecture constraints are met.
- Domain boundaries are strictly enforced.

### Deliverables

- Architecture Specification (Part A)
- Domain Contracts (Part B)
- Implementation Guide (Part C)

### Architecture Review Checklist

- [x] Requirements met?
- [x] Dependencies validated?
- [x] Security reviewed?
- [x] Performance criteria defined?

### ARB Decision

- **Status:** Approved
- **Date:** July 24, 2026
- **Approver:** ARB

### Status

- **Current Status:** Baselined Architecture Specification

---

## Navigation

- **Previous:** [Phase 16 — Enterprise CMS](../phase-16-enterprise-cms/phase-16-01-enterprise-cms-architecture-specification.md)
- **Next:** [Phase 18 — Enterprise Student Tools Platform](../phase-18-enterprise-student-tools-platform/phase-18-01-architecture-specification.md) (or corresponding baseline)
