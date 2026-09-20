# MANARATAK 2.0: Phase 18 (Enterprise Student Tools Platform) Enterprise Domain Contracts

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.
> **Note:** This phase complies fully with ADR-004, establishing the Enterprise AI Platform as the single owner of AI capabilities. Phase 18 acts strictly as an AI consumer.

## Part B - Enterprise Domain Contracts

### 18.B.1 Foundation Contracts

**Architectural Commentary**
The foundation contracts establish the universal, lowest-level architectural structures shared across the entire Enterprise Student Tools Platform. These abstract definitions form the baseline vocabulary for all student tools and utilities, decoupling the originating intent from the underlying execution environment.

```typescript
/**
 * Represents an abstract student tool within the enterprise ecosystem.
 */
export interface IStudentTool {
  toolReference: ToolReference;
  category: ToolCategoryReference;
  isEnabled: boolean;
  execute(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

/**
 * Represents the contextual parameters for tool execution.
 */
export interface IToolContext {
  studentId?: string;
  tenantId: string;
  locale: string;
}

/**
 * Represents an immutable, incoming request for tool execution.
 */
export interface IToolRequest {
  requestId: string;
  correlationId: string;
  toolId: string;
  context: IToolContext;
  parameters: Record<string, any>;
}

/**
 * Represents the standardized, structured response returned after tool execution.
 */
export interface IToolResponse {
  responseId: string;
  requestId: string;
  isSuccess: boolean;
  result: Record<string, any>;
  executedAt: Date;
}

/**
 * Tracking context for internal tool execution metrics and tracing.
 */
export interface IToolExecutionContext {
  executionId: string;
  traceId: string;
  startTime: Date;
  endTime?: Date;
}

export interface ToolReference {
  toolId: string;
  version: string;
}

export interface ToolCategoryReference {
  categoryId: string;
  name: string;
}

export interface ToolExecutionReference {
  executionId: string;
  toolId: string;
}

export interface ToolSessionReference {
  sessionId: string;
  studentId?: string; // Optional because selected public tools can execute anonymously
}
```

### 18.B.2 Tool Contracts

**Architectural Commentary**
Tool contracts define the structural enterprise abstractions for the tools themselves. This ensures that every tool, whether a simple deterministic calculator or a complex multi-step wizard orchestrating an AI delegation, conforms to an identical operational footprint, lifecycle, and telemetry standard.

```typescript
/**
 * Defines the configuration and structural schema for a specific tool.
 */
export interface IToolDefinition {
  toolReference: ToolReference;
  name: string;
  description: string;
  capabilities: IToolCapability[];
  metadata: ToolMetadata;
  supportedLocales: string[];
}

/**
 * Defines a category or grouping of tools.
 */
export interface IToolCategory {
  categoryReference: ToolCategoryReference;
  parentCategoryId?: string;
  description: string;
}

/**
 * Represents an instance of a tool's execution lifecycle.
 */
export interface IToolExecution {
  executionReference: ToolExecutionReference;
  sessionReference: ToolSessionReference;
  status: string;
  requestPayload: any;
  responsePayload: any;
}

/**
 * Represents a discrete capability or feature provided by a tool.
 */
export interface IToolCapability {
  capabilityId: string;
  name: string;
  isRequired: boolean;
}

/**
 * Tool-specific configuration values and thresholds.
 */
export interface ToolConfiguration {
  maxExecutionTimeMs: number;
  requiresAuthentication: boolean;
  rateLimitKey?: string;
}

/**
 * Arbitrary metadata defining UI behavior or specific tagging for the tool.
 */
export interface ToolMetadata {
  tags: string[];
  iconUri?: string;
  documentationUri?: string;
}

/**
 * Strict versioning information for the tool schema.
 */
export interface ToolVersion {
  major: number;
  minor: number;
  patch: number;
  releaseDate: Date;
}

export enum ToolExecutionType {
  DETERMINISTIC = 'DETERMINISTIC',
  AI_DELEGATED = 'AI_DELEGATED',
  HYBRID = 'HYBRID',
  ADMIN_INTERNAL = 'ADMIN_INTERNAL'
}

export enum ToolLaunchVisibility {
  ACTIVE = 'ACTIVE',
  COMING_SOON = 'COMING_SOON',
  UNDER_DEVELOPMENT = 'UNDER_DEVELOPMENT',
  HIDDEN_ADMIN_ONLY = 'HIDDEN_ADMIN_ONLY',
  DISABLED = 'DISABLED',
  RETIRED = 'RETIRED'
}

export enum ToolImplementationPriority {
  P1_CORE_LAUNCH = 'P1_CORE_LAUNCH',
  P2_EXPANSION = 'P2_EXPANSION',
  P3_LATER = 'P3_LATER'
}

export interface IToolDependencyDeclaration {
  platformPhase: string;
  dependencyType: 'DATA' | 'EXECUTION' | 'PERSISTENCE';
  isRequired: boolean;
  description: string;
}

export interface IToolAvailabilityPolicy {
  publicAvailability: boolean;
  authenticatedAvailability: boolean;
  adminOnly: boolean;
}

export interface IToolRegistryEntry {
  toolId: string;
  name: string;
  category: string;
  executionType: ToolExecutionType;
  primaryOwner: string;
  aiDependency: string | null;
  availability: IToolAvailabilityPolicy;
  outputType: string;
  dataDependencies: IToolDependencyDeclaration[];
  launchVisibility: ToolLaunchVisibility;
  implementationPriority: ToolImplementationPriority;
  notes?: string;
}
```

### 18.B.3 AI Tool Contracts

**Architectural Commentary**
AI Tool Contracts represent the suite of utilities that leverage Artificial Intelligence for generation, advisory, and semantic processing. Crucially, these interfaces **DO NOT EXECUTE AI**. They compile student context, user inputs, and configuration parameters, and then delegate execution to the Enterprise AI Platform (Phase 17). Phase 17 remains the sole owner of the models, prompts, and inference execution.

```typescript
// Writing & Documents
export interface IPersonalStatementGenerator {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IPersonalStatementReviewer {
  review(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IMotivationLetterGenerator {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IMotivationLetterReviewer {
  review(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IRecommendationLetterGenerator {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IRecommendationLetterReviewer {
  review(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICVBuilder {
  build(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICVAnalyzer {
  analyze(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICVReviewer {
  review(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IAcademicTranslator {
  translate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IGrammarAssistant {
  check(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IProofreadingAssistant {
  proofread(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IResearchAssistant {
  assist(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IResearchProposalGenerator {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IResearchProposalReviewer {
  review(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

// Coaching & Advisory
export interface IInterviewCoach {
  coach(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IInterviewSimulator {
  simulate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IEmailGenerator {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IEmailImprover {
  improve(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICareerAdvisor {
  advise(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IMajorAdvisor {
  advise(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IUniversityAdvisor {
  advise(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IScholarshipAdvisor {
  advise(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IStudyPlanner {
  plan(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}
```

### 18.B.4 Student Utility Contracts

**Architectural Commentary**
Student Utility Contracts define deterministic, rules-based tools that execute algorithmic calculations, comparisons, and assessments. These tools consume canonical data from core enterprise domains (e.g., Phase 11 - Universities & Institutions, Phase 12 - Scholarships) to guarantee accuracy and consistency.

```typescript
export interface IGradeConverter {
  convert(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICreditHourCalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IAgeCalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICurrencyConverter {
  convert(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IUniversityComparison {
  compare(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IScholarshipComparison {
  compare(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICountryComparison {
  compare(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IUniversityFinder {
  find(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IScholarshipFinder {
  find(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IMajorFinder {
  find(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICareerFinder {
  find(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IEligibilityChecker {
  check(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IAdmissionChanceCalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IApplicationReadinessScore {
  score(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IDocumentChecklist {
  generateChecklist(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}
```

### 18.B.5 Calculator Contracts

**Architectural Commentary**
Calculator Contracts are specialized utilities focused on distinct mathematical, financial, or academic algorithmic projections. They represent stateless evaluation engines.

```typescript
export interface IGPACalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IGPAPlanner {
  plan(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IGraduationGPAPredictor {
  predict(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ITuitionCalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ILivingCostCalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IBudgetPlanner {
  plan(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IROICalculator {
  calculate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}
```

### 18.B.6 Recommendation Contracts

**Architectural Commentary**
Recommendation Contracts standardize the delivery of curated options to the student. The underlying implementation of these recommendations delegates semantic matching or complex filtering algorithms to respective enterprise platforms (Phase 17 for semantic, approved search/read-model capabilities for deterministic).

```typescript
export interface IRecommendationService {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IMajorRecommendation {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IUniversityRecommendation {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IScholarshipRecommendation {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICountryRecommendation {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ICareerRecommendation {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IStudyRecommendation {
  recommend(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}
```

### 18.B.7 Planning Contracts

**Architectural Commentary**
Planning Contracts govern tools that project future timelines, milestones, or step-by-step academic roadmaps for students.

```typescript
export interface ISemesterPlanner {
  plan(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IAcademicTimeline {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IApplicationTimeline {
  generate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IDeadlineTracker {
  track(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface ITimelinePlanner {
  plan(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IStudyPlan {
  create(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IGoalPlanner {
  plan(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}
```

### 18.B.8 Validation Contracts

**Architectural Commentary**
Validation Contracts define deterministic checkers for application readiness, format constraints, and eligibility criteria, isolating the rules engine from the user interface.

```typescript
export interface IDocumentValidation {
  validate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IDocumentValidator {
  validate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IEligibilityValidation {
  validate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IApplicationValidation {
  validate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}

export interface IProfileValidation {
  validate(context: IToolExecutionContext, request: IToolRequest): Promise<IToolResponse>;
}
```

### 18.B.9 Governance Contracts

**Architectural Commentary**
Governance Contracts dictate the policies and constraints for executing any tool within the platform. They enforce security, rate limiting, availability, and access control boundaries without bleeding infrastructure logic into the tool definition.

```typescript
export interface IExecutionPolicy {
  policyId: string;
  evaluate(request: IToolRequest): boolean;
}

export interface IUsagePolicy {
  policyId: string;
  maxExecutionsPerDay: number;
  enforce(context: IToolContext): void;
}

export interface IAuthorizationPolicy {
  policyId: string;
  requiresAuthenticatedSession: boolean;
  requiredRoles: string[];
}

export interface IVisibilityPolicy {
  policyId: string;
  isVisibleToAnonymous: boolean;
  isVisibleToStudent: boolean;
}

export interface IRateLimiting {
  limitId: string;
  requestsPerMinute: number;
}

export interface IToolAvailability {
  toolReference: ToolReference;
  isOnline: boolean;
  maintenanceWindow?: string;
}

export interface IConsumerPermissions {
  consumerId: string;
  allowedToolCategories: string[];
}
```

### 18.B.10 Integration Contracts

**Architectural Commentary**
Integration Contracts declare the strict dependency interfaces Phase 18 uses to consume external enterprise platforms. Phase 18 **must never** own or duplicate the domain models of these platforms; it accesses them purely via read-only orchestration contracts.

```typescript
/**
 * Delegate interface pointing to Phase 17 Enterprise AI Platform.
 */
export interface IAIPlatformIntegration {
  delegateExecution(request: any): Promise<any>;
}

/**
 * Delegate interface pointing to Phase 15 - Enterprise Student Platform.
 */
export interface IStudentPlatformIntegration {
  getStudentProfile(studentId: string): Promise<any>;
}

/**
 * Delegate interface pointing to Phase 11 - Universities & Institutions.
 */
export interface IUniversityPlatformIntegration {
  getUniversityDetails(universityId: string): Promise<any>;
}

/**
 * Delegate interface pointing to Phase 12 - Scholarships.
 */
export interface IScholarshipPlatformIntegration {
  getScholarshipCriteria(scholarshipId: string): Promise<any>;
}

/**
 * Delegate interface pointing to Phase 10 - Major Platform.
 */
export interface IMajorPlatformIntegration {
  getMajorRequirements(majorId: string): Promise<any>;
}

/**
 * Delegate interface pointing to Phase 21 - Enterprise Career & Alumni Platform for canonical career/alumni data.
 */
export interface ICareerPlatformIntegration {
  getCareerPathways(careerId: string): Promise<any>;
}

/**
 * Delegate interface pointing to Country taxonomy.
 */
export interface ICountryPlatformIntegration {
  getCountryMetrics(countryId: string): Promise<any>;
}

/**
 * Delegate interface pointing to Phase 07 - Enterprise Reference Data.
 * Note: Actual translation execution belongs to Phase 17 - Enterprise AI Platform.
 * Phase 07 supplies static language/reference data only.
 */
export interface ITranslationPlatformIntegration {
  translateText(content: string, targetLocale: string): Promise<string>;
}

/**
 * Delegate interface pointing to Phase 05 - Enterprise Asset Platform (EAP).
 * Used for persisting and referencing generated files, PDFs, previews, document outputs, and media artifacts.
 */
export interface IAssetPlatformIntegration {
  saveAsset(payload: { content: any; metadata: any }): Promise<{ assetId: string; assetReference: string }>;
  getAsset(assetId: string): Promise<any>;
}

/**
 * Delegate interface pointing to foundation search capability.
 */
export interface IFoundationSearchCapabilityIntegration {
  queryTools(query: string): Promise<any>;
}
```

### 18.B.11 Repository Contracts

**Architectural Commentary**
Repository Contracts handle the persistence exclusively for entities owned by Phase 18 (e.g., Tool Definitions, Tool Execution histories). Phase 18 **does not** contain repositories for AI Models, Prompts, Universities, or permanent Student Profiles.

```typescript
export interface IToolDefinitionRepository {
  getById(toolId: string): Promise<IToolDefinition>;
  getAllActive(): Promise<IToolDefinition[]>;
  save(definition: IToolDefinition): Promise<void>;
}

export interface IToolCategoryRepository {
  getById(categoryId: string): Promise<IToolCategory>;
  getAll(): Promise<IToolCategory[]>;
}

export interface IToolExecutionRepository {
  recordExecution(execution: IToolExecution): Promise<void>;
  getExecutionsBySession(sessionReference: ToolSessionReference): Promise<IToolExecution[]>;
}
```

### 18.B.12 Event Contracts

**Architectural Commentary**
Event Contracts define the immutable domain events published to the Enterprise Event Bus. This allows analytics/read-model consumers to react to tool usage without synchronous coupling to Phase 18.

```typescript
export interface ToolStartedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  sessionReference: ToolSessionReference;
  timestamp: Date;
}

export interface ToolCompletedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  sessionReference: ToolSessionReference;
  isSuccess: boolean;
  timestamp: Date;
}

export interface ToolFailedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  sessionReference: ToolSessionReference;
  errorCode: string;
  timestamp: Date;
}

export interface RecommendationGeneratedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  recommendationType: string;
  timestamp: Date;
}

export interface ValidationCompletedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  validationStatus: string;
  timestamp: Date;
}

export interface CalculationCompletedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  calculationType: string;
  timestamp: Date;
}

export interface PlannerGeneratedEvent {
  eventId: string;
  executionReference: ToolExecutionReference;
  plannerType: string;
  timestamp: Date;
}
```

### 18.B.13 Consumer Contracts

**Architectural Commentary**
Consumer Contracts describe the formal interfaces through which front-end presentations access the Enterprise Student Tools Platform. These interfaces abstract the underlying complexity, providing a unified access pattern for varying clients.

```typescript
/**
 * Interface utilized by the authenticated Phase 15 - Enterprise Student Platform portal.
 */
export interface IStudentPortalConsumer {
  executeAuthenticatedTool(toolId: string, payload: any): Promise<any>;
  getSavedExecutions(): Promise<any[]>;
}

/**
 * Interface utilized by the anonymous Phase 24 - Enterprise Public Platform.
 */
export interface IPublicWebsiteConsumer {
  executeAnonymousTool(toolId: string, payload: any): Promise<any>;
  getAvailablePublicTools(): Promise<any[]>;
}

/**
 * Interface utilized by the Admin Portal for governance and configuration.
 */
export interface IAdminPortalConsumer {
  configureTool(toolId: string, config: any): Promise<void>;
  getToolTelemetry(toolId: string): Promise<any>;
}

/**
 * Interface utilized by Mobile Applications.
 */
export interface IMobileApplicationConsumer {
  executeMobileOptimizedTool(toolId: string, payload: any): Promise<any>;
}
```

### 18.B.14 Final Contracts Review

- **Part A Alignment:** Validated. All contracts structurally map to the AI Consumer Pattern and functional utilities defined in the Phase 18 Architecture Specification.
- **Domain Isolation:** Validated. Phase 18 contains no persistence models for Universities, Scholarships, Students, or AI engines. It acts strictly as a specialized tooling and orchestration domain.
- **Ownership Validation:** Validated. The platform exclusively owns the concepts of `ToolDefinition`, `ToolCategory`, and `ToolExecution`.
- **AI Boundary Validation:** Validated. The platform contains no contracts for LLMs, Prompts, Embeddings, or Vector Databases. All intelligent generation is explicitly delegated via `IAIPlatformIntegration`.
- **Enterprise Reusability:** Validated. All tools implement the standardized `IStudentTool` and `IToolRequest`/`IToolResponse` interfaces, ensuring maximum reusability across any front-end consumer.
- **Implementation Agnosticism:** Validated. No framework-specific or database-specific implementation details exist in these domain contracts.
- **Shared Foundation Compliance:** Validated. The contracts respect the global shared contexts and enterprise integration patterns.

**Status:** Approved for Baseline
**Approver:** Chief Enterprise Architect & Architecture Review Board (ARB)

---

## Navigation

- **Previous Artifact:** [Phase 18 Part A - Architecture Specification](phase-18-01-enterprise-student-tools-platform-architecture-specification.md)
- **Current Artifact:** **Phase 18 Part B - Domain Contracts** (This File)
- **Next Artifact:** [Phase 18 Part C - Implementation Guide](phase-18-03-enterprise-student-tools-platform-implementation-guide.md)
