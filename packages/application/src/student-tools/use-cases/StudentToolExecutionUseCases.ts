import { createHash, randomUUID } from 'node:crypto';
import {
  ExecuteStudentToolRequest,
  IStudentToolDependencyHealthGateway,
  IStudentToolRegistryRepository,
  IStudentToolRateLimitGateway,
  IStudentToolResultProtector,
  IStudentToolSaveGateway,
  StudentToolExecutionContext,
  StudentToolExecutionRecord,
  StudentToolExecutionStatus,
  StudentToolHandlerRegistryLike,
  StudentToolImplementationStatus,
  StudentToolExecutionRequester,
  StudentToolPublicAccessPolicy,
  assertBoundedStudentToolInput,
  StudentToolExecutionType,
  StudentToolAIExecutionError,
} from '@absheer/domain';

const TRANSIENT_RESULT_TTL_MS = 15 * 60_000;
const hash = (value?: string) =>
  value ? createHash('sha256').update(`phase18:${value}`).digest('hex') : null;
const resultDigest = (value: unknown) =>
  createHash('sha256').update(stableStringify(value)).digest('hex');

export class StudentToolExecutionUseCases {
  constructor(
    private readonly repository: IStudentToolRegistryRepository,
    private readonly handlers: StudentToolHandlerRegistryLike,
    private readonly rateLimit: IStudentToolRateLimitGateway,
    private readonly dependencyHealth: IStudentToolDependencyHealthGateway,
    private readonly resultProtector: IStudentToolResultProtector,
    private readonly saveGateway?: IStudentToolSaveGateway,
  ) {}

  async execute(toolKey: string, request: ExecuteStudentToolRequest) {
    if (request.consumerType === 'AUTHENTICATED_STUDENT' && !request.authenticatedStudentReference)
      throw new Error('TOOL_AUTH_REQUIRED');
    const abuseIdentity =
      request.authenticatedStudentReference ??
      request.trustedNetworkReference ??
      request.anonymousSessionReference ??
      'unverified';
    const abuse = await this.rateLimit.consume(`input-abuse:${hash(abuseIdentity)}`, 120, 60000);
    if (!abuse.allowed) throw new Error('TOOL_RATE_LIMITED');
    assertBoundedStudentToolInput(request.input);
    const handler = this.handlers.get(toolKey);
    if (!handler) throw new Error('TOOL_NOT_IMPLEMENTED');
    await this.repository.pruneExpiredTransientResults(new Date());
    const tool = await this.repository.findByKey(toolKey);
    if (!tool) throw new Error('TOOL_NOT_FOUND');
    if (request.consumerType === 'ADMIN_TEST') {
      if (tool.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED)
        throw new Error('TOOL_NOT_IMPLEMENTED');
    } else {
      StudentToolPublicAccessPolicy.assertDiscoverable(tool);
    }
    if (!this.handlers.has(toolKey)) throw new Error('TOOL_NOT_IMPLEMENTED');
    if (
      !handler.contract ||
      resultDigest(handler.contract.inputSchema) !== resultDigest(tool.inputSchema) ||
      resultDigest(handler.contract.outputSchema) !== resultDigest(tool.outputSchema)
    )
      throw new Error('TOOL_HANDLER_SCHEMA_MISMATCH');
    const handlerContractVersion = `${handler.contract.inputSchema.version}:${handler.contract.outputSchema.version}`;
    if (tool.availability.allowedRegions.length) throw new Error('TOOL_REGION_POLICY_UNAVAILABLE');
    const locale = request.locale ?? 'ar';
    if (
      !tool.supportedLocales.includes(locale) ||
      (tool.availability.allowedLocales.length > 0 &&
        !tool.availability.allowedLocales.includes(locale))
    )
      throw new Error('TOOL_LOCALE_NOT_ALLOWED');
    if (
      request.consumerType === 'ANONYMOUS' &&
      (!tool.availability.anonymousEnabled || !tool.featureFlags.anonymousEnabled)
    )
      throw new Error('TOOL_AUTH_REQUIRED');
    if (
      request.consumerType === 'AUTHENTICATED_STUDENT' &&
      (!tool.availability.authenticatedEnabled || !tool.featureFlags.authenticatedEnabled)
    )
      throw new Error('TOOL_ACCESS_DENIED');
    if (request.consumerType !== 'ADMIN_TEST' && StudentToolPublicAccessPolicy.consumerBlockers(tool, request.consumerType, locale).length) throw new Error('TOOL_ACCESS_DENIED');
    if (request.consumerType === 'ANONYMOUS' && !request.anonymousSessionReference)
      throw new Error('TOOL_ANONYMOUS_SESSION_REQUIRED');
    if (request.consumerType === 'ANONYMOUS' && !request.trustedNetworkReference)
      throw new Error('TOOL_TRUSTED_NETWORK_REFERENCE_REQUIRED');
    if (this.resultProtector.status() !== 'READY')
      throw new Error('TOOL_RESULT_PROTECTION_NOT_CONFIGURED');

    const identity =
      request.authenticatedStudentReference ??
      request.anonymousSessionReference ??
      request.requestId ??
      'admin-test';
    const fingerprintForVersion = (toolVersion: string) => resultDigest({
      toolKey,
      toolVersion,
      consumerType: request.consumerType,
      input: request.input,
      locale: request.locale ?? 'ar',
      privacyConsent: request.privacyConsent === true,
    });
    const requestFingerprint = fingerprintForVersion(tool.currentVersion.semanticVersion);
    const idempotencyKeyHash = request.idempotencyKey
      ? hash(`${identity}:${request.idempotencyKey}`)
      : null;
    if (idempotencyKeyHash) {
      const previous = await this.repository.findExecutionByIdempotency(
        toolKey,
        idempotencyKeyHash,
      );
      if (previous) {
        if (previous.safeUsageMetadata?.requestFingerprint !== fingerprintForVersion(previous.toolVersion))
          throw new Error('TOOL_IDEMPOTENCY_KEY_REUSED');
        return this.replay(previous);
      }
    }

    const input = handler.validate(request.input);

    if (
      request.consumerType === 'ADMIN_TEST' &&
      (tool.executionType === StudentToolExecutionType.AI_DELEGATED ||
        tool.executionType === StudentToolExecutionType.HYBRID) &&
      request.adminTestCostApproved !== true
    )
      throw new Error('TOOL_TEST_BUDGET_NOT_CONFIGURED');

    const requestLimit =
      request.consumerType === 'ANONYMOUS'
        ? tool.rateLimitPolicy.anonymousRequestsPerMinute
        : request.consumerType === 'ADMIN_TEST'
          ? tool.rateLimitPolicy.adminTestRequestsPerMinute
          : tool.rateLimitPolicy.authenticatedRequestsPerMinute;
    const allowance = await this.rateLimit.consume(
      `${toolKey}:principal:${hash(identity)}`,
      requestLimit,
      60_000,
    );
    if (!allowance.allowed) throw new Error('TOOL_RATE_LIMITED');
    if (request.consumerType === 'ANONYMOUS') {
      const networkAllowance = await this.rateLimit.consume(
        `${toolKey}:network:${hash(request.trustedNetworkReference)}`,
        Math.max(requestLimit, requestLimit * 3),
        60_000,
      );
      if (!networkAllowance.allowed) throw new Error('TOOL_RATE_LIMITED');
    }

    const dependencyEntries = await Promise.all(
      tool.dependencies.map(
        async (dependency) =>
          [
            `${dependency.phase}:${dependency.capabilityKey ?? dependency.type}`,
            await this.dependencyHealth.status(dependency),
          ] as const,
      ),
    );
    const dependencyStatus = Object.fromEntries(dependencyEntries);
    const unavailableRequired = tool.dependencies.find((dependency) => {
      const key = `${dependency.phase}:${dependency.capabilityKey ?? dependency.type}`;
      return dependency.required && dependencyStatus[key] !== 'READY';
    });
    if (unavailableRequired) throw new Error('TOOL_DEPENDENCY_UNAVAILABLE');

    const executionId = `stx_${randomUUID()}`;
    const startedAt = new Date();
    const context: StudentToolExecutionContext = {
      executionId,
      requestId: request.requestId ?? randomUUID(),
      correlationId: randomUUID(),
      traceId: randomUUID(),
      toolKey,
      toolVersion: tool.currentVersion.semanticVersion,
      locale: request.locale ?? 'ar',
      consumerType: request.consumerType,
      authenticatedStudentReference: request.authenticatedStudentReference,
      anonymousSessionReference: request.anonymousSessionReference,
      startedAt,
      privacyConsent: request.privacyConsent,
    };
    const claimed = await this.repository.recordExecutionOrReplay({
      executionId,
      toolKey,
      toolVersion: context.toolVersion,
      status: StudentToolExecutionStatus.RUNNING,
      consumerType: request.consumerType,
      studentReferenceHash: hash(request.authenticatedStudentReference),
      anonymousSessionHash: hash(request.anonymousSessionReference),
      idempotencyKeyHash,
      correlationId: context.correlationId,
      traceId: context.traceId,
      isTest: request.consumerType === 'ADMIN_TEST',
      startedAt,
      safeUsageMetadata: {
        locale: context.locale,
        requestFingerprint,
        handlerContractVersion,
        definitionRevision: tool.revision ?? 0,
      },
      dependencyStatus,
    });
    if (!claimed.created) {
      if (claimed.record.safeUsageMetadata?.requestFingerprint !== requestFingerprint)
        throw new Error('TOOL_IDEMPOTENCY_KEY_REUSED');
      return this.replay(claimed.record);
    }

    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const unvalidatedResult = await Promise.race([
        handler.execute(context, input as never),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('TOOL_AI_UNKNOWN_OUTCOME')), 60000);
        }),
      ]).finally(() => {
        if (timeout) clearTimeout(timeout);
      });
      const result = handler.validateOutput(unvalidatedResult);
      const completedAt = new Date();
      const aiExecutionReference =
        'aiExecutionId' in result && typeof result.aiExecutionId === 'string'
          ? result.aiExecutionId
          : null;
      const digest = resultDigest(result);
      const protectedResult = this.resultProtector.protect({
        result,
        executionId,
        toolVersion: context.toolVersion,
        ownerHash: hash(identity),
        expiresAt: new Date(completedAt.getTime() + TRANSIENT_RESULT_TTL_MS).toISOString(),
      });
      await this.repository.completeExecution(
        executionId,
        {
          status: StudentToolExecutionStatus.COMPLETED,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          aiExecutionReference,
          resultDigest: digest,
          resultExpiresAt: new Date(completedAt.getTime() + TRANSIENT_RESULT_TTL_MS),
        },
        {
          resultDigest: digest,
          resultExpiresAt: new Date(completedAt.getTime() + TRANSIENT_RESULT_TTL_MS),
          protectedResult,
        },
      );
      return {
        executionId,
        toolKey,
        toolVersion: context.toolVersion,
        status: StudentToolExecutionStatus.COMPLETED,
        result,
        aiExecutionReference: aiExecutionReference ?? undefined,
        executedAt: completedAt,
        resultExpiresAt: new Date(completedAt.getTime() + TRANSIENT_RESULT_TTL_MS),
      };
    } catch (error) {
      const completedAt = new Date();
      const candidateCode = error instanceof Error ? error.message.split(':')[0] : '';
      const errorCode = /^[A-Z][A-Z0-9_]{0,99}$/.test(candidateCode) ? candidateCode : 'TOOL_EXECUTION_FAILED';
      await this.repository.completeExecution(executionId, {
        status: errorCode.includes('UNKNOWN_OUTCOME')
          ? StudentToolExecutionStatus.UNKNOWN_OUTCOME
          : errorCode.includes('BLOCKED') || errorCode.includes('UNAVAILABLE')
            ? StudentToolExecutionStatus.BLOCKED
            : StudentToolExecutionStatus.FAILED,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        errorCode,
        aiExecutionReference: error instanceof StudentToolAIExecutionError ? error.aiExecutionReference : undefined,
      });
      throw error;
    }
  }

  async findExecutionForRequester(executionId: string, requester: StudentToolExecutionRequester) {
    const record = await this.repository.findExecution(executionId);
    if (!record || record.consumerType !== requester.consumerType) return null;
    const expected =
      requester.consumerType === 'AUTHENTICATED_STUDENT'
        ? hash(requester.authenticatedStudentReference)
        : hash(requester.anonymousSessionReference);
    const actual =
      requester.consumerType === 'AUTHENTICATED_STUDENT'
        ? record.studentReferenceHash
        : record.anonymousSessionHash;
    return expected && actual === expected ? record : null;
  }

  async saveExecutionForStudent(executionId: string, authenticatedStudentReference: string) {
    if (!authenticatedStudentReference) throw new Error('TOOL_AUTH_REQUIRED');
    if (!this.saveGateway) throw new Error('TOOL_SAVE_NOT_CONFIGURED');
    const record = await this.findExecutionForRequester(executionId, {
      consumerType: 'AUTHENTICATED_STUDENT',
      authenticatedStudentReference,
    });
    if (!record) throw new Error('TOOL_EXECUTION_NOT_FOUND');
    if (record.status !== StudentToolExecutionStatus.COMPLETED)
      throw new Error('TOOL_EXECUTION_NOT_SAVABLE');
    const result = await this.recoverResult(record);
    return this.saveGateway.savePrivateResult({
      studentReference: authenticatedStudentReference,
      toolKey: record.toolKey,
      executionId: record.executionId,
      resultReference: `${record.executionId}:${record.resultDigest}`,
      result,
    });
  }

  /**
   * Explicit anonymous -> authenticated adoption flow.
   * The original execution remains classified as ANONYMOUS for truthful
   * analytics/retention. Ownership is proven by the server-verified anonymous
   * session and the result is copied into the authenticated student's private
   * Phase 15 workspace rather than mutating historical provenance.
   */
  async claimAnonymousExecutionForStudent(
    executionId: string,
    anonymousSessionReference: string,
    authenticatedStudentReference: string,
  ) {
    if (!authenticatedStudentReference) throw new Error('TOOL_AUTH_REQUIRED');
    if (!anonymousSessionReference) throw new Error('TOOL_ANONYMOUS_SESSION_REQUIRED');
    if (!this.saveGateway) throw new Error('TOOL_SAVE_NOT_CONFIGURED');
    const record = await this.findExecutionForRequester(executionId, {
      consumerType: 'ANONYMOUS',
      anonymousSessionReference,
    });
    if (!record) throw new Error('TOOL_EXECUTION_NOT_FOUND');
    if (record.status !== StudentToolExecutionStatus.COMPLETED)
      throw new Error('TOOL_EXECUTION_NOT_SAVABLE');
    const result = await this.recoverResult(record);
    const saved = await this.saveGateway.savePrivateResult({
      studentReference: authenticatedStudentReference,
      toolKey: record.toolKey,
      executionId: record.executionId,
      resultReference: `${record.executionId}:${record.resultDigest}`,
      result,
    });
    return {
      ...saved,
      adoption: {
        fromConsumerType: 'ANONYMOUS' as const,
        toConsumerType: 'AUTHENTICATED_STUDENT' as const,
        executionId: record.executionId,
      },
    };
  }

  private async replay(record: StudentToolExecutionRecord) {
    if (
      record.status === StudentToolExecutionStatus.RUNNING &&
      Date.now() - new Date(record.startedAt).getTime() > 120000
    ) {
      record = await this.repository.completeExecution(record.executionId, {
        status: StudentToolExecutionStatus.UNKNOWN_OUTCOME,
        completedAt: new Date(),
        errorCode: 'TOOL_AI_UNKNOWN_OUTCOME',
      });
    }
    if (record.status === StudentToolExecutionStatus.COMPLETED) {
      const result = await this.recoverResult(record);
      return {
        executionId: record.executionId,
        toolKey: record.toolKey,
        toolVersion: record.toolVersion,
        status: record.status,
        result,
        warnings: ['IDEMPOTENT_REPLAY'],
        aiExecutionReference: record.aiExecutionReference ?? undefined,
        executedAt: record.completedAt ?? record.startedAt,
        resultExpiresAt: record.resultExpiresAt,
      };
    }
    return {
      executionId: record.executionId,
      toolKey: record.toolKey,
      toolVersion: record.toolVersion,
      status: record.status,
      warnings: [
        record.status === StudentToolExecutionStatus.RUNNING
          ? 'IDEMPOTENT_REPLAY_IN_PROGRESS'
          : 'IDEMPOTENT_REPLAY_TERMINAL',
      ],
      aiExecutionReference: record.aiExecutionReference ?? undefined,
      executedAt: record.completedAt ?? record.startedAt,
      resultExpiresAt: record.resultExpiresAt,
    };
  }

  private async recoverResult(record: StudentToolExecutionRecord) {
    const stored = await this.repository.loadTransientResult(record.executionId);
    const expiresAt = stored ? new Date(stored.resultExpiresAt).getTime() : NaN;
    const assertLiveResult = () => {
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now())
        throw new Error('TOOL_IDEMPOTENT_RESULT_EXPIRED');
    };
    assertLiveResult();
    if (!stored) throw new Error('TOOL_IDEMPOTENT_RESULT_EXPIRED');
    if (
      !record.resultDigest ||
      !record.resultExpiresAt ||
      new Date(record.resultExpiresAt).getTime() !== expiresAt
    )
      throw new Error('TOOL_RESULT_BINDING_INVALID');
    const envelope = this.resultProtector.unprotect(stored.protectedResult) as Record<
      string,
      unknown
    >;
    if (
      envelope.executionId !== record.executionId ||
      envelope.toolVersion !== record.toolVersion ||
      envelope.ownerHash !== (record.studentReferenceHash ?? record.anonymousSessionHash) ||
      envelope.expiresAt !== new Date(stored.resultExpiresAt).toISOString()
    )
      throw new Error('TOOL_RESULT_BINDING_INVALID');
    const raw = envelope.result;
    const contractVersion = record.safeUsageMetadata?.handlerContractVersion;
    const handler =
      typeof contractVersion === 'string'
        ? this.handlers.getVersion?.(record.toolKey, contractVersion)
        : null;
    if (!handler) throw new Error('TOOL_NOT_IMPLEMENTED');
    const result = handler.validateOutput(raw);
    const digest = resultDigest(result);
    if (digest !== stored.resultDigest || (record.resultDigest && digest !== record.resultDigest))
      throw new Error('TOOL_RESULT_PROVENANCE_MISMATCH');
    assertLiveResult();
    return result;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
