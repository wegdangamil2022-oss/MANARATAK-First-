import {
  StudentToolDefinition,
  StudentToolExecutionContext,
  StudentToolExecutionRecord,
  StudentToolExecutionResponse,
  StudentToolExecutionType,
  StudentToolInput,
  StudentToolOutput,
  UniversityComparisonItem,
  ScholarshipCandidate,
} from './types';
export interface StudentToolFilters {
  category?: string;
  visibility?: string;
  implementationStatus?: string;
  lifecycle?: string;
  executionType?: string;
  search?: string;
}
export interface StudentToolTelemetry {
  executions24h: number | null;
  executions7d: number | null;
  executions30d: number | null;
  successRate: number | null;
  failureRate: number | null;
  p95LatencyMs: number | null;
  blocked: number | null;
  dependencyFailures: number | null;
}
export interface IStudentToolRegistryRepository {
  list(filters?: StudentToolFilters): Promise<StudentToolDefinition[]>;
  listPublic(filters?: StudentToolFilters): Promise<StudentToolDefinition[]>;
  findByKey(toolKey: string): Promise<StudentToolDefinition | null>;
  upsertDefinition(
    definition: StudentToolDefinition,
    actorReferenceId: string,
  ): Promise<StudentToolDefinition>;
  updateDefinition(
    toolKey: string,
    patch: Partial<StudentToolDefinition>,
    actorReferenceId: string,
    action: string,
  ): Promise<StudentToolDefinition>;
  recordExecution(record: StudentToolExecutionRecord): Promise<StudentToolExecutionRecord>;
  recordExecutionOrReplay(record: StudentToolExecutionRecord): Promise<{ record: StudentToolExecutionRecord; created: boolean }>;
  completeExecution(
    executionId: string,
    patch: Partial<StudentToolExecutionRecord>,
    transientResult?: StudentToolTransientResultWrite,
  ): Promise<StudentToolExecutionRecord>;
  loadTransientResult(executionId: string): Promise<StudentToolTransientResultRead | null>;
  pruneExpiredTransientResults(now?: Date): Promise<number>;
  findExecution(executionId: string): Promise<StudentToolExecutionRecord | null>;
  findExecutionByIdempotency(
    toolKey: string,
    idempotencyKeyHash: string,
  ): Promise<StudentToolExecutionRecord | null>;
  listExecutions(
    toolKey: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ data: StudentToolExecutionRecord[]; total: number }>;
  telemetry(toolKey?: string): Promise<StudentToolTelemetry>;
  audit(
    toolKey: string,
  ): Promise<
    Array<{
      timestamp: Date | string;
      actor: string;
      action: string;
      summary: string;
      correlationId?: string | null;
    }>
  >;
}

export interface StudentToolProtectedResultEnvelope {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}
export interface StudentToolTransientResultWrite {
  resultDigest: string;
  resultExpiresAt: Date;
  protectedResult: StudentToolProtectedResultEnvelope;
}
export interface StudentToolTransientResultRead extends StudentToolTransientResultWrite {}
export interface IStudentToolResultProtector {
  status(): 'READY' | 'NOT_CONFIGURED';
  protect(value: StudentToolOutput): StudentToolProtectedResultEnvelope;
  unprotect(value: StudentToolProtectedResultEnvelope): unknown;
}

export interface IStudentToolHandler<
  TInput extends StudentToolInput = StudentToolInput,
  TOutput extends StudentToolOutput = StudentToolOutput,
> {
  readonly toolKey: string;
  readonly executionType: StudentToolExecutionType;
  validate(input: unknown): TInput;
  validateOutput(output: unknown): TOutput;
  execute(context: StudentToolExecutionContext, input: TInput): Promise<TOutput>;
}
export interface IEnterpriseAIConsumerGateway {
  executeCapability<TPayload extends object, TResult>(request: {
    consumerKey: 'phase18-student-tools';
    capabilityKey:
      'student-tools.motivation-letter.generate' | 'student-tools.scholarship-recommendation.rank';
    correlationId: string;
    locale: 'ar' | 'en';
    dataClassification: 'PRIVATE_STUDENT_DATA' | 'CANONICAL_PUBLIC_DATA';
    payload: TPayload;
    idempotencyKey: string;
    outputSchema: Record<string, unknown>;
  }): Promise<{
    status: 'COMPLETED' | 'BLOCKED' | 'FAILED' | 'NOT_CONFIGURED';
    result?: TResult;
    executionReference?: string;
    safetyStatus?: string;
    errorCode?: string;
  }>;
}
export interface IUniversityComparisonGateway {
  getUniversitiesByPublicIds(
    publicIds: string[],
  ): Promise<{ available: UniversityComparisonItem[]; unavailableIds: string[] }>;
}
export interface IScholarshipRecommendationGateway {
  findPublishedCandidates(filters: {
    countries: string[];
    targetDegree?: string;
    fundingPreference?: string;
    studyLanguage?: string;
  }): Promise<ScholarshipCandidate[]>;
}
export interface IStudentContextGateway {
  getMinimalContext(
    studentReference: string,
  ): Promise<{
    preferredLocale?: 'ar' | 'en';
    educationalLevel?: string;
    targetDegree?: string;
    interests?: string[];
  } | null>;
}
export interface IStudentToolSaveGateway {
  savePrivateResult(input: {
    studentReference: string;
    toolKey: string;
    executionId: string;
    resultReference: string;
    result: StudentToolOutput;
  }): Promise<{ savedReference: string }>;
}
export interface IStudentToolAssetGateway {
  saveGeneratedAsset(input: {
    ownerReference: string;
    mediaType: string;
    content: Uint8Array;
    fileName: string;
  }): Promise<{ assetId: string; assetReference: string }>;
}
export interface IStudentToolRateLimitGateway {
  consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
}
export interface IStudentToolDependencyHealthGateway {
  status(
    dependency: StudentToolDefinition['dependencies'][number],
  ): Promise<'READY' | 'DEGRADED' | 'NOT_CONFIGURED' | 'UNAVAILABLE'>;
}
export interface StudentToolHandlerRegistryLike {
  get(toolKey: string): IStudentToolHandler | null;
  has(toolKey: string): boolean;
  list(): IStudentToolHandler[];
}
export type ExecuteStudentToolRequest = {
  input: unknown;
  locale?: 'ar' | 'en';
  requestId?: string;
  idempotencyKey?: string;
  consumerType: StudentToolExecutionContext['consumerType'];
  authenticatedStudentReference?: string;
  anonymousSessionReference?: string;
  trustedNetworkReference?: string;
  isTest?: boolean;
};
export type ExecuteStudentToolResult = StudentToolExecutionResponse<StudentToolOutput>;
export interface StudentToolExecutionRequester {
  consumerType: 'ANONYMOUS' | 'AUTHENTICATED_STUDENT';
  authenticatedStudentReference?: string;
  anonymousSessionReference?: string;
}
