import { AIProviderType, AIRequestPurpose, type AIRegistryResource } from '@manaratak/domain';

/** Validate governance inputs before they can become executable configuration. */
export function validateAIRegistry(resource: AIRegistryResource, value: Record<string, unknown>) {
  const fail = (field: string): never => {
    throw new Error(`AI_REGISTRY_INVALID:${resource}.${field}`);
  };
  const text = (field: string, required = true) => {
    const candidate = value[field];
    if (candidate == null && !required) return;
    if (typeof candidate !== 'string' || !candidate.trim() || candidate.length > 4000) fail(field);
  };
  const number = (
    field: string,
    minimum: number,
    maximum: number,
    integer = false,
    optional = false,
  ) => {
    const candidate = value[field];
    if (candidate == null && optional) return;
    if (
      typeof candidate !== 'number' ||
      !Number.isFinite(candidate) ||
      candidate < minimum ||
      candidate > maximum ||
      (integer && !Number.isInteger(candidate))
    )
      fail(field);
  };
  const boolean = (field: string, optional = false) => {
    if (!(optional && value[field] == null) && typeof value[field] !== 'boolean') fail(field);
  };
  const choice = (field: string, allowed: string[]) => {
    if (typeof value[field] !== 'string' || !allowed.includes(value[field] as string)) fail(field);
  };
  const strings = (field: string, allowed?: string[], optional = false) => {
    if (value[field] == null && optional) return;
    const candidate = value[field];
    if (
      !Array.isArray(candidate) ||
      candidate.length > 1000 ||
      !candidate.every(
        (item) => typeof item === 'string' && item.trim() && (!allowed || allowed.includes(item)),
      ) ||
      new Set(candidate).size !== candidate.length
    )
      fail(field);
  };
  const object = (field: string) => {
    if (!value[field] || typeof value[field] !== 'object' || Array.isArray(value[field]))
      fail(field);
  };
  const date = (field: string, optional = false) => {
    if (value[field] == null && optional) return;
    if (
      (typeof value[field] !== 'string' && !(value[field] instanceof Date)) ||
      !Number.isFinite(new Date(value[field] as string).getTime())
    )
      fail(field);
  };
  const classifications = [
    'PUBLIC',
    'INTERNAL',
    'CONFIDENTIAL',
    'STUDENT_PRIVATE',
    'HIGHLY_SENSITIVE',
  ];
  const kinds = [
    'TEXT_GENERATION',
    'CHAT',
    'STRUCTURED_OUTPUT',
    'EMBEDDINGS',
    'RERANKING',
    'MODERATION',
  ];
  text('key');
  if (!/^[a-zA-Z0-9_.:-]{1,160}$/.test(String(value.key))) fail('key');
  choice(
    'status',
    resource === 'incidents'
      ? ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED']
      : ['DRAFT', 'REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED'],
  );
  if (resource === 'providers') {
    text('displayName');
    choice('type', Object.values(AIProviderType));
    number('timeoutMs', 100, 60000, true);
    number('maxRetries', 0, 7, true);
    boolean('productionApproved', true);
    if (value.maxDataClassification != null) choice('maxDataClassification', classifications);
    if (value.baseUrl != null) {
      const url = new URL(String(value.baseUrl));
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
        fail('baseUrl');
    }
  } else if (resource === 'models') {
    text('displayName');
    text('providerKey');
    text('providerModelId');
    strings('capabilities', kinds);
    boolean('supportsStreaming');
    boolean('supportsTools');
    boolean('supportsStructuredOutput');
    boolean('productionApproved', true);
    number('contextWindow', 1, 100000000, true, true);
    number('maxOutputTokens', 1, 1000000, true, true);
    number('inputPricePerMillion', 0, 1000000, false, true);
    number('outputPricePerMillion', 0, 1000000, false, true);
    if (value.maxDataClassification != null) choice('maxDataClassification', classifications);
  } else if (resource === 'modelPrices') {
    text('modelKey');
    text('currency');
    number('inputPricePerMillion', 0, 1000000);
    number('outputPricePerMillion', 0, 1000000);
    date('effectiveFrom');
    date('effectiveTo', true);
    if (
      value.effectiveTo &&
      new Date(value.effectiveTo as string) <= new Date(value.effectiveFrom as string)
    )
      fail('effectiveTo');
  } else if (resource === 'consumers') {
    text('displayName');
    text('consumerKey');
    if (value.consumerKey !== value.key) fail('consumerKey');
    strings('allowedCapabilities');
    strings('allowedModels', undefined, true);
    number('requestsPerMinute', 0, 1000000, true);
    number('dailyRequestLimit', 0, 100000000, true);
    number('monthlyTokenLimit', 0, Number.MAX_SAFE_INTEGER, true);
    number('monthlyCostLimit', 0, 1000000000, false, true);
    if (value.monthlyCostLimit != null) text('currency');
    boolean('requireHumanReview');
    boolean('allowAsyncJobs', true);
    strings('allowedDataClassifications', classifications, true);
  } else if (resource === 'capabilities') {
    text('displayNameAr');
    text('displayNameEn');
    choice('kind', kinds);
    choice('riskLevel', ['LOW', 'MEDIUM', 'HIGH', 'PROHIBITED']);
    boolean('requiresHumanReview');
    strings('allowedPurposes', Object.values(AIRequestPurpose));
    strings('allowedDataClassifications', classifications, true);
    if (
      value.status === 'ACTIVE' &&
      (!Array.isArray(value.allowedPurposes) ||
        !value.allowedPurposes.length ||
        value.riskLevel === 'PROHIBITED')
    )
      fail('allowedPurposes');
  } else if (resource === 'routingPolicies') {
    text('capabilityKey');
    boolean('fallbackEnabled');
    number('maxAttempts', 1, 8, true);
    if (!Array.isArray(value.targets) || value.targets.length > 100) fail('targets');
    const keys = new Set<string>();
    for (const raw of value.targets as unknown[]) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('targets');
      const target = raw as Record<string, unknown>;
      if (
        typeof target.modelKey !== 'string' ||
        !target.modelKey.trim() ||
        keys.has(target.modelKey)
      )
        fail('targets.modelKey');
      keys.add(target.modelKey as string);
      for (const field of ['priority', 'weight'])
        if (
          typeof target[field] !== 'number' ||
          !Number.isFinite(target[field]) ||
          Number(target[field]) < 0
        )
          fail(`targets.${field}`);
      if (typeof target.enabled !== 'boolean') fail('targets.enabled');
      if (target.shadow != null && typeof target.shadow !== 'boolean') fail('targets.shadow');
      if (
        target.canaryPercentage != null &&
        (typeof target.canaryPercentage !== 'number' ||
          !Number.isFinite(target.canaryPercentage) ||
          target.canaryPercentage < 0 ||
          target.canaryPercentage > 100)
      )
        fail('targets.canaryPercentage');
      if (
        target.maxLatencyMs != null &&
        (typeof target.maxLatencyMs !== 'number' ||
          !Number.isInteger(target.maxLatencyMs) ||
          target.maxLatencyMs < 100 ||
          target.maxLatencyMs > 60000)
      )
        fail('targets.maxLatencyMs');
    }
  } else if (resource === 'prompts') {
    text('capabilityKey');
    choice('purpose', Object.values(AIRequestPurpose));
    number('activeVersion', 1, Number.MAX_SAFE_INTEGER, true, true);
  } else if (resource === 'guardrails') {
    choice('stage', ['INPUT', 'OUTPUT', 'BOTH']);
    choice('action', ['ALLOW', 'REDACT', 'BLOCK', 'REQUIRE_REVIEW']);
    number('version', 1, Number.MAX_SAFE_INTEGER, true);
    object('rules');
    const patterns = (value.rules as Record<string, unknown>).patterns;
    if (
      patterns != null &&
      (!Array.isArray(patterns) || !patterns.every((item) => typeof item === 'string'))
    )
      fail('rules.patterns');
    if (value.status === 'ACTIVE' && value.action === 'REQUIRE_REVIEW') fail('action');
  } else if (resource === 'workflows') {
    text('displayNameAr');
    text('displayNameEn');
    object('definition');
    const steps = (value.definition as Record<string, unknown>).steps;
    if (
      !Array.isArray(steps) ||
      steps.length > 100 ||
      (value.status === 'ACTIVE' && steps.length === 0)
    )
      fail('definition.steps');
    for (const raw of steps as unknown[]) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('definition.steps');
      const step = raw as Record<string, unknown>;
      if (
        !['key', 'capabilityKey', 'promptKey'].every(
          (field) =>
            typeof step[field] === 'string' &&
            /^[a-zA-Z0-9_.:-]{1,160}$/.test(step[field] as string),
        )
      )
        fail('definition.steps.key');
      if (
        step.retryLimit != null &&
        (!Number.isSafeInteger(step.retryLimit) ||
          Number(step.retryLimit) < 0 ||
          Number(step.retryLimit) > 7)
      )
        fail('definition.steps.retryLimit');
      if (
        step.dependsOn != null &&
        (!Array.isArray(step.dependsOn) ||
          !step.dependsOn.every((item) => typeof item === 'string'))
      )
        fail('definition.steps.dependsOn');
    }
  } else if (resource === 'evaluations') {
    text('displayName');
    text('capabilityKey');
    object('target');
    const target = value.target as Record<string, unknown>;
    if (
      !['PROMPT', 'MODEL', 'ROUTING', 'WORKFLOW'].includes(String(target.type)) ||
      typeof target.key !== 'string' ||
      !target.key.trim()
    )
      fail('target');
    if (
      !Array.isArray(value.dataset) ||
      value.dataset.length > 1000 ||
      !Array.isArray(value.evaluators) ||
      value.evaluators.length > 100
    )
      fail('dataset');
    const datasetKeys = new Set<string>();
    for (const raw of value.dataset as unknown[]) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('dataset');
      const item = raw as Record<string, unknown>;
      if (
        typeof item.key !== 'string' ||
        !item.key.trim() ||
        datasetKeys.has(item.key) ||
        typeof item.input !== 'string' ||
        !item.input.trim() ||
        item.input.length > 20000
      )
        fail('dataset.item');
      datasetKeys.add(item.key as string);
    }
    const evaluatorKeys = new Set<string>();
    for (const raw of value.evaluators as unknown[]) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('evaluators');
      const evaluator = raw as Record<string, unknown>;
      if (
        typeof evaluator.key !== 'string' ||
        !evaluator.key.trim() ||
        evaluatorKeys.has(evaluator.key) ||
        !['EXACT_MATCH', 'JSON_SCHEMA', 'REGEX', 'LATENCY', 'COST', 'HUMAN'].includes(
          String(evaluator.type),
        )
      )
        fail('evaluators.item');
      evaluatorKeys.add(evaluator.key as string);
      if (
        evaluator.threshold != null &&
        (typeof evaluator.threshold !== 'number' ||
          !Number.isFinite(evaluator.threshold) ||
          evaluator.threshold < 0)
      )
        fail('evaluators.threshold');
    }
    if (value.deploymentGate != null) {
      object('deploymentGate');
      const gate = value.deploymentGate as Record<string, unknown>;
      if (
        typeof gate.minimumScore !== 'number' ||
        !Number.isFinite(gate.minimumScore) ||
        gate.minimumScore < 0 ||
        gate.minimumScore > 1 ||
        typeof gate.maximumSafetyFailures !== 'number' ||
        !Number.isSafeInteger(gate.maximumSafetyFailures) ||
        gate.maximumSafetyFailures < 0 ||
        typeof gate.requiresHumanApproval !== 'boolean'
      )
        fail('deploymentGate');
    }
  } else if (resource === 'knowledgeIndexes') {
    text('displayName');
    text('embeddingModelKey');
    number('dimensions', 1, 65536, true);
    strings('sourceDomains');
    object('chunkingStrategy');
    const strategy = value.chunkingStrategy as Record<string, unknown>;
    if (
      strategy.maxCharacters != null &&
      (typeof strategy.maxCharacters !== 'number' ||
        !Number.isInteger(strategy.maxCharacters) ||
        strategy.maxCharacters < 200 ||
        strategy.maxCharacters > 8000)
    )
      fail('chunkingStrategy.maxCharacters');
    if (
      strategy.overlapCharacters != null &&
      (typeof strategy.overlapCharacters !== 'number' ||
        !Number.isInteger(strategy.overlapCharacters) ||
        strategy.overlapCharacters < 0 ||
        strategy.overlapCharacters >= Number(strategy.maxCharacters ?? 1600))
    )
      fail('chunkingStrategy.overlapCharacters');
  } else if (resource === 'platformSettings') {
    if (value.key !== 'runtime') fail('key');
    boolean('globalEnabled');
  } else if (resource === 'incidents') {
    text('publicId');
    if (value.publicId !== value.key) fail('publicId');
    text('title');
    choice('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  } else if (resource === 'knowledgeSources') {
    throw new Error('AI_KNOWLEDGE_SOURCE_REQUIRES_INDEXING_ENDPOINT');
  }
  if (
    value.currency != null &&
    (typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency))
  )
    fail('currency');
}
