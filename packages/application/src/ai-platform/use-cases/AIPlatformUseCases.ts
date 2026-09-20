import { createHash, randomUUID } from 'node:crypto';
import {
  AICapabilityDefinition,
  AIAsyncJobRecord,
  AIConsumerPolicy,
  AIDataClassification,
  AIEvaluationDefinition,
  AIEvaluationRun,
  AIExecutionRecord,
  AIExecutionRequestDto,
  AIExecutionStatus,
  AIGuardrailDefinition,
  AIKnowledgeIndex,
  AIKnowledgeSource,
  AIModelDefinition,
  AIModelPrice,
  AIPromptDefinition,
  AIPromptVersion,
  AIProviderDefinition,
  AIProviderInvocationResult,
  AIProviderOperationalStatus,
  AIRegistryResource,
  AIRoutingPolicy,
  AISafetyDecision,
  AIWorkflowDefinition,
  IAIAsyncPayloadProtector,
  IAIPlatformRepository,
  IAIProviderRegistry,
  type AIPlatformResourceValue,
} from '@manaratak/domain';

interface AIOrchestrationResponse {
  executionPublicId: string;
  traceId: string;
  status: AIExecutionStatus;
  blockedReason?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  providerKey?: string | null;
  modelKey?: string | null;
  usage: { inputTokens: number; outputTokens: number; cost?: number | null; currency?: string | null };
  result?: string;
}

interface InternalExecutionOptions {
  promptVersion?: number;
  forcedModelKey?: string;
  forcedRoutingPolicyKey?: string;
}

const HUMAN_REVIEW_UNSUPPORTED = 'AI_HUMAN_REVIEW_WORKFLOW_NOT_CONFIGURED';
const MAX_GOVERNED_REGEX_LENGTH = 256;
const ASYNC_LEASE_MS = 120_000;

export class AIPlatformAdminUseCases {
  constructor(private readonly repository: IAIPlatformRepository, private readonly providers: IAIProviderRegistry) {}

  async overview() {
    const base = await this.repository.overview();
    const counts: Record<AIProviderOperationalStatus, number> = {
      NOT_CONFIGURED: 0, RUNTIME_PENDING: 0, READY: 0, DEGRADED: 0, UNAVAILABLE: 0, DISABLED: 0,
    };
    for (const adapter of this.providers.list()) counts[adapter.status()] += 1;

    let overallStatus = base.overallStatus;
    if (overallStatus !== 'DISABLED') {
      if (base.activeModels === 0 || base.activePrompts === 0 || (counts.READY + counts.RUNTIME_PENDING) === 0)
        overallStatus = 'NOT_CONFIGURED';
      else if (base.openIncidents > 0 || counts.DEGRADED > 0 || counts.UNAVAILABLE > 0) overallStatus = 'DEGRADED';
      else if (counts.READY > 0) overallStatus = 'READY';
      else overallStatus = 'RUNTIME_PENDING';
    }

    return { ...base, providers: counts, overallStatus };
  }
  list<T>(resource: AIRegistryResource, filters?: Record<string, unknown>) { return this.repository.list<T>(resource, filters); }
  find<T>(resource: AIRegistryResource, key: string) { return this.repository.find<T>(resource, key); }

  async save<T extends AIPlatformResourceValue>(resource: AIRegistryResource, value: T, actorReferenceId: string) {
    if (!actorReferenceId) throw new Error('Actor reference is required for AI governance changes.');
    assertNoSecretMaterial(value);
    const governed = value as unknown as Record<string, unknown>;
    if (resource === 'prompts' && (governed.status === 'ACTIVE' || governed.activeVersion != null))
      throw new Error('AI_PROMPT_ACTIVATION_REQUIRES_DEPLOYMENT_ENDPOINT');
    if (resource === 'models' && governed.status === 'ACTIVE' && governed.productionApproved !== true)
      throw new Error('AI_MODEL_PRODUCTION_APPROVAL_REQUIRED');
    if (resource === 'routingPolicies' && governed.status === 'ACTIVE') {
      const targets = Array.isArray(governed.targets) ? governed.targets : [];
      if (!targets.some((target) => target && typeof target === 'object' && (target as Record<string, unknown>).enabled === true))
        throw new Error('AI_ROUTING_ACTIVE_TARGET_REQUIRED');
    }
    if (resource === 'guardrails') validateGuardrailDefinition(value as unknown as AIGuardrailDefinition);
    if (resource === 'workflows') validateWorkflowDefinition(value as unknown as AIWorkflowDefinition);
    if (resource === 'evaluations') validateEvaluationDefinition(value as unknown as AIEvaluationDefinition);
    if ((resource === 'consumers' || resource === 'capabilities') && governed.status === 'ACTIVE' && governed.requireHumanReview === true)
      throw new Error(HUMAN_REVIEW_UNSUPPORTED);
    if (resource === 'providers') {
      const provider = value as unknown as AIProviderDefinition & { apiKey?: string; secretValue?: string };
      if (provider.apiKey || provider.secretValue) throw new Error('Provider secrets cannot be accepted by the AI Admin API.');
      if (!provider.secretReference?.match(/^[A-Z][A-Z0-9_]+$/)) throw new Error('Provider secretReference must be an environment variable name.');
      provider.operationalStatus = this.providers.get(provider.key)?.status() ?? 'NOT_CONFIGURED';
    }
    return this.repository.upsert(resource, value, actorReferenceId);
  }

  createPromptVersion(value: Omit<AIPromptVersion, 'id' | 'createdAt' | 'checksum'>) {
    if (value.status === 'APPROVED') throw new Error('AI_PROMPT_APPROVAL_REQUIRES_APPROVAL_ENDPOINT');
    if (value.inputSchema) compileGovernedJsonSchema(value.inputSchema);
    if (value.outputSchema) compileGovernedJsonSchema(value.outputSchema);
    return this.repository.createPromptVersion(value);
  }

  approvePromptVersion(promptKey: string, version: number, actorReferenceId: string) {
    return this.repository.approvePromptVersion(promptKey, version, actorReferenceId);
  }

  async deployPrompt(promptKey: string, version: number, actorReferenceId: string) {
    const versionRecord = await this.repository.findPromptVersion(promptKey, version);
    if (!versionRecord || versionRecord.status !== 'APPROVED') throw new Error('AI_PROMPT_VERSION_NOT_APPROVED');
    const evaluations = await this.repository.list<AIEvaluationDefinition>('evaluations', { status: 'ACTIVE' });
    for (const evaluation of evaluations.filter((item) => item.target.type === 'PROMPT' && item.target.key === promptKey && item.deploymentGate)) {
      const run = await this.repository.findLatestEvaluationRun(evaluation.key, {
        type: 'PROMPT', key: promptKey, version, checksum: versionRecord.checksum,
      });
      if (!run || run.targetType !== 'PROMPT' || run.targetKey !== promptKey || run.targetVersion !== version || run.targetChecksum !== versionRecord.checksum)
        throw new Error(`AI_EVALUATION_EXACT_TARGET_EVIDENCE_REQUIRED:${evaluation.key}`);
      if (run.score == null || run.score < evaluation.deploymentGate!.minimumScore || run.safetyFailures > evaluation.deploymentGate!.maximumSafetyFailures)
        throw new Error(`AI_EVALUATION_DEPLOYMENT_GATE_FAILED:${evaluation.key}`);
      if (evaluation.deploymentGate!.requiresHumanApproval && !run.approvedBy)
        throw new Error(`AI_EVALUATION_HUMAN_APPROVAL_REQUIRED:${evaluation.key}`);
    }
    return this.repository.deployPrompt(promptKey, version, actorReferenceId);
  }

  rollbackPrompt(promptKey: string, version: number, actorReferenceId: string) {
    return this.deployPrompt(promptKey, version, actorReferenceId);
  }
  executions(filters?: Record<string, unknown>) { return this.repository.listExecutions(filters); }
  execution(publicId: string) { return this.repository.findExecution(publicId); }
  executionTrace(publicId: string) { return this.repository.listExecutionSpans(publicId); }
  appendIncidentEvent(publicId: string, action: string, actorReferenceId: string, note?: string) {
    return this.repository.appendIncidentEvent(publicId, { at: new Date(), action, actorReferenceId, note });
  }
  providerStatuses(): Array<{ key: string; status: AIProviderOperationalStatus; capabilities: string[] }> {
    return this.providers.list().map((provider) => ({ key: provider.key, status: provider.status(), capabilities: provider.capabilities }));
  }
}

export class AIExecutionOrchestrator {
  private readonly guardrails = new EnterpriseAIGuardrailEngine();
  constructor(
    private readonly repository: IAIPlatformRepository,
    private readonly providers: IAIProviderRegistry,
    private readonly asyncPayloads?: IAIAsyncPayloadProtector,
  ) {}

  async execute(request: AIExecutionRequestDto, options: InternalExecutionOptions = {}): Promise<AIOrchestrationResponse> {
    validateExecutionRequest(request);
    const consumerKey = request.consumerKey ?? request.sourceDomain ?? 'default';
    const capabilityKey = request.capabilityKey ?? request.purpose;
    const dataClassification = normalizeDataClassification(request.dataClassification ?? request.metadata?.dataClassification);
    const requesterScope = request.requesterReferenceId ?? request.sourceDomain ?? 'system';
    const requestFingerprint = sha256(stableStringify({
      capabilityKey,
      promptKey: request.promptKey,
      purpose: request.purpose,
      input: request.input,
      locale: request.locale ?? 'ar',
      dataClassification,
      structuredOutputSchema: request.structuredOutputSchema ?? null,
    }));
    const idempotencyKeyHash = request.idempotencyKey ? sha256(`${consumerKey}:${requesterScope}:${request.idempotencyKey}`) : null;
    if (idempotencyKeyHash) {
      const previous = await this.repository.findExecutionByIdempotency(consumerKey, idempotencyKeyHash);
      if (previous) {
        if (previous.metadata?.requestFingerprint !== requestFingerprint) throw new Error('AI_IDEMPOTENCY_KEY_REUSED');
        return toExecutionResponse(previous);
      }
    }

    const [platformSettings, prompt, consumer, capability, routing, models, providerDefinitions, prices, configuredGuardrails] = await Promise.all([
      this.repository.find<{ key: string; globalEnabled?: boolean }>('platformSettings', 'runtime'),
      this.repository.find<AIPromptDefinition>('prompts', request.promptKey),
      this.repository.find<AIConsumerPolicy>('consumers', consumerKey),
      this.repository.find<AICapabilityDefinition>('capabilities', capabilityKey),
      options.forcedRoutingPolicyKey
        ? this.repository.find<AIRoutingPolicy>('routingPolicies', options.forcedRoutingPolicyKey)
        : this.findRoutingPolicy(capabilityKey, consumerKey),
      this.repository.list<AIModelDefinition>('models', { status: 'ACTIVE' }),
      this.repository.list<AIProviderDefinition>('providers', { status: 'ACTIVE' }),
      this.repository.list<AIModelPrice>('modelPrices', { status: 'ACTIVE' }),
      this.repository.list<AIGuardrailDefinition>('guardrails', { status: 'ACTIVE' }),
    ]);
    if (platformSettings?.globalEnabled === false) throw new Error('AI_PLATFORM_EMERGENCY_DISABLED');
    if (!prompt || (!options.promptVersion && (prompt.status !== 'ACTIVE' || !prompt.activeVersion))) throw new Error('AI_PROMPT_NOT_DEPLOYED');
    const resolvedPromptVersion = options.promptVersion ?? prompt.activeVersion!;
    const promptVersion = await this.repository.findPromptVersion(request.promptKey, resolvedPromptVersion);
    if (!promptVersion || promptVersion.status !== 'APPROVED') throw new Error('AI_PROMPT_VERSION_NOT_APPROVED');
    if (!consumer || consumer.status !== 'ACTIVE') throw new Error('AI_CONSUMER_NOT_ACTIVE');
    if (!consumer.allowedCapabilities.includes(capabilityKey)) throw new Error('AI_CAPABILITY_NOT_ALLOWED');
    if (!capability || capability.status !== 'ACTIVE') throw new Error('AI_CAPABILITY_DISABLED');
    if (consumer.requireHumanReview || capability.requiresHumanReview) throw new Error(HUMAN_REVIEW_UNSUPPORTED);
    if (capability.allowedDataClassifications?.length && !capability.allowedDataClassifications.includes(dataClassification)) throw new Error('AI_DATA_CLASSIFICATION_NOT_ALLOWED');
    if (consumer.allowedDataClassifications?.length && !consumer.allowedDataClassifications.includes(dataClassification)) throw new Error('AI_CONSUMER_DATA_CLASSIFICATION_NOT_ALLOWED');
    if (options.forcedRoutingPolicyKey && (!routing || routing.key !== options.forcedRoutingPolicyKey || routing.status !== 'ACTIVE'))
      throw new Error('AI_EVALUATION_ROUTING_TARGET_NOT_ACTIVE');

    const publicId = `ai_${randomUUID()}`;
    const traceId = randomUUID();
    const safety = this.guardrails.evaluateInput(request.input, configuredGuardrails);
    const candidates = this.route(routing, models, providerDefinitions, consumer, capability, dataClassification, traceId)
      .filter((candidate) => !options.forcedModelKey || candidate.model.key === options.forcedModelKey);
    if (options.forcedModelKey && candidates.length === 0) throw new Error('AI_EVALUATION_MODEL_TARGET_NOT_ROUTABLE');

    const inputTokenEstimate = estimateTokens(safety.value);
    const reservation = estimateQuotaReservation({
      consumer,
      candidates,
      prices,
      inputTokens: inputTokenEstimate,
      maxOutputTokens: request.maxOutputTokens,
    });
    const created = await this.repository.createExecutionWithQuota({
      publicId,
      traceId,
      idempotencyKeyHash,
      consumerKey,
      capabilityKey,
      purpose: request.purpose,
      promptKey: request.promptKey,
      promptVersion: resolvedPromptVersion,
      status: safety.decision === AISafetyDecision.BLOCKED ? AIExecutionStatus.BLOCKED : AIExecutionStatus.RECEIVED,
      safetyDecision: safety.decision,
      dataClassification,
      inputPreview: privacyPreview(safety.value, dataClassification),
      outputPreview: null,
      inputTokens: inputTokenEstimate,
      outputTokens: 0,
      requesterReferenceId: request.requesterReferenceId,
      sourceDomain: request.sourceDomain,
      metadata: sanitizeMetadata({ ...(request.metadata ?? {}), dataClassification, promptChecksum: promptVersion.checksum, requestFingerprint }),
    }, {
      reservationKey: idempotencyKeyHash ?? publicId,
      requestsPerMinute: consumer.requestsPerMinute,
      dailyRequestLimit: consumer.dailyRequestLimit,
      monthlyTokenLimit: consumer.monthlyTokenLimit,
      monthlyCostLimit: consumer.monthlyCostLimit,
      currency: consumer.currency,
      reservedTokens: reservation.tokens,
      reservedCost: reservation.cost,
    });
    let execution = created.execution;
    if (created.replayed) return toExecutionResponse(execution);

    await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'AUTHORIZATION', status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(), durationMs: 0, attributes: { consumerKey, capabilityKey, dataClassification } });
    await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'PRE_SAFETY', status: safety.decision === AISafetyDecision.BLOCKED ? 'FAILED' : 'COMPLETED', startedAt: new Date(), completedAt: new Date(), durationMs: 0, attributes: { decision: safety.decision, reasons: safety.reasons } });
    if (safety.decision === AISafetyDecision.BLOCKED) {
      await this.repository.finalizeQuotaReservation(execution.publicId, { tokens: 0, cost: 0, currency: consumer.currency });
      return toExecutionResponse(execution, safety.reasons.join(' '));
    }

    execution = await this.repository.updateExecution(execution.publicId, { status: AIExecutionStatus.RUNNING });
    await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'PROMPT_RESOLUTION', status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(), durationMs: 0, attributes: { promptKey: prompt.key, promptVersion: resolvedPromptVersion, promptChecksum: promptVersion.checksum } });
    await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'ROUTING', status: candidates.length ? 'COMPLETED' : 'FAILED', startedAt: new Date(), completedAt: new Date(), durationMs: 0, attributes: { candidateCount: candidates.length, policyKey: routing?.key ?? null, forcedModelKey: options.forcedModelKey ?? null } });

    let lastError: Error | null = null;
    let totalAttempts = 0;
    const maxAttempts = Math.max(1, Math.min(8, routing?.maxAttempts ?? 1));
    for (const candidate of candidates) {
      const adapter = this.providers.get(candidate.provider.key);
      const breakerKey = `${candidate.provider.key}:${candidate.model.key}`;
      if (!adapter || !isProviderExecutable(adapter.status()) || !(await this.repository.providerCircuitCanAttempt(breakerKey))) continue;
      const candidateAttempts = Math.max(1, Math.min(candidate.provider.maxRetries + 1, maxAttempts - totalAttempts));
      for (let attempt = 1; attempt <= candidateAttempts && totalAttempts < maxAttempts; attempt += 1) {
        totalAttempts += 1;
        const spanStarted = new Date();
        try {
          const result = await adapter.invoke({
            model: candidate.model.providerModelId,
            systemPrompt: renderPrompt(promptVersion.template, safety.value, request.locale),
            input: safety.value,
            maxOutputTokens: request.maxOutputTokens,
            structuredOutputSchema: request.structuredOutputSchema ?? promptVersion.outputSchema,
            metadata: sanitizeMetadata(request.metadata),
            timeoutMs: Math.min(candidate.provider.timeoutMs, candidate.target.maxLatencyMs ?? candidate.provider.timeoutMs),
          });
          const outputSafety = this.guardrails.evaluateOutput(result.output, configuredGuardrails);
          if (outputSafety.decision === AISafetyDecision.BLOCKED) throw new Error('AI_OUTPUT_BLOCKED');
          validateStructuredOutput(outputSafety.value, request.structuredOutputSchema ?? promptVersion.outputSchema);
          const price = selectPriceSnapshot(prices, candidate.model.key, new Date());
          const cost = estimateCost(candidate.model, result, price);
          const currency = price?.currency ?? candidate.model.currency ?? 'USD';
          if (consumer.monthlyCostLimit != null && (!consumer.currency || currency !== consumer.currency)) throw new Error('AI_COST_CURRENCY_MISMATCH');
          await this.repository.recordUsage({ executionPublicId: execution.publicId, providerKey: candidate.provider.key, modelKey: candidate.model.key, inputTokens: result.inputTokens, outputTokens: result.outputTokens, cost, currency, priceSnapshotKey: price?.key ?? null, pricingEffectiveFrom: price?.effectiveFrom ?? null, costKind: price ? 'ACTUAL' : candidate.model.inputPricePerMillion != null || candidate.model.outputPricePerMillion != null ? 'ESTIMATED' : 'UNKNOWN' });
          await this.repository.finalizeQuotaReservation(execution.publicId, { tokens: result.inputTokens + result.outputTokens, cost, currency });
          await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'PROVIDER_CALL', status: 'COMPLETED', startedAt: spanStarted, completedAt: new Date(), durationMs: Date.now() - spanStarted.getTime(), attributes: { providerKey: candidate.provider.key, modelKey: candidate.model.key, attempt } });
          await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'OUTPUT_VALIDATION', status: 'COMPLETED', startedAt: new Date(), completedAt: new Date(), durationMs: 0, attributes: { structured: Boolean(request.structuredOutputSchema ?? promptVersion.outputSchema) } });
          await this.repository.providerCircuitSuccess(breakerKey);
          execution = await this.repository.updateExecution(execution.publicId, { providerKey: candidate.provider.key, modelKey: candidate.model.key, status: AIExecutionStatus.COMPLETED, safetyDecision: mergeSafety(safety.decision, outputSafety.decision), outputPreview: privacyPreview(outputSafety.value, dataClassification), inputTokens: result.inputTokens, outputTokens: result.outputTokens, actualCost: cost, currency, metadata: sanitizeMetadata({ ...(execution.metadata ?? {}), providerRequestId: result.providerRequestId, finishReason: result.finishReason, priceSnapshotKey: price?.key ?? null }) });
          return { ...toExecutionResponse(execution), result: outputSafety.value };
        } catch (error) {
          lastError = error as Error;
          await this.repository.providerCircuitFailure(breakerKey);
          await this.repository.appendSpan({ executionPublicId: execution.publicId, traceId: execution.traceId, name: 'PROVIDER_CALL', status: 'FAILED', startedAt: spanStarted, completedAt: new Date(), durationMs: Date.now() - spanStarted.getTime(), attributes: { error: safeError(lastError), providerKey: candidate.provider.key, modelKey: candidate.model.key, attempt } });
          if (!isRetryable(lastError) || attempt >= candidateAttempts) break;
          await boundedBackoff(attempt);
        }
      }
    }
    await this.repository.finalizeQuotaReservation(execution.publicId, { tokens: 0, cost: 0, currency: consumer.currency, release: true });
    execution = await this.repository.updateExecution(execution.publicId, { status: AIExecutionStatus.FAILED, errorCode: lastError?.message.startsWith('AI_') ? lastError.message : 'AI_PROVIDER_UNAVAILABLE', errorMessage: safeError(lastError ?? new Error('No configured provider route is available.')) });
    return toExecutionResponse(execution);
  }

  async executeCapability(request: { consumerKey: string; capabilityKey: string; input: string; locale?: string | null; requesterReferenceId?: string | null; sourceDomain: string; metadata?: Record<string, unknown> | null; idempotencyKey?: string | null; structuredOutputSchema?: Record<string, unknown> | null; dataClassification?: AIDataClassification | null }): Promise<AIOrchestrationResponse> {
    const prompt = await this.repository.resolvePromptForCapability(request.capabilityKey);
    if (!prompt || !prompt.activeVersion) throw new Error('AI_CAPABILITY_NOT_CONFIGURED');
    return this.execute({ ...request, promptKey: prompt.key, purpose: prompt.purpose });
  }

  async capabilityReadiness(request: {
    consumerKey: string;
    capabilityKey: string;
    dataClassification?: AIDataClassification | null;
  }): Promise<{ ready: boolean; reason?: string; candidateCount: number; promptVersion?: number }> {
    const dataClassification = normalizeDataClassification(request.dataClassification);
    const prompt = await this.repository.resolvePromptForCapability(request.capabilityKey);
    if (!prompt || prompt.status !== 'ACTIVE' || !prompt.activeVersion)
      return { ready: false, reason: 'AI_PROMPT_NOT_DEPLOYED', candidateCount: 0 };
    const [platformSettings, promptVersion, consumer, capability, routing, models, providerDefinitions] = await Promise.all([
      this.repository.find<{ key: string; globalEnabled?: boolean }>('platformSettings', 'runtime'),
      this.repository.findPromptVersion(prompt.key, prompt.activeVersion),
      this.repository.find<AIConsumerPolicy>('consumers', request.consumerKey),
      this.repository.find<AICapabilityDefinition>('capabilities', request.capabilityKey),
      this.findRoutingPolicy(request.capabilityKey, request.consumerKey),
      this.repository.list<AIModelDefinition>('models', { status: 'ACTIVE' }),
      this.repository.list<AIProviderDefinition>('providers', { status: 'ACTIVE' }),
    ]);
    if (platformSettings?.globalEnabled === false) return { ready: false, reason: 'AI_PLATFORM_EMERGENCY_DISABLED', candidateCount: 0 };
    if (!promptVersion || promptVersion.status !== 'APPROVED') return { ready: false, reason: 'AI_PROMPT_VERSION_NOT_APPROVED', candidateCount: 0 };
    if (!consumer || consumer.status !== 'ACTIVE') return { ready: false, reason: 'AI_CONSUMER_NOT_ACTIVE', candidateCount: 0 };
    if (!consumer.allowedCapabilities.includes(request.capabilityKey)) return { ready: false, reason: 'AI_CAPABILITY_NOT_ALLOWED', candidateCount: 0 };
    if (!capability || capability.status !== 'ACTIVE') return { ready: false, reason: 'AI_CAPABILITY_DISABLED', candidateCount: 0 };
    if (consumer.requireHumanReview || capability.requiresHumanReview) return { ready: false, reason: HUMAN_REVIEW_UNSUPPORTED, candidateCount: 0 };
    if (capability.allowedDataClassifications?.length && !capability.allowedDataClassifications.includes(dataClassification))
      return { ready: false, reason: 'AI_DATA_CLASSIFICATION_NOT_ALLOWED', candidateCount: 0 };
    if (consumer.allowedDataClassifications?.length && !consumer.allowedDataClassifications.includes(dataClassification))
      return { ready: false, reason: 'AI_CONSUMER_DATA_CLASSIFICATION_NOT_ALLOWED', candidateCount: 0 };

    const routed = this.route(
      routing,
      models,
      providerDefinitions,
      consumer,
      capability,
      dataClassification,
      `readiness:${request.consumerKey}:${request.capabilityKey}`,
    );
    let candidateCount = 0;
    for (const candidate of routed) {
      const adapter = this.providers.get(candidate.provider.key);
      if (!adapter || !isProviderExecutable(adapter.status())) continue;
      if (!(await this.repository.providerCircuitCanAttempt(`${candidate.provider.key}:${candidate.model.key}`))) continue;
      candidateCount += 1;
    }
    return candidateCount > 0
      ? { ready: true, candidateCount, promptVersion: prompt.activeVersion }
      : { ready: false, reason: 'AI_ROUTE_NOT_EXECUTABLE', candidateCount: 0, promptVersion: prompt.activeVersion };
  }

  async executeCapabilityForEvaluation(
    request: { consumerKey: string; capabilityKey: string; input: string; sourceDomain: string; idempotencyKey: string; dataClassification?: AIDataClassification },
    target: { modelKey?: string; routingPolicyKey?: string },
  ) {
    const prompt = await this.repository.resolvePromptForCapability(request.capabilityKey);
    if (!prompt || !prompt.activeVersion) throw new Error('AI_CAPABILITY_NOT_CONFIGURED');
    return this.execute({ ...request, promptKey: prompt.key, purpose: prompt.purpose }, { forcedModelKey: target.modelKey, forcedRoutingPolicyKey: target.routingPolicyKey });
  }

  async executePromptVersionForEvaluation(request: { capabilityKey: string; promptKey: string; promptVersion: number; input: string; idempotencyKey: string }) {
    return this.execute({ consumerKey: 'evaluation', capabilityKey: request.capabilityKey, promptKey: request.promptKey, purpose: 'TOOL_ASSISTANCE' as any, sourceDomain: 'AIEvaluation', input: request.input, idempotencyKey: request.idempotencyKey, dataClassification: 'INTERNAL' }, { promptVersion: request.promptVersion });
  }

  async submitAsync(request: AIExecutionRequestDto) {
    validateExecutionRequest(request);
    if (!request.requesterReferenceId) throw new Error('AI_AUTHENTICATED_REQUESTER_REQUIRED');
    if (!this.asyncPayloads || this.asyncPayloads.status() !== 'READY') throw new Error('AI_ASYNC_QUEUE_NOT_CONFIGURED');
    const consumerKey = request.consumerKey ?? request.sourceDomain ?? 'default';
    const capabilityKey = request.capabilityKey ?? request.purpose;
    const [consumer, capability] = await Promise.all([
      this.repository.find<AIConsumerPolicy>('consumers', consumerKey),
      this.repository.find<AICapabilityDefinition>('capabilities', capabilityKey),
    ]);
    if (!consumer || consumer.status !== 'ACTIVE' || consumer.allowAsyncJobs !== true) throw new Error('AI_ASYNC_NOT_ALLOWED');
    if (consumer.requireHumanReview || capability?.requiresHumanReview) throw new Error(HUMAN_REVIEW_UNSUPPORTED);
    if (!consumer.allowedCapabilities.includes(capabilityKey) || !capability || capability.status !== 'ACTIVE') throw new Error('AI_CAPABILITY_NOT_ALLOWED');
    assertNoSecretMaterial(request.metadata ?? {});
    const protectedPayload = this.asyncPayloads.protect(request);
    return this.repository.createAsyncJob({ publicId: `aij_${randomUUID()}`, requesterReferenceId: request.requesterReferenceId, consumerKey, capabilityKey, status: 'QUEUED', payloadCiphertext: protectedPayload.ciphertext, payloadIv: protectedPayload.iv, payloadAuthTag: protectedPayload.authTag, payloadKeyVersion: protectedPayload.keyVersion, attempts: 0, maxAttempts: 3, nextAttemptAt: null, lockedAt: null, lockedBy: null, leaseExpiresAt: null, executionPublicId: null, errorCode: null, completedAt: null });
  }

  async submitAsyncCapability(request: { consumerKey: string; capabilityKey: string; input: string; locale?: string | null; requesterReferenceId: string; sourceDomain: string; metadata?: Record<string, unknown> | null; idempotencyKey?: string | null; structuredOutputSchema?: Record<string, unknown> | null; dataClassification?: AIDataClassification | null }) {
    const prompt = await this.repository.resolvePromptForCapability(request.capabilityKey);
    if (!prompt || !prompt.activeVersion) throw new Error('AI_CAPABILITY_NOT_CONFIGURED');
    return this.submitAsync({ ...request, promptKey: prompt.key, purpose: prompt.purpose });
  }

  async processAsync(publicId: string, workerId: string) {
    if (!workerId) throw new Error('AI_ASYNC_WORKER_ID_REQUIRED');
    if (!this.asyncPayloads || this.asyncPayloads.status() !== 'READY') throw new Error('AI_ASYNC_QUEUE_NOT_CONFIGURED');
    const job = await this.repository.claimAsyncJob(publicId, workerId);
    if (!job) throw new Error('AI_ASYNC_JOB_NOT_CLAIMABLE');
    try {
      const request = this.asyncPayloads.unprotect({ ciphertext: job.payloadCiphertext, iv: job.payloadIv, authTag: job.payloadAuthTag, keyVersion: job.payloadKeyVersion }) as AIExecutionRequestDto;
      validateExecutionRequest(request);
      if (request.requesterReferenceId !== job.requesterReferenceId || (request.consumerKey ?? request.sourceDomain ?? 'default') !== job.consumerKey || (request.capabilityKey ?? request.purpose) !== job.capabilityKey)
        throw new Error('AI_ASYNC_PAYLOAD_IDENTITY_MISMATCH');
      const response = await this.execute(request);
      if (response.status !== AIExecutionStatus.COMPLETED && response.status !== AIExecutionStatus.BLOCKED) throw new Error(response.errorCode ?? 'AI_ASYNC_EXECUTION_FAILED');
      return this.repository.updateAsyncJob(publicId, { status: 'COMPLETED', executionPublicId: response.executionPublicId, completedAt: new Date(), lockedAt: null, lockedBy: null, leaseExpiresAt: null, errorCode: null });
    } catch (error) {
      const retry = job.attempts < job.maxAttempts;
      return this.repository.updateAsyncJob(publicId, { status: retry ? 'RETRYING' : 'DEAD_LETTER', nextAttemptAt: retry ? new Date(Date.now() + jitteredBackoffMs(job.attempts, 1_000, 60_000)) : null, lockedAt: null, lockedBy: null, leaseExpiresAt: null, errorCode: safeError(error as Error), completedAt: retry ? null : new Date() });
    }
  }

  async processDueAsyncJobs(workerId: string, limit = 10, signal?: AbortSignal) {
    if (!workerId.trim()) throw new Error('AI_ASYNC_WORKER_ID_REQUIRED');
    const bounded = Math.min(50, Math.max(1, Math.trunc(limit)));
    const now = Date.now();
    const candidates = [] as AIAsyncJobRecord[];
    for (const status of ['QUEUED', 'RETRYING', 'RUNNING']) {
      const page = await this.repository.listAsyncJobs({ status, page: 1, pageSize: bounded });
      for (const job of page.data) {
        if (candidates.length >= bounded) break;
        if (status === 'RETRYING' && job.nextAttemptAt && new Date(job.nextAttemptAt).getTime() > now) continue;
        if (status === 'RUNNING' && (!job.leaseExpiresAt || new Date(job.leaseExpiresAt).getTime() > now)) continue;
        candidates.push(job);
      }
      if (candidates.length >= bounded) break;
    }
    let processed = 0;
    for (const job of candidates) {
      if (signal?.aborted) throw signal.reason ?? new Error('BACKGROUND_JOB_ABORTED');
      try {
        await this.processAsync(job.publicId, workerId);
        processed += 1;
      } catch (error) {
        if (!(error instanceof Error) || error.message !== 'AI_ASYNC_JOB_NOT_CLAIMABLE') throw error;
      }
    }
    return { scanned: candidates.length, processed };
  }

  queueStatus() { return this.repository.asyncQueueStatus(); }
  async listAsyncJobs(filters?: { status?: string; page?: number; pageSize?: number }) { const page = await this.repository.listAsyncJobs(filters); return { ...page, data: page.data.map(redactAsyncJob) }; }
  async operateAsyncJob(publicId: string, action: 'RETRY' | 'CANCEL', actorReferenceId: string) { return redactAsyncJob(await this.repository.operateAsyncJob(publicId, action, actorReferenceId)); }
  async findAsyncForRequester(publicId: string, requesterReferenceId: string) { const value = await this.repository.findAsyncJob(publicId); return value?.requesterReferenceId === requesterReferenceId ? redactAsyncJob(value) : null; }
  async cancelAsync(publicId: string, requesterReferenceId: string) { const value = await this.repository.findAsyncJob(publicId); if (!value || value.requesterReferenceId !== requesterReferenceId) throw new Error('AI_ASYNC_JOB_NOT_FOUND'); if (!['QUEUED', 'RETRYING'].includes(value.status)) throw new Error('AI_ASYNC_JOB_NOT_CANCELLABLE'); return redactAsyncJob(await this.repository.updateAsyncJob(publicId, { status: 'CANCELLED', completedAt: new Date() })); }
  find(publicId: string) { return this.repository.findExecution(publicId); }
  async findForRequester(publicId: string, requesterReferenceId: string) { const value = await this.repository.findExecution(publicId); return value?.requesterReferenceId === requesterReferenceId ? value : null; }
  list(filters?: Record<string, unknown>) { return this.repository.listExecutions(filters); }
  listLogs(filters?: Record<string, unknown>) { return this.repository.listExecutions(filters); }
  async cancel(publicId: string) { const value = await this.repository.findExecution(publicId); if (!value) throw new Error('AI_EXECUTION_NOT_FOUND'); if (![AIExecutionStatus.RECEIVED, AIExecutionStatus.QUEUED, AIExecutionStatus.RUNNING, AIExecutionStatus.RETRYING].includes(value.status)) throw new Error('AI_EXECUTION_NOT_CANCELLABLE'); return this.repository.updateExecution(publicId, { status: AIExecutionStatus.CANCELLED }); }

  private async findRoutingPolicy(capabilityKey: string, consumerKey: string) {
    const values = await this.repository.list<AIRoutingPolicy>('routingPolicies', { status: 'ACTIVE' });
    return values.find((item) => item.capabilityKey === capabilityKey && item.consumerKey === consumerKey)
      ?? values.find((item) => item.capabilityKey === capabilityKey && !item.consumerKey)
      ?? null;
  }

  private route(policy: AIRoutingPolicy | null, models: AIModelDefinition[], providers: AIProviderDefinition[], consumer: AIConsumerPolicy, capability: AICapabilityDefinition, classification: AIDataClassification, routingSeed: string) {
    if (!policy) return [];
    return policy.targets
      .filter((target) => target.enabled && !target.shadow && deterministicPercentage(`${routingSeed}:${target.modelKey}:canary`) < (target.canaryPercentage ?? 100))
      .sort((a, b) => a.priority - b.priority || weightedRank(routingSeed, a.modelKey, a.weight) - weightedRank(routingSeed, b.modelKey, b.weight))
      .map((target) => {
        const model = models.find((item) => item.key === target.modelKey);
        const provider = model ? providers.find((item) => item.key === model.providerKey) : null;
        return model && provider ? { model, provider, target } : null;
      })
      .filter((candidate): candidate is { model: AIModelDefinition; provider: AIProviderDefinition; target: AIRoutingPolicy['targets'][number] } => Boolean(candidate)
        && candidate!.model.productionApproved === true
        && candidate!.provider.productionApproved === true
        && candidate!.model.capabilities.includes(capability.kind)
        && classificationAllowed(classification, candidate!.model.maxDataClassification)
        && classificationAllowed(classification, candidate!.provider.maxDataClassification)
        && (!consumer.allowedModels?.length || consumer.allowedModels.includes(candidate!.model.key)));
  }
}

export class AIWorkflowUseCases {
  constructor(private readonly repository: IAIPlatformRepository, private readonly execution: AIExecutionOrchestrator) {}

  async start(workflowKey: string, input: Record<string, unknown>) {
    const workflow = await this.repository.find<AIWorkflowDefinition>('workflows', workflowKey);
    if (!workflow || workflow.status !== 'ACTIVE' || !workflow.activeVersion) throw new Error('AI_WORKFLOW_NOT_ACTIVE');
    const frozen = await this.repository.findWorkflowVersion(workflowKey, workflow.activeVersion);
    if (!frozen) throw new Error('AI_WORKFLOW_VERSION_NOT_FROZEN');
    return this.repository.createWorkflowRun({ publicId: `aiw_${randomUUID()}`, workflowKey, workflowVersion: frozen.version, status: 'QUEUED', traceId: randomUUID(), inputReferenceHash: sha256(stableStringify(input)), outputReferenceHash: null });
  }

  async run(publicId: string, input: Record<string, unknown>) {
    const run = await this.repository.findWorkflowRun(publicId);
    if (!run) throw new Error('AI_WORKFLOW_RUN_NOT_FOUND');
    if (run.inputReferenceHash !== sha256(stableStringify(input))) throw new Error('AI_WORKFLOW_INPUT_REFERENCE_MISMATCH');
    const workflow = await this.repository.findWorkflowVersion(run.workflowKey, run.workflowVersion);
    if (!workflow) throw new Error('AI_WORKFLOW_VERSION_NOT_FOUND');
    validateWorkflowDag(workflow.definition.steps);
    await this.repository.updateWorkflowRun(publicId, { status: 'RUNNING' });
    const outputs: Record<string, unknown> = {};
    const prior = await this.repository.listWorkflowStepRuns(publicId);
    for (const completed of prior.filter((item) => item.status === 'COMPLETED' && item.outputSnapshot !== undefined)) outputs[completed.stepKey] = completed.outputSnapshot;
    const order = topologicalSteps(workflow.definition.steps);
    for (const step of order) {
      if (outputs[step.key] !== undefined) continue;
      const missingDependency = (step.dependsOn ?? []).find((dependency) => outputs[dependency] === undefined);
      if (missingDependency) throw new Error(`AI_WORKFLOW_DEPENDENCY_NOT_COMPLETED:${step.key}:${missingDependency}`);
      const attempts = prior.filter((item) => item.stepKey === step.key).length;
      const maxAttempts = Math.max(1, Math.min(8, (step.retryLimit ?? 0) + 1));
      let response: AIOrchestrationResponse | null = null;
      let lastError: string | null = null;
      for (let attempt = attempts + 1; attempt <= maxAttempts; attempt += 1) {
        await this.repository.createWorkflowStepRun({ runPublicId: publicId, stepKey: step.key, executionId: null, status: 'RUNNING', attempt, inputReferenceHash: sha256(stableStringify({ workflowInput: input, dependencies: step.dependsOn ?? [], outputs })), outputReferenceHash: null, outputSnapshot: undefined, errorMessage: null, startedAt: new Date(), completedAt: null });
        response = await this.execution.execute({ purpose: 'TOOL_ASSISTANCE' as any, promptKey: step.promptKey, capabilityKey: step.capabilityKey, consumerKey: 'workflow', sourceDomain: 'AIWorkflow', input: JSON.stringify({ workflowInput: input, dependencyOutputs: Object.fromEntries((step.dependsOn ?? []).map((key) => [key, outputs[key]])) }), idempotencyKey: `${publicId}:${step.key}:${attempt}`, dataClassification: 'INTERNAL' });
        if (response.status === AIExecutionStatus.COMPLETED) {
          outputs[step.key] = response.result ?? null;
          await this.repository.updateWorkflowStepRun(publicId, step.key, attempt, { executionId: response.executionPublicId, status: 'COMPLETED', outputReferenceHash: sha256(stableStringify(outputs[step.key])), outputSnapshot: outputs[step.key], completedAt: new Date() });
          break;
        }
        lastError = response.errorMessage ?? response.errorCode ?? 'Workflow step failed.';
        await this.repository.updateWorkflowStepRun(publicId, step.key, attempt, { executionId: response.executionPublicId, status: 'FAILED', errorMessage: lastError, completedAt: new Date() });
      }
      if (!response || response.status !== AIExecutionStatus.COMPLETED) return this.repository.updateWorkflowRun(publicId, { status: 'FAILED', currentStep: step.key, errorMessage: lastError ?? 'Workflow step failed.' });
      await this.repository.updateWorkflowRun(publicId, { currentStep: step.key });
    }
    return this.repository.updateWorkflowRun(publicId, { status: 'COMPLETED', outputReferenceHash: sha256(stableStringify(outputs)) });
  }
}

export class AIEvaluationUseCases {
  constructor(private readonly repository: IAIPlatformRepository, private readonly execution: AIExecutionOrchestrator, private readonly workflows?: AIWorkflowUseCases) {}

  async start(evaluationKey: string, options: { promptVersion?: number; modelKey?: string } = {}) {
    const definition = await this.repository.find<AIEvaluationDefinition>('evaluations', evaluationKey);
    if (!definition || definition.status !== 'ACTIVE') throw new Error('AI_EVALUATION_NOT_ACTIVE');
    validateEvaluationDefinition(definition);
    const evidence = await this.resolveTargetEvidence(definition, options);
    return this.repository.createEvaluationRun({ publicId: `aiev_${randomUUID()}`, evaluationKey, status: 'QUEUED', promptVersion: evidence.type === 'PROMPT' ? evidence.version : null, modelKey: evidence.type === 'MODEL' ? evidence.key : null, targetType: evidence.type, targetKey: evidence.key, targetVersion: evidence.version ?? null, targetChecksum: evidence.checksum ?? null, targetEvidence: evidence.details, passed: 0, failed: 0, safetyFailures: 0, score: null, results: null, approvedBy: null, approvedAt: null });
  }

  async run(publicId: string) {
    const run = await this.repository.findEvaluationRun(publicId);
    if (!run) throw new Error('AI_EVALUATION_RUN_NOT_FOUND');
    const definition = await this.repository.find<AIEvaluationDefinition>('evaluations', run.evaluationKey);
    if (!definition || definition.status !== 'ACTIVE') throw new Error('AI_EVALUATION_NOT_ACTIVE');
    const currentEvidence = await this.resolveTargetEvidence(definition, { promptVersion: run.targetVersion ?? undefined, modelKey: run.modelKey ?? undefined });
    if (currentEvidence.type !== run.targetType || currentEvidence.key !== run.targetKey || (run.targetVersion ?? null) !== (currentEvidence.version ?? null) || (run.targetChecksum ?? null) !== (currentEvidence.checksum ?? null))
      throw new Error('AI_EVALUATION_TARGET_EVIDENCE_CHANGED');
    await this.repository.updateEvaluationRun(publicId, { status: 'RUNNING' });
    const results: Record<string, unknown>[] = [];
    let passed = 0;
    let safetyFailures = 0;
    for (const item of definition.dataset) {
      const started = Date.now();
      const response = await this.executeTarget(publicId, definition, run, item.input, item.key);
      const latencyMs = Date.now() - started;
      if (response.status === AIExecutionStatus.BLOCKED) safetyFailures += 1;
      const evaluatorResults = definition.evaluators.map((evaluator) => evaluateDefinition(evaluator, item, response, latencyMs));
      const ok = response.status === AIExecutionStatus.COMPLETED && evaluatorResults.every((result) => result.passed);
      results.push({ key: item.key, passed: ok, safetyFailure: response.status === AIExecutionStatus.BLOCKED, executionPublicId: response.executionPublicId, latencyMs, evaluatorResults, target: { type: run.targetType, key: run.targetKey, version: run.targetVersion, checksum: run.targetChecksum } });
      if (ok) passed += 1;
    }
    const score = definition.dataset.length ? passed / definition.dataset.length : 0;
    return this.repository.updateEvaluationRun(publicId, { status: 'COMPLETED', passed, failed: definition.dataset.length - passed, safetyFailures, score, results, completedAt: new Date() });
  }

  approve(publicId: string, actorReferenceId: string) { return this.repository.approveEvaluationRun(publicId, actorReferenceId); }

  private async executeTarget(publicId: string, definition: AIEvaluationDefinition, run: AIEvaluationRun, input: string, itemKey: string): Promise<AIOrchestrationResponse> {
    if (run.targetType === 'PROMPT') return this.execution.executePromptVersionForEvaluation({ capabilityKey: definition.capabilityKey, promptKey: run.targetKey, promptVersion: run.targetVersion!, input, idempotencyKey: `${publicId}:${itemKey}` });
    if (run.targetType === 'MODEL') return this.execution.executeCapabilityForEvaluation({ consumerKey: 'evaluation', capabilityKey: definition.capabilityKey, sourceDomain: 'AIEvaluation', input, idempotencyKey: `${publicId}:${itemKey}`, dataClassification: 'INTERNAL' }, { modelKey: run.targetKey });
    if (run.targetType === 'ROUTING') return this.execution.executeCapabilityForEvaluation({ consumerKey: 'evaluation', capabilityKey: definition.capabilityKey, sourceDomain: 'AIEvaluation', input, idempotencyKey: `${publicId}:${itemKey}`, dataClassification: 'INTERNAL' }, { routingPolicyKey: run.targetKey });
    if (run.targetType === 'WORKFLOW') {
      if (!this.workflows) throw new Error('AI_EVALUATION_WORKFLOW_EXECUTOR_NOT_CONFIGURED');
      const workflowRun = await this.workflows.start(run.targetKey, { evaluationInput: input });
      const completed = await this.workflows.run(workflowRun.publicId, { evaluationInput: input });
      return { executionPublicId: completed.publicId, traceId: completed.traceId, status: completed.status === 'COMPLETED' ? AIExecutionStatus.COMPLETED : AIExecutionStatus.FAILED, usage: { inputTokens: 0, outputTokens: 0, cost: 0, currency: null }, result: JSON.stringify({ workflowPublicId: completed.publicId, outputReferenceHash: completed.outputReferenceHash }) };
    }
    throw new Error('AI_EVALUATION_TARGET_UNSUPPORTED');
  }

  private async resolveTargetEvidence(definition: AIEvaluationDefinition, options: { promptVersion?: number; modelKey?: string }) {
    if (definition.target.type === 'PROMPT') {
      if (!options.promptVersion) throw new Error('AI_EVALUATION_PROMPT_VERSION_REQUIRED');
      const version = await this.repository.findPromptVersion(definition.target.key, options.promptVersion);
      if (!version || version.status !== 'APPROVED') throw new Error('AI_EVALUATION_PROMPT_VERSION_NOT_APPROVED');
      return { type: 'PROMPT' as const, key: definition.target.key, version: version.version, checksum: version.checksum, details: { promptVersionId: version.id } };
    }
    if (definition.target.type === 'MODEL') {
      const model = await this.repository.find<AIModelDefinition>('models', definition.target.key);
      if (!model || model.status !== 'ACTIVE' || model.productionApproved !== true) throw new Error('AI_EVALUATION_MODEL_TARGET_NOT_ACTIVE');
      if (options.modelKey && options.modelKey !== model.key) throw new Error('AI_EVALUATION_MODEL_TARGET_MISMATCH');
      return { type: 'MODEL' as const, key: model.key, checksum: sha256(stableStringify({ providerKey: model.providerKey, providerModelId: model.providerModelId, capabilities: model.capabilities })), details: { providerKey: model.providerKey, providerModelId: model.providerModelId } };
    }
    if (definition.target.type === 'ROUTING') {
      const routing = await this.repository.find<AIRoutingPolicy>('routingPolicies', definition.target.key);
      if (!routing || routing.status !== 'ACTIVE') throw new Error('AI_EVALUATION_ROUTING_TARGET_NOT_ACTIVE');
      return { type: 'ROUTING' as const, key: routing.key, checksum: sha256(stableStringify(routing.targets)), details: { capabilityKey: routing.capabilityKey, consumerKey: routing.consumerKey ?? null } };
    }
    if (definition.target.type === 'WORKFLOW') {
      const workflow = await this.repository.find<AIWorkflowDefinition>('workflows', definition.target.key);
      if (!workflow || workflow.status !== 'ACTIVE' || !workflow.activeVersion) throw new Error('AI_EVALUATION_WORKFLOW_TARGET_NOT_ACTIVE');
      const frozen = await this.repository.findWorkflowVersion(workflow.key, workflow.activeVersion);
      if (!frozen) throw new Error('AI_EVALUATION_WORKFLOW_VERSION_NOT_FROZEN');
      return { type: 'WORKFLOW' as const, key: workflow.key, version: frozen.version, checksum: frozen.checksum, details: { workflowVersionId: frozen.id } };
    }
    throw new Error('AI_EVALUATION_KNOWLEDGE_TARGET_NOT_SUPPORTED');
  }
}

export class AIKnowledgeUseCases {
  constructor(private readonly repository: IAIPlatformRepository, private readonly providers: IAIProviderRegistry) {}
  async index(input: { indexKey: string; sourceType: string; sourceReferenceId: string; sourceVersion?: string; locale?: string; content: string; actorReferenceId: string }) {
    const index = await this.repository.find<AIKnowledgeIndex>('knowledgeIndexes', input.indexKey);
    if (!index || index.status !== 'ACTIVE') throw new Error('AI_KNOWLEDGE_INDEX_NOT_ACTIVE');
    const model = await this.repository.find<AIModelDefinition>('models', index.embeddingModelKey);
    if (!model || model.status !== 'ACTIVE') throw new Error('AI_EMBEDDING_MODEL_NOT_ACTIVE');
    const adapter = this.providers.get(model.providerKey);
    if (!adapter || !isProviderExecutable(adapter.status()) || !adapter.embed) throw new Error('AI_EMBEDDING_PROVIDER_NOT_CONFIGURED');
    const sourceChecksum = sha256(input.content);
    const source: AIKnowledgeSource = { id: '', indexKey: input.indexKey, sourceType: input.sourceType, sourceReferenceId: input.sourceReferenceId, sourceVersion: input.sourceVersion, checksum: sourceChecksum, locale: input.locale, status: 'PENDING', metadata: { canonicalSourceOnly: true } };
    await this.repository.upsert('knowledgeSources', { ...source, key: `${input.indexKey}:${input.sourceType}:${input.sourceReferenceId}` } as any, input.actorReferenceId);
    const chunks = chunkText(input.content, Number(index.chunkingStrategy.maxCharacters ?? 1600), Number(index.chunkingStrategy.overlapCharacters ?? 160));
    const run = await this.repository.createIndexingRun({ publicId: `aiidx_${randomUUID()}`, indexKey: input.indexKey, sourceReferenceId: input.sourceReferenceId, status: 'RUNNING', chunks: chunks.length, embeddedChunks: 0 });
    try {
      const result = await adapter.embed({ model: model.providerModelId, inputs: chunks, dimensions: index.dimensions });
      if (result.embeddings.length !== chunks.length) throw new Error('AI_EMBEDDING_COUNT_MISMATCH');
      await this.repository.replaceEmbeddings({ indexKey: input.indexKey, sourceReferenceId: input.sourceReferenceId, modelKey: model.key, dimensions: index.dimensions, chunks: chunks.map((text, position) => ({ chunkKey: `${position + 1}`, chunkText: text, embeddingRef: sha256(JSON.stringify(result.embeddings[position])), checksum: sha256(text), metadata: { position, vector: result.embeddings[position], sourceChecksum } })) });
      await this.repository.upsert('knowledgeSources', { ...source, key: `${input.indexKey}:${input.sourceType}:${input.sourceReferenceId}`, status: 'INDEXED', metadata: { canonicalSourceOnly: true, chunks: chunks.length, modelKey: model.key } } as any, input.actorReferenceId);
      return this.repository.updateIndexingRun(run.publicId, { status: 'COMPLETED', embeddedChunks: chunks.length, completedAt: new Date() });
    } catch (error) {
      await this.repository.updateIndexingRun(run.publicId, { status: 'FAILED', errorMessage: safeError(error as Error), completedAt: new Date() });
      throw error;
    }
  }
}

export class EnterpriseAIGuardrailEngine {
  private readonly compiled = new Map<string, RegExp[]>();
  evaluateInput(value: string, guardrails: AIGuardrailDefinition[]) { return this.evaluate(value, guardrails.filter((item) => item.stage !== 'OUTPUT')); }
  evaluateOutput(value: string, guardrails: AIGuardrailDefinition[]) { return this.evaluate(value, guardrails.filter((item) => item.stage !== 'INPUT')); }
  private evaluate(input: string, guardrails: AIGuardrailDefinition[]) {
    let value = input;
    const reasons: string[] = [];
    let decision = AISafetyDecision.ALLOWED;
    const pii = [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, /\+?\d[\d\s()-]{7,}\d/g, /\b(?:\d[ -]*?){13,19}\b/g];
    for (const pattern of pii) if (pattern.test(value)) { value = value.replace(pattern, '[REDACTED]'); decision = AISafetyDecision.REDACTED; reasons.push('PII_REDACTED'); }
    const injection = /(ignore|disregard).{0,30}(instructions|system prompt)|reveal.{0,20}(prompt|secret)|developer message/iu;
    if (injection.test(value)) { decision = AISafetyDecision.BLOCKED; reasons.push('PROMPT_INJECTION'); }
    for (const guardrail of guardrails) {
      const regexes = this.compiled.get(`${guardrail.key}:${guardrail.version}`) ?? compileGuardrailPatterns(guardrail);
      this.compiled.set(`${guardrail.key}:${guardrail.version}`, regexes);
      if (regexes.some((pattern) => pattern.test(value))) {
        reasons.push(guardrail.key);
        if (guardrail.action === 'REQUIRE_REVIEW') throw new Error(HUMAN_REVIEW_UNSUPPORTED);
        if (guardrail.action === 'BLOCK') decision = AISafetyDecision.BLOCKED;
        if (guardrail.action === 'REDACT' && decision !== AISafetyDecision.BLOCKED) decision = AISafetyDecision.REDACTED;
      }
    }
    return { decision, value, reasons };
  }
}

/** Unit-test helper only. Runtime circuit state is repository-backed and shared across instances. */
export class AIProviderCircuitBreaker {
  private readonly states = new Map<string, { failures: number; openedAt?: number; halfOpen?: boolean }>();
  constructor(private readonly threshold = 3, private readonly resetAfterMs = 30_000) {}
  state(key: string): 'CLOSED' | 'OPEN' | 'HALF_OPEN' { const value = this.states.get(key); if (!value?.openedAt) return value?.halfOpen ? 'HALF_OPEN' : 'CLOSED'; return Date.now() - value.openedAt >= this.resetAfterMs ? 'HALF_OPEN' : 'OPEN'; }
  canAttempt(key: string) { const state = this.states.get(key); if (!state?.openedAt) return !state?.halfOpen; if (Date.now() - state.openedAt >= this.resetAfterMs) { this.states.set(key, { failures: state.failures, halfOpen: true }); return true; } return false; }
  success(key: string) { this.states.set(key, { failures: 0 }); }
  failure(key: string) { const previous = this.states.get(key) ?? { failures: 0 }; const failures = previous.failures + 1; this.states.set(key, { failures, openedAt: previous.halfOpen || failures >= this.threshold ? Date.now() : previous.openedAt, halfOpen: false }); }
}

function isProviderExecutable(status: AIProviderOperationalStatus) { return status === 'READY' || status === 'RUNTIME_PENDING'; }

function validateExecutionRequest(request: AIExecutionRequestDto) {
  if (!request.promptKey?.trim()) throw new Error('AI promptKey is required.');
  if (!request.input?.trim()) throw new Error('AI input is required.');
  if (request.input.length > 100_000) throw new Error('AI input exceeds the source safety limit.');
  if (request.structuredOutputSchema) compileGovernedJsonSchema(request.structuredOutputSchema);
}

function validateStructuredOutput(value: string, schema?: Record<string, unknown> | null) {
  if (!schema) return;
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('AI_STRUCTURED_OUTPUT_INVALID_JSON'); }
  const validator = compileGovernedJsonSchema(schema);
  if (!validator(parsed)) throw new Error('AI_STRUCTURED_OUTPUT_SCHEMA_MISMATCH');
}

function compileGovernedJsonSchema(schema: Record<string, unknown>): (value: unknown) => boolean {
  const allowed = new Set(['$schema', 'type', 'required', 'properties', 'items', 'enum', 'const', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'format', 'additionalProperties', 'anyOf', 'oneOf', 'allOf', 'minItems', 'maxItems']);
  const compile = (node: unknown, path: string): ((value: unknown) => boolean) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error(`AI_JSON_SCHEMA_INVALID:${path}`);
    const definition = node as Record<string, unknown>;
    for (const key of Object.keys(definition)) if (!allowed.has(key)) throw new Error(`AI_JSON_SCHEMA_UNSUPPORTED_KEYWORD:${path}.${key}`);
    if (definition.$schema !== undefined && definition.$schema !== 'https://json-schema.org/draft/2020-12/schema')
      throw new Error(`AI_JSON_SCHEMA_UNSUPPORTED_DIALECT:${definition.$schema}`);
    const type = typeof definition.type === 'string' ? definition.type : undefined;
    if (type && !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(type))
      throw new Error(`AI_JSON_SCHEMA_UNSUPPORTED_TYPE:${path}.${type}`);
    if (definition.format !== undefined && !['email', 'uri', 'date-time'].includes(String(definition.format)))
      throw new Error(`AI_JSON_SCHEMA_UNSUPPORTED_FORMAT:${definition.format}`);
    const enumValues = Array.isArray(definition.enum) ? definition.enum : null;
    const hasConst = Object.prototype.hasOwnProperty.call(definition, 'const');
    const properties = definition.properties && typeof definition.properties === 'object' && !Array.isArray(definition.properties) ? definition.properties as Record<string, unknown> : {};
    const required = Array.isArray(definition.required) ? definition.required.map(String) : [];
    const propertyValidators = new Map(Object.entries(properties).map(([key, child]) => [key, compile(child, `${path}.properties.${key}`)]));
    const itemValidator = definition.items ? compile(definition.items, `${path}.items`) : null;
    const anyOf = Array.isArray(definition.anyOf) ? definition.anyOf.map((child, index) => compile(child, `${path}.anyOf.${index}`)) : [];
    const oneOf = Array.isArray(definition.oneOf) ? definition.oneOf.map((child, index) => compile(child, `${path}.oneOf.${index}`)) : [];
    const allOf = Array.isArray(definition.allOf) ? definition.allOf.map((child, index) => compile(child, `${path}.allOf.${index}`)) : [];
    const safePattern = typeof definition.pattern === 'string' ? compileSafeRegex(definition.pattern, `${path}.pattern`) : null;
    const additional = definition.additionalProperties;
    const additionalValidator = additional && typeof additional === 'object' ? compile(additional, `${path}.additionalProperties`) : null;
    return (value: unknown) => {
      if (type && !matchesJsonType(value, type)) return false;
      if (enumValues && !enumValues.some((candidate) => deepEqual(candidate, value))) return false;
      if (hasConst && !deepEqual(definition.const, value)) return false;
      if (typeof value === 'number') {
        if (typeof definition.minimum === 'number' && value < definition.minimum) return false;
        if (typeof definition.maximum === 'number' && value > definition.maximum) return false;
      }
      if (typeof value === 'string') {
        if (typeof definition.minLength === 'number' && value.length < definition.minLength) return false;
        if (typeof definition.maxLength === 'number' && value.length > definition.maxLength) return false;
        if (safePattern && !safePattern.test(value)) return false;
        if (definition.format === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return false;
        if (definition.format === 'uri') { try { new URL(value); } catch { return false; } }
        if (definition.format === 'date-time' && Number.isNaN(Date.parse(value))) return false;
      }
      if (Array.isArray(value)) {
        if (typeof definition.minItems === 'number' && value.length < definition.minItems) return false;
        if (typeof definition.maxItems === 'number' && value.length > definition.maxItems) return false;
        if (itemValidator && !value.every((item) => itemValidator(item))) return false;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        if (required.some((key) => !(key in record))) return false;
        for (const [key, candidate] of Object.entries(record)) {
          const validator = propertyValidators.get(key);
          if (validator && !validator(candidate)) return false;
          if (!validator && additional === false) return false;
          if (!validator && additionalValidator && !additionalValidator(candidate)) return false;
        }
      }
      if (anyOf.length && !anyOf.some((validator) => validator(value))) return false;
      if (oneOf.length && oneOf.filter((validator) => validator(value)).length !== 1) return false;
      if (allOf.length && !allOf.every((validator) => validator(value))) return false;
      return true;
    };
  };
  return compile(schema, '$');
}

function validateGuardrailDefinition(guardrail: AIGuardrailDefinition) { compileGuardrailPatterns(guardrail); }
function compileGuardrailPatterns(guardrail: AIGuardrailDefinition) {
  const patterns = Array.isArray(guardrail.rules.patterns) ? guardrail.rules.patterns.filter((value): value is string => typeof value === 'string') : [];
  return patterns.map((pattern, index) => compileSafeRegex(pattern, `${guardrail.key}.rules.patterns.${index}`));
}
function compileSafeRegex(pattern: string, path: string) {
  if (!pattern || pattern.length > MAX_GOVERNED_REGEX_LENGTH) throw new Error(`AI_GUARDRAIL_REGEX_UNSAFE:${path}`);
  if (/\\[1-9]/.test(pattern) || /\(\?<([=!])/.test(pattern) || /\)[+*{]/.test(pattern) || /(?:\.\*){2,}|(?:\.\+){2,}/.test(pattern) || /(?:[^\\]|^)\.[*+].*\.[*+]/.test(pattern)) throw new Error(`AI_GUARDRAIL_REGEX_UNSAFE:${path}`);
  try { return new RegExp(pattern, 'iu'); } catch { throw new Error(`AI_GUARDRAIL_REGEX_INVALID:${path}`); }
}

function validateWorkflowDefinition(workflow: AIWorkflowDefinition) {
  if (workflow.status === 'ACTIVE' && (!workflow.activeVersion || !Number.isInteger(workflow.activeVersion) || workflow.activeVersion < 1)) throw new Error('AI_WORKFLOW_ACTIVE_VERSION_REQUIRED');
  validateWorkflowDag(workflow.definition?.steps ?? []);
}
function validateWorkflowDag(steps: AIWorkflowDefinition['definition']['steps']) {
  const keys = new Set<string>();
  for (const step of steps) {
    if (!step.key || keys.has(step.key)) throw new Error('AI_WORKFLOW_STEP_KEY_DUPLICATE');
    keys.add(step.key);
    if ((step.retryLimit ?? 0) < 0 || (step.retryLimit ?? 0) > 7) throw new Error('AI_WORKFLOW_RETRY_LIMIT_INVALID');
  }
  for (const step of steps) for (const dependency of step.dependsOn ?? []) if (!keys.has(dependency) || dependency === step.key) throw new Error('AI_WORKFLOW_DEPENDENCY_INVALID');
  topologicalSteps(steps);
}
function topologicalSteps(steps: AIWorkflowDefinition['definition']['steps']) {
  const remaining = new Map(steps.map((step) => [step.key, step]));
  const done = new Set<string>();
  const order: typeof steps = [];
  while (remaining.size) {
    const ready = [...remaining.values()].filter((step) => (step.dependsOn ?? []).every((dependency) => done.has(dependency))).sort((a, b) => a.key.localeCompare(b.key));
    if (!ready.length) throw new Error('AI_WORKFLOW_DEPENDENCY_CYCLE');
    for (const step of ready) { order.push(step); done.add(step.key); remaining.delete(step.key); }
  }
  return order;
}

function validateEvaluationDefinition(definition: AIEvaluationDefinition) {
  if (definition.target.type === 'KNOWLEDGE') throw new Error('AI_EVALUATION_KNOWLEDGE_TARGET_NOT_SUPPORTED');
  if (!definition.dataset.length) throw new Error('AI_EVALUATION_DATASET_REQUIRED');
  if (!definition.evaluators.length) throw new Error('AI_EVALUATOR_REQUIRED');
  for (const evaluator of definition.evaluators) {
    if ((evaluator.type === 'LATENCY' || evaluator.type === 'COST') && (evaluator.threshold == null || evaluator.threshold < 0)) throw new Error(`AI_EVALUATOR_THRESHOLD_REQUIRED:${evaluator.key}`);
  }
}

function evaluateDefinition(evaluator: AIEvaluationDefinition['evaluators'][number], item: AIEvaluationDefinition['dataset'][number], response: AIOrchestrationResponse, latencyMs: number) {
  switch (evaluator.type) {
    case 'EXACT_MATCH': return { key: evaluator.key, type: evaluator.type, passed: deepEqual(response.result, item.expected) };
    case 'JSON_SCHEMA': {
      const schema = (item.metadata?.jsonSchema ?? item.expected) as Record<string, unknown> | undefined;
      if (!schema || typeof schema !== 'object') throw new Error(`AI_EVALUATOR_JSON_SCHEMA_REQUIRED:${evaluator.key}`);
      let parsed: unknown;
      try { parsed = JSON.parse(response.result ?? ''); } catch { return { key: evaluator.key, type: evaluator.type, passed: false }; }
      return { key: evaluator.key, type: evaluator.type, passed: compileGovernedJsonSchema(schema)(parsed) };
    }
    case 'REGEX': {
      if (typeof item.expected !== 'string') throw new Error(`AI_EVALUATOR_REGEX_REQUIRED:${evaluator.key}`);
      return { key: evaluator.key, type: evaluator.type, passed: compileSafeRegex(item.expected, `evaluation.${evaluator.key}`).test(response.result ?? '') };
    }
    case 'LATENCY': return { key: evaluator.key, type: evaluator.type, passed: latencyMs <= (evaluator.threshold ?? -1), observed: latencyMs };
    case 'COST': return { key: evaluator.key, type: evaluator.type, passed: (response.usage.cost ?? Number.POSITIVE_INFINITY) <= (evaluator.threshold ?? -1), observed: response.usage.cost ?? null, currency: response.usage.currency ?? null };
    case 'HUMAN': return { key: evaluator.key, type: evaluator.type, passed: item.metadata?.humanApproved === true };
    default: throw new Error(`AI_EVALUATOR_UNSUPPORTED:${(evaluator as { type: string }).type}`);
  }
}

function estimateQuotaReservation(input: { consumer: AIConsumerPolicy; candidates: Array<{ model: AIModelDefinition; provider: AIProviderDefinition; target: AIRoutingPolicy['targets'][number] }>; prices: AIModelPrice[]; inputTokens: number; maxOutputTokens?: number | null }) {
  const reservedTokens = input.inputTokens + Math.max(1, input.maxOutputTokens ?? Math.max(1, ...input.candidates.map((candidate) => candidate.model.maxOutputTokens ?? 1024)));
  if (input.consumer.monthlyCostLimit == null) return { tokens: reservedTokens, cost: 0 };
  if (!input.consumer.currency) throw new Error('AI_CONSUMER_BUDGET_CURRENCY_REQUIRED');
  if (!input.candidates.length) return { tokens: reservedTokens, cost: 0 };
  const costs = input.candidates.map((candidate) => {
    const price = selectPriceSnapshot(input.prices, candidate.model.key, new Date());
    const currency = price?.currency ?? candidate.model.currency;
    if (!currency || currency !== input.consumer.currency) throw new Error('AI_COST_CURRENCY_MISMATCH');
    const inputPrice = Number(price?.inputPricePerMillion ?? candidate.model.inputPricePerMillion ?? NaN);
    const outputPrice = Number(price?.outputPricePerMillion ?? candidate.model.outputPricePerMillion ?? NaN);
    if (!Number.isFinite(inputPrice) || !Number.isFinite(outputPrice)) throw new Error('AI_COST_PRICE_REQUIRED_FOR_BUDGETED_CONSUMER');
    return (input.inputTokens * inputPrice + (input.maxOutputTokens ?? candidate.model.maxOutputTokens ?? 1024) * outputPrice) / 1_000_000;
  });
  return { tokens: reservedTokens, cost: Math.max(...costs, 0) };
}

function matchesJsonType(value: unknown, type: string) { if (type === 'array') return Array.isArray(value); if (type === 'integer') return Number.isInteger(value); if (type === 'number') return typeof value === 'number' && Number.isFinite(value); if (type === 'null') return value === null; if (type === 'object') return !!value && typeof value === 'object' && !Array.isArray(value); if (type === 'boolean') return typeof value === 'boolean'; if (type === 'string') return typeof value === 'string'; throw new Error(`AI_JSON_SCHEMA_UNSUPPORTED_TYPE:${type}`); }
function estimateTokens(value: string) { return Math.max(1, Math.ceil(value.length / 4)); }
function estimateCost(model: AIModelDefinition, result: AIProviderInvocationResult, price?: AIModelPrice | null) { return (result.inputTokens * Number(price?.inputPricePerMillion ?? model.inputPricePerMillion ?? 0) + result.outputTokens * Number(price?.outputPricePerMillion ?? model.outputPricePerMillion ?? 0)) / 1_000_000; }
function privacyPreview(value: string, classification: AIDataClassification) { return classification === 'STUDENT_PRIVATE' || classification === 'HIGHLY_SENSITIVE' ? null : value.slice(0, 500); }
function sanitizeMetadata(value?: Record<string, unknown> | null): Record<string, unknown> | null { if (!value) return null; const output: Record<string, unknown> = {}; for (const [key, item] of Object.entries(value)) { if (/secret|token|api.?key|password|authorization/i.test(key)) output[key] = '[REDACTED]'; else if (item && typeof item === 'object' && !Array.isArray(item)) output[key] = sanitizeMetadata(item as Record<string, unknown>); else if (Array.isArray(item)) output[key] = item.slice(0, 50).map((entry) => entry && typeof entry === 'object' ? '[OBJECT_REDACTED]' : entry); else output[key] = item; } return output; }
function assertNoSecretMaterial(value: unknown, path = 'root'): void { if (!value || typeof value !== 'object') return; for (const [key, nested] of Object.entries(value)) { const current = `${path}.${key}`; if (/api.?key|secretValue|accessToken|authorization|password|credential/i.test(key)) throw new Error(`AI_SECRET_MATERIAL_FORBIDDEN:${current}`); if (nested && typeof nested === 'object') assertNoSecretMaterial(nested, current); } }
function safeError(error: Error) { const value = error.message.replace(/(sk-[A-Za-z0-9_-]+|Bearer\s+\S+)/g, '[REDACTED]'); return value.startsWith('AI_') ? value.slice(0, 240) : 'AI_PROVIDER_ERROR'; }
function redactAsyncJob<T extends { payloadCiphertext: string; payloadIv: string; payloadAuthTag: string }>(job: T) { const { payloadCiphertext: _ciphertext, payloadIv: _iv, payloadAuthTag: _tag, ...safe } = job; return safe; }
function mergeSafety(a: AISafetyDecision, b: AISafetyDecision) { return a === AISafetyDecision.BLOCKED || b === AISafetyDecision.BLOCKED ? AISafetyDecision.BLOCKED : a === AISafetyDecision.REDACTED || b === AISafetyDecision.REDACTED ? AISafetyDecision.REDACTED : AISafetyDecision.ALLOWED; }
function toExecutionResponse(value: AIExecutionRecord, blockedReason?: string): AIOrchestrationResponse { return { executionPublicId: value.publicId, traceId: value.traceId, status: value.status, blockedReason, errorCode: value.errorCode, errorMessage: value.errorMessage, providerKey: value.providerKey, modelKey: value.modelKey, usage: { inputTokens: value.inputTokens, outputTokens: value.outputTokens, cost: value.actualCost, currency: value.currency } }; }
function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
const classificationRank: Record<AIDataClassification, number> = { PUBLIC: 0, INTERNAL: 1, CONFIDENTIAL: 2, STUDENT_PRIVATE: 3, HIGHLY_SENSITIVE: 4 };
function normalizeDataClassification(value: unknown): AIDataClassification { return typeof value === 'string' && value in classificationRank ? value as AIDataClassification : 'INTERNAL'; }
function classificationAllowed(value: AIDataClassification, maximum?: AIDataClassification) { return maximum != null && classificationRank[value] <= classificationRank[maximum]; }
function selectPriceSnapshot(prices: AIModelPrice[], modelKey: string, at: Date) { return prices.filter((price) => price.modelKey === modelKey && new Date(price.effectiveFrom) <= at && (!price.effectiveTo || new Date(price.effectiveTo) > at)).sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0] ?? null; }
function isRetryable(error: Error & { retryable?: boolean }) { return error.retryable === true || /TIMEOUT|RATE_LIMIT|UNAVAILABLE|429|5\d\d/.test(error.message); }
function jitteredBackoffMs(attempt: number, base = 50, max = 750) { const cap = Math.min(max, base * 2 ** Math.max(0, attempt - 1)); return Math.max(1, Math.floor(cap * (0.5 + Math.random() * 0.5))); }
function boundedBackoff(attempt: number) { return new Promise<void>((resolve) => setTimeout(resolve, jitteredBackoffMs(attempt))); }
function deterministicPercentage(value: string) { return Number.parseInt(sha256(value).slice(0, 8), 16) % 100; }
function weightedRank(seed: string, key: string, weight: number) { return deterministicPercentage(`${seed}:${key}:weight`) / Math.max(1, weight); }
function chunkText(value: string, maxCharacters: number, overlapCharacters: number) { const max = Math.max(200, Math.min(8000, maxCharacters)); const overlap = Math.max(0, Math.min(max - 1, overlapCharacters)); const chunks: string[] = []; for (let start = 0; start < value.length; start += max - overlap) { const chunk = value.slice(start, start + max).trim(); if (chunk) chunks.push(chunk); if (start + max >= value.length) break; } return chunks; }
function renderPrompt(template: string, _input: string, locale?: string | null) { if (template.includes('{{input}}')) throw new Error('AI_PROMPT_UNSAFE_INPUT_INTERPOLATION'); return template.replaceAll('{{locale}}', locale ?? 'ar'); }
function stableStringify(value: unknown): string { if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'; if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`; const record = value as Record<string, unknown>; return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`; }
function deepEqual(a: unknown, b: unknown) { return stableStringify(a) === stableStringify(b); }
export const AI_ASYNC_LEASE_MS = ASYNC_LEASE_MS;
