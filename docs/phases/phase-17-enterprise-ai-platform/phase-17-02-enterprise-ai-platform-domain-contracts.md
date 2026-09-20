# MANARATAK 2.0: Phase 17 (Enterprise AI Platform) Enterprise Domain

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.
> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.
> **Note:** This phase complies fully with ADR-004, establishing the Enterprise AI Platform as the single owner of AI capabilities.

## Part B — Enterprise Domain Contracts

### 17.B.1 Foundation Contracts

**Architectural Commentary**
The foundation contracts establish the universal, lowest-level architectural structures shared across the entire Enterprise AI Platform. These abstract definitions form the baseline vocabulary for all intelligent operations, decoupling the originating intent from the underlying execution environment.

```typescript

    /**
     * Represents an immutable, incoming request for AI execution from a business domain consumer.
     */
    export interface IAIRequest
    {
        /**
         * Unique identifier for this specific AI execution request.
         */
        requestId: string;

        /**
         * Enterprise distributed trace ID linking this AI operation back to the originating business transaction.
         */
        correlationId: string;

        /**
         * The enterprise identity of the consuming system (e.g., Phase 12 — Scholarships, Phase 16 — Enterprise CMS).
         */
        consumerId: string;

        /**
         * Environmental and tenant-specific execution context.
         */
        context: IAIContext;
    }

    /**
     * Represents the standardized, structured response returned to the consumer after execution.
     */
    export interface IAIResponse
    {
        responseId: string;
        requestId: string;
        isSuccess: boolean;

        /**
         * The core output data returned from the execution engine, formatted as advisory data.
         */
        payload: string;

        /**
         * Indicates if the payload passed the platform's toxicity and safety policies.
         */
        safetyStatus: string;
        executedAt: Date | string;
    }

    /**
     * The specific tenant and regional context bounding the execution request.
     */
    export interface IAIContext
    {
        locale: string;
        tenantId: string;
        attributes: Record<string, string>;
    }

    /**
     * Tracking context for internal execution metrics and timeline.
     */
    export interface IAIExecutionContext
    {
        executionId: string;
        traceId: string;
        startTime: Date | string;
        endTime: Date | string | null;
    }

    /**


     * Defines the AIProviderReference contract.


     */


    export interface AIProviderReference {
        providerId: string;
        name: string;
    }
    /**

     * Defines the AIModelReference contract.

     */

    export interface AIModelReference {
        modelId: string;
        version: string;
    }
    /**

     * Defines the PromptReference contract.

     */

    export interface PromptReference {
        promptId: string;
        version: string;
    }
    /**

     * Defines the AIConversationReference contract.

     */

    export interface AIConversationReference {
        conversationId: string;
        contextToken: string;
    }

```

### 17.B.2 Provider Contracts

**Architectural Commentary**
Provider Contracts define the strict abstraction layer that shields the enterprise from vendor lock-in. These interfaces ensure no external AI provider concepts (e.g., vendor-specific SDK structures) leak into the enterprise ecosystem.

```typescript

    /**
     * The primary abstraction forcing all external AI vendors to adhere to a common execution footprint.
     */
    export interface IAIProvider
    {
        providerReference: AIProviderReference;
        capabilities: IAIProviderCapabilities;
        executeAsync(request: IAIRequest, context: IAIExecutionContext): Promise<IAIResponse>;
    }

    /**


     * Defines the IAIProviderRegistry contract.


     */


    export interface IAIProviderRegistry
    {
        getActiveProvider(requiredCapability: string): IAIProvider;
        getAllRegisteredProviders(): readonly IAIProvider[];
    }

    /**


     * Defines the IAIProviderCapabilities contract.


     */


    export interface IAIProviderCapabilities
    {
        supportsStreaming: boolean;
        supportsFunctionCalling: boolean;
        supportsEmbeddings: boolean;
        maxContextWindowSize: number;
    }

    /**


     * Defines the AIProviderConfiguration contract.


     */


    export interface AIProviderConfiguration {
        configurationId: string;
        endpointUri: string;
        timeoutMs: number;
        maxRetryAttempts: number;
    }

```

### 17.B.3 Prompt Contracts

**Architectural Commentary**
Prompt Contracts establish prompts as first-class, versioned enterprise assets. The Enterprise AI Platform completely abstracts prompt construction and lifecycle management away from consuming domains.

```typescript

    /**
     * The base interface for an abstract enterprise AI prompt.
     */
    export interface IPrompt
    {
        promptId: string;
        body: string;
    }

    /**


     * Defines the IPromptTemplate contract.


     */


    export interface IPromptTemplate extends IPrompt
    {
        requiredParameters: readonly string[];
    }

    /**


     * Defines the IPromptVersion contract.


     */


    export interface IPromptVersion
    {
        versionId: string;
        promptId: string;
        semanticVersion: string;
        content: string;
        publishedAt: Date | string;
    }

    /**


     * Defines the IPromptLibrary contract.


     */


    export interface IPromptLibrary
    {
        libraryId: string;
        categories: readonly IPromptCategory[];
    }

    /**


     * Defines the IPromptCategory contract.


     */


    export interface IPromptCategory {
        categoryId: string;
        name: string;
        description: string;
    }

    /**


     * Defines the PromptMetadata contract.


     */


    export interface PromptMetadata {
        authorId: string;
        expectedOutputSchema: string;
        targetCapability: string;
    }

    /**


     * Defines the PromptExecutionRequest contract.


     */


    export interface PromptExecutionRequest {
        promptId: string;
        versionId: string;
        parameters: Record<string, string>;
    }

```

### 17.B.4 Model Contracts

**Architectural Commentary**
Model Contracts govern the selection, lifecycle, and operational boundaries of the underlying computational engines independently of their hosting providers.

```typescript
    /**
     * Represents an abstract AI model engine (e.g., GPT-4, Gemini Pro).
     */
    export interface IAIModel
    {
        modelId: string;
        canonicalName: string;
        profile: IModelProfile;
    }

    /**


     * Defines the IAIModelVersion contract.


     */


    export interface IAIModelVersion
    {
        modelId: string;
        versionTag: string;
        capabilities: IModelCapabilities;
    }

    /**


     * Defines the IModelCapabilities contract.


     */


    export interface IModelCapabilities
    {
        maxInputTokens: number;
        maxOutputTokens: number;
        multimodal: boolean;
    }

    /**


     * Defines the IModelProfile contract.


     */


    export interface IModelProfile
    {
        tier: string; // e.g., HighReasoning, FastClassification
        costProfile: string;
    }

    /**


     * Defines the ModelPolicy contract.


     */


    export interface ModelPolicy {
        policyId: string;
        modelId: string;
        isApprovedForPII: boolean;
        isApprovedForProduction: boolean;
    }

```

### 17.B.5 AI Service Contracts

**Architectural Commentary**
These contracts represent the primary functional capabilities exposed by the Enterprise AI Platform to internal consumers. They are highly specialized semantic operations abstracted away from base model APIs.

```typescript

    /**


     * Defines the IAICompletionService contract.


     */


    export interface IAICompletionService
    {
        generateCompletionAsync(request: IAIRequest): Promise<IAIResponse>;
    }

    /**


     * Defines the IAITranslationService contract.


     */


    export interface IAITranslationService
    {
        translateAsync(request: IAIRequest, targetLocale: string): Promise<IAIResponse>;
    }

    /**


     * Defines the IAISummarizationService contract.


     */


    export interface IAISummarizationService
    {
        summarizeAsync(request: IAIRequest, maxLengthTokens: number): Promise<IAIResponse>;
    }

    /**


     * Defines the IAIClassificationService contract.


     */


    export interface IAIClassificationService
    {
        classifyAsync(request: IAIRequest, targetTaxonomy: readonly string[]): Promise<IAIResponse>;
    }

    /**


     * Defines the IAIEmbeddingService contract.


     */


    export interface IAIEmbeddingService
    {
        generateEmbeddingsAsync(request: IAIRequest): Promise<readonly number[]>;
    }

    /**


     * Defines the IAIRecommendationExecutionService contract.


     */


    export interface IAIRecommendationExecutionService
    {
        executeRecommendationScoringAsync(request: IAIRequest): Promise<IAIResponse>;
    }

    /**


     * Defines the IAIContentGenerationService contract.


     */


    export interface IAIContentGenerationService
    {
        generateStructuredContentAsync(request: IAIRequest, outputSchema: string): Promise<IAIResponse>;
    }

```

### 17.B.6 Workflow Contracts

**Architectural Commentary**
Workflow Contracts orchestrate multi-step AI operations that require chaining, branching, or sequential reasoning without leaking this orchestration to business domains.

```typescript

    /**


     * Defines the IAIWorkflow contract.


     */


    export interface IAIWorkflow
    {
        workflowId: string;
        name: string;
        stages: readonly IWorkflowStage[];
    }

    /**


     * Defines the IWorkflowExecution contract.


     */


    export interface IWorkflowExecution
    {
        executionId: string;
        workflowId: string;
        currentStatus: string;
    }

    /**


     * Defines the IWorkflowStage contract.


     */


    export interface IWorkflowStage
    {
        stageId: string;
        targetCapability: string;
        sequenceOrder: number;
    }

    /**


     * Defines the WorkflowResult contract.


     */


    export interface WorkflowResult {
        executionId: string;
        completedSuccessfully: boolean;
        finalPayload: string;
        stageOutputs: readonly string[];
    }

    /**


     * Defines the WorkflowPolicy contract.


     */


    export interface WorkflowPolicy {
        policyId: string;
        maxExecutionTimeMs: number;
        continueOnStageFailure: boolean;
    }

```

### 17.B.7 Governance Contracts

**Architectural Commentary**
Governance Contracts enforce enterprise policies, safety guardrails, and compliance regulations across all AI operations centrally.

```typescript
/**

     * Defines the IUsagePolicy contract.

     */

export interface IUsagePolicy {
  maxTokensPerRequest: number;
  dailyQuotaPerConsumer: number;
}

/**


     * Defines the ISafetyPolicy contract.


     */

export interface ISafetyPolicy {
  requirePIIRedaction: boolean;
  maximumToxicityScore: number;
}

/**


     * Defines the ICompliancePolicy contract.


     */

export interface ICompliancePolicy {
  requiredDataResidency: string;
  isAuditLoggingMandatory: boolean;
}

/**


     * Defines the IApprovalPolicy contract.


     */

export interface IApprovalPolicy {
  requiresHumanInTheLoop: boolean;
  targetApprovalRole: string;
}

/**


     * Defines the IAccessPolicy contract.


     */

export interface IAccessPolicy {
  isConsumerAuthorized(consumerId: string, targetCapability: string): boolean;
}
```

### 17.B.8 Evaluation Contracts

**Architectural Commentary**
Evaluation Contracts define the structural mechanisms for assessing the quality, determinism, and safety of model outputs asynchronously or periodically.

```typescript

    /**


     * Defines the IEvaluation contract.


     */


    export interface IEvaluation
    {
        evaluationId: string;
        targetModel: AIModelReference;
        targetPrompt: PromptReference;
    }

    /**


     * Defines the IEvaluationCriteria contract.


     */


    export interface IEvaluationCriteria
    {
        criteriaId: string;
        assertionType: string; // e.g., SchemaMatch, SemanticSimilarity
    }

    /**


     * Defines the EvaluationResult contract.


     */


    export interface EvaluationResult {
        evaluationId: string;
        score: QualityScore;
        passed: boolean;
        evaluatedAt: Date | string;
    }

    /**


     * Defines the QualityScore contract.


     */


    export interface QualityScore {
        overallScore: number;
        metricScores: Record<string, number>;
    }

    /**


     * Defines the Benchmark contract.


     */


    export interface Benchmark {
        benchmarkId: string;
        datasetReference: string;
        targetCapability: string;
    }

```

### 17.B.9 Audit Contracts

**Architectural Commentary**
Audit Contracts provide immutable telemetry for security, debugging, and cross-domain accountability across the AI Platform.

```typescript

    /**


     * Defines the IAuditEntry contract.


     */


    export interface IAuditEntry
    {
        auditId: string;
        actionType: string;
        actorId: string;
        timestamp: Date | string;
    }

    /**


     * Defines the IUsageRecord contract.


     */


    export interface IUsageRecord
    {
        recordId: string;
        consumerId: string;
        inputTokens: number;
        outputTokens: number;
    }

    /**


     * Defines the IExecutionRecord contract.


     */


    export interface IExecutionRecord
    {
        executionId: string;
        usedModel: AIModelReference;
        usedPrompt: PromptReference;
        durationMs: number;
    }

    /**


     * Defines the CostRecord contract.


     */


    export interface CostRecord {
        usageRecordId: string;
        estimatedCost: number;
        currency: string;
    }

    /**


     * Defines the RateLimitRecord contract.


     */


    export interface RateLimitRecord {
        incidentId: string;
        consumerId: string;
        triggeredPolicyId: string;
        incidentTime: Date | string;
    }

```

### 17.B.10 Monitoring Contracts

**Architectural Commentary**
Monitoring Contracts provide real-time observability into the health and performance of the Enterprise AI Platform to external observability tools.

```typescript

    /**


     * Defines the IHealthStatus contract.


     */


    export interface IHealthStatus
    {
        componentId: string;
        status: string; // Healthy, Degraded, Offline
        lastChecked: Date | string;
    }

    /**


     * Defines the IMetrics contract.


     */


    export interface IMetrics
    {
        metricName: string;
        value: number;
        dimensions: Record<string, string>;
    }

    /**


     * Defines the UsageStatistics contract.


     */


    export interface UsageStatistics {
        totalTokensProcessed: number;
        activeInferences: number;
        throttledRequests: number;
    }

    /**


     * Defines the PerformanceSnapshot contract.


     */


    export interface PerformanceSnapshot {
        snapshotId: string;
        p95LatencyMs: number;
        errorRatePercentage: number;
        timestamp: Date | string;
    }

```

### 17.B.11 Integration Contracts

**Architectural Commentary**
Integration Contracts strictly govern how external business domains communicate with the AI Platform. Domains supply canonical domain events or payloads, and the AI platform returns advisory structural results. No raw prompt engineering is exposed over this boundary.

```typescript
// Scholarships Platform
/**

     * Defines the IScholarshipScoringRequest contract.

     */

export interface IScholarshipScoringRequest extends IAIRequest {}
// University Platform
/**

     * Defines the IUniversityTaxonomyMappingRequest contract.

     */

export interface IUniversityTaxonomyMappingRequest extends IAIRequest {}
// Course Platform
/**

     * Defines the ICourseTagExtractionRequest contract.

     */

export interface ICourseTagExtractionRequest extends IAIRequest {}
// Enterprise CMS
/**

     * Defines the ICmsTranslationRequest contract.

     */

export interface ICmsTranslationRequest extends IAIRequest {}
// Enterprise Search
/**

     * Defines the ISearchVectorizationRequest contract.

     */

export interface ISearchVectorizationRequest extends IAIRequest {}
// Learning Platform
/**

     * Defines the ILearningPathRecommendationRequest contract.

     */

export interface ILearningPathRecommendationRequest extends IAIRequest {}
// Student Platform
/**

     * Defines the IStudentWorkspaceSuggestionRequest contract.

     */

export interface IStudentWorkspaceSuggestionRequest extends IAIRequest {}
// Import Platform
/**

     * Defines the IDataNormalizationRequest contract.

     */

export interface IDataNormalizationRequest extends IAIRequest {}
// Analytics Platform
/**

     * Defines the IAITelemetryExportRequest contract.

     */

export interface IAITelemetryExportRequest extends IAIRequest {}
// Notification Platform
/**

     * Defines the IAlertDraftingRequest contract.

     */

export interface IAlertDraftingRequest extends IAIRequest {}
```

### 17.B.12 Repository Contracts

**Architectural Commentary**
Repository Contracts abstract the underlying storage technologies for all AI state, templates, and configurations.

```typescript

    /**


     * Defines the IPromptRepository contract.


     */


    export interface IPromptRepository
    {
        getActiveVersionAsync(promptId: string): Promise<IPromptVersion>;
    }

    /**


     * Defines the IModelRepository contract.


     */


    export interface IModelRepository
    {
        getActiveModelsAsync(): Promise<readonly IAIModel[]>;
    }

    /**


     * Defines the IProviderRepository contract.


     */


    export interface IProviderRepository
    {
        getPrimaryProviderAsync(capability: string): Promise<IAIProvider>;
    }

    /**


     * Defines the IPolicyRepository contract.


     */


    export interface IPolicyRepository
    {
        getUsagePolicyForConsumerAsync(consumerId: string): Promise<IUsagePolicy>;
    }

    /**


     * Defines the IAuditRepository contract.


     */


    export interface IAuditRepository
    {
        appendExecutionRecordAsync(record: IExecutionRecord): Promise<void>;
    }

    /**


     * Defines the IWorkflowRepository contract.


     */


    export interface IWorkflowRepository
    {
        getWorkflowDefinitionAsync(workflowId: string): Promise<IAIWorkflow>;
    }

```

### 17.B.13 Event Contracts

**Architectural Commentary**
Event Contracts define the asynchronous domain events emitted by the Enterprise AI Platform to the Enterprise Event Bus, allowing decoupled reactions across the enterprise.

```typescript

    /**


     * Defines the IAIRequestReceivedEvent contract.


     */


    export interface IAIRequestReceivedEvent
    {
        requestId: string;
        timestamp: Date | string;
    }

    /**


     * Defines the IAIExecutionStartedEvent contract.


     */


    export interface IAIExecutionStartedEvent
    {
        executionId: string;
        providerId: string;
        timestamp: Date | string;
    }

    /**


     * Defines the IAIExecutionCompletedEvent contract.


     */


    export interface IAIExecutionCompletedEvent
    {
        executionId: string;
        wasSuccessful: boolean;
        tokensConsumed: number;
    }

    /**


     * Defines the IPromptUpdatedEvent contract.


     */


    export interface IPromptUpdatedEvent
    {
        promptId: string;
        newVersionId: string;
    }

    /**


     * Defines the IModelRegisteredEvent contract.


     */


    export interface IModelRegisteredEvent
    {
        modelId: string;
        canonicalName: string;
    }

    /**


     * Defines the IProviderChangedEvent contract.


     */


    export interface IProviderChangedEvent
    {
        oldProviderId: string;
        newProviderId: string;
        reason: string;
    }

    /**


     * Defines the IEvaluationCompletedEvent contract.


     */


    export interface IEvaluationCompletedEvent
    {
        evaluationId: string;
        passed: boolean;
    }

```

### 17.B.14 Consumer Contracts

**Architectural Commentary**
Consumer Contracts define the unidirectional dependency model. Business platforms consume AI Platform services via abstract interfaces. The AI Platform possesses zero knowledge of the underlying business domain entities (e.g., Phase 13 — Learning Platform courses, Phase 15 — Enterprise Student Platform student profiles), accepting only decoupled Data Transfer Objects or primitive parameters. The AI Platform is the producer; all other systems act strictly as consumers, validating and interpreting the advisory outputs based on their own domain logic.

### 17.B.15 Contracts Review

**Architecture Validation & Verification**

- **Part A Alignment**: Every contract listed directly maps to a responsibility defined in Phase 17 Part A (Prompt Management, Provider Abstraction, Usage Tracking, etc.).
- **Domain Isolation**: No business logic (Phase 12 — Scholarships criteria, Phase 16 — Enterprise CMS state management, etc.) exists in any contract.
- **ADR-004 Adherence**: These contracts force all AI requests to funnel through the `IAIRequest` envelope via defined interfaces, strictly preventing domains from integrating directly with external providers.
- **Implementation Agnosticism**: No contract exposes HTTP verbs, REST paths, vendor SDK dependencies, or SQL database constructs.
- **Enterprise Reusability**: The abstractions are modular and identical for any domain attempting to consume intelligence services.

**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING

---

## Navigation

- **Previous:** [Phase 16 — Enterprise CMS](../phase-16-enterprise-cms/phase-16-02-enterprise-cms-domain-contracts.md)
- **Next:** [Phase 18 — Enterprise Student Tools Platform](../phase-18-enterprise-student-tools-platform/phase-18-02-enterprise-student-tools-platform-domain-contracts.md) (or corresponding baseline)
