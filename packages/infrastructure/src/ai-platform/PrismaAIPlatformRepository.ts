import { createHash, randomUUID } from 'node:crypto';
import {
  AIAsyncJobRecord,
  AIEvaluationRun,
  AIExecutionLogDto,
  AIExecutionRecord,
  AIExecutionSpan,
  AIIncident,
  AIIndexingRun,
  AIPlatformOverview,
  AIPromptDefinition,
  AIPromptVersion,
  AIRegistryResource,
  AIWorkflowRun,
  AIWorkflowStepRun,
  AIWorkflowVersion,
  IAIExecutionRepository,
  IAIPlatformRepository,
} from '@manaratak/domain';

const ASYNC_LEASE_MS = 120_000;

export class PrismaAIPlatformRepository implements IAIPlatformRepository, IAIExecutionRepository {
  constructor(private readonly prisma: any) {}

  async overview(): Promise<AIPlatformOverview> {
    const startToday = new Date(); startToday.setUTCHours(0, 0, 0, 0);
    const startMonth = new Date(Date.UTC(startToday.getUTCFullYear(), startToday.getUTCMonth(), 1));
    const [providers, activeModels, activePrompts, executionsToday, blockedToday, usageGroups, openIncidents] = await Promise.all([
      this.list<any>('providers'),
      this.prisma.aIRegistryRecord.count({ where: { resourceType: 'models', status: 'ACTIVE' } }),
      this.prisma.aIRegistryRecord.count({ where: { resourceType: 'prompts', status: 'ACTIVE' } }),
      this.prisma.aIExecutionRecord.count({ where: { createdAt: { gte: startToday } } }),
      this.prisma.aIExecutionRecord.count({ where: { createdAt: { gte: startToday }, safetyDecision: 'BLOCKED' } }),
      this.prisma.aIUsageRecord.groupBy({ by: ['currency'], where: { createdAt: { gte: startMonth } }, _sum: { cost: true } }),
      this.prisma.aIRegistryRecord.count({ where: { resourceType: 'incidents', status: { in: ['OPEN', 'INVESTIGATING'] } } }),
    ]);
    const counts: AIPlatformOverview['providers'] = { NOT_CONFIGURED: 0, RUNTIME_PENDING: 0, READY: 0, DEGRADED: 0, UNAVAILABLE: 0, DISABLED: 0 };
    providers.forEach((provider: any) => { const status = provider.operationalStatus ?? 'NOT_CONFIGURED'; if (status in counts) counts[status as keyof typeof counts] += 1; });
    const settings = await this.find<{ globalEnabled?: boolean }>('platformSettings', 'runtime');
    const overallStatus = settings?.globalEnabled === false
      ? 'DISABLED'
      : activeModels === 0 || activePrompts === 0 || (counts.READY === 0 && counts.RUNTIME_PENDING === 0)
        ? 'NOT_CONFIGURED'
        : counts.DEGRADED > 0 || counts.UNAVAILABLE > 0 || openIncidents > 0
          ? 'DEGRADED'
          : counts.READY > 0
            ? 'READY'
            : 'RUNTIME_PENDING';
    const costMonthToDateByCurrency = Object.fromEntries(usageGroups.map((row: any) => [row.currency, Number(row._sum.cost ?? 0)]));
    const currencies = Object.keys(costMonthToDateByCurrency);
    return {
      overallStatus,
      providers: counts,
      activeModels,
      activePrompts,
      executionsToday,
      blockedToday,
      costMonthToDate: currencies.length === 1 ? costMonthToDateByCurrency[currencies[0]] : 0,
      currency: currencies.length === 1 ? currencies[0] : currencies.length === 0 ? 'N/A' : 'MULTI',
      costMonthToDateByCurrency,
      openIncidents,
    };
  }

  async list<T>(resource: AIRegistryResource, filters: Record<string, unknown> = {}): Promise<T[]> {
    const records = await this.prisma.aIRegistryRecord.findMany({ where: { resourceType: resource, ...(filters.status ? { status: filters.status } : {}) }, orderBy: { updatedAt: 'desc' } });
    return records.map((record: any) => ({ ...record.configuration, id: record.id, key: record.key, status: record.status, secretReference: record.secretReference ?? record.configuration?.secretReference ?? null })) as T[];
  }

  async find<T>(resource: AIRegistryResource, key: string): Promise<T | null> {
    const record = await this.prisma.aIRegistryRecord.findUnique({ where: { resourceType_key: { resourceType: resource, key } } });
    return record ? ({ ...record.configuration, id: record.id, key: record.key, status: record.status, secretReference: record.secretReference ?? null } as T) : null;
  }

  async upsert<T>(resource: AIRegistryResource, value: T, actorReferenceId: string): Promise<T> {
    const candidate = value as any;
    if (!candidate.key) throw new Error('AI registry key is required.');
    assertNoPersistedSecret(candidate);
    const configuration = { ...candidate }; delete configuration.id; delete configuration.key; delete configuration.apiKey; delete configuration.secretValue;
    const record = await this.prisma.$transaction(async (tx: any) => {
      if (resource === 'workflows' && Number.isInteger(candidate.activeVersion) && candidate.activeVersion > 0) {
        const checksum = createHash('sha256').update(stableStringify(candidate.definition)).digest('hex');
        const existingVersion = await tx.aIWorkflowVersionRecord.findUnique({ where: { workflowKey_version: { workflowKey: candidate.key, version: candidate.activeVersion } } });
        if (existingVersion && existingVersion.checksum !== checksum) throw new Error('AI_WORKFLOW_VERSION_IMMUTABLE');
        if (!existingVersion) await tx.aIWorkflowVersionRecord.create({ data: { workflowKey: candidate.key, version: candidate.activeVersion, checksum, definition: candidate.definition, createdBy: actorReferenceId } });
      }
      const saved = await tx.aIRegistryRecord.upsert({
        where: { resourceType_key: { resourceType: resource, key: candidate.key } },
        create: { resourceType: resource, key: candidate.key, status: candidate.status ?? 'DRAFT', providerKey: candidate.providerKey, capabilityKey: candidate.capabilityKey, consumerKey: candidate.consumerKey, secretReference: candidate.secretReference, configuration, createdBy: actorReferenceId, updatedBy: actorReferenceId },
        update: { status: candidate.status ?? 'DRAFT', providerKey: candidate.providerKey, capabilityKey: candidate.capabilityKey, consumerKey: candidate.consumerKey, secretReference: candidate.secretReference, configuration, updatedBy: actorReferenceId },
      });
      await appendGovernanceEvidence(tx, { action: 'AI_REGISTRY_UPSERTED', actorReferenceId, targetId: saved.id, targetType: resource, aggregateId: candidate.key, payload: { resource, key: candidate.key, status: saved.status } });
      return saved;
    });
    return { ...record.configuration, id: record.id, key: record.key, status: record.status, secretReference: record.secretReference } as T;
  }

  async createPromptVersion(value: Omit<AIPromptVersion, 'id' | 'createdAt' | 'checksum'>): Promise<AIPromptVersion> {
    const checksum = createHash('sha256').update(`${value.promptKey}:${value.version}:${value.template}:${stableStringify(value.inputSchema)}:${stableStringify(value.outputSchema)}`).digest('hex');
    return this.prisma.$transaction(async (tx: any) => {
      const record = await tx.aIPromptVersionRecord.create({ data: { ...value, checksum } });
      await appendGovernanceEvidence(tx, { action: 'AI_PROMPT_VERSION_CREATED', actorReferenceId: value.createdBy, targetId: record.id, targetType: 'promptVersion', aggregateId: value.promptKey, payload: { promptKey: value.promptKey, version: value.version, status: value.status, checksum } });
      return record;
    });
  }

  async findPromptVersion(promptKey: string, version: number): Promise<AIPromptVersion | null> {
    return this.prisma.aIPromptVersionRecord.findUnique({ where: { promptKey_version: { promptKey, version } } });
  }

  async approvePromptVersion(promptKey: string, version: number, actorReferenceId: string): Promise<AIPromptVersion> {
    return this.prisma.$transaction(async (tx: any) => {
      const current = await tx.aIPromptVersionRecord.findUnique({ where: { promptKey_version: { promptKey, version } } });
      if (!current) throw new Error('AI_PROMPT_VERSION_NOT_FOUND');
      if (!['DRAFT', 'REVIEW'].includes(current.status)) throw new Error('AI_PROMPT_VERSION_NOT_APPROVABLE');
      const approved = await tx.aIPromptVersionRecord.update({ where: { id: current.id }, data: { status: 'APPROVED', approvedBy: actorReferenceId } });
      await appendGovernanceEvidence(tx, { action: 'AI_PROMPT_VERSION_APPROVED', actorReferenceId, targetId: approved.id, targetType: 'promptVersion', aggregateId: promptKey, payload: { promptKey, version, checksum: approved.checksum } });
      return approved;
    });
  }

  async deployPrompt(promptKey: string, version: number, actorReferenceId: string): Promise<AIPromptDefinition> {
    return this.prisma.$transaction(async (tx: any) => {
      const versionRecord = await tx.aIPromptVersionRecord.findUnique({ where: { promptKey_version: { promptKey, version } } });
      if (!versionRecord || versionRecord.status !== 'APPROVED') throw new Error('Only an approved immutable prompt version can be deployed.');
      const record = await tx.aIRegistryRecord.findUnique({ where: { resourceType_key: { resourceType: 'prompts', key: promptKey } } });
      if (!record || !record.capabilityKey) throw new Error('AI_PROMPT_CAPABILITY_BINDING_REQUIRED');
      const existingBinding = await tx.aICapabilityPromptBindingRecord.findUnique({ where: { capabilityKey: record.capabilityKey } });
      if (existingBinding && existingBinding.promptKey !== promptKey) throw new Error('AI_CAPABILITY_PROMPT_BINDING_CONFLICT');
      await tx.aIPromptDeploymentRecord.updateMany({ where: { promptKey, environment: 'PRODUCTION', status: 'ACTIVE' }, data: { status: 'RETIRED', retiredAt: new Date() } });
      await tx.aIPromptDeploymentRecord.create({ data: { promptKey, version, environment: 'PRODUCTION', status: 'ACTIVE', deployedBy: actorReferenceId } });
      await tx.aICapabilityPromptBindingRecord.upsert({ where: { capabilityKey: record.capabilityKey }, create: { capabilityKey: record.capabilityKey, promptKey, promptVersion: version, boundBy: actorReferenceId }, update: { promptKey, promptVersion: version, boundBy: actorReferenceId } });
      const configuration = { ...record.configuration, activeVersion: version };
      const updated = await tx.aIRegistryRecord.update({ where: { id: record.id }, data: { status: 'ACTIVE', configuration, updatedBy: actorReferenceId } });
      await appendGovernanceEvidence(tx, { action: 'AI_PROMPT_DEPLOYED', actorReferenceId, targetId: updated.id, targetType: 'prompts', aggregateId: promptKey, payload: { promptKey, version, capabilityKey: record.capabilityKey, environment: 'PRODUCTION' } });
      return { ...updated.configuration, id: updated.id, key: updated.key, status: updated.status };
    });
  }

  async resolvePromptForCapability(capabilityKey: string): Promise<AIPromptDefinition | null> {
    const binding = await this.prisma.aICapabilityPromptBindingRecord.findUnique({ where: { capabilityKey } });
    if (!binding) return null;
    const record = await this.prisma.aIRegistryRecord.findUnique({ where: { resourceType_key: { resourceType: 'prompts', key: binding.promptKey } } });
    if (!record || record.status !== 'ACTIVE' || record.configuration?.activeVersion !== binding.promptVersion) return null;
    return { ...record.configuration, id: record.id, key: record.key, status: record.status } as AIPromptDefinition;
  }

  async createExecution(value: Omit<AIExecutionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIExecutionRecord> {
    const record = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.aIExecutionRecord.create({ data: value });
      await appendExecutionReceived(tx, value);
      return created;
    });
    return normalizeExecution(record);
  }

  async createExecutionWithQuota(
    value: Omit<AIExecutionRecord, 'id' | 'createdAt' | 'updatedAt'>,
    reservation: { reservationKey: string; requestsPerMinute: number; dailyRequestLimit: number; monthlyTokenLimit: number; monthlyCostLimit?: number | null; currency?: string | null; reservedTokens: number; reservedCost: number },
  ): Promise<{ execution: AIExecutionRecord; replayed: boolean }> {
    if (value.idempotencyKeyHash) {
      const existing = await this.findExecutionByIdempotency(value.consumerKey, value.idempotencyKeyHash);
      if (existing) return { execution: existing, replayed: true };
    }
    try {
      const created = await serializableRetry(this.prisma, async (tx: any) => {
        if (value.idempotencyKeyHash) {
          const existing = await tx.aIExecutionRecord.findUnique({ where: { consumerKey_idempotencyKeyHash: { consumerKey: value.consumerKey, idempotencyKeyHash: value.idempotencyKeyHash } } });
          if (existing) return { execution: existing, replayed: true };
        }
        const now = new Date();
        const minute = periodStartAt('MINUTE', now);
        const day = periodStartAt('DAY', now);
        const month = periodStartAt('MONTH', now);
        const [minuteRequests, dayRequests, monthlyUsage, pendingReservations] = await Promise.all([
          tx.aIExecutionRecord.count({ where: { consumerKey: value.consumerKey, createdAt: { gte: minute } } }),
          tx.aIExecutionRecord.count({ where: { consumerKey: value.consumerKey, createdAt: { gte: day } } }),
          tx.aIUsageRecord.findMany({
            where: { consumerKey: value.consumerKey, createdAt: { gte: month } },
            select: { inputTokens: true, outputTokens: true, cost: true, currency: true },
          }),
          tx.aIQuotaReservationRecord.findMany({
            where: { consumerKey: value.consumerKey, createdAt: { gte: month }, status: 'RESERVED' },
            select: { reservedTokens: true, reservedCost: true, currency: true },
          }),
        ]);
        const tokens = monthlyUsage.reduce((sum: number, row: any) => sum + Number(row.inputTokens ?? 0) + Number(row.outputTokens ?? 0), 0)
          + pendingReservations.reduce((sum: number, row: any) => sum + Number(row.reservedTokens ?? 0), 0);
        const currencyRows = [
          ...monthlyUsage.map((row: any) => ({ currency: row.currency, cost: Number(row.cost ?? 0) })),
          ...pendingReservations.map((row: any) => ({ currency: row.currency, cost: Number(row.reservedCost ?? 0) })),
        ];
        const currencies = new Set(currencyRows.filter((row: any) => row.cost !== 0).map((row: any) => row.currency).filter(Boolean));
        if (reservation.monthlyCostLimit != null) {
          if (!reservation.currency) throw new Error('AI_CONSUMER_BUDGET_CURRENCY_REQUIRED');
          if ([...currencies].some((currency) => currency !== reservation.currency)) throw new Error('AI_COST_CURRENCY_MISMATCH');
        }
        const cost = currencyRows
          .filter((row: any) => !reservation.currency || row.currency === reservation.currency)
          .reduce((sum: number, row: any) => sum + row.cost, 0);
        if (minuteRequests + 1 > reservation.requestsPerMinute) throw new Error('AI_RATE_LIMIT_EXCEEDED');
        if (dayRequests + 1 > reservation.dailyRequestLimit) throw new Error('AI_DAILY_QUOTA_EXCEEDED');
        if (tokens + reservation.reservedTokens > reservation.monthlyTokenLimit) throw new Error('AI_MONTHLY_TOKEN_BUDGET_EXCEEDED');
        if (reservation.monthlyCostLimit != null && cost + reservation.reservedCost > reservation.monthlyCostLimit) throw new Error('AI_MONTHLY_COST_BUDGET_EXCEEDED');
        const execution = await tx.aIExecutionRecord.create({ data: value });
        await tx.aIQuotaReservationRecord.create({ data: { reservationKey: reservation.reservationKey, executionPublicId: value.publicId, consumerKey: value.consumerKey, status: 'RESERVED', reservedTokens: reservation.reservedTokens, reservedCost: reservation.reservedCost, currency: reservation.currency ?? null } });
        await appendExecutionReceived(tx, value);
        return { execution, replayed: false };
      });
      return { execution: normalizeExecution(created.execution), replayed: created.replayed };
    } catch (error) {
      if (isUniqueConflict(error) && value.idempotencyKeyHash) {
        const winner = await this.findExecutionByIdempotency(value.consumerKey, value.idempotencyKeyHash);
        if (winner) return { execution: winner, replayed: true };
      }
      throw error;
    }
  }

  async finalizeQuotaReservation(executionPublicId: string, usage: { tokens: number; cost: number; currency?: string | null; release?: boolean }): Promise<void> {
    const current = await this.prisma.aIQuotaReservationRecord.findUnique({ where: { executionPublicId } });
    if (!current) return;
    if (!usage.release && current.currency && usage.currency && current.currency !== usage.currency) throw new Error('AI_COST_CURRENCY_MISMATCH');
    await this.prisma.aIQuotaReservationRecord.update({ where: { executionPublicId }, data: { status: usage.release ? 'RELEASED' : 'COMMITTED', actualTokens: usage.release ? 0 : usage.tokens, actualCost: usage.release ? 0 : usage.cost, currency: usage.currency ?? current.currency } });
  }

  async updateExecution(publicId: string, patch: Partial<AIExecutionRecord>): Promise<AIExecutionRecord> {
    const data = { ...patch } as any; delete data.id; delete data.publicId; delete data.createdAt; delete data.updatedAt;
    return normalizeExecution(await this.prisma.aIExecutionRecord.update({ where: { publicId }, data }));
  }
  async findExecution(publicId: string): Promise<AIExecutionRecord | null> { const value = await this.prisma.aIExecutionRecord.findUnique({ where: { publicId } }); return value ? normalizeExecution(value) : null; }
  async findExecutionByIdempotency(consumerKey: string, idempotencyKeyHash: string): Promise<AIExecutionRecord | null> { const value = await this.prisma.aIExecutionRecord.findUnique({ where: { consumerKey_idempotencyKeyHash: { consumerKey, idempotencyKeyHash } } }); return value ? normalizeExecution(value) : null; }

  async listExecutions(filters: Record<string, any> = {}) {
    const page = Math.max(1, Number(filters.page ?? 1)); const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize ?? 20)));
    const where = { ...(filters.status ? { status: filters.status } : {}), ...(filters.consumerKey ? { consumerKey: filters.consumerKey } : {}), ...(filters.providerKey ? { providerKey: filters.providerKey } : {}), ...(filters.purpose ? { purpose: filters.purpose } : {}) };
    const [data, total] = await Promise.all([this.prisma.aIExecutionRecord.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), this.prisma.aIExecutionRecord.count({ where })]);
    return { data: data.map(normalizeExecution), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async appendSpan(span: Omit<AIExecutionSpan, 'id'>): Promise<AIExecutionSpan> { return this.prisma.aIExecutionSpanRecord.create({ data: span }); }
  async listExecutionSpans(executionPublicId: string): Promise<AIExecutionSpan[]> { return this.prisma.aIExecutionSpanRecord.findMany({ where: { executionPublicId }, orderBy: { startedAt: 'asc' } }); }

  async createAsyncJob(value: Omit<AIAsyncJobRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIAsyncJobRecord> {
    return this.prisma.$transaction(async (tx: any) => {
      const record = await tx.aIAsyncJobRecord.create({ data: value });
      await tx.transactionalOutboxRecord.create({ data: { id: randomUUID(), eventType: 'AI_ASYNC_JOB_QUEUED', domain: 'AI_PLATFORM', aggregateType: 'AIAsyncJob', aggregateId: record.publicId, payload: { publicId: record.publicId, consumerKey: record.consumerKey, capabilityKey: record.capabilityKey }, metadata: { requesterReferenceId: record.requesterReferenceId } } });
      return record;
    });
  }
  async findAsyncJob(publicId: string): Promise<AIAsyncJobRecord | null> { return this.prisma.aIAsyncJobRecord.findUnique({ where: { publicId } }); }
  async listAsyncJobs(filters: { status?: string; page?: number; pageSize?: number } = {}) { const page = Math.max(1, filters.page ?? 1); const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50)); const where = filters.status ? { status: filters.status } : {}; const [data, total] = await Promise.all([this.prisma.aIAsyncJobRecord.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), this.prisma.aIAsyncJobRecord.count({ where })]); return { data, total }; }

  async claimAsyncJob(publicId: string, workerId: string): Promise<AIAsyncJobRecord | null> {
    return serializableRetry(this.prisma, async (tx: any) => {
      const now = new Date();
      const current = await tx.aIAsyncJobRecord.findUnique({ where: { publicId } });
      if (!current) return null;
      const staleRunning = current.status === 'RUNNING' && current.leaseExpiresAt && new Date(current.leaseExpiresAt) <= now;
      const due = ['QUEUED', 'RETRYING'].includes(current.status) && (!current.nextAttemptAt || new Date(current.nextAttemptAt) <= now);
      if (!staleRunning && !due) return null;
      if (current.attempts >= current.maxAttempts) {
        await tx.aIAsyncJobRecord.update({ where: { publicId }, data: { status: 'DEAD_LETTER', lockedAt: null, lockedBy: null, leaseExpiresAt: null, completedAt: now, errorCode: 'AI_ASYNC_LEASE_ATTEMPTS_EXHAUSTED' } });
        return null;
      }
      const record = await tx.aIAsyncJobRecord.update({ where: { publicId }, data: { status: 'RUNNING', lockedAt: now, lockedBy: workerId, leaseExpiresAt: new Date(now.getTime() + ASYNC_LEASE_MS), attempts: { increment: 1 } } });
      if (staleRunning) await tx.transactionalOutboxRecord.create({ data: { id: randomUUID(), eventType: 'AI_ASYNC_JOB_STALE_LEASE_RECLAIMED', domain: 'AI_PLATFORM', aggregateType: 'AIAsyncJob', aggregateId: publicId, payload: { publicId, previousWorker: current.lockedBy, newWorker: workerId, attempts: record.attempts }, metadata: {}, correlationId: randomUUID() } });
      return record;
    });
  }

  async updateAsyncJob(publicId: string, patch: Partial<AIAsyncJobRecord>): Promise<AIAsyncJobRecord> { const data = { ...patch } as any; delete data.id; delete data.publicId; delete data.createdAt; delete data.updatedAt; return this.prisma.aIAsyncJobRecord.update({ where: { publicId }, data }); }
  async operateAsyncJob(publicId: string, action: 'RETRY' | 'CANCEL', actorReferenceId: string): Promise<AIAsyncJobRecord> { return this.prisma.$transaction(async (tx: any) => { const current = await tx.aIAsyncJobRecord.findUnique({ where: { publicId } }); if (!current) throw new Error('AI_ASYNC_JOB_NOT_FOUND'); if (action === 'RETRY' && !['FAILED', 'DEAD_LETTER'].includes(current.status)) throw new Error('AI_ASYNC_JOB_NOT_RETRYABLE'); if (action === 'CANCEL' && !['QUEUED', 'RETRYING'].includes(current.status)) throw new Error('AI_ASYNC_JOB_NOT_CANCELLABLE'); const record = await tx.aIAsyncJobRecord.update({ where: { publicId }, data: action === 'RETRY' ? { status: 'RETRYING', attempts: 0, nextAttemptAt: new Date(), completedAt: null, errorCode: null, lockedAt: null, lockedBy: null, leaseExpiresAt: null } : { status: 'CANCELLED', completedAt: new Date(), lockedAt: null, lockedBy: null, leaseExpiresAt: null } }); await appendGovernanceEvidence(tx, { action: `AI_ASYNC_JOB_${action}`, actorReferenceId, targetId: record.id, targetType: 'asyncJob', aggregateId: publicId, payload: { publicId, previousStatus: current.status, status: record.status } }); return record; }); }
  async asyncQueueStatus() { const [groups, oldest] = await Promise.all([this.prisma.aIAsyncJobRecord.groupBy({ by: ['status'], _count: { _all: true } }), this.prisma.aIAsyncJobRecord.findFirst({ where: { status: { in: ['QUEUED', 'RETRYING'] } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } })]); const count = (status: string) => groups.find((item: any) => item.status === status)?._count._all ?? 0; return { queued: count('QUEUED'), running: count('RUNNING'), retrying: count('RETRYING'), failed: count('FAILED'), deadLetter: count('DEAD_LETTER'), oldestQueuedAt: oldest?.createdAt ?? null }; }

  async recordUsage(value: { executionPublicId: string; providerKey: string; modelKey: string; inputTokens: number; outputTokens: number; cost: number; currency: string; priceSnapshotKey?: string | null; pricingEffectiveFrom?: Date | string | null; costKind: 'ACTUAL' | 'ESTIMATED' | 'UNKNOWN'; metadata?: Record<string, unknown> }) {
    const execution = await this.prisma.aIExecutionRecord.findUnique({ where: { publicId: value.executionPublicId }, select: { consumerKey: true } });
    if (!execution) throw new Error('AI execution not found for usage record.');
    await this.prisma.aIUsageRecord.upsert({ where: { executionPublicId_providerKey_modelKey: { executionPublicId: value.executionPublicId, providerKey: value.providerKey, modelKey: value.modelKey } }, create: { ...value, pricingEffectiveFrom: value.pricingEffectiveFrom ? new Date(value.pricingEffectiveFrom) : null, consumerKey: execution.consumerKey }, update: { inputTokens: value.inputTokens, outputTokens: value.outputTokens, cost: value.cost, currency: value.currency, priceSnapshotKey: value.priceSnapshotKey, pricingEffectiveFrom: value.pricingEffectiveFrom ? new Date(value.pricingEffectiveFrom) : null, costKind: value.costKind, metadata: value.metadata } });
  }

  async quotaUsage(consumerKey: string, period: 'MINUTE' | 'DAY' | 'MONTH') {
    const since = periodStart(period);
    const [requests, usage] = await Promise.all([
      this.prisma.aIExecutionRecord.count({ where: { consumerKey, createdAt: { gte: since } } }),
      this.prisma.aIUsageRecord.findMany({ where: { consumerKey, createdAt: { gte: since } }, select: { inputTokens: true, outputTokens: true, cost: true, currency: true } }),
    ]);
    const costs: Record<string, number> = {};
    let tokens = 0;
    for (const row of usage) { tokens += Number(row.inputTokens ?? 0) + Number(row.outputTokens ?? 0); costs[row.currency] = (costs[row.currency] ?? 0) + Number(row.cost ?? 0); }
    return { requests, tokens, costs };
  }

  async createWorkflowRun(value: Omit<AIWorkflowRun, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIWorkflowRun> { return this.prisma.aIWorkflowRunRecord.create({ data: value }); }
  async findWorkflowVersion(workflowKey: string, version: number): Promise<AIWorkflowVersion | null> { return this.prisma.aIWorkflowVersionRecord.findUnique({ where: { workflowKey_version: { workflowKey, version } } }); }
  async createWorkflowStepRun(value: Omit<AIWorkflowStepRun, 'id'>): Promise<AIWorkflowStepRun> { return this.prisma.aIWorkflowStepRunRecord.create({ data: value }); }
  async updateWorkflowStepRun(runPublicId: string, stepKey: string, attempt: number, patch: Partial<AIWorkflowStepRun>): Promise<AIWorkflowStepRun> { const data = { ...patch } as any; delete data.id; delete data.runPublicId; delete data.stepKey; delete data.attempt; delete data.startedAt; return this.prisma.aIWorkflowStepRunRecord.update({ where: { runPublicId_stepKey_attempt: { runPublicId, stepKey, attempt } }, data }); }
  async listWorkflowStepRuns(runPublicId: string): Promise<AIWorkflowStepRun[]> { return this.prisma.aIWorkflowStepRunRecord.findMany({ where: { runPublicId }, orderBy: [{ stepKey: 'asc' }, { attempt: 'asc' }] }); }
  async findWorkflowRun(publicId: string): Promise<AIWorkflowRun | null> { return this.prisma.aIWorkflowRunRecord.findUnique({ where: { publicId } }); }
  async updateWorkflowRun(publicId: string, patch: Partial<AIWorkflowRun>): Promise<AIWorkflowRun> { const data = { ...patch } as any; delete data.id; delete data.publicId; delete data.createdAt; delete data.updatedAt; return this.prisma.aIWorkflowRunRecord.update({ where: { publicId }, data }); }

  async createEvaluationRun(value: Omit<AIEvaluationRun, 'id' | 'createdAt'>): Promise<AIEvaluationRun> { return this.prisma.aIEvaluationRunRecord.create({ data: value }); }
  async findEvaluationRun(publicId: string): Promise<AIEvaluationRun | null> { return this.prisma.aIEvaluationRunRecord.findUnique({ where: { publicId } }); }
  async findLatestEvaluationRun(evaluationKey: string, target?: { type: AIEvaluationRun['targetType']; key: string; version?: number | null; checksum?: string | null }): Promise<AIEvaluationRun | null> {
    return this.prisma.aIEvaluationRunRecord.findFirst({ where: { evaluationKey, status: 'COMPLETED', ...(target ? { targetType: target.type, targetKey: target.key, ...(target.version == null ? {} : { targetVersion: target.version }), ...(target.checksum == null ? {} : { targetChecksum: target.checksum }) } : {}) }, orderBy: { completedAt: 'desc' } });
  }
  async updateEvaluationRun(publicId: string, patch: Partial<AIEvaluationRun>): Promise<AIEvaluationRun> { const data = { ...patch } as any; delete data.id; delete data.publicId; delete data.createdAt; return this.prisma.aIEvaluationRunRecord.update({ where: { publicId }, data }); }
  async approveEvaluationRun(publicId: string, actorReferenceId: string): Promise<AIEvaluationRun> { return this.prisma.$transaction(async (tx: any) => { const current = await tx.aIEvaluationRunRecord.findUnique({ where: { publicId } }); if (!current || current.status !== 'COMPLETED') throw new Error('AI_EVALUATION_RUN_NOT_APPROVABLE'); const approved = await tx.aIEvaluationRunRecord.update({ where: { publicId }, data: { approvedBy: actorReferenceId, approvedAt: new Date() } }); await appendGovernanceEvidence(tx, { action: 'AI_EVALUATION_RUN_APPROVED', actorReferenceId, targetId: approved.id, targetType: 'evaluationRun', aggregateId: publicId, payload: { publicId, evaluationKey: approved.evaluationKey, targetType: approved.targetType, targetKey: approved.targetKey, targetVersion: approved.targetVersion, targetChecksum: approved.targetChecksum, score: approved.score, safetyFailures: approved.safetyFailures } }); return approved; }); }

  async appendIncidentEvent(publicId: string, event: AIIncident['timeline'][number]): Promise<AIIncident> { await this.prisma.aIIncidentEventRecord.create({ data: { incidentPublicId: publicId, action: event.action, actorReferenceId: event.actorReferenceId, note: event.note, createdAt: event.at } }); const incident = await this.find<AIIncident>('incidents', publicId); if (!incident) throw new Error('AI incident not found.'); const events = await this.prisma.aIIncidentEventRecord.findMany({ where: { incidentPublicId: publicId }, orderBy: { createdAt: 'asc' } }); return { ...incident, timeline: events.map((item: any) => ({ at: item.createdAt, action: item.action, actorReferenceId: item.actorReferenceId, note: item.note })) }; }
  async createIndexingRun(value: Omit<AIIndexingRun, 'id' | 'createdAt'>): Promise<AIIndexingRun> { return this.prisma.aIIndexingRunRecord.create({ data: value }); }
  async updateIndexingRun(publicId: string, patch: Partial<AIIndexingRun>): Promise<AIIndexingRun> { const data = { ...patch } as any; delete data.id; delete data.publicId; delete data.createdAt; return this.prisma.aIIndexingRunRecord.update({ where: { publicId }, data }); }
  async replaceEmbeddings(input: { indexKey: string; sourceReferenceId: string; modelKey: string; dimensions: number; chunks: Array<{ chunkKey: string; chunkText: string; embeddingRef: string; checksum: string; metadata?: Record<string, unknown> }> }) { await this.prisma.$transaction(async (tx: any) => { await tx.aIEmbeddingRecord.deleteMany({ where: { indexKey: input.indexKey, sourceReferenceId: input.sourceReferenceId } }); if (input.chunks.length) await tx.aIEmbeddingRecord.createMany({ data: input.chunks.map((chunk) => ({ ...chunk, indexKey: input.indexKey, sourceReferenceId: input.sourceReferenceId, modelKey: input.modelKey, dimensions: input.dimensions })) }); }); }

  async providerCircuitCanAttempt(key: string, _threshold = 3, resetAfterMs = 30_000): Promise<boolean> {
    return serializableRetry(this.prisma, async (tx: any) => {
      const current = await tx.aIProviderCircuitRecord.findUnique({ where: { key } });
      if (!current || current.state === 'CLOSED') return true;
      const now = new Date();
      if (current.state === 'OPEN') {
        if (!current.openedAt || now.getTime() - new Date(current.openedAt).getTime() < resetAfterMs) return false;
        await tx.aIProviderCircuitRecord.update({ where: { key }, data: { state: 'HALF_OPEN', probeLeaseAt: now } });
        return true;
      }
      if (current.state === 'HALF_OPEN') {
        if (!current.probeLeaseAt || now.getTime() - new Date(current.probeLeaseAt).getTime() >= resetAfterMs) {
          await tx.aIProviderCircuitRecord.update({ where: { key }, data: { probeLeaseAt: now } });
          return true;
        }
        return false;
      }
      return false;
    });
  }

  async providerCircuitSuccess(key: string): Promise<void> {
    await this.prisma.aIProviderCircuitRecord.upsert({ where: { key }, create: { key, failures: 0, state: 'CLOSED' }, update: { failures: 0, state: 'CLOSED', openedAt: null, probeLeaseAt: null } });
  }

  async providerCircuitFailure(key: string, threshold = 3): Promise<void> {
    await serializableRetry(this.prisma, async (tx: any) => {
      const current = await tx.aIProviderCircuitRecord.findUnique({ where: { key } });
      const failures = Number(current?.failures ?? 0) + 1;
      const open = current?.state === 'HALF_OPEN' || failures >= threshold;
      await tx.aIProviderCircuitRecord.upsert({ where: { key }, create: { key, failures, state: open ? 'OPEN' : 'CLOSED', openedAt: open ? new Date() : null }, update: { failures, state: open ? 'OPEN' : current?.state ?? 'CLOSED', openedAt: open ? new Date() : current?.openedAt ?? null, probeLeaseAt: null } });
    });
  }

  async createLog(data: any): Promise<AIExecutionLogDto> {
    const record = await this.createExecution({ publicId: data.publicId, traceId: data.metadata?.traceId ?? randomUUID(), consumerKey: data.metadata?.consumerKey ?? data.sourceDomain ?? 'legacy', capabilityKey: data.metadata?.capabilityKey ?? data.purpose, purpose: data.purpose, promptKey: data.promptKey, providerKey: String(data.providerType), modelKey: data.modelReference, status: data.status, safetyDecision: data.safetyDecision, dataClassification: 'INTERNAL', inputPreview: data.inputPreview, outputPreview: data.outputPreview, inputTokens: data.estimatedInputTokens, outputTokens: data.estimatedOutputTokens, errorMessage: data.errorMessage, requesterReferenceId: data.requesterReferenceId, sourceDomain: data.sourceDomain, metadata: data.metadata });
    return legacyLog(record);
  }
  async findLogByPublicId(publicId: string) { const value = await this.findExecution(publicId); return value ? legacyLog(value) : null; }
  async listLogs(filters: any) { const page = await this.listExecutions(filters); return { ...page, data: page.data.map(legacyLog) }; }
}

function normalizeExecution(value: any): AIExecutionRecord { return { ...value, estimatedCost: value.estimatedCost == null ? null : Number(value.estimatedCost), actualCost: value.actualCost == null ? null : Number(value.actualCost) }; }
function legacyLog(value: AIExecutionRecord): AIExecutionLogDto { return { id: value.id, publicId: value.publicId, purpose: value.purpose, promptKey: value.promptKey, providerType: (value.providerKey ?? 'EXTERNAL_LLM') as any, modelReference: value.modelKey ?? 'unassigned', status: value.status, safetyDecision: value.safetyDecision, requesterReferenceId: value.requesterReferenceId, sourceDomain: value.sourceDomain, inputPreview: value.inputPreview, outputPreview: value.outputPreview, estimatedInputTokens: value.inputTokens, estimatedOutputTokens: value.outputTokens, errorMessage: value.errorMessage, metadata: value.metadata, createdAt: value.createdAt, updatedAt: value.updatedAt }; }
function periodStart(period: 'MINUTE' | 'DAY' | 'MONTH') { return periodStartAt(period, new Date()); }
function periodStartAt(period: 'MINUTE' | 'DAY' | 'MONTH', at: Date) { const value = new Date(at); if (period === 'MINUTE') value.setUTCSeconds(0, 0); else if (period === 'DAY') value.setUTCHours(0, 0, 0, 0); else value.setUTCDate(1), value.setUTCHours(0, 0, 0, 0); return value; }
async function appendExecutionReceived(tx: any, value: Omit<AIExecutionRecord, 'id' | 'createdAt' | 'updatedAt'>) { await tx.transactionalOutboxRecord.create({ data: { id: randomUUID(), eventType: 'AI_EXECUTION_RECEIVED', domain: 'AI_PLATFORM', aggregateType: 'AIExecution', aggregateId: value.publicId, payload: { publicId: value.publicId, consumerKey: value.consumerKey, capabilityKey: value.capabilityKey, status: value.status }, metadata: { traceId: value.traceId }, correlationId: value.traceId } }); }
async function appendGovernanceEvidence(tx: any, input: { action: string; actorReferenceId: string; targetId: string; targetType: string; aggregateId: string; payload: Record<string, unknown> }) { const now = new Date(); const correlationId = randomUUID(); await tx.auditRecord.create({ data: { id: randomUUID(), reference: `audit_ai_${randomUUID()}`, action: input.action, category: 'AI_GOVERNANCE', severity: 'INFO', actorId: input.actorReferenceId, actorType: 'IDENTITY', targetId: input.targetId, targetType: input.targetType, source: 'AI_ADMIN_API', timestamp: now, contextMetadata: input.payload, correlationReference: correlationId } }); await tx.transactionalOutboxRecord.create({ data: { id: randomUUID(), eventType: input.action, domain: 'AI_PLATFORM', aggregateType: input.targetType, aggregateId: input.aggregateId, payload: input.payload, metadata: { actorReferenceId: input.actorReferenceId }, correlationId } }); }
function assertNoPersistedSecret(value: unknown, path = 'root'): void { if (!value || typeof value !== 'object') return; for (const [key, nested] of Object.entries(value)) { if (/api.?key|secretValue|accessToken|authorization|password|credential/i.test(key)) throw new Error(`AI_SECRET_MATERIAL_FORBIDDEN:${path}.${key}`); if (nested && typeof nested === 'object') assertNoPersistedSecret(nested, `${path}.${key}`); } }
function isUniqueConflict(error: unknown) { return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002'); }
function isSerializationConflict(error: unknown) { return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2034'); }
async function serializableRetry<T>(prisma: any, work: (tx: any) => Promise<T>): Promise<T> { let last: unknown; for (let attempt = 0; attempt < 3; attempt += 1) { try { return await prisma.$transaction(work, { isolationLevel: 'Serializable' }); } catch (error) { last = error; if (!isSerializationConflict(error)) throw error; } } throw last; }
function stableStringify(value: unknown): string { if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'; if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`; const record = value as Record<string, unknown>; return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`; }
