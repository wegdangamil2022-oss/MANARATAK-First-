# ADR-004

Title: Enterprise AI Platform as the Single Owner of AI Capabilities
Status: Accepted
Date: 2026-07-21
Authors: Lead Architect (AI Agent)
Reviewers: Architecture Review Board (ARB), Chief Enterprise Software Architect
Decision Authority: Architecture Review Board (ARB)
Related Phases: All Phases (Phase 01 - Phase 16), Phase 17
Related ADRs: ADR-003
Superseded Decisions: None

## 2. Context

The MANARATAK 2.0 enterprise ecosystem encompasses multiple autonomous business domains (e.g., Scholarships, Universities, Courses, CMS, Student Profiles). As Artificial Intelligence capabilities become a core requirement across these domains, there is a risk of architectural fragmentation. If each business domain is permitted to implement or own its own AI capabilities, the enterprise will suffer from duplicated integrations, fragmented governance, and long-term maintenance risks. An inconsistent approach to AI across the ecosystem violates the principles of Clean Architecture and Domain-Driven Design (DDD) by allowing cross-cutting technical concerns to pollute business logic.

## 3. Problem Statement

Allowing decentralized AI ownership across business domains introduces critical systemic problems:

- **Duplicate AI provider integrations**: Multiple domains integrating with the same or different external AI providers.
- **Multiple Prompt Engines**: Redundant implementation of prompt resolution and injection logic.
- **Multiple Prompt Libraries**: Decentralized and unversioned prompt storage leading to inconsistent AI behavior.
- **Multiple AI Policies**: Inconsistent enforcement of AI safety, PII redaction, and compliance rules.
- **Inconsistent governance**: Lack of centralized auditing, tracking, and approval workflows for AI outputs.
- **Increased operational complexity**: Higher cognitive load for operations teams monitoring multiple AI implementations.
- **Vendor lock-in**: Difficulty in swapping underlying AI providers if integrations are scattered across business domains.
- **Fragmented monitoring**: Inability to track holistic AI token usage, costs, and performance metrics.
- **Duplicate AI infrastructure**: Waste of computational and engineering resources.

## 4. Decision

The Enterprise AI Platform is the single and exclusive owner of all Artificial Intelligence capabilities within MANARATAK.

No business domain may implement, embed, orchestrate, or own AI infrastructure, model integrations, prompt management, or AI business services.

All domains consume AI capabilities exclusively through the Enterprise AI Platform using approved public contracts.

## 5. Decision Details

The Enterprise AI Platform has absolute ownership of the following capabilities and infrastructure:

- **AI Gateway**: The central proxy routing all AI requests.
- **Provider Integrations**: Abstractions and adapters for all external AI models and APIs.
- **Model Registry**: Centralized catalog of approved AI models and their capabilities.
- **Prompt Management**: Centralized lifecycle management for prompts.
- **Prompt Templates**: The canonical storage of all structural prompt definitions.
- **Prompt Versioning**: Immutable history of prompt changes.
- **AI Workflows**: Complex orchestration of multi-step AI tasks.
- **AI Policies**: Enforcement of enterprise rules regarding AI usage.
- **AI Safety**: PII redaction, schema validation, and hallucination guardrails.
- **AI Evaluation**: Systemic testing and quality assurance of model outputs.
- **AI Usage Tracking**: Centralized telemetry for all AI operations.
- **AI Cost Monitoring**: Budgeting and token consumption tracking per domain.
- **AI Audit Logs**: Immutable records of AI requests, responses, and approvals.
- **AI Rate Limiting**: Protection against abuse and cost overruns.
- **Embedding Services**: Generation and management of vector embeddings.
- **Semantic Services**: Vector search and similarity matching orchestration.
- **Translation Services**: Automated localization text generation.
- **Summarization Services**: Distillation of large text payloads.
- **Content Generation Services**: Drafting and creation of unstructured content.
- **Classification Services**: Taxonomy mapping and tagging.
- **Recommendation Execution Services**: The calculation and generation of personalized suggestions.

## 6. Non-Responsibilities

The Enterprise AI Platform is strictly an enabler. It does NOT own canonical business data or domain-specific business rules. Explicit non-responsibilities include:

- Scholarship business rules and eligibility criteria.
- University business rules and institutional definitions.
- Course business rules and curriculum definitions.
- CMS editorial workflows, publishing states, and content ownership.
- Search business logic and the primary search index.
- Academic Taxonomy rules and hierarchy governance.
- Import business logic and provider mapping rules.
- Recommendation business rules (e.g., deciding _when_ a recommendation is appropriate).

## 7. Consumer Model

Every business platform acts only as an AI Consumer. They request AI services via standardized, asynchronous, or synchronous contracts and treat the Enterprise AI Platform as a black-box service. Examples include:

- **Scholarships Platform**: Consumes AI for likelihood ranking and profile matching.
- **University Platform**: Consumes AI for institutional categorization or semantic matching.
- **Course Platform**: Consumes AI for automated tag generation or skill extraction.
- **Enterprise CMS**: Consumes AI for translation drafting and content summarization.
- **Search Platform**: Consumes AI for semantic relevance tuning.
- **Learning Platform**: Consumes AI for personalized course recommendations.
- **Student Platform**: Consumes AI to display personalized dashboards.
- **Academic Taxonomy**: Consumes AI for classification suggestions.
- **Import Platform**: Consumes AI to map external schemas to the canonical taxonomy.

None of these platforms may directly integrate with AI providers or own AI infrastructure. All AI-generated data is treated as advisory until validated by domain-specific business workflows (e.g., Maker-Checker approvals).

## 8. Architectural Consequences

This decision yields the following architectural benefits:

- **Single Ownership**: Clear accountability for all AI capabilities.
- **Centralized Governance**: A unified point for enforcing compliance, safety, and privacy policies.
- **Unified Provider Management**: Abstracted provider interfaces enabling seamless failover and replacement.
- **Reduced Duplication**: Elimination of redundant code, infrastructure, and prompt management logic across domains.
- **Easier Provider Replacement**: Vendor lock-in is mitigated by the AI Gateway abstraction.
- **Unified Security**: Centralized PII redaction and access control for all AI operations.
- **Unified Monitoring**: Holistic visibility into AI performance, costs, and token consumption.
- **Lower Maintenance Cost**: Updates to AI logic, models, or prompt templates are localized to a single platform.
- **Higher Scalability**: The AI platform can scale its infrastructure independently based on enterprise-wide demand.
- **Better Extensibility**: New AI capabilities (e.g., image generation, audio processing) can be added centrally and exposed to all domains simultaneously.

## 9. Rejected Alternatives

The following alternatives were evaluated and rejected:

- **AI embedded within every business domain**: Rejected due to massive duplication of effort, fragmented prompt management, inconsistent safety guardrails, and vendor lock-in at the domain level.
- **Shared utility AI services (Library/Nuget Package)**: Rejected because a shared library still executes within the context of the business domain, requiring the domain to manage credentials, infrastructure, and orchestration, violating the boundary.
- **Independent AI modules per platform**: Rejected as it leads to inconsistent architectures (e.g., CMS implementing its own translation workflow while the Learning Platform implements a different one).
- **Domain-owned Prompt Engines**: Rejected because prompt engineering requires specialized governance, versioning, and monitoring that distracts domain teams from core business logic.

## 10. Governance Rules

The following enterprise governance rules are mandatory:

1. No direct AI provider integration outside the Enterprise AI Platform.
2. No Prompt Management outside the Enterprise AI Platform.
3. No AI orchestration outside the Enterprise AI Platform.
4. No duplicated AI infrastructure.
5. All AI requests must pass through approved Enterprise AI public contracts.
6. All AI outputs remain strictly advisory and must not mutate canonical transactional state without human or domain-governed workflow approval.

## 11. Impact Analysis

This decision enforces strict boundaries across all existing and future architecture phases. The following phases were subjected to a Cross-Phase AI Ownership Review and updated to reflect strict AI Consumer status:

- Phase 08 (Academic Taxonomy)
- Phase 09 (International Tests Platform)
- Phase 12 (Scholarships Platform)
- Phase 13 (Learning Platform)
- Phase 15 (Enterprise Student Platform (Student Workspace))
- Phase 16 (Enterprise CMS Platform)

All other reviewed phases (Phase 01-07, 10-11, 14) were confirmed to already align with this constraint.

## 12. References

- Cross-Phase AI Ownership Review Report (`docs/reports/Cross-Phase-AI-Ownership-Review.md`)
- Phase 17 – Enterprise AI Platform (Upcoming Implementation)
- ADR-003: Establish the Enterprise AI Platform as the Single Owner of AI Capabilities
