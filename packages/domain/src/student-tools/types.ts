export enum StudentToolExecutionType {
  DETERMINISTIC = 'DETERMINISTIC',
  AI_DELEGATED = 'AI_DELEGATED',
  HYBRID = 'HYBRID',
  ADMIN_INTERNAL = 'ADMIN_INTERNAL',
}
export enum StudentToolLifecycleStatus {
  DRAFT = 'DRAFT',
  TESTING = 'TESTING',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  RETIRED = 'RETIRED',
}
export enum StudentToolImplementationStatus {
  PLANNED = 'PLANNED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  IMPLEMENTED = 'IMPLEMENTED',
  RUNTIME_BLOCKED = 'RUNTIME_BLOCKED',
}
export enum StudentToolVisibilityStatus {
  ACTIVE = 'ACTIVE',
  COMING_SOON = 'COMING_SOON',
  UNDER_DEVELOPMENT = 'UNDER_DEVELOPMENT',
  HIDDEN_ADMIN_ONLY = 'HIDDEN_ADMIN_ONLY',
  DISABLED = 'DISABLED',
  RETIRED = 'RETIRED',
}
export enum StudentToolHealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  DEGRADED = 'DEGRADED',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}
export enum StudentToolImplementationPriority {
  P1_CORE_LAUNCH = 'P1_CORE_LAUNCH',
  P2_EXPANSION = 'P2_EXPANSION',
  P3_LATER = 'P3_LATER',
}
export enum StudentToolExecutionStatus {
  RECEIVED = 'RECEIVED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
export enum StudentToolErrorCode {
  NOT_FOUND = 'TOOL_NOT_FOUND',
  NOT_IMPLEMENTED = 'TOOL_NOT_IMPLEMENTED',
  NOT_ACTIVE = 'TOOL_NOT_ACTIVE',
  MAINTENANCE = 'TOOL_MAINTENANCE',
  AUTH_REQUIRED = 'TOOL_AUTH_REQUIRED',
  ACCESS_DENIED = 'TOOL_ACCESS_DENIED',
  RATE_LIMITED = 'TOOL_RATE_LIMITED',
  INPUT_INVALID = 'TOOL_INPUT_INVALID',
  DEPENDENCY_UNAVAILABLE = 'TOOL_DEPENDENCY_UNAVAILABLE',
  AI_CAPABILITY_UNAVAILABLE = 'TOOL_AI_CAPABILITY_UNAVAILABLE',
  EXECUTION_BLOCKED = 'TOOL_EXECUTION_BLOCKED',
  EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  OUTPUT_INVALID = 'TOOL_OUTPUT_INVALID',
}

export interface StudentToolDependency {
  phase:
    | 'PHASE_05'
    | 'PHASE_10'
    | 'PHASE_11'
    | 'PHASE_12'
    | 'PHASE_13'
    | 'PHASE_15'
    | 'PHASE_17'
    | 'PHASE_07';
  type: 'DATA' | 'EXECUTION' | 'PERSISTENCE';
  required: boolean;
  capabilityKey?: string | null;
  description: string;
}
export interface StudentToolAvailabilityPolicy {
  publicEnabled: boolean;
  anonymousEnabled: boolean;
  authenticatedEnabled: boolean;
  adminOnly: boolean;
  allowedLocales: string[];
  allowedRegions: string[];
  maintenanceMode: boolean;
}
export interface StudentToolFeatureFlags {
  globallyEnabled: boolean;
  anonymousEnabled: boolean;
  authenticatedEnabled: boolean;
  maintenanceMode: boolean;
}
export interface StudentToolRateLimitPolicy {
  anonymousRequestsPerMinute: number;
  authenticatedRequestsPerMinute: number;
  adminTestRequestsPerMinute: number;
}
export interface StudentToolSchema {
  version: string;
  fields: Array<{
    key: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    labelAr: string;
    labelEn: string;
    constraints?: Record<string, string | number | boolean>;
  }>;
}
export interface StudentToolVersionSnapshot {
  inputSchema: StudentToolSchema;
  outputSchema: StudentToolSchema;
  dependencies: StudentToolDependency[];
  availability: StudentToolAvailabilityPolicy;
  rateLimitPolicy: StudentToolRateLimitPolicy;
  executionType: StudentToolExecutionType;
  aiCapabilityKey?: string | null;
  outputType: string;
  supportedLocales: string[];
}
export interface StudentToolVersion {
  semanticVersion: string;
  inputSchemaVersion: string;
  outputSchemaVersion: string;
  releaseDate: Date | string;
  changeNote: string;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  snapshotHash?: string;
}

export interface StudentToolDefinition {
  id?: string;
  toolKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  executionType: StudentToolExecutionType;
  implementationPriority: StudentToolImplementationPriority;
  desiredLaunchVisibility: StudentToolVisibilityStatus;
  visibility: StudentToolVisibilityStatus;
  implementationStatus: StudentToolImplementationStatus;
  lifecycle: StudentToolLifecycleStatus;
  availability: StudentToolAvailabilityPolicy;
  featureFlags: StudentToolFeatureFlags;
  rateLimitPolicy: StudentToolRateLimitPolicy;
  aiCapabilityKey?: string | null;
  outputType: string;
  supportedLocales: string[];
  estimatedMinutes: number;
  tags: string[];
  iconAssetId?: string | null;
  dependencies: StudentToolDependency[];
  currentVersion: StudentToolVersion;
  inputSchema: StudentToolSchema;
  outputSchema: StudentToolSchema;
  owner: string;
  launchOrder: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface StudentToolExecutionContext {
  executionId: string;
  requestId: string;
  correlationId: string;
  traceId: string;
  toolKey: string;
  toolVersion: string;
  locale: 'ar' | 'en';
  consumerType: 'ANONYMOUS' | 'AUTHENTICATED_STUDENT' | 'ADMIN_TEST';
  authenticatedStudentReference?: string;
  anonymousSessionReference?: string;
  startedAt: Date;
}
export interface StudentToolExecutionRecord {
  id?: string;
  executionId: string;
  toolKey: string;
  toolVersion: string;
  versionRecordId?: string;
  status: StudentToolExecutionStatus;
  consumerType: StudentToolExecutionContext['consumerType'];
  studentReferenceHash?: string | null;
  anonymousSessionHash?: string | null;
  idempotencyKeyHash?: string | null;
  correlationId: string;
  traceId: string;
  aiExecutionReference?: string | null;
  dependencyStatus?: Record<string, string> | null;
  durationMs?: number | null;
  errorCode?: string | null;
  safeUsageMetadata?: Record<string, string | number | boolean> | null;
  isTest: boolean;
  startedAt: Date | string;
  completedAt?: Date | string | null;
  resultDigest?: string | null;
  resultExpiresAt?: Date | string | null;
}
export interface StudentToolExecutionResponse<TResult> {
  executionId: string;
  toolKey: string;
  toolVersion: string;
  versionRecordId?: string;
  status: StudentToolExecutionStatus;
  result?: TResult;
  warnings?: string[];
  dependencyStatus?: Record<string, string>;
  aiExecutionReference?: string;
  executedAt: Date | string;
}

export interface GpaCourseInput {
  label: string;
  creditHours: number;
  gradePoints: number;
}
export interface GpaCalculatorInput {
  scale: number;
  courses: GpaCourseInput[];
  existingCumulativeGpa?: number;
  existingCompletedCredits?: number;
}
export interface GpaCalculatorOutput {
  semesterGpa: number;
  projectedCumulativeGpa?: number;
  totalSemesterCredits: number;
  projectedTotalCredits?: number;
  qualityPoints: number;
  scale: number;
  courses: Array<GpaCourseInput & { qualityPoints: number }>;
}
export interface UniversityComparisonInput {
  universityIds: string[];
  hideUnavailableRows?: boolean;
}
export interface UniversityComparisonItem {
  publicId: string;
  slug: string;
  displayName: string;
  country?: string | null;
  city?: string | null;
  institutionType?: string | null;
  institutionalOwnership?: string | null;
  officialWebsite?: string | null;
  languagesOfInstruction?: string[];
  academicProgramCount?: number | null;
  updatedAt?: Date | string;
}
export interface UniversityComparisonOutput {
  universities: UniversityComparisonItem[];
  unavailableUniversityIds: string[];
  comparedCanonicalIds: string[];
}
export interface MotivationLetterInput {
  target: {
    universityId?: string;
    program: string;
    degreeLevel: string;
    country?: string;
    applicationType: string;
  };
  studentBackground: {
    education: string;
    academicInterests: string[];
    experiences: string[];
    achievements: string[];
    skills: string[];
  };
  motivation: {
    whyField: string;
    whyProgram: string;
    careerGoals: string;
    contribution: string;
    emphasizedExperiences: string[];
  };
  outputPreferences: {
    language: 'ar' | 'en';
    targetWords: number;
    tone: 'FORMAL';
    specialInstructions?: string;
  };
}
export interface MotivationLetterOutput {
  draft: string;
  warnings: string[];
  sections?: Array<{ heading: string; content: string }>;
  aiExecutionId: string;
  safetyStatus: string;
}
export interface ScholarshipRecommendationInput {
  targetDegree?: string;
  studyField?: string;
  preferredCountries: string[];
  fundingPreference?: 'FULL' | 'PARTIAL' | 'ANY';
  studyLanguage?: string;
  targetYear?: number;
  academicInterests?: string[];
  careerGoals?: string;
}
export interface ScholarshipCandidate {
  publicId: string;
  slug: string;
  displayName: string;
  country?: string | null;
  degreeLevels: string[];
  fundingType?: string | null;
  isFullyFunded?: boolean | null;
  deadline?: Date | string | null;
  canonicalUrl?: string | null;
  publicationStatus: string;
}
export interface ScholarshipRecommendationOutput {
  mode: 'AI_ADVISORY' | 'DETERMINISTIC_FALLBACK';
  recommendations: Array<{
    scholarship: ScholarshipCandidate;
    explanation?: string;
    constraintSummary: string[];
  }>;
  disclaimer: string;
  aiExecutionId?: string;
}
export type StudentToolInput =
  | GpaCalculatorInput
  | UniversityComparisonInput
  | MotivationLetterInput
  | ScholarshipRecommendationInput;
export type StudentToolOutput =
  | GpaCalculatorOutput
  | UniversityComparisonOutput
  | MotivationLetterOutput
  | ScholarshipRecommendationOutput;
